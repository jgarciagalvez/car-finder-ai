/**
 * Integration tests for concurrent processing in VehicleAnalyzer
 */

import { VehicleAnalyzer } from '../analyze';
import { AIService } from '../../services/AIService';
import { MarketValueService } from '../../services/MarketValueService';
import { VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';

// Mock p-limit
jest.mock('p-limit', () => {
  return jest.fn(() => {
    return jest.fn((fn: any) => fn());
  });
});

// Mock dependencies
jest.mock('../../services/AIService');
jest.mock('../../services/MarketValueService');
jest.mock('@car-finder/db', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getDatabase: jest.fn().mockReturnValue({}),
  })),
  VehicleRepository: jest.fn(),
}));

jest.mock('@car-finder/services', () => ({
  WorkspaceUtils: {
    findWorkspaceRoot: jest.fn().mockReturnValue('/mock/workspace'),
    loadEnvFromRoot: jest.fn(),
    resolveConfigFile: jest.fn((filename: string) => `/mock/workspace/${filename}`),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    analysisSettings: {
      userCriteria: {
        budgetEur: { min: 10000, max: 15000 },
        preferredFeatures: ['air_conditioning'],
        useCase: 'daily commute',
        priorityFactors: ['fuel_efficiency'],
      },
    },
    marketValueSettings: {
      enabled: true,
      equivalentModels: {},
    },
  })),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

describe('VehicleAnalyzer - Concurrent Processing Integration', () => {
  let mockAIService: jest.Mocked<AIService>;
  let mockMarketValueService: jest.Mocked<MarketValueService>;
  let mockRepository: jest.Mocked<VehicleRepository>;
  let consoleLogSpy: jest.SpyInstance;

  const createMockVehicle = (id: string): Vehicle => ({
    id,
    source: 'otomoto',
    sourceId: `source-${id}`,
    sourceUrl: `https://example.com/${id}`,
    sourceCreatedAt: new Date(),
    sourceTitle: `Test Vehicle ${id}`,
    sourceDescriptionHtml: '<p>Test</p>',
    sourceParameters: {},
    sourceEquipment: {},
    sourcePhotos: [],
    title: `Test Vehicle ${id}`,
    description: `Translated description for ${id}`,
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
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock console to suppress output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Setup AI service mocks
    mockAIService = {
      generateDataSanityCheck: jest.fn().mockResolvedValue('Sanity check complete'),
      generatePersonalFitScore: jest.fn().mockResolvedValue(8),
      generateMechanicSummary: jest.fn().mockResolvedValue('- Concise mechanic summary\n- Second point'),
      generateMechanicReport: jest.fn().mockResolvedValue('Mechanic report'),
      generatePriorityRating: jest.fn().mockResolvedValue({ rating: 9, summary: 'Priority summary' }),
    } as any;

    (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

    // Setup MarketValueService mocks
    mockMarketValueService = {
      calculateMarketValue: jest.fn().mockResolvedValue('good-deal'),
    } as any;

    (MarketValueService as jest.MockedClass<typeof MarketValueService>).mockImplementation(
      () => mockMarketValueService
    );

    // Setup repository mocks
    mockRepository = {
      findVehiclesNeedingAnalysis: jest.fn(),
      findVehicleById: jest.fn(),
      updateVehicleAnalysis: jest.fn().mockResolvedValue(undefined),
    } as any;

    (VehicleRepository as jest.MockedClass<typeof VehicleRepository>).mockImplementation(
      () => mockRepository
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Concurrent Processing Behavior', () => {
    it('should process multiple vehicles concurrently with concurrency=3', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
        createMockVehicle('vehicle3'),
        createMockVehicle('vehicle4'),
        createMockVehicle('vehicle5'),
        createMockVehicle('vehicle6'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Verify all vehicles were processed
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledTimes(6);

      // Verify batch logging occurred
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting concurrent analysis with concurrency=3')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 1/2')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 2/2')
      );
    });

    it('should process vehicles sequentially with concurrency=1 (backward compatibility)', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
        createMockVehicle('vehicle3'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 1 });

      // Verify all vehicles were processed
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledTimes(3);

      // Verify sequential batch processing (3 batches of 1 vehicle each)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('concurrency=1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 1/3')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 2/3')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 3/3')
      );
    });

    it('should default to concurrency=3 when not specified', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
        createMockVehicle('vehicle3'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({}); // No concurrency specified

      // Verify default concurrency=3 was used
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('concurrency=3')
      );
    });
  });

  describe('Error Handling in Concurrent Execution', () => {
    it('should continue processing other vehicles when one fails in a batch', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'), // This will fail
        createMockVehicle('vehicle3'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      // Make vehicle2 fail on sanity check
      mockAIService.generateDataSanityCheck.mockImplementation((vehicle: Vehicle) => {
        if (vehicle.id === 'vehicle2') {
          return Promise.reject(new Error('API Error for vehicle2'));
        }
        return Promise.resolve('Sanity check complete');
      });

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Verify vehicle1 and vehicle3 were processed successfully
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'vehicle1',
        expect.any(Object)
      );
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'vehicle3',
        expect.any(Object)
      );

      // Verify vehicle2 was NOT updated (it failed)
      expect(mockRepository.updateVehicleAnalysis).not.toHaveBeenCalledWith(
        'vehicle2',
        expect.any(Object)
      );

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('vehicle2')
      );
    });

    it('should handle multiple failures in same batch gracefully', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'), // Will fail
        createMockVehicle('vehicle2'), // Will fail
        createMockVehicle('vehicle3'), // Will succeed
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      // Make vehicle1 and vehicle2 fail
      mockAIService.generateDataSanityCheck.mockImplementation((vehicle: Vehicle) => {
        if (vehicle.id === 'vehicle1' || vehicle.id === 'vehicle2') {
          return Promise.reject(new Error(`API Error for ${vehicle.id}`));
        }
        return Promise.resolve('Sanity check complete');
      });

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Only vehicle3 should be updated
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'vehicle3',
        expect.any(Object)
      );

      // Verify both errors were logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('vehicle1')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('vehicle2')
      );
    });
  });

  describe('Batch Processing and Rate Limiting', () => {
    it('should calculate correct number of batches', async () => {
      const vehicles = Array.from({ length: 10 }, (_, i) => createMockVehicle(`vehicle${i + 1}`));

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // 10 vehicles / 3 per batch = 4 batches (3+3+3+1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 1/4')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 4/4')
      );
    });

    it('should show correct vehicle ranges in batch logs', async () => {
      const vehicles = Array.from({ length: 7 }, (_, i) => createMockVehicle(`vehicle${i + 1}`));

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Batch 1: vehicles 1-3
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing vehicles 1-3 of 7')
      );

      // Batch 2: vehicles 4-6
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing vehicles 4-6 of 7')
      );

      // Batch 3: vehicle 7 only
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing vehicles 7-7 of 7')
      );
    });

    it('should show rate limit delay between batches', async () => {
      const vehicles = Array.from({ length: 6 }, (_, i) => createMockVehicle(`vehicle${i + 1}`));

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Should show delay message between batches (2 batches = 1 delay)
      const delayLogs = consoleLogSpy.mock.calls.filter(call =>
        call[0]?.includes('Waiting 4 seconds')
      );

      expect(delayLogs.length).toBe(1); // Only 1 delay between 2 batches
    });

    it('should NOT show delay after last batch', async () => {
      const vehicles = Array.from({ length: 3 }, (_, i) => createMockVehicle(`vehicle${i + 1}`));

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // With 3 vehicles and concurrency=3, there's only 1 batch
      // Should NOT show delay message
      const delayLogs = consoleLogSpy.mock.calls.filter(call =>
        call[0]?.includes('Waiting 4 seconds')
      );

      expect(delayLogs.length).toBe(0); // No delays for single batch
    });
  });

  describe('Summary Report with Concurrency Metrics', () => {
    it('should include concurrency level in summary', async () => {
      const vehicles = [createMockVehicle('vehicle1')];
      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 4 });

      // Verify summary includes concurrency
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Concurrency:       4 vehicles/batch')
      );
    });

    it('should calculate and display throughput', async () => {
      const vehicles = [createMockVehicle('vehicle1')];
      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Verify summary includes throughput
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Throughput:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('vehicles/hour')
      );
    });

    it('should display API call metrics', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
      ];
      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // 2 vehicles × 4 API calls = 8 total calls
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Calls:       8 total')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('RPM average')
      );
    });
  });

  describe('Progress Logging', () => {
    it('should show individual vehicle completion within batch', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
        createMockVehicle('vehicle3'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Check for individual completion logs (truncated IDs)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('complete [1/3]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('complete [2/3]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('complete [3/3]')
      );
    });

    it('should show batch completion summary with counts', async () => {
      const vehicles = [
        createMockVehicle('vehicle1'),
        createMockVehicle('vehicle2'),
        createMockVehicle('vehicle3'),
      ];

      mockRepository.findVehiclesNeedingAnalysis.mockResolvedValue(vehicles);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ concurrency: 3 });

      // Check for batch completion summary
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch 1 complete. [Completed: 3/3 vehicles, Failed: 0]')
      );
    });
  });
});
