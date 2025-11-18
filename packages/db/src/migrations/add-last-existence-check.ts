#!/usr/bin/env node
/**
 * Migration Script: Add lastExistenceCheck field
 *
 * Adds the new lastExistenceCheck TEXT field to the vehicles table.
 * This field stores the ISO timestamp of when the vehicle was last checked for existence.
 * SQLite stores this as TEXT (ISO date string) and defaults to NULL.
 */

import { createClient } from '@libsql/client';
import { WorkspaceUtils } from '@car-finder/services';
import * as path from 'path';

async function migrate() {
  console.log('Starting migration: Add lastExistenceCheck field...');

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
    const columnExists = tableInfo.rows.some((row: any) => row.name === 'lastExistenceCheck');

    if (columnExists) {
      console.log('Column lastExistenceCheck already exists. Migration skipped.');
      return;
    }

    // Add the new column with default value of NULL
    await client.execute(`
      ALTER TABLE vehicles
      ADD COLUMN lastExistenceCheck TEXT DEFAULT NULL
    `);

    console.log('Successfully added lastExistenceCheck column to vehicles table');

    // Verify the column was added
    const verifyTableInfo = await client.execute("PRAGMA table_info(vehicles)");
    const verifyColumn = verifyTableInfo.rows.find((row: any) => row.name === 'lastExistenceCheck');

    if (verifyColumn) {
      console.log('Verification successful: lastExistenceCheck column exists');
      console.log(`   Type: ${verifyColumn.type}, Default: ${verifyColumn.dflt_value}, Nullable: ${verifyColumn.notnull === 0 ? 'YES' : 'NO'}`);
    } else {
      console.error('Verification failed: Column not found after migration');
      process.exit(1);
    }

    // Count how many vehicles were updated with default value
    const countResult = await client.execute("SELECT COUNT(*) as count FROM vehicles");
    const vehicleCount = (countResult.rows[0] as any).count;
    console.log(`Set lastExistenceCheck = NULL for ${vehicleCount} existing vehicles`);

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
