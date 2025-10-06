import { DatabaseService } from '../database';
import { VehicleRepository } from '../repositories/vehicleRepository';
import { Vehicle as VehicleType } from '@car-finder/types';
import path from 'path';
import fs from 'fs';

describe('VehicleRepository Integration Tests', () => {
  let dbService: DatabaseService;
  let repository: VehicleRepository;
  let testDbPath: string;

  beforeEach(async () => {
    // Use a unique test database file for each test
    testDbPath = path.join(__dirname, `test-integration-${Date.now()}.db`);
    dbService = new DatabaseService(testDbPath);
    await dbService.initialize();
    repository = new VehicleRepository(dbService.getDb());
  });

  afterEach(async () => {
    // Clean up after each test
    if (dbService.isInitialized()) {
      await dbService.close();
    }
    
    // Remove test database file with retry for Windows file locking
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (error) {
        // Retry after a short delay for Windows file locking issues
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          fs.unlinkSync(testDbPath);
        } catch (retryError) {
          // If still fails, just warn - don't fail the test
          console.warn(`Warning: Could not delete test database file: ${testDbPath}`);
        }
      }
    }
  });

  const createTestVehicle = (): VehicleType => ({
    id: 'test-id-123',
    source: 'otomoto',
    sourceId: 'otomoto-123',
    sourceUrl: 'https://otomoto.pl/test-vehicle-123',
    sourceCreatedAt: new Date('2025-01-01'),
    
    // Raw scraped data
    sourceTitle: 'Test Vehicle Title',
    sourceDescriptionHtml: '<p>Test description</p>',
    sourceParameters: { fuel: 'petrol', transmission: 'manual' },
    sourceEquipment: { comfort: ['air_conditioning', 'navigation'] },
    sourcePhotos: ['https://example.com/photo1.jpg'],
    
    // Processed data
    title: 'Test Vehicle',
    description: 'Test description',
    features: ['air_conditioning', 'navigation'],
    pricePln: 50000,
    priceEur: 12000,
    year: 2020,
    mileage: 50000,
    
    // Seller info
    sellerInfo: {
      name: 'Test Seller',
      id: 'seller-123',
      type: 'private',
      location: 'Warsaw',
      memberSince: '2020-01-01',
    },
    photos: ['https://example.com/photo1.jpg'],
    
    // AI data (initially null)
    personalFitScore: null,
    marketValueScore: null,
    aiPriorityRating: null,
    aiPrioritySummary: null,
    aiMechanicReport: null,
    aiDataSanityCheck: null,
    
    // User workflow
    status: 'new',
    personalNotes: null,
    
    // Timestamps
    scrapedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  describe('insertVehicle', () => {
    it('should insert a vehicle successfully', async () => {
      const vehicle = createTestVehicle();
      
      await expect(repository.insertVehicle(vehicle)).resolves.not.toThrow();
    });

    it('should handle duplicate sourceUrl by throwing error', async () => {
      const vehicle = createTestVehicle();
      
      // Insert first vehicle
      await repository.insertVehicle(vehicle);
      
      // Try to insert duplicate
      const duplicate = { ...vehicle, id: 'different-id' };
      await expect(repository.insertVehicle(duplicate)).rejects.toThrow();
    });
  });

  describe('findVehicleByUrl', () => {
    it('should find vehicle by sourceUrl', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      const found = await repository.findVehicleByUrl(vehicle.sourceUrl);
      
      expect(found).toBeDefined();
      expect(found?.sourceUrl).toBe(vehicle.sourceUrl);
      expect(found?.title).toBe(vehicle.title);
    });

    it('should return null for non-existent URL', async () => {
      const found = await repository.findVehicleByUrl('https://nonexistent.com');
      
      expect(found).toBeNull();
    });

    it('should properly deserialize JSON fields', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      const found = await repository.findVehicleByUrl(vehicle.sourceUrl);
      
      expect(found?.features).toEqual(vehicle.features);
      expect(found?.sellerInfo).toEqual(vehicle.sellerInfo);
      expect(found?.sourceParameters).toEqual(vehicle.sourceParameters);
    });
  });

  describe('findVehicleById', () => {
    it('should find vehicle by ID after insertion', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      // Get the auto-generated ID
      const inserted = await repository.findVehicleByUrl(vehicle.sourceUrl);
      expect(inserted).toBeDefined();
      
      const found = await repository.findVehicleById(inserted!.id);
      
      expect(found).toBeDefined();
      expect(found?.sourceUrl).toBe(vehicle.sourceUrl);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findVehicleById('non-existent-id');
      
      expect(found).toBeNull();
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle status and notes', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      const inserted = await repository.findVehicleByUrl(vehicle.sourceUrl);
      expect(inserted).toBeDefined();
      
      await repository.updateVehicle(inserted!.id, {
        status: 'to_contact',
        personalNotes: 'Looks promising',
      });
      
      const updated = await repository.findVehicleById(inserted!.id);
      expect(updated?.status).toBe('to_contact');
      expect(updated?.personalNotes).toBe('Looks promising');
    });

    it('should update AI-generated fields', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      const inserted = await repository.findVehicleByUrl(vehicle.sourceUrl);
      expect(inserted).toBeDefined();
      
      await repository.updateVehicle(inserted!.id, {
        personalFitScore: 85,
        marketValueScore: '+5%',
        aiPriorityRating: 7,
      });
      
      const updated = await repository.findVehicleById(inserted!.id);
      expect(updated?.personalFitScore).toBe(85);
      expect(updated?.marketValueScore).toBe('+5%');
      expect(updated?.aiPriorityRating).toBe(7);
    });

    it('should throw error for non-existent vehicle', async () => {
      await expect(
        repository.updateVehicle('non-existent-id', { status: 'contacted' })
      ).rejects.toThrow('Vehicle with ID non-existent-id not found');
    });
  });

  describe('getAllVehicles', () => {
    it('should return empty array when no vehicles exist', async () => {
      const vehicles = await repository.getAllVehicles();
      
      expect(vehicles).toEqual([]);
    });

    it('should return all vehicles ordered by creation date', async () => {
      const vehicle1 = createTestVehicle();
      const vehicle2 = { ...createTestVehicle(), sourceUrl: 'https://different.com' };
      
      await repository.insertVehicle(vehicle1);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await repository.insertVehicle(vehicle2);
      
      const vehicles = await repository.getAllVehicles();
      
      expect(vehicles).toHaveLength(2);
      // Should be ordered by createdAt desc (newest first)
      expect(vehicles[0].sourceUrl).toBe(vehicle2.sourceUrl);
      expect(vehicles[1].sourceUrl).toBe(vehicle1.sourceUrl);
    });
  });

  describe('getVehiclesByStatus', () => {
    it('should filter vehicles by status', async () => {
      const vehicle1 = createTestVehicle();
      const vehicle2 = { ...createTestVehicle(), sourceUrl: 'https://different.com' };
      
      await repository.insertVehicle(vehicle1);
      await repository.insertVehicle(vehicle2);
      
      // Update one vehicle's status
      const inserted2 = await repository.findVehicleByUrl(vehicle2.sourceUrl);
      await repository.updateVehicle(inserted2!.id, { status: 'to_contact' });
      
      const newVehicles = await repository.getVehiclesByStatus('new');
      const toContactVehicles = await repository.getVehiclesByStatus('to_contact');
      
      expect(newVehicles).toHaveLength(1);
      expect(toContactVehicles).toHaveLength(1);
      expect(newVehicles[0].sourceUrl).toBe(vehicle1.sourceUrl);
      expect(toContactVehicles[0].sourceUrl).toBe(vehicle2.sourceUrl);
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      const vehicle = createTestVehicle();
      await repository.insertVehicle(vehicle);
      
      const inserted = await repository.findVehicleByUrl(vehicle.sourceUrl);
      expect(inserted).toBeDefined();
      
      await repository.deleteVehicle(inserted!.id);
      
      const deleted = await repository.findVehicleById(inserted!.id);
      expect(deleted).toBeNull();
    });

    it('should throw error when deleting non-existent vehicle', async () => {
      await expect(
        repository.deleteVehicle('non-existent-id')
      ).rejects.toThrow('Vehicle with ID non-existent-id not found');
    });
  });
});
