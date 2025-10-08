# Database Schema

The database uses LibSQL (SQLite-compatible) with a single `vehicles` table that stores all scraped, processed, and AI-generated data. The schema is defined in `packages/db/src/schema.ts` using Kysely for type-safe query building.

## Vehicles Table DDL

```sql
CREATE TABLE IF NOT EXISTS vehicles (
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
  description TEXT NOT NULL,
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
);
```

## Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_vehicles_source_url ON vehicles(sourceUrl);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(createdAt);
CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
CREATE INDEX IF NOT EXISTS idx_vehicles_price_eur ON vehicles(priceEur);
```

**Index Rationale:**
- `idx_vehicles_source_url`: Ensures fast duplicate detection during scraping (UNIQUE constraint support)
- `idx_vehicles_status`: Optimizes dashboard filtering by workflow status
- `idx_vehicles_created_at`: Enables efficient "newest first" sorting
- `idx_vehicles_source`: Supports filtering by source site (Otomoto vs OLX)
- `idx_vehicles_price_eur`: Accelerates price-based sorting and filtering

## Auto-Update Trigger

```sql
CREATE TRIGGER IF NOT EXISTS vehicles_updated_at
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
  UPDATE vehicles SET updatedAt = datetime('now') WHERE id = NEW.id;
END;
```

This trigger automatically maintains the `updatedAt` timestamp whenever any field is modified, ensuring accurate audit trails without manual timestamp management.

## Schema Design Decisions

1. **JSON Storage**: Complex objects (sourceParameters, sourceEquipment, features, sellerInfo, photos) are stored as JSON strings. This balances SQLite's limitations with flexible data structures from scraped content.

2. **Text Timestamps**: Dates stored as ISO 8601 strings (TEXT) instead of UNIX timestamps for human readability in direct database queries.

3. **Generated IDs**: Uses SQLite's `randomblob(16)` for CUID-like unique identifiers, avoiding auto-increment integers.

4. **Nullable AI Fields**: All AI-generated columns allow NULL to support the two-phase workflow (scrape first, analyze later).

5. **Source URL Uniqueness**: The `UNIQUE` constraint on `sourceUrl` prevents duplicate scraping of the same listing.

## Post-MVP Considerations

- **Migration Risks:** For the MVP, database migrations are handled manually. Post-MVP, a more robust migration strategy should be implemented, including risk analysis for schema changes and automated tooling.
- **Backward Compatibility:** As the schema evolves, a formal process for ensuring backward compatibility or planning for breaking changes will be necessary.