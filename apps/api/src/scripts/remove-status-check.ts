#!/usr/bin/env node
/**
 * Migration Script: Remove status CHECK constraint
 *
 * Removes the CHECK constraint on the status column to allow new status values.
 * SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we must recreate the table.
 *
 * This script:
 * 1. Creates a new table without the CHECK constraint
 * 2. Copies all data
 * 3. Drops the old table
 * 4. Renames the new table
 */

import { createClient } from '@libsql/client';
import { WorkspaceUtils } from '@car-finder/services';
import * as path from 'path';

async function removeCheckConstraint() {
  console.log('Starting migration: Remove status CHECK constraint...');

  // Load environment
  WorkspaceUtils.loadEnvFromRoot();
  const workspaceRoot = WorkspaceUtils.findWorkspaceRoot();

  // Get database URL
  let dbUrl = process.env.DATABASE_URL || `file:${workspaceRoot}/data/vehicles.db`;

  if (dbUrl.startsWith('file:') && !dbUrl.includes('://')) {
    const filePath = dbUrl.substring(5);
    if (!path.isAbsolute(filePath)) {
      dbUrl = `file:${path.join(workspaceRoot, filePath)}`;
    }
  }

  console.log(`Database URL: ${dbUrl}`);
  const client = createClient({ url: dbUrl });

  try {
    // Count vehicles before migration
    const countBefore = await client.execute("SELECT COUNT(*) as count FROM vehicles");
    const totalBefore = (countBefore.rows[0] as any).count;
    console.log(`Vehicles before migration: ${totalBefore}`);

    // Create new table with updated CHECK constraint (or without it)
    console.log('Creating new table with updated constraints...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS vehicles_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

        source TEXT NOT NULL CHECK (source IN ('otomoto', 'olx')),
        sourceId TEXT NOT NULL,
        sourceUrl TEXT NOT NULL UNIQUE,
        sourceCreatedAt TEXT NOT NULL,

        sourceTitle TEXT NOT NULL,
        sourceDescriptionHtml TEXT NOT NULL,
        sourceParameters TEXT NOT NULL DEFAULT '{}',
        sourceEquipment TEXT NOT NULL DEFAULT '{}',
        sourcePhotos TEXT NOT NULL DEFAULT '[]',

        title TEXT NOT NULL,
        description TEXT,
        features TEXT NOT NULL DEFAULT '[]',
        pricePln REAL NOT NULL,
        priceEur REAL NOT NULL,
        year INTEGER NOT NULL,
        mileage INTEGER NOT NULL,

        sellerInfo TEXT NOT NULL DEFAULT '{}',
        photos TEXT NOT NULL DEFAULT '[]',

        personalFitScore REAL,
        marketValueScore TEXT,
        aiPriorityRating REAL,
        aiPrioritySummary TEXT,
        aiMechanicReport TEXT,
        virtualMechanicSummary TEXT,
        aiDataSanityCheck TEXT,

        distanceFromWroclaw REAL,

        status TEXT NOT NULL DEFAULT 'new',
        personalNotes TEXT,
        isRemovedFromSource INTEGER DEFAULT 0,

        scrapedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Copy data from old table
    console.log('Copying data to new table...');
    await client.execute(`
      INSERT INTO vehicles_new
      SELECT
        id, source, sourceId, sourceUrl, sourceCreatedAt,
        sourceTitle, sourceDescriptionHtml, sourceParameters, sourceEquipment, sourcePhotos,
        title, description, features, pricePln, priceEur, year, mileage,
        sellerInfo, photos,
        personalFitScore, marketValueScore, aiPriorityRating, aiPrioritySummary,
        aiMechanicReport, virtualMechanicSummary, aiDataSanityCheck,
        distanceFromWroclaw,
        status, personalNotes, isRemovedFromSource,
        scrapedAt, createdAt, updatedAt
      FROM vehicles
    `);

    // Verify data copied
    const countAfter = await client.execute("SELECT COUNT(*) as count FROM vehicles_new");
    const totalAfter = (countAfter.rows[0] as any).count;
    console.log(`Vehicles in new table: ${totalAfter}`);

    if (totalBefore !== totalAfter) {
      throw new Error(`Data mismatch: ${totalBefore} vs ${totalAfter} vehicles`);
    }

    // Drop old table
    console.log('Dropping old table...');
    await client.execute('DROP TABLE vehicles');

    // Rename new table
    console.log('Renaming new table to vehicles...');
    await client.execute('ALTER TABLE vehicles_new RENAME TO vehicles');

    // Recreate indexes
    console.log('Recreating indexes...');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_source_url ON vehicles(sourceUrl)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(createdAt)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_price_eur ON vehicles(priceEur)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_vehicles_distance ON vehicles(distanceFromWroclaw)');

    // Recreate trigger
    console.log('Recreating update trigger...');
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS vehicles_updated_at
      AFTER UPDATE ON vehicles
      FOR EACH ROW
      BEGIN
        UPDATE vehicles SET updatedAt = datetime('now') WHERE id = NEW.id;
      END
    `);

    // Final verification
    const finalCount = await client.execute("SELECT COUNT(*) as count FROM vehicles");
    const finalTotal = (finalCount.rows[0] as any).count;
    console.log(`Final vehicle count: ${finalTotal}`);

    if (totalBefore !== finalTotal) {
      throw new Error(`Final verification failed: ${totalBefore} vs ${finalTotal}`);
    }

    console.log('CHECK constraint removed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }

  console.log('Migration completed successfully');
}

if (require.main === module) {
  removeCheckConstraint().catch(console.error);
}

export { removeCheckConstraint };
