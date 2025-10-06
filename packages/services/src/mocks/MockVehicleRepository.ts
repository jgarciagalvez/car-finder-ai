import { Vehicle } from '@car-finder/types';
import { IVehicleRepository } from '../interfaces/IVehicleRepository';

/**
 * Mock implementation of VehicleRepository for testing
 * Provides in-memory data storage and configurable behavior
 */
export class MockVehicleRepository implements IVehicleRepository {
  private vehicles = new Map<string, Vehicle>();
  private urlIndex = new Map<string, string>(); // sourceUrl -> id mapping
  private nextId = 1;
  private mockErrors = new Map<string, Error>();

  constructor(initialData: Vehicle[] = []) {
    // Populate with initial test data
    initialData.forEach(vehicle => {
      this.vehicles.set(vehicle.id, vehicle);
      this.urlIndex.set(vehicle.sourceUrl, vehicle.id);
    });
  }

  /**
   * Mock vehicle insertion with in-memory storage
   */
  async insertVehicle(vehicle: Vehicle): Promise<void> {
    // Check for configured error
    const errorKey = `insert:${vehicle.sourceUrl}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    // Generate ID if not provided
    const vehicleToInsert = {
      ...vehicle,
      id: vehicle.id || `mock-id-${this.nextId++}`,
      createdAt: vehicle.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Check for duplicate URL
    if (this.urlIndex.has(vehicleToInsert.sourceUrl)) {
      throw new Error(`Vehicle with URL ${vehicleToInsert.sourceUrl} already exists`);
    }

    this.vehicles.set(vehicleToInsert.id, vehicleToInsert);
    this.urlIndex.set(vehicleToInsert.sourceUrl, vehicleToInsert.id);
  }

  /**
   * Mock vehicle lookup by URL
   */
  async findVehicleByUrl(sourceUrl: string): Promise<Vehicle | null> {
    // Check for configured error
    const errorKey = `findByUrl:${sourceUrl}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    const id = this.urlIndex.get(sourceUrl);
    return id ? this.vehicles.get(id) || null : null;
  }

  /**
   * Mock vehicle lookup by ID
   */
  async findVehicleById(id: string): Promise<Vehicle | null> {
    // Check for configured error
    const errorKey = `findById:${id}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    return this.vehicles.get(id) || null;
  }

  /**
   * Mock vehicle update
   */
  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void> {
    // Check for configured error
    const errorKey = `update:${id}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    const existing = this.vehicles.get(id);
    if (!existing) {
      throw new Error(`Vehicle with ID ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.vehicles.set(id, updated);
  }

  /**
   * Mock get all vehicles
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    // Check for configured error
    const mockError = this.mockErrors.get('getAllVehicles');
    if (mockError) {
      throw mockError;
    }

    return Array.from(this.vehicles.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mock get vehicles by status
   */
  async getVehiclesByStatus(status: Vehicle['status']): Promise<Vehicle[]> {
    // Check for configured error
    const errorKey = `getByStatus:${status}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    return Array.from(this.vehicles.values())
      .filter(vehicle => vehicle.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mock vehicle deletion
   */
  async deleteVehicle(id: string): Promise<void> {
    // Check for configured error
    const errorKey = `delete:${id}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      throw new Error(`Vehicle with ID ${id} not found`);
    }

    this.vehicles.delete(id);
    this.urlIndex.delete(vehicle.sourceUrl);
  }

  // Test helper methods

  /**
   * Configure a mock error for specific operations
   */
  setMockError(operation: string, error: Error): void {
    this.mockErrors.set(operation, error);
  }

  /**
   * Clear all mock errors
   */
  clearMockErrors(): void {
    this.mockErrors.clear();
  }

  /**
   * Clear all data (useful for test cleanup)
   */
  clearAll(): void {
    this.vehicles.clear();
    this.urlIndex.clear();
    this.mockErrors.clear();
    this.nextId = 1;
  }

  /**
   * Get current vehicle count
   */
  getVehicleCount(): number {
    return this.vehicles.size;
  }

  /**
   * Check if a vehicle exists by URL
   */
  hasVehicleWithUrl(sourceUrl: string): boolean {
    return this.urlIndex.has(sourceUrl);
  }

  /**
   * Get all vehicle IDs (for testing)
   */
  getAllVehicleIds(): string[] {
    return Array.from(this.vehicles.keys());
  }

  /**
   * Seed with test data
   */
  seedWithTestData(vehicles: Partial<Vehicle>[]): void {
    vehicles.forEach((vehicleData, index) => {
      const vehicle: Vehicle = {
        id: `test-id-${index + 1}`,
        source: 'otomoto',
        sourceId: `test-source-${index + 1}`,
        sourceUrl: `https://otomoto.pl/test-vehicle-${index + 1}`,
        sourceCreatedAt: new Date(),
        sourceTitle: `Test Vehicle ${index + 1}`,
        sourceDescriptionHtml: `<p>Test description ${index + 1}</p>`,
        sourceParameters: {},
        sourceEquipment: {},
        sourcePhotos: [],
        title: `Test Vehicle ${index + 1}`,
        description: `Test description ${index + 1}`,
        features: [],
        pricePln: 40000 + (index * 5000),
        priceEur: Math.round((40000 + (index * 5000)) * 0.23),
        year: 2018 + index,
        mileage: 30000 + (index * 10000),
        sellerInfo: {
          name: `Test Seller ${index + 1}`,
          id: `seller-${index + 1}`,
          type: 'private',
          location: 'Test City',
          memberSince: '2020-01-01',
        },
        photos: [],
        personalFitScore: null,
        marketValueScore: null,
        aiPriorityRating: null,
        aiPrioritySummary: null,
        aiMechanicReport: null,
        aiDataSanityCheck: null,
        status: 'new',
        personalNotes: null,
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...vehicleData,
      };

      this.vehicles.set(vehicle.id, vehicle);
      this.urlIndex.set(vehicle.sourceUrl, vehicle.id);
    });
  }

  /**
   * Create a test vehicle with minimal required fields
   */
  static createTestVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
    const now = new Date();
    return {
      id: 'test-vehicle-id',
      source: 'otomoto',
      sourceId: 'test-source-id',
      sourceUrl: 'https://otomoto.pl/test-vehicle',
      sourceCreatedAt: now,
      sourceTitle: 'Test Vehicle Title',
      sourceDescriptionHtml: '<p>Test description</p>',
      sourceParameters: { Brand: 'Test Brand', Model: 'Test Model' },
      sourceEquipment: { Comfort: ['Air Conditioning'] },
      sourcePhotos: ['https://example.com/photo.jpg'],
      title: 'Test Vehicle Title',
      description: 'Test description',
      features: ['comfort_air_conditioning'],
      pricePln: 50000,
      priceEur: 11500,
      year: 2020,
      mileage: 50000,
      sellerInfo: {
        name: 'Test Seller',
        id: 'test-seller-id',
        type: 'private',
        location: 'Test City',
        memberSince: '2020-01-01',
      },
      photos: ['https://example.com/photo.jpg'],
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      aiDataSanityCheck: null,
      status: 'new',
      personalNotes: null,
      scrapedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
}
