#!/usr/bin/env node

/**
 * Distance Backfill Script
 *
 * Calculates and populates distanceFromWroclaw for all vehicles that don't have it yet.
 * Uses Nominatim API for geocoding and Haversine formula for distance calculation.
 *
 * Usage:
 *   pnpm --filter @car-finder/api backfill-distances           # Process all vehicles without distance
 *   pnpm --filter @car-finder/api backfill-distances --limit 10  # Process only first 10 vehicles
 *
 * Environment Variables:
 *   DATABASE_PATH    Optional. Path to database file (default: <root>/data/vehicles.db)
 */

import { VehicleRepository, DatabaseService } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';
import { WorkspaceUtils } from '@car-finder/services';
import { DistanceCalculationService } from '../services/DistanceCalculationService';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

interface BackfillStats {
  totalVehicles: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ vehicleId: string; city: string | null; error: string }>;
  startTime: Date;
  endTime?: Date;
}

interface BackfillOptions {
  limit?: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {};

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
 * Extract city name from seller location
 */
function extractCity(location: string | null): string | null {
  if (!location) {
    return null;
  }

  // Location format: "City" or "City, Region"
  // Extract city by splitting on comma and taking first part
  const city = location.split(',')[0].trim();
  return city || null;
}

/**
 * Main backfill function
 */
async function backfillDistances(options: BackfillOptions): Promise<void> {
  const stats: BackfillStats = {
    totalVehicles: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    startTime: new Date(),
  };

  console.log('🚗 Distance Backfill Script');
  console.log('============================');
  console.log(`Started at: ${stats.startTime.toISOString()}`);
  console.log('');

  // Initialize database
  const dbService = new DatabaseService();
  await dbService.initialize();
  const vehicleRepo = new VehicleRepository(dbService.getDatabase());
  const distanceService = new DistanceCalculationService();

  try {
    // Load all vehicles
    console.log('📊 Loading vehicles from database...');
    const allVehicles = await vehicleRepo.getAllVehicles();

    // Filter vehicles without distance
    const vehiclesWithoutDistance = allVehicles.filter(
      (v) => v.distanceFromWroclaw === null || v.distanceFromWroclaw === undefined
    );

    stats.totalVehicles = vehiclesWithoutDistance.length;

    if (stats.totalVehicles === 0) {
      console.log('✅ All vehicles already have distance data. Nothing to do!');
      return;
    }

    console.log(`Found ${stats.totalVehicles} vehicles without distance data`);

    // Apply limit if specified
    const vehiclesToProcess = options.limit
      ? vehiclesWithoutDistance.slice(0, options.limit)
      : vehiclesWithoutDistance;

    if (options.limit) {
      console.log(`Limiting to first ${options.limit} vehicles`);
    }

    console.log('');
    console.log('🔄 Processing vehicles...');
    console.log('');

    // Process each vehicle
    for (let i = 0; i < vehiclesToProcess.length; i++) {
      const vehicle = vehiclesToProcess[i];
      stats.processed++;

      const city = extractCity(vehicle.sellerInfo.location);

      if (!city) {
        console.log(`[${i + 1}/${vehiclesToProcess.length}] ⏭️  Skipping ${vehicle.id} - no city`);
        stats.skipped++;
        continue;
      }

      console.log(`[${i + 1}/${vehiclesToProcess.length}] 📍 ${city}...`);

      try {
        // Calculate distance
        const distance = await distanceService.calculateDistanceFromWroclaw(city);

        if (distance !== null) {
          // Update vehicle in database
          await vehicleRepo.updateVehicle(vehicle.id, {
            distanceFromWroclaw: distance,
          });

          console.log(`   ✅ ${distance} km`);
          stats.successful++;
        } else {
          console.log(`   ❌ Failed to calculate distance`);
          stats.failed++;
          stats.errors.push({
            vehicleId: vehicle.id,
            city,
            error: 'Distance calculation returned null',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Error: ${errorMessage}`);
        stats.failed++;
        stats.errors.push({
          vehicleId: vehicle.id,
          city,
          error: errorMessage,
        });
      }

      // Note: Rate limiting is handled internally by DistanceCalculationService
    }

    stats.endTime = new Date();

    console.log('');
    console.log('============================');
    console.log('📊 Backfill Summary');
    console.log('============================');
    console.log(`Total vehicles without distance: ${stats.totalVehicles}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped (no city): ${stats.skipped}`);
    console.log('');

    const cacheStats = distanceService.getCacheStats();
    console.log('📦 Cache Statistics:');
    console.log(`  Unique cities geocoded: ${cacheStats.geocodeCacheSize}`);
    console.log(`  Unique distances cached: ${cacheStats.distanceCacheSize}`);
    console.log('');

    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log('');

    if (stats.errors.length > 0) {
      console.log('❌ Errors:');
      stats.errors.forEach((err) => {
        console.log(`  - Vehicle ${err.vehicleId} (${err.city}): ${err.error}`);
      });
      console.log('');
    }

    if (stats.successful > 0) {
      console.log('✅ Backfill completed successfully!');
    } else {
      console.log('⚠️  No vehicles were updated.');
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
const options = parseArgs();
backfillDistances(options).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
