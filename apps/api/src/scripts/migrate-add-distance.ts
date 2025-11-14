#!/usr/bin/env node

/**
 * Database Migration Script: Add distanceFromWroclaw Column
 *
 * This script adds the distanceFromWroclaw column to the vehicles table
 * and creates an index for sorting performance.
 *
 * Usage:
 *   pnpm --filter @car-finder/api migrate-add-distance
 *
 * Environment Variables:
 *   DATABASE_PATH    Optional. Path to database file (default: <root>/data/vehicles.db)
 */

import { WorkspaceUtils } from '@car-finder/services';
import { createClient } from '@libsql/client';
import { Kysely } from 'kysely';
import { LibsqlDialect } from 'kysely-libsql';
import path from 'path';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

async function runMigration(): Promise<void> {
  console.log('🔧 Starting migration: Add distanceFromWroclaw column');

  // Connect directly to database without schema validation
  const workspaceRoot = WorkspaceUtils.findWorkspaceRoot();
  const dbPath = process.env.DATABASE_PATH
    ? path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.join(workspaceRoot, process.env.DATABASE_PATH)
    : path.join(workspaceRoot, 'data', 'vehicles.db');

  console.log(`📂 Database path: ${dbPath}`);

  const client = createClient({
    url: `file:${path.resolve(dbPath)}`,
  });

  const db = new Kysely<any>({
    dialect: new LibsqlDialect({ client }),
  });

  try {
    console.log('📝 Adding distanceFromWroclaw column...');

    // Add column to vehicles table (IF NOT EXISTS handled by SQLite - column add is idempotent)
    try {
      await db.schema
        .alterTable('vehicles')
        .addColumn('distanceFromWroclaw', 'real')
        .execute();

      console.log('✅ Column distanceFromWroclaw added successfully');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('✅ Column distanceFromWroclaw already exists. Skipping column addition.');
      } else {
        throw error;
      }
    }

    // Create index for sorting performance
    console.log('📝 Creating index on distanceFromWroclaw...');

    await db.schema
      .createIndex('idx_vehicles_distance')
      .ifNotExists()
      .on('vehicles')
      .column('distanceFromWroclaw')
      .execute();

    console.log('✅ Index idx_vehicles_distance created successfully');

    console.log('✅ Migration completed successfully!');
    console.log('   - Column: distanceFromWroclaw (REAL, nullable)');
    console.log('   - Index: idx_vehicles_distance');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run backfill script to populate distances for existing vehicles');
    console.log('  2. pnpm --filter @car-finder/api backfill-distances');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.destroy();
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
