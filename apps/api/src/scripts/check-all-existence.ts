#!/usr/bin/env node

/**
 * Existence Check Script (One-Time Cleanup)
 *
 * Checks all vehicles to see if they still exist on their source URLs (Otomoto).
 * Updates isRemovedFromSource and lastExistenceCheck fields based on HTTP response.
 *
 * Usage:
 *   pnpm --filter @car-finder/api check-all-existence           # Check all vehicles
 *   pnpm --filter @car-finder/api check-all-existence --limit 10  # Check only first 10 vehicles
 *
 * Environment Variables:
 *   DATABASE_PATH    Optional. Path to database file (default: <root>/data/vehicles.db)
 *
 * Rate Limiting:
 *   - 3 second delay between requests to avoid overloading Otomoto servers
 *   - 10 second timeout per request
 */

import { VehicleRepository, DatabaseService } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';
import { WorkspaceUtils } from '@car-finder/services';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

interface CheckStats {
  totalVehicles: number;
  checked: number;
  stillAvailable: number;
  removed: number;
  networkErrors: number;
  errors: Array<{ vehicleId: string; url: string; error: string }>;
  startTime: Date;
  endTime?: Date;
}

interface CheckOptions {
  limit?: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CheckOptions {
  const args = process.argv.slice(2);
  const options: CheckOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a single vehicle URL still exists
 */
async function checkVehicleExistence(
  url: string
): Promise<{ exists: boolean; httpStatus: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 404 or 410 means vehicle is removed
    if (response.status === 404 || response.status === 410) {
      return { exists: false, httpStatus: response.status };
    } else {
      return { exists: true, httpStatus: response.status };
    }
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Main existence check function
 */
async function checkAllExistence(options: CheckOptions): Promise<void> {
  const stats: CheckStats = {
    totalVehicles: 0,
    checked: 0,
    stillAvailable: 0,
    removed: 0,
    networkErrors: 0,
    errors: [],
    startTime: new Date(),
  };

  console.log('🔍 Vehicle Existence Check Script');
  console.log('==================================');
  console.log(`Started at: ${stats.startTime.toISOString()}`);
  console.log('');

  // Initialize database
  const dbService = new DatabaseService();
  await dbService.initialize();
  const vehicleRepo = new VehicleRepository(dbService.getDatabase());

  try {
    // Load all vehicles
    console.log('📊 Loading vehicles from database...');
    let vehicles = await vehicleRepo.getAllVehicles();
    stats.totalVehicles = vehicles.length;
    console.log(`   Found ${vehicles.length} vehicles`);

    // Filter: only check vehicles with no lastExistenceCheck OR older than 4 hours
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const now = Date.now();

    const needsCheck = vehicles.filter((v) => {
      if (!v.lastExistenceCheck) return true; // Never checked

      const lastCheck = new Date(v.lastExistenceCheck).getTime();
      return (now - lastCheck) > FOUR_HOURS_MS; // Checked > 4 hours ago
    });

    console.log(`   ${needsCheck.length} vehicles need checking (never checked or >4h old)`);
    console.log(`   ${vehicles.length - needsCheck.length} vehicles skipped (checked within 4h)`);

    vehicles = needsCheck;

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      vehicles = vehicles.slice(0, options.limit);
      console.log(`   Limited to first ${options.limit} vehicles`);
    }

    console.log('');
    console.log('🚀 Starting existence checks...');
    console.log(`   Rate limit: 3 second delay between requests`);
    console.log('');

    // Check each vehicle
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const progress = `[${i + 1}/${vehicles.length}]`;

      console.log(`${progress} Checking: ${vehicle.title.substring(0, 50)}...`);
      console.log(`           URL: ${vehicle.sourceUrl}`);

      try {
        const result = await checkVehicleExistence(vehicle.sourceUrl);
        const lastExistenceCheck = new Date().toISOString();

        // Update database
        if (result.exists) {
          // Vehicle still available - just update lastExistenceCheck
          await vehicleRepo.updateVehicle(vehicle.id, {
            isRemovedFromSource: false,
            lastExistenceCheck,
          });
          stats.stillAvailable++;
          console.log(`           ✅ Available (HTTP ${result.httpStatus})`);
        } else {
          // Vehicle removed - set isRemovedFromSource AND status='deleted'
          await vehicleRepo.updateVehicle(vehicle.id, {
            isRemovedFromSource: true,
            status: 'deleted',
            lastExistenceCheck,
          });
          stats.removed++;
          console.log(`           ❌ REMOVED - marked as deleted (HTTP ${result.httpStatus})`);
        }

        stats.checked++;
      } catch (error) {
        stats.networkErrors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          vehicleId: vehicle.id,
          url: vehicle.sourceUrl,
          error: errorMessage,
        });
        console.log(`           ⚠️ Network Error: ${errorMessage}`);
      }

      // Rate limiting: wait 3 seconds between requests (except for the last one)
      if (i < vehicles.length - 1) {
        console.log('           ⏳ Waiting 3 seconds...');
        await sleep(3000);
      }

      console.log('');
    }

    stats.endTime = new Date();
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

    // Print summary
    console.log('📊 Final Statistics');
    console.log('===================');
    console.log(`Total vehicles in database: ${stats.totalVehicles}`);
    console.log(`Vehicles checked: ${stats.checked}`);
    console.log(`Still available: ${stats.stillAvailable}`);
    console.log(`Removed from source: ${stats.removed}`);
    console.log(`Network errors: ${stats.networkErrors}`);
    console.log('');
    console.log(`Started: ${stats.startTime.toISOString()}`);
    console.log(`Ended: ${stats.endTime.toISOString()}`);
    console.log(`Duration: ${duration.toFixed(1)} seconds`);
    console.log('');

    if (stats.errors.length > 0) {
      console.log('⚠️ Errors Encountered:');
      for (const err of stats.errors) {
        console.log(`   Vehicle ${err.vehicleId}: ${err.error}`);
        console.log(`   URL: ${err.url}`);
        console.log('');
      }
    }

    if (stats.removed > 0) {
      console.log(`⚠️ ${stats.removed} vehicle(s) have been removed from Otomoto.`);
      console.log('   These vehicles have been marked with status="deleted".');
      console.log('   Warning badges will appear in the UI.');
    } else if (stats.checked > 0) {
      console.log('✅ All checked vehicles are still available on Otomoto!');
    }

    console.log('');
    console.log('🎉 Existence check complete!');
    console.log('');
    console.log('📝 NOTE: This is a one-time cleanup script.');
    console.log('   Remove the package.json command after running.');
  } finally {
    await dbService.close();
  }
}

// Run the script
const options = parseArgs();
checkAllExistence(options).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
