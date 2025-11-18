/**
 * Unit tests for analyze.ts
 */

import { getRequiredAnalysisSteps, shouldCheckExistence, checkVehicleExistence } from '../analyze';
import { Vehicle } from '@car-finder/types';
import { VehicleRepository } from '@car-finder/db';

// Mock p-limit before importing analyze.ts
jest.mock('p-limit', () => {
  return jest.fn(() => {
    return jest.fn((fn: any) => fn());
  });
});

// Mock dependencies
jest.mock('@car-finder/services', () => ({
  WorkspaceUtils: {
    loadEnvFromRoot: jest.fn(),
    findWorkspaceRoot: jest.fn(() => '/mock/workspace/root'),
  },
}));

describe('analyze.ts', () => {
  describe('getRequiredAnalysisSteps', () => {
    const createMockVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
      id: 'test-id',
      source: 'otomoto',
      sourceId: 'source-123',
      sourceUrl: 'https://example.com',
      sourceCreatedAt: new Date(),
      sourceTitle: 'Test Vehicle',
      sourceDescriptionHtml: '<p>Test</p>',
      sourceParameters: {},
      sourceEquipment: {},
      sourcePhotos: [],
      title: 'Test Vehicle',
      description: 'Translated description',
      features: ['ABS', 'ESP'],
      pricePln: 50000,
      priceEur: 11500,
      year: 2015,
      mileage: 150000,
      sellerInfo: { name: 'Test Seller', id: 'seller-123', type: 'private', location: 'Warsaw', memberSince: '2020' },
      photos: [],
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      virtualMechanicSummary: null,
      aiDataSanityCheck: null,
      distanceFromWroclaw: null,
      status: 'new',
      personalNotes: null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should not include translate step (translation handled separately)', () => {
      const vehicle = createMockVehicle({ description: null });
      const steps = getRequiredAnalysisSteps(vehicle, false);

      expect(steps).not.toContain('translate');
    });

    it('should return all steps for vehicle with no analysis data', () => {
      const vehicle = createMockVehicle();
      const steps = getRequiredAnalysisSteps(vehicle, false);

      expect(steps).toContain('sanity_check');
      expect(steps).toContain('fit_score');
      expect(steps).toContain('mechanic_report');
      expect(steps).toContain('market_value');
      expect(steps).toContain('priority_rating');
    });

    it('should return empty array for vehicle with complete analysis', () => {
      const vehicle = createMockVehicle({
        aiDataSanityCheck: 'Complete',
        personalFitScore: 8,
        virtualMechanicSummary: '- Concise summary',
        marketValueScore: 'good-deal',
        aiPriorityRating: 9,
      });

      const steps = getRequiredAnalysisSteps(vehicle, false);

      expect(steps).toEqual([]);
    });

    it('should only return missing steps for partially analyzed vehicle', () => {
      const vehicle = createMockVehicle({
        aiDataSanityCheck: 'Complete',
        personalFitScore: 8,
        // mechanic_report, market_value, and priority_rating are missing
      });

      const steps = getRequiredAnalysisSteps(vehicle, false);

      expect(steps).toContain('mechanic_report');
      expect(steps).toContain('market_value');
      expect(steps).toContain('priority_rating');
      expect(steps).not.toContain('sanity_check');
      expect(steps).not.toContain('fit_score');
    });

    it('should return all steps when force=true regardless of existing data', () => {
      const vehicle = createMockVehicle({
        aiDataSanityCheck: 'Complete',
        personalFitScore: 8,
        virtualMechanicSummary: '- Concise summary',
        marketValueScore: 'good-deal',
        aiPriorityRating: 9,
      });

      const steps = getRequiredAnalysisSteps(vehicle, true);

      expect(steps).toEqual([
        'sanity_check',
        'fit_score',
        'mechanic_report',
        'market_value',
        'priority_rating'
      ]);
    });

    it('should correctly identify missing personalFitScore when it is 0', () => {
      const vehicle = createMockVehicle({
        personalFitScore: 0, // Valid score but falsy
        aiDataSanityCheck: 'Complete',
        aiMechanicReport: 'Report complete',
        marketValueScore: 'good-deal',
        aiPriorityRating: 9,
      });

      const steps = getRequiredAnalysisSteps(vehicle, false);

      // Should not include fit_score because 0 is a valid score
      expect(steps).not.toContain('fit_score');
    });

    it('should include fit_score when personalFitScore is null', () => {
      const vehicle = createMockVehicle({
        personalFitScore: null,
        aiDataSanityCheck: 'Complete',
      });

      const steps = getRequiredAnalysisSteps(vehicle, false);

      expect(steps).toContain('fit_score');
    });
  });

  describe('shouldCheckExistence', () => {
    const createMockVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
      id: 'test-id',
      source: 'otomoto',
      sourceId: 'source-123',
      sourceUrl: 'https://example.com',
      sourceCreatedAt: new Date(),
      sourceTitle: 'Test Vehicle',
      sourceDescriptionHtml: '<p>Test</p>',
      sourceParameters: {},
      sourceEquipment: {},
      sourcePhotos: [],
      title: 'Test Vehicle',
      description: 'Translated description',
      features: ['ABS', 'ESP'],
      pricePln: 50000,
      priceEur: 11500,
      year: 2015,
      mileage: 150000,
      sellerInfo: { name: 'Test Seller', id: 'seller-123', type: 'private', location: 'Warsaw', memberSince: '2020' },
      photos: [],
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      virtualMechanicSummary: null,
      aiDataSanityCheck: null,
      distanceFromWroclaw: null,
      status: 'new',
      personalNotes: null,
      isRemovedFromSource: false,
      lastExistenceCheck: null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should return true when lastExistenceCheck is null', () => {
      const vehicle = createMockVehicle({
        lastExistenceCheck: null,
        scrapedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      });

      expect(shouldCheckExistence(vehicle)).toBe(true);
    });

    it('should return true when lastExistenceCheck is more than 4 hours old', () => {
      const vehicle = createMockVehicle({
        lastExistenceCheck: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        scrapedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      });

      expect(shouldCheckExistence(vehicle)).toBe(true);
    });

    it('should return false when lastExistenceCheck is less than 4 hours old', () => {
      const vehicle = createMockVehicle({
        lastExistenceCheck: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        scrapedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      });

      expect(shouldCheckExistence(vehicle)).toBe(false);
    });

    it('should return false when vehicle was scraped less than 4 hours ago (fresh data)', () => {
      const vehicle = createMockVehicle({
        lastExistenceCheck: null,
        scrapedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });

      expect(shouldCheckExistence(vehicle)).toBe(false);
    });

    it('should return false when scraped recently, regardless of lastExistenceCheck', () => {
      const vehicle = createMockVehicle({
        lastExistenceCheck: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago (old)
        scrapedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago (fresh)
      });

      expect(shouldCheckExistence(vehicle)).toBe(false);
    });
  });

  describe('checkVehicleExistence', () => {
    const createMockVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
      id: 'test-id',
      source: 'otomoto',
      sourceId: 'source-123',
      sourceUrl: 'https://otomoto.pl/test-vehicle',
      sourceCreatedAt: new Date(),
      sourceTitle: 'Test Vehicle',
      sourceDescriptionHtml: '<p>Test</p>',
      sourceParameters: {},
      sourceEquipment: {},
      sourcePhotos: [],
      title: 'Test Vehicle',
      description: 'Translated description',
      features: ['ABS', 'ESP'],
      pricePln: 50000,
      priceEur: 11500,
      year: 2015,
      mileage: 150000,
      sellerInfo: { name: 'Test Seller', id: 'seller-123', type: 'private', location: 'Warsaw', memberSince: '2020' },
      photos: [],
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      virtualMechanicSummary: null,
      aiDataSanityCheck: null,
      distanceFromWroclaw: null,
      status: 'new',
      personalNotes: null,
      isRemovedFromSource: false,
      lastExistenceCheck: null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    let mockUpdateVehicle: jest.Mock;
    let mockVehicleRepository: VehicleRepository;

    beforeEach(() => {
      mockUpdateVehicle = jest.fn();
      mockVehicleRepository = {
        updateVehicle: mockUpdateVehicle,
      } as unknown as VehicleRepository;

      // Mock global fetch
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true and update DB when vehicle exists (200)', async () => {
      const vehicle = createMockVehicle();
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        vehicle.sourceUrl,
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'follow',
        })
      );
      expect(mockUpdateVehicle).toHaveBeenCalledWith(
        vehicle.id,
        expect.objectContaining({
          isRemovedFromSource: false,
          lastExistenceCheck: expect.any(String),
        })
      );
    });

    it('should return false and update DB when vehicle is removed (404)', async () => {
      const vehicle = createMockVehicle();
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 404,
      });

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(false);
      expect(mockUpdateVehicle).toHaveBeenCalledWith(
        vehicle.id,
        expect.objectContaining({
          isRemovedFromSource: true,
          lastExistenceCheck: expect.any(String),
        })
      );
    });

    it('should return false and update DB when vehicle is removed (410)', async () => {
      const vehicle = createMockVehicle();
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 410,
      });

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(false);
      expect(mockUpdateVehicle).toHaveBeenCalledWith(
        vehicle.id,
        expect.objectContaining({
          isRemovedFromSource: true,
        })
      );
    });

    it('should return true (fail-open) on network error without updating DB', async () => {
      const vehicle = createMockVehicle();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Existence check failed (network error)')
      );
      expect(mockUpdateVehicle).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return true (fail-open) on timeout without updating DB', async () => {
      const vehicle = createMockVehicle();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock AbortController timeout
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockUpdateVehicle).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle 500 error as exists (not removed)', async () => {
      const vehicle = createMockVehicle();
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 500,
      });

      const result = await checkVehicleExistence(vehicle, mockVehicleRepository);

      expect(result).toBe(true);
      expect(mockUpdateVehicle).toHaveBeenCalledWith(
        vehicle.id,
        expect.objectContaining({
          isRemovedFromSource: false,
        })
      );
    });
  });
});
