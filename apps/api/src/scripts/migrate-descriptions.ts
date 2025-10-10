/**
 * One-time migration script to make description nullable and set all to NULL
 * This allows the analyze script to run translation on all existing vehicles
 *
 * Usage: pnpm --filter @car-finder/api tsx src/scripts/migrate-descriptions.ts
 */

import { DatabaseService, VehicleRepository } from '@car-finder/db';
import { sql } from 'kysely';

async function migrateDescriptions() {
  const dbService = new DatabaseService();

  try {
    console.log('🚀 Starting migration: Making description nullable...');

    await dbService.initialize();
    const db = dbService.getDatabase();

    // Step 1: Alter table to make description nullable
    // SQLite doesn't support ALTER COLUMN directly, so we need to:
    // 1. Create a new table with the correct schema
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table

    console.log('   Creating temporary table with nullable description...');

    // Create temp table with nullable description
    await sql`
      CREATE TABLE vehicles_new AS SELECT * FROM vehicles
    `.execute(db);

    // Drop old table
    await sql`DROP TABLE vehicles`.execute(db);

    // Recreate with correct schema (nullable description)
    await sql`
      CREATE TABLE vehicles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

        -- Source information
        source TEXT NOT NULL CHECK (source IN ('otomoto', 'olx')),
        sourceId TEXT NOT NULL,
        sourceUrl TEXT NOT NULL UNIQUE,
        sourceCreatedAt TEXT NOT NULL,

        -- Raw scraped data
        sourceTitle TEXT NOT NULL,
        sourceDescriptionHtml TEXT NOT NULL,
        sourceParameters TEXT NOT NULL DEFAULT '{}',
        sourceEquipment TEXT NOT NULL DEFAULT '{}',
        sourcePhotos TEXT NOT NULL DEFAULT '[]',

        -- Processed & normalized data
        title TEXT NOT NULL,
        description TEXT, -- Nullable - translated by analyze script
        features TEXT NOT NULL DEFAULT '[]',
        pricePln REAL NOT NULL,
        priceEur REAL NOT NULL,
        year INTEGER NOT NULL,
        mileage INTEGER NOT NULL,

        -- Seller information
        sellerInfo TEXT NOT NULL DEFAULT '{}',
        photos TEXT NOT NULL DEFAULT '[]',

        -- AI generated data (nullable)
        personalFitScore REAL,
        marketValueScore TEXT,
        aiPriorityRating REAL,
        aiPrioritySummary TEXT,
        aiMechanicReport TEXT,
        aiDataSanityCheck TEXT,

        -- User workflow data
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'to_contact', 'contacted', 'to_visit', 'visited', 'deleted')),
        personalNotes TEXT,

        -- Timestamps
        scrapedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `.execute(db);

    // Copy data back with description set to NULL
    await sql`
      INSERT INTO vehicles
      SELECT
        id, source, sourceId, sourceUrl, sourceCreatedAt,
        sourceTitle, sourceDescriptionHtml, sourceParameters, sourceEquipment, sourcePhotos,
        title, NULL as description, features, pricePln, priceEur, year, mileage,
        sellerInfo, photos,
        personalFitScore, marketValueScore, aiPriorityRating, aiPrioritySummary, aiMechanicReport, aiDataSanityCheck,
        status, personalNotes,
        scrapedAt, createdAt, updatedAt
      FROM vehicles_new
    `.execute(db);

    // Drop temp table
    await sql`DROP TABLE vehicles_new`.execute(db);

    // Recreate indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_source_url ON vehicles(sourceUrl)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(createdAt)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_price_eur ON vehicles(priceEur)`.execute(db);

    // Recreate trigger
    await sql`
      CREATE TRIGGER IF NOT EXISTS vehicles_updated_at
      AFTER UPDATE ON vehicles
      FOR EACH ROW
      BEGIN
        UPDATE vehicles SET updatedAt = datetime('now') WHERE id = NEW.id;
      END
    `.execute(db);

    console.log(`✅ Migration complete! Description column is now nullable and all descriptions set to NULL`);
    console.log('   All vehicles are now ready for translation');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dbService.close();
  }
}

// Run the migration
migrateDescriptions()
  .then(() => {
    console.log('✨ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
