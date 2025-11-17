#!/usr/bin/env node
/**
 * Migration Script: Add isRemovedFromSource field
 *
 * Adds the new isRemovedFromSource INTEGER field to the vehicles table.
 * This field indicates if the vehicle listing has been removed from source.
 * SQLite uses INTEGER (0/1) for boolean values.
 *
 * NOTE: Status CHECK constraint is not modified per story guidance.
 * TypeScript type safety handles status validation at application level.
 */

import { createClient } from '@libsql/client';
import { WorkspaceUtils } from '@car-finder/services';
import * as path from 'path';

async function migrate() {
  console.log('Starting migration: Add isRemovedFromSource field...');

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
    // Check if column already exists
    const tableInfo = await client.execute("PRAGMA table_info(vehicles)");
    const columnExists = tableInfo.rows.some((row: any) => row.name === 'isRemovedFromSource');

    if (columnExists) {
      console.log('Column isRemovedFromSource already exists. Migration skipped.');
      return;
    }

    // Add the new column with default value of 0 (false)
    await client.execute(`
      ALTER TABLE vehicles
      ADD COLUMN isRemovedFromSource INTEGER DEFAULT 0
    `);

    console.log('Successfully added isRemovedFromSource column to vehicles table');

    // Verify the column was added
    const verifyTableInfo = await client.execute("PRAGMA table_info(vehicles)");
    const verifyColumn = verifyTableInfo.rows.find((row: any) => row.name === 'isRemovedFromSource');

    if (verifyColumn) {
      console.log('Verification successful: isRemovedFromSource column exists');
      console.log(`   Type: ${verifyColumn.type}, Default: ${verifyColumn.dflt_value}, Nullable: ${verifyColumn.notnull === 0 ? 'YES' : 'NO'}`);
    } else {
      console.error('Verification failed: Column not found after migration');
      process.exit(1);
    }

    // Count how many vehicles were updated with default value
    const countResult = await client.execute("SELECT COUNT(*) as count FROM vehicles");
    const vehicleCount = (countResult.rows[0] as any).count;
    console.log(`Set isRemovedFromSource = 0 for ${vehicleCount} existing vehicles`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }

  console.log('Migration completed successfully');
}

// Run migration if executed directly
if (require.main === module) {
  migrate().catch(console.error);
}

export { migrate };
