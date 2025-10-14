# Data Models

## Vehicle

**Purpose:** To represent a single vehicle listing, combining the rich data scraped from the source with our own generated analysis and user-workflow data. This will be our primary data entity.

**TypeScript Interface:**
This interface will be placed in the shared `packages/types` directory within our monorepo, ensuring both the frontend and backend use the exact same data structure.

```typescript
export type VehicleSource = 'otomoto' | 'olx';
export type VehicleStatus = 'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted';
export type SellerType = 'private' | 'company' | null;

export interface SellerInfo {
  name: string | null;
  id: string | null;
  type: SellerType;
  location: string | null;
  memberSince: string | null;
}

export interface Vehicle {
  id: string; // Our internal unique identifier
  source: VehicleSource;
  sourceId: string; // The ID from the source site (e.g., Otomoto's ID)
  sourceUrl: string;
  sourceCreatedAt: Date; // When the ad was published on Otomoto/OLX

  // Raw Scraped Data
  sourceTitle: string;
  sourceDescriptionHtml: string;
  sourceParameters: Record<string, string>;
  sourceEquipment: Record<string, string[]>;
  sourcePhotos: string[];
  
  // Our Processed & Normalised Data
  title: string; // Cleaned title
  description: string; // Translated, plain-text description
  features: string[]; // Normalised, e.g., ["comfort_air_conditioning"]
  pricePln: number;
  priceEur: number;
  year: number; 
  mileage: number;
  sellerInfo: SellerInfo;
  photos: string[]; // Cleaned photo URLs

  // AI Generated Data
  personalFitScore: number | null;
  marketValueScore: string | null; // e.g., "-5%" or "+10%"
  aiPriorityRating: number | null;
  aiPrioritySummary: string | null;
  aiMechanicReport: string | null;
  aiDataSanityCheck: string | null;

  // User Workflow Data
  status: VehicleStatus;
  personalNotes: string | null;

  // Our Timestamps
  scrapedAt: Date;
  createdAt: Date; 
  updatedAt: Date;
}
```
**Status Field Notes:**
- `'not_interested'`: Vehicle automatically filtered out during translation due to missing required features (see Story 2.4c). Can be manually re-translated via UI action button with force flag.

**Relationships:**
For the scope of the MVP, the Vehicle model is a self-contained entity. It has no direct relationships with other data models.

