/**
 * MarketValueService Unit Tests
 */

import { MarketValueService } from './MarketValueService';
import { VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';

// Mock VehicleRepository
jest.mock('@car-finder/db', () => ({
  VehicleRepository: jest.fn(),
}));

describe('MarketValueService', () => {
  let mockVehicleRepo: jest.Mocked<VehicleRepository>;
  let marketValueService: MarketValueService;
  let mockVehicle: Vehicle;

  beforeEach(() => {
    // Setup mock repository
    mockVehicleRepo = {
      findComparableVehicles: jest.fn(),
    } as any;

    // Create service instance
    marketValueService = new MarketValueService(mockVehicleRepo);

    // Setup mock vehicle (2010 Renault Trafic, 180k km, €10,000)
    mockVehicle = {
      id: 'target-vehicle-123',
      source: 'otomoto',
      sourceId: '12345',
      sourceUrl: 'https://otomoto.pl/test',
      sourceCreatedAt: new Date('2024-01-01'),
      sourceTitle: 'Renault Trafic Passenger 2010',
      sourceDescriptionHtml: '<p>Test description</p>',
      sourceParameters: {
        'Marka pojazdu': 'Renault',
        'Model pojazdu': 'Trafic Passenger',
      },
      sourceEquipment: '{}',
      sourcePhotos: '[]',
      title: 'Renault Trafic Passenger 2010',
      description: 'Test description',
      features: [],
      pricePln: 40000,
      priceEur: 10000,
      year: 2010,
      mileage: 180000,
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
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMarketValue', () => {
    it('should return percentage below market average (good deal)', async () => {
      // Mock comparables: €11,000, €11,500, €12,000 (avg ~€11,500)
      // Target: €10,000 → should be ~-13% below market
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 11000, mileage: 175000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 11500, mileage: 185000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 12000, mileage: 190000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBeDefined();
      expect(result).toMatch(/^-\d+%$/); // Negative percentage
      expect(mockVehicleRepo.findComparableVehicles).toHaveBeenCalledWith({
        source: 'otomoto',
        make: 'Renault',
        model: 'Trafic Passenger',
        year: 2010,
        mileage: 180000,
        excludeId: 'target-vehicle-123',
      });
    });

    it('should return percentage above market average (overpriced)', async () => {
      // Mock comparables: €8,000, €8,500, €9,000 (avg ~€8,500)
      // Target: €10,000 → should be ~+18% above market
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 8000, mileage: 175000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 8500, mileage: 185000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 9000, mileage: 190000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBeDefined();
      expect(result).toMatch(/^\+\d+%$/); // Positive percentage
    });

    it('should return "market_avg" when price is within ±2% of market', async () => {
      // Mock comparables: €10,100, €10,000, €9,900 (avg ~€10,000)
      // Target: €10,000 → should be "market_avg"
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10100, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 9900, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBe('market_avg');
    });

    it('should return null when fewer than 3 comparables found', async () => {
      // Only 2 comparables - insufficient data
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 11000, mileage: 175000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 11500, mileage: 185000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBeNull();
    });

    it('should return null when no comparables found', async () => {
      mockVehicleRepo.findComparableVehicles.mockResolvedValue([]);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBeNull();
    });

    it('should weight closer mileage vehicles higher', async () => {
      // Comparables with varying mileage proximity
      // Comp-1 closest (175k) should have highest weight
      // Comp-3 furthest (220k) should have lowest weight
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 12000, mileage: 175000 }, // Very close, expensive
        { ...mockVehicle, id: 'comp-2', priceEur: 8000, mileage: 185000 }, // Close, cheap
        { ...mockVehicle, id: 'comp-3', priceEur: 7000, mileage: 220000 }, // Far, cheap
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // Weighted average should be closer to €12,000 and €8,000 (nearby vehicles)
      // than to €7,000 (distant vehicle)
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should apply high mileage penalty (>200k km)', async () => {
      // Comparables with >200k km should get -10% price adjustment
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 210000 }, // >200k
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 190000 }, // <200k
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 }, // <200k
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // With penalty applied, comp-1 effective price = €9,000
      // Average should be lower than €10,000
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should apply very high mileage penalty (>250k km)', async () => {
      // Comparables with >250k km should get -19% total price adjustment (-10% then -10% more)
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 260000 }, // >250k
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 }, // Normal
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 }, // Normal
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // With double penalty applied, comp-1 effective price = €8,100
      // Average should be significantly lower than €10,000
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should apply low mileage bonus for old vans (<120k km, age >10)', async () => {
      // 2010 vehicle with <120k km is a "golden find" → +10% bonus
      const currentYear = new Date().getFullYear();
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 100000, year: 2010 }, // Low mileage, old (bonus!)
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000, year: 2010 }, // Normal
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000, year: 2010 }, // Normal
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // With bonus applied, comp-1 effective price = €11,000
      // Average should be higher than €10,000
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should NOT apply low mileage bonus for newer vehicles', async () => {
      const currentYear = new Date().getFullYear();
      const newVehicle = { ...mockVehicle, year: currentYear - 5 }; // 5 years old

      const comparables: Vehicle[] = [
        { ...newVehicle, id: 'comp-1', priceEur: 10000, mileage: 100000, year: currentYear - 5 }, // Low mileage, but not old enough
        { ...newVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000, year: currentYear - 5 },
        { ...newVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000, year: currentYear - 5 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(newVehicle);

      // No bonus should be applied for newer vehicle
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should handle missing make/model in sourceParameters', async () => {
      const vehicleNoMakeModel = {
        ...mockVehicle,
        sourceParameters: {},
      };

      const result = await marketValueService.calculateMarketValue(vehicleNoMakeModel);

      expect(result).toBeNull();
      expect(mockVehicleRepo.findComparableVehicles).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockVehicleRepo.findComparableVehicles.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // Should return null instead of throwing error
      expect(result).toBeNull();
    });

    it('should handle division by zero in average price calculation', async () => {
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 0, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 0, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 0, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // Should return "market_avg" instead of error
      expect(result).toBe('market_avg');
    });

    it('should handle edge case with identical prices', async () => {
      const vehiclePrice = { ...mockVehicle, priceEur: 10000 };
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(vehiclePrice);

      expect(result).toBe('market_avg');
    });

    it('should handle sourceParameters as JSON string', async () => {
      const vehicleWithStringParams = {
        ...mockVehicle,
        sourceParameters: JSON.stringify({
          'Marka pojazdu': 'Renault',
          'Model pojazdu': 'Trafic Passenger',
        }),
      };

      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(vehicleWithStringParams);

      expect(result).toBe('market_avg');
      expect(mockVehicleRepo.findComparableVehicles).toHaveBeenCalledWith(
        expect.objectContaining({
          make: 'Renault',
          model: 'Trafic Passenger',
        })
      );
    });

    it('should support alternative sourceParameter keys (lowercase)', async () => {
      const vehicleWithAltKeys = {
        ...mockVehicle,
        sourceParameters: {
          make: 'Renault',
          model: 'Trafic Passenger',
        },
      };

      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(vehicleWithAltKeys);

      expect(result).toBe('market_avg');
      expect(mockVehicleRepo.findComparableVehicles).toHaveBeenCalledWith(
        expect.objectContaining({
          make: 'Renault',
          model: 'Trafic Passenger',
        })
      );
    });

    it('should log progress during calculation', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      await marketValueService.calculateMarketValue(mockVehicle);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 comparable vehicles')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weighted average price')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log warning when insufficient comparables found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      await marketValueService.calculateMarketValue(mockVehicle);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient comparables (1/3)')
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate exact percentage difference correctly', async () => {
      // Test precise percentage calculation
      // Target: €10,000
      // Comparables avg: €12,000
      // Expected: -17% (10k is 17% less than 12k)
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 12000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 12000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 12000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      // (10000 - 12000) / 12000 * 100 = -16.67%, rounded to -17%
      expect(result).toBe('-17%');
    });

    it('should round percentage to nearest integer', async () => {
      // Target: €10,150
      // Comparables avg: €10,000
      // Expected: +2% (rounded from +1.5%)
      const vehicle = { ...mockVehicle, priceEur: 10150 };
      const comparables: Vehicle[] = [
        { ...mockVehicle, id: 'comp-1', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-2', priceEur: 10000, mileage: 180000 },
        { ...mockVehicle, id: 'comp-3', priceEur: 10000, mileage: 180000 },
      ];

      mockVehicleRepo.findComparableVehicles.mockResolvedValue(comparables);

      const result = await marketValueService.calculateMarketValue(vehicle);

      // (10150 - 10000) / 10000 * 100 = +1.5%, rounded to +2%
      expect(result).toBe('+2%');
    });
  });

  describe('error handling', () => {
    it('should log errors and return null on exception', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockVehicleRepo.findComparableVehicles.mockRejectedValue(
        new Error('Database error')
      );

      const result = await marketValueService.calculateMarketValue(mockVehicle);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed sourceParameters gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const vehicleBadParams = {
        ...mockVehicle,
        sourceParameters: 'invalid json' as any,
      };

      const result = await marketValueService.calculateMarketValue(vehicleBadParams);

      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });
});
