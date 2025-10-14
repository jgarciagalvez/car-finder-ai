/**
 * VehicleRepository Unit Tests
 */

import { VehicleRepository } from './vehicleRepository';
import { Vehicle as VehicleType } from '@car-finder/types';
import { Kysely } from 'kysely';
import { Database as DatabaseSchema } from '../schema';

// Mock Kysely
const mockExecuteTakeFirst = jest.fn();
const mockExecute = jest.fn();
const mockOrderBy = jest.fn(() => ({ execute: mockExecute }));
const mockWhere = jest.fn(() => ({
  executeTakeFirst: mockExecuteTakeFirst,
  execute: mockExecute,
  orderBy: mockOrderBy
}));
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockValues = jest.fn(() => ({ execute: mockExecute }));
const mockSelectAll = jest.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  execute: mockExecute,
}));

const mockDb = {
  selectFrom: jest.fn(() => ({
    selectAll: mockSelectAll,
  })),
  insertInto: jest.fn(() => ({
    values: mockValues,
  })),
  updateTable: jest.fn(() => ({
    set: mockSet,
  })),
  deleteFrom: jest.fn(() => ({
    where: mockWhere,
  })),
} as unknown as Kysely<DatabaseSchema>;

describe('VehicleRepository', () => {
  let repository: VehicleRepository;
  let mockVehicle: VehicleType;

  beforeEach(() => {
    repository = new VehicleRepository(mockDb);

    // Setup mock vehicle
    mockVehicle = {
      id: 'test-vehicle-123',
      source: 'otomoto',
      sourceId: '12345',
      sourceUrl: 'https://otomoto.pl/test',
      sourceCreatedAt: new Date('2024-01-01'),
      sourceTitle: 'Test Vehicle',
      sourceDescriptionHtml: '<p>Test description</p>',
      sourceParameters: { 'Marka pojazdu': 'Toyota', 'Model pojazdu': 'Corolla' },
      sourceEquipment: {},
      sourcePhotos: [],
      title: 'Test Vehicle',
      description: 'Test description',
      features: ['air_conditioning'],
      pricePln: 50000,
      priceEur: 12500,
      year: 2017,
      mileage: 95000,
      sellerInfo: {
        name: 'Test Seller',
        id: '123',
        type: 'private',
        location: 'Test City',
        memberSince: '2020',
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
      scrapedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findVehiclesWithoutAnalysis', () => {
    it('should return vehicles with NULL personalFitScore', async () => {
      const mockDbVehicle = {
        ...mockVehicle,
        sourceParameters: JSON.stringify(mockVehicle.sourceParameters),
        sourceEquipment: JSON.stringify(mockVehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(mockVehicle.sourcePhotos),
        features: JSON.stringify(mockVehicle.features),
        sellerInfo: JSON.stringify(mockVehicle.sellerInfo),
        photos: JSON.stringify(mockVehicle.photos),
        sourceCreatedAt: mockVehicle.sourceCreatedAt.toISOString(),
        scrapedAt: mockVehicle.scrapedAt.toISOString(),
        createdAt: mockVehicle.createdAt.toISOString(),
        updatedAt: mockVehicle.updatedAt.toISOString(),
        personalFitScore: null,
      };

      mockExecute.mockResolvedValue([mockDbVehicle]);

      const results = await repository.findVehiclesWithoutAnalysis();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-vehicle-123');
      expect(results[0].personalFitScore).toBeNull();
      expect(mockDb.selectFrom).toHaveBeenCalledWith('vehicles');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should return vehicles with NULL aiPriorityRating', async () => {
      const mockDbVehicle = {
        ...mockVehicle,
        sourceParameters: JSON.stringify(mockVehicle.sourceParameters),
        sourceEquipment: JSON.stringify(mockVehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(mockVehicle.sourcePhotos),
        features: JSON.stringify(mockVehicle.features),
        sellerInfo: JSON.stringify(mockVehicle.sellerInfo),
        photos: JSON.stringify(mockVehicle.photos),
        sourceCreatedAt: mockVehicle.sourceCreatedAt.toISOString(),
        scrapedAt: mockVehicle.scrapedAt.toISOString(),
        createdAt: mockVehicle.createdAt.toISOString(),
        updatedAt: mockVehicle.updatedAt.toISOString(),
        personalFitScore: 8,
        aiPriorityRating: null,
      };

      mockExecute.mockResolvedValue([mockDbVehicle]);

      const results = await repository.findVehiclesWithoutAnalysis();

      expect(results).toHaveLength(1);
      expect(results[0].personalFitScore).toBe(8);
      expect(results[0].aiPriorityRating).toBeNull();
    });

    it('should return vehicles with NULL aiMechanicReport', async () => {
      const mockDbVehicle = {
        ...mockVehicle,
        sourceParameters: JSON.stringify(mockVehicle.sourceParameters),
        sourceEquipment: JSON.stringify(mockVehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(mockVehicle.sourcePhotos),
        features: JSON.stringify(mockVehicle.features),
        sellerInfo: JSON.stringify(mockVehicle.sellerInfo),
        photos: JSON.stringify(mockVehicle.photos),
        sourceCreatedAt: mockVehicle.sourceCreatedAt.toISOString(),
        scrapedAt: mockVehicle.scrapedAt.toISOString(),
        createdAt: mockVehicle.createdAt.toISOString(),
        updatedAt: mockVehicle.updatedAt.toISOString(),
        personalFitScore: 8,
        aiPriorityRating: 9,
        aiMechanicReport: null,
      };

      mockExecute.mockResolvedValue([mockDbVehicle]);

      const results = await repository.findVehiclesWithoutAnalysis();

      expect(results).toHaveLength(1);
      expect(results[0].aiMechanicReport).toBeNull();
    });

    it('should return vehicles with NULL aiDataSanityCheck', async () => {
      const mockDbVehicle = {
        ...mockVehicle,
        sourceParameters: JSON.stringify(mockVehicle.sourceParameters),
        sourceEquipment: JSON.stringify(mockVehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(mockVehicle.sourcePhotos),
        features: JSON.stringify(mockVehicle.features),
        sellerInfo: JSON.stringify(mockVehicle.sellerInfo),
        photos: JSON.stringify(mockVehicle.photos),
        sourceCreatedAt: mockVehicle.sourceCreatedAt.toISOString(),
        scrapedAt: mockVehicle.scrapedAt.toISOString(),
        createdAt: mockVehicle.createdAt.toISOString(),
        updatedAt: mockVehicle.updatedAt.toISOString(),
        personalFitScore: 8,
        aiPriorityRating: 9,
        aiMechanicReport: 'Test report',
        aiDataSanityCheck: null,
      };

      mockExecute.mockResolvedValue([mockDbVehicle]);

      const results = await repository.findVehiclesWithoutAnalysis();

      expect(results).toHaveLength(1);
      expect(results[0].aiDataSanityCheck).toBeNull();
    });

    it('should not return vehicles with all AI fields populated', async () => {
      mockExecute.mockResolvedValue([]);

      const results = await repository.findVehiclesWithoutAnalysis();

      expect(results).toHaveLength(0);
    });

    it('should handle errors and throw descriptive error', async () => {
      mockExecute.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(repository.findVehiclesWithoutAnalysis()).rejects.toThrow(
        'Vehicle retrieval failed: Database error'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to find vehicles without analysis:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateVehicleAnalysis', () => {
    it('should update personalFitScore', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        personalFitScore: 8,
      });

      expect(mockDb.updateTable).toHaveBeenCalledWith('vehicles');
      expect(mockSet).toHaveBeenCalledWith({ personalFitScore: 8 });
      expect(mockWhere).toHaveBeenCalledWith('id', '=', 'test-vehicle-123');
    });

    it('should update aiPriorityRating and aiPrioritySummary', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        aiPriorityRating: 9,
        aiPrioritySummary: 'Excellent vehicle',
      });

      expect(mockSet).toHaveBeenCalledWith({
        aiPriorityRating: 9,
        aiPrioritySummary: 'Excellent vehicle',
      });
    });

    it('should update aiMechanicReport', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        aiMechanicReport: '# Mechanic Report\n\nTest content',
      });

      expect(mockSet).toHaveBeenCalledWith({
        aiMechanicReport: '# Mechanic Report\n\nTest content',
      });
    });

    it('should update aiDataSanityCheck', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        aiDataSanityCheck: 'Consistency Score: 8/10',
      });

      expect(mockSet).toHaveBeenCalledWith({
        aiDataSanityCheck: 'Consistency Score: 8/10',
      });
    });

    it('should update multiple fields at once', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        personalFitScore: 8,
        aiPriorityRating: 9,
        aiPrioritySummary: 'Great vehicle',
        aiMechanicReport: 'Report content',
        aiDataSanityCheck: 'Sanity check results',
      });

      expect(mockSet).toHaveBeenCalledWith({
        personalFitScore: 8,
        aiPriorityRating: 9,
        aiPrioritySummary: 'Great vehicle',
        aiMechanicReport: 'Report content',
        aiDataSanityCheck: 'Sanity check results',
      });
    });

    it('should handle partial updates', async () => {
      mockExecute.mockResolvedValue([{ id: 'test-vehicle-123' }]);

      await repository.updateVehicleAnalysis('test-vehicle-123', {
        personalFitScore: 7,
        aiMechanicReport: 'Updated report',
      });

      expect(mockSet).toHaveBeenCalledWith({
        personalFitScore: 7,
        aiMechanicReport: 'Updated report',
      });
      expect(mockSet).not.toHaveBeenCalledWith(
        expect.objectContaining({ aiPriorityRating: expect.anything() })
      );
    });

    it('should handle empty updates gracefully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await repository.updateVehicleAnalysis('test-vehicle-123', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⚠️ No analysis updates provided for vehicle:',
        'test-vehicle-123'
      );
      expect(mockDb.updateTable).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should throw error if vehicle not found', async () => {
      mockExecute.mockResolvedValue([]);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        repository.updateVehicleAnalysis('non-existent-id', { personalFitScore: 8 })
      ).rejects.toThrow('Vehicle with ID non-existent-id not found');

      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      mockExecute.mockRejectedValue(new Error('Database connection failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        repository.updateVehicleAnalysis('test-vehicle-123', { personalFitScore: 8 })
      ).rejects.toThrow('Vehicle analysis update failed: Database connection failed');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('findVehicleById', () => {
    it('should find vehicle by ID', async () => {
      const mockDbVehicle = {
        ...mockVehicle,
        sourceParameters: JSON.stringify(mockVehicle.sourceParameters),
        sourceEquipment: JSON.stringify(mockVehicle.sourceEquipment),
        sourcePhotos: JSON.stringify(mockVehicle.sourcePhotos),
        features: JSON.stringify(mockVehicle.features),
        sellerInfo: JSON.stringify(mockVehicle.sellerInfo),
        photos: JSON.stringify(mockVehicle.photos),
        sourceCreatedAt: mockVehicle.sourceCreatedAt.toISOString(),
        scrapedAt: mockVehicle.scrapedAt.toISOString(),
        createdAt: mockVehicle.createdAt.toISOString(),
        updatedAt: mockVehicle.updatedAt.toISOString(),
      };

      mockExecuteTakeFirst.mockResolvedValue(mockDbVehicle);

      const result = await repository.findVehicleById('test-vehicle-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-vehicle-123');
      expect(mockDb.selectFrom).toHaveBeenCalledWith('vehicles');
      expect(mockWhere).toHaveBeenCalledWith('id', '=', 'test-vehicle-123');
    });

    it('should return null if vehicle not found', async () => {
      mockExecuteTakeFirst.mockResolvedValue(null);

      const result = await repository.findVehicleById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockExecuteTakeFirst.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(repository.findVehicleById('test-vehicle-123')).rejects.toThrow(
        'Vehicle lookup failed: Database error'
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
