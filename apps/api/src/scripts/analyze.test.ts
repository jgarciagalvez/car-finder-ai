/**
 * Vehicle Analyzer Integration Tests
 */

import { VehicleAnalyzer, parseArgs } from './analyze';
import { AIService } from '../services/AIService';
import { VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';

// Mock dependencies
jest.mock('../services/AIService');
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
  })),
}));

describe('VehicleAnalyzer', () => {
  let mockAIService: jest.Mocked<AIService>;
  let mockRepository: jest.Mocked<VehicleRepository>;
  let mockVehicle: Vehicle;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mock vehicle
    mockVehicle = {
      id: 'test-vehicle-123',
      source: 'otomoto',
      sourceId: '12345',
      sourceUrl: 'https://otomoto.pl/test',
      sourceCreatedAt: new Date('2024-01-01'),
      sourceTitle: 'Test Vehicle',
      sourceDescriptionHtml: '<p>Test description</p>',
      sourceParameters: JSON.stringify({
        'Marka pojazdu': 'Toyota',
        'Model pojazdu': 'Corolla',
        equipment: ['Klimatyzacja', 'ABS'],
      }),
      sourceEquipment: '{}',
      sourcePhotos: '[]',
      title: 'Test Vehicle',
      description: null, // Needs translation
      features: [], // Needs translation
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
      personalFitScore: null, // Needs analysis
      marketValueScore: null,
      aiPriorityRating: null, // Needs analysis
      aiPrioritySummary: null, // Needs analysis
      aiMechanicReport: null, // Needs analysis
      aiDataSanityCheck: null, // Needs analysis
      status: 'new',
      personalNotes: null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Setup mocks
    mockAIService = {
      translateVehicleContent: jest.fn().mockResolvedValue({
        description: 'Translated description',
        features: ['Air Conditioning', 'ABS'],
      }),
      generatePersonalFitScore: jest.fn().mockResolvedValue(8),
      generatePriorityRating: jest.fn().mockResolvedValue({
        rating: 9,
        summary: 'Excellent vehicle',
      }),
      generateMechanicReport: jest.fn().mockResolvedValue('# Mechanic Report\n\nTest content'),
      generateDataSanityCheck: jest.fn().mockResolvedValue('Consistency Score: 8/10'),
    } as any;

    mockRepository = {
      findVehiclesWithoutAnalysis: jest.fn().mockResolvedValue([mockVehicle]),
      findVehicleById: jest.fn().mockResolvedValue(mockVehicle),
      updateVehicleAnalysis: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);
    (VehicleRepository as jest.MockedClass<typeof VehicleRepository>).mockImplementation(() => mockRepository);

    // Suppress console output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('run', () => {
    it('should analyze vehicles without AI data', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      expect(mockRepository.findVehiclesWithoutAnalysis).toHaveBeenCalled();
      expect(mockAIService.translateVehicleContent).toHaveBeenCalledWith(mockVehicle);
      expect(mockAIService.generateDataSanityCheck).toHaveBeenCalledWith(mockVehicle);
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
      expect(mockAIService.generateMechanicReport).toHaveBeenCalledWith(mockVehicle);
      expect(mockAIService.generatePriorityRating).toHaveBeenCalled();
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'test-vehicle-123',
        expect.objectContaining({
          description: 'Translated description',
          features: ['Air Conditioning', 'ABS'],
          personalFitScore: 8,
          aiPriorityRating: 9,
          aiPrioritySummary: 'Excellent vehicle',
          aiMechanicReport: '# Mechanic Report\n\nTest content',
          aiDataSanityCheck: 'Consistency Score: 8/10',
        })
      );
    });

    it('should run translation FIRST before other analyses', async () => {
      const callOrder: string[] = [];

      mockAIService.translateVehicleContent.mockImplementation(async () => {
        callOrder.push('translate');
        return { description: 'Translated', features: [] };
      });

      mockAIService.generateDataSanityCheck.mockImplementation(async () => {
        callOrder.push('sanity');
        return 'Sanity check';
      });

      mockAIService.generatePersonalFitScore.mockImplementation(async () => {
        callOrder.push('fit');
        return 8;
      });

      mockAIService.generateMechanicReport.mockImplementation(async () => {
        callOrder.push('mechanic');
        return 'Report';
      });

      mockAIService.generatePriorityRating.mockImplementation(async () => {
        callOrder.push('priority');
        return { rating: 9, summary: 'Summary' };
      });

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      expect(callOrder).toEqual(['translate', 'sanity', 'fit', 'mechanic', 'priority']);
    });

    it('should analyze specific vehicle by ID', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ vehicleId: 'test-vehicle-123' });

      expect(mockRepository.findVehicleById).toHaveBeenCalledWith('test-vehicle-123');
      expect(mockRepository.findVehiclesWithoutAnalysis).not.toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
    });

    it('should respect limit option', async () => {
      const vehicles = [mockVehicle, { ...mockVehicle, id: 'vehicle-2' }, { ...mockVehicle, id: 'vehicle-3' }];
      mockRepository.findVehiclesWithoutAnalysis.mockResolvedValue(vehicles as Vehicle[]);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ limit: 2 });

      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalledTimes(2);
    });

    it('should skip mechanic report when flag is set', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ skipMechanicReport: true });

      expect(mockAIService.generateMechanicReport).not.toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
    });

    it('should skip sanity check when flag is set', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ skipSanityCheck: true });

      expect(mockAIService.generateDataSanityCheck).not.toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
    });

    it('should skip priority rating when flag is set', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ skipPriorityRating: true });

      expect(mockAIService.generatePriorityRating).not.toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
    });

    it('should continue processing after individual failure', async () => {
      const vehicle2 = { ...mockVehicle, id: 'vehicle-2' };
      mockRepository.findVehiclesWithoutAnalysis.mockResolvedValue([mockVehicle, vehicle2] as Vehicle[]);

      // First vehicle fails
      mockAIService.generatePersonalFitScore
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(7);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Should still process second vehicle
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledTimes(2);
    });

    it('should handle translation failures gracefully', async () => {
      mockAIService.translateVehicleContent.mockRejectedValue(new Error('Translation failed'));

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Should continue with other analyses despite translation failure
      expect(mockAIService.generateDataSanityCheck).toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).toHaveBeenCalled();
    });

    it('should handle empty vehicle list', async () => {
      mockRepository.findVehiclesWithoutAnalysis.mockResolvedValue([]);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      expect(mockAIService.generatePersonalFitScore).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ No vehicles need analysis. All done!');
    });

    it('should skip vehicles that already have complete analysis', async () => {
      const analyzedVehicle = {
        ...mockVehicle,
        description: 'Already translated',
        features: ['Feature 1'],
        personalFitScore: 8,
        aiPriorityRating: 9,
        aiPrioritySummary: 'Summary',
        aiMechanicReport: 'Report',
        aiDataSanityCheck: 'Check',
      };

      mockRepository.findVehicleById.mockResolvedValue(analyzedVehicle as Vehicle);

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run({ vehicleId: 'test-vehicle-123' });

      // Should not call any AI services since vehicle is already analyzed
      expect(mockAIService.translateVehicleContent).not.toHaveBeenCalled();
      expect(mockAIService.generatePersonalFitScore).not.toHaveBeenCalled();
    });

    it('should throw error if specific vehicle not found', async () => {
      mockRepository.findVehicleById.mockResolvedValue(null);

      const analyzer = await VehicleAnalyzer.create();

      await expect(analyzer.run({ vehicleId: 'non-existent-id' })).rejects.toThrow(
        'Vehicle with ID non-existent-id not found in database'
      );
    });

    it('should save analysis results to database', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'test-vehicle-123',
        expect.objectContaining({
          description: 'Translated description',
          features: ['Air Conditioning', 'ABS'],
          personalFitScore: 8,
          aiPriorityRating: 9,
          aiPrioritySummary: 'Excellent vehicle',
          aiMechanicReport: expect.any(String),
          aiDataSanityCheck: expect.any(String),
        })
      );
    });

    it('should update vehicle with new analysis before priority rating', async () => {
      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Priority rating should be called with updated vehicle including personalFitScore
      expect(mockAIService.generatePriorityRating).toHaveBeenCalledWith(
        expect.objectContaining({
          personalFitScore: 8,
          aiDataSanityCheck: 'Consistency Score: 8/10',
        })
      );
    });
  });

  describe('parseArgs', () => {
    it('should parse vehicle-id argument', () => {
      process.argv = ['node', 'analyze.js', '--vehicle-id', 'test-123'];
      const options = parseArgs();
      expect(options.vehicleId).toBe('test-123');
    });

    it('should parse limit argument', () => {
      process.argv = ['node', 'analyze.js', '--limit', '10'];
      const options = parseArgs();
      expect(options.limit).toBe(10);
    });

    it('should parse skip flags', () => {
      process.argv = [
        'node',
        'analyze.js',
        '--skip-mechanic-report',
        '--skip-sanity-check',
        '--skip-priority-rating',
      ];
      const options = parseArgs();
      expect(options.skipMechanicReport).toBe(true);
      expect(options.skipSanityCheck).toBe(true);
      expect(options.skipPriorityRating).toBe(true);
    });

    it('should parse multiple arguments', () => {
      process.argv = ['node', 'analyze.js', '--vehicle-id', 'abc-123', '--skip-mechanic-report'];
      const options = parseArgs();
      expect(options.vehicleId).toBe('abc-123');
      expect(options.skipMechanicReport).toBe(true);
    });

    it('should return empty options for no arguments', () => {
      process.argv = ['node', 'analyze.js'];
      const options = parseArgs();
      expect(options).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should log errors and continue processing', async () => {
      mockAIService.generateMechanicReport.mockRejectedValue(new Error('Mechanic report failed'));

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Should still save other analyses
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'test-vehicle-123',
        expect.objectContaining({
          description: 'Translated description',
          personalFitScore: 8,
        })
      );

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate mechanic report'),
        expect.any(Error)
      );
    });

    it('should handle database update failures', async () => {
      mockRepository.updateVehicleAnalysis.mockRejectedValue(new Error('Database error'));

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Should log error and mark as failed
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze test-vehicle-123: Database error')
      );
    });

    it('should provide fallback fit score on error', async () => {
      mockAIService.generatePersonalFitScore.mockRejectedValue(new Error('API Error'));

      const analyzer = await VehicleAnalyzer.create();
      await analyzer.run();

      // Should save with fallback score of 5
      expect(mockRepository.updateVehicleAnalysis).toHaveBeenCalledWith(
        'test-vehicle-123',
        expect.objectContaining({
          personalFitScore: 5,
        })
      );
    });
  });
});