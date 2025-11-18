#!/usr/bin/env node

/**
 * Reset Auto-Filtered Vehicles Script
 *
 * Resets vehicles that were automatically marked as 'skipped'
 * by the translate script (due to missing required features) back to 'new' status.
 *
 * This is needed after Story 3.10, which now checks for features in descriptions,
 * so vehicles that were previously filtered may now pass the filter.
 *
 * Usage:
 *   pnpm reset-filtered              # Preview what would be reset
 *   pnpm reset-filtered --execute    # Actually reset the vehicles
 */

import { DatabaseService, VehicleRepository } from '@car-finder/db';
import { WorkspaceUtils } from '@car-finder/services';

// Load environment variables from workspace root
WorkspaceUtils.loadEnvFromRoot();

interface AutoFilteredVehicle {
  id: string;
  title: string;
  sourceUrl: string;
  aiDataSanityCheck: string | null;
}

async function main() {
  const execute = process.argv.includes('--execute');

  console.log('🔍 Analyzing auto-filtered vehicles...\n');

  const dbService = new DatabaseService();
  await dbService.initialize();
  const kysely = dbService.getDatabase();

  // Get all skipped vehicles
  const allSkipped = await kysely
    .selectFrom('vehicles')
    .select(['id', 'title', 'sourceUrl', 'aiDataSanityCheck'])
    .where('status', '=', 'skipped')
    .execute();

  // Also get legacy not_interested vehicles (from before Story 3.10)
  const allNotInterested = await kysely
    .selectFrom('vehicles')
    .select(['id', 'title', 'sourceUrl', 'aiDataSanityCheck'])
    .where('status', '=', 'not_interested')
    .execute();

  console.log(`Total skipped vehicles: ${allSkipped.length}`);
  console.log(`Total not_interested vehicles: ${allNotInterested.length}`);

  // Filter for auto-filtered vehicles (have aiDataSanityCheck with overallAssessment='filtered_out')
  const autoFiltered: AutoFilteredVehicle[] = [];
  const manuallyMarked: AutoFilteredVehicle[] = [];

  // Check both skipped and not_interested
  const allVehicles = [...allSkipped, ...allNotInterested];

  for (const vehicle of allVehicles) {
    let isAutoFiltered = false;

    if (vehicle.aiDataSanityCheck) {
      try {
        const check = JSON.parse(vehicle.aiDataSanityCheck);
        if (check.overallAssessment === 'filtered_out') {
          isAutoFiltered = true;
        }
      } catch (error) {
        // Invalid JSON, treat as manually marked
      }
    }

    if (isAutoFiltered) {
      autoFiltered.push(vehicle);
    } else {
      manuallyMarked.push(vehicle);
    }
  }

  console.log(`Auto-filtered by translate script: ${autoFiltered.length}`);
  console.log(`Manually marked by user (skipped): ${manuallyMarked.length}\n`);

  if (autoFiltered.length === 0) {
    console.log('✅ No auto-filtered vehicles found. Nothing to reset.');
    process.exit(0);
  }

  if (!execute) {
    console.log('📋 Preview of vehicles that would be reset to "new" status:\n');
    autoFiltered.slice(0, 10).forEach((v, i) => {
      console.log(`${i + 1}. ${v.title.substring(0, 60)}...`);
      console.log(`   ID: ${v.id.substring(0, 8)}`);
      console.log(`   URL: ${v.sourceUrl}\n`);
    });

    if (autoFiltered.length > 10) {
      console.log(`... and ${autoFiltered.length - 10} more vehicles\n`);
    }

    console.log('🔄 To actually reset these vehicles, run:');
    console.log('   pnpm reset-filtered --execute\n');
    process.exit(0);
  }

  // Execute the reset
  console.log('🔄 Resetting auto-filtered vehicles to "new" status...\n');

  const autoFilteredIds = autoFiltered.map(v => v.id);

  const result = await kysely
    .updateTable('vehicles')
    .set({
      status: 'new',
      aiDataSanityCheck: null // Clear the auto-filter marker
    })
    .where('id', 'in', autoFilteredIds)
    .executeTakeFirst();

  console.log(`✅ Reset ${result.numUpdatedRows} vehicles to "new" status`);
  console.log(`\n💡 These vehicles will now be picked up by the translate script.`);
  console.log(`   Run: pnpm translate\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
