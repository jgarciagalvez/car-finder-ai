import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Database table interface that matches the Vehicle type from @car-finder/types
export interface VehicleTable {
  // Primary identifier
  id: Generated<string>;
  
  // Source information
  source: 'otomoto' | 'olx';
  sourceId: string;
  sourceUrl: string;
  sourceCreatedAt: string; // ISO date string
  
  // Raw scraped data
  sourceTitle: string;
  sourceDescriptionHtml: string;
  sourceParameters: string; // JSON string
  sourceEquipment: string; // JSON string
  sourcePhotos: string; // JSON array string
  
  // Processed & normalized data
  title: string;
  description: string | null; // Translated by analyze script
  features: string; // JSON array string
  pricePln: number;
  priceEur: number;
  year: number;
  mileage: number;
  
  // Seller information (JSON string)
  sellerInfo: string; // JSON string of SellerInfo
  photos: string; // JSON array string
  
  // AI generated data (all nullable)
  personalFitScore: number | null;
  marketValueScore: string | null;
  aiPriorityRating: number | null;
  aiPrioritySummary: string | null;
  aiMechanicReport: string | null;
  aiDataSanityCheck: string | null;
  
  // User workflow data
  status: 'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted';
  personalNotes: string | null;
  
  // Timestamps
  scrapedAt: string; // ISO date string
  createdAt: Generated<string>; // Auto-generated ISO date string
  updatedAt: Generated<string>; // Auto-updated ISO date string
}

// Database schema interface
export interface Database {
  vehicles: VehicleTable;
}

// Type helpers for CRUD operations
export type Vehicle = Selectable<VehicleTable>;
export type NewVehicle = Insertable<VehicleTable>;
export type VehicleUpdate = Updateable<VehicleTable>;

// SQL DDL for creating the vehicles table
export const CREATE_VEHICLES_TABLE = `
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
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'to_contact', 'contacted', 'to_visit', 'visited', 'not_interested', 'deleted')),
    personalNotes TEXT,
    
    -- Timestamps
    scrapedAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

// Indexes for performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_vehicles_source_url ON vehicles(sourceUrl)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_price_eur ON vehicles(priceEur)',
];

// Trigger for auto-updating updatedAt timestamp
export const CREATE_UPDATE_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS vehicles_updated_at
  AFTER UPDATE ON vehicles
  FOR EACH ROW
  BEGIN
    UPDATE vehicles SET updatedAt = datetime('now') WHERE id = NEW.id;
  END
`;

// All schema creation statements
export const SCHEMA_STATEMENTS = [
  CREATE_VEHICLES_TABLE,
  ...CREATE_INDEXES,
  CREATE_UPDATE_TRIGGER,
];
