#!/usr/bin/env node
/**
 * Migration Script: Backfill Vehicle Statuses
 *
 * Updates existing vehicles from 'new' status to 'processed' if they have AI analysis data.
 * This script handles the transition to the new status workflow system.
 *
 * Logic:
 * - Vehicles with aiPriorityRating != null are updated from 'new' to 'processed'
 * - Vehicles without AI data remain as 'new' (system-only status)
 * - isRemovedFromSource defaults to 0 for all existing vehicles (handled by column default)
 */

import { createClient } from '@libsql/client';
import { WorkspaceUtils } from '@car-finder/services';
import * as path from 'path';

async function migrateStatuses() {
  console.log('Starting status backfill migration...');

  // Load environment
  WorkspaceUtils.loadEnvFromRoot();
  const workspaceRoot = WorkspaceUtils.findWorkspaceRoot();

  // Get database URL and ensure it's an absolute path
  let dbUrl = process.env.DATABASE_URL || `file:${workspaceRoot}/data/vehicles.db`;

  // If the URL uses a relative file path, make it absolute
  if (dbUrl.startsWith('file:') && !dbUrl.includes('://')) {
    const filePath = dbUrl.substring(5); // Remove 'file:' prefix
    if (!path.isAbsolute(filePath)) {
      dbUrl = `file:${path.join(workspaceRoot, filePath)}`;
    }
  }

  console.log(`Database URL: ${dbUrl}`);
  const client = createClient({ url: dbUrl });

  try {
    // Get counts before migration
    const beforeCounts = await client.execute(`
      SELECT
        status,
        COUNT(*) as count
      FROM vehicles
      GROUP BY status
    `);

    console.log('Current status distribution:');
    beforeCounts.rows.forEach((row: any) => {
      console.log(`  ${row.status}: ${row.count} vehicles`);
    });

    // Count vehicles with AI analysis that are still 'new'
    const toUpdateResult = await client.execute(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE status = 'new' AND aiPriorityRating IS NOT NULL
    `);
    const toUpdateCount = (toUpdateResult.rows[0] as any).count;

    console.log(`\nFound ${toUpdateCount} vehicles with AI analysis still marked as 'new'`);

    if (toUpdateCount === 0) {
      console.log('No vehicles need status migration. Backfill complete.');
      return;
    }

    // Update status from 'new' to 'processed' for vehicles with AI data
    const updateResult = await client.execute(`
      UPDATE vehicles
      SET status = 'processed'
      WHERE status = 'new' AND aiPriorityRating IS NOT NULL
    `);

    console.log(`Updated ${updateResult.rowsAffected} vehicles from 'new' to 'processed'`);

    // Verify the migration
    const afterCounts = await client.execute(`
      SELECT
        status,
        COUNT(*) as count
      FROM vehicles
      GROUP BY status
    `);

    console.log('\nStatus distribution after migration:');
    afterCounts.rows.forEach((row: any) => {
      console.log(`  ${row.status}: ${row.count} vehicles`);
    });

    // Check remaining 'new' vehicles
    const remainingNewResult = await client.execute(`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE status = 'new'
    `);
    const remainingNew = (remainingNewResult.rows[0] as any).count;

    console.log(`\nRemaining 'new' vehicles (without AI analysis): ${remainingNew}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }

  console.log('\nStatus backfill migration completed successfully');
}

// Run migration if executed directly
if (require.main === module) {
  migrateStatuses().catch(console.error);
}

export { migrateStatuses };
