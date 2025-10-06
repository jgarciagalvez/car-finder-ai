// Vehicle-related types based on architecture specifications

export type VehicleSource = 'otomoto' | 'olx';
export type VehicleStatus = 'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'deleted';
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

// API-related types
export interface UpdateVehiclePayload {
  status?: VehicleStatus;
  personalNotes?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatRequest {
  context: {
    view: 'dashboard' | 'detail';
    vehicleId?: string;
  };
  conversationHistory: ChatMessage[];
  userMessage: string;
}

export interface ChatResponse {
  aiResponse: string;
}

// Common utility types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
