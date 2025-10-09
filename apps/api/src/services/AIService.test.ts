/**
 * AIService Unit Tests
 */

import { AIService, UserCriteria } from './AIService';
import { IAIProvider } from '@car-finder/ai';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import { PromptLoader } from '@car-finder/ai';
import { Vehicle } from '@car-finder/types';

// Mock dependencies
jest.mock('@car-finder/ai', () => {
  const actual = jest.requireActual('@car-finder/ai');
  return {
    ...actual,
    AIProviderFactory: {
      createProvider: jest.fn(),
    },
    PromptLoader: {
      loadPrompt: jest.fn(),
      buildPrompt: jest.fn(),
    },
  };
});

describe('AIService', () => {
  let mockProvider: jest.Mocked<IAIProvider>;
  let aiService: AIService;
  let mockVehicle: Vehicle;
  let mockCriteria: UserCriteria;

  beforeEach(() => {
    // Setup mock provider
    mockProvider = {
      generateText: jest.fn(),
      chat: jest.fn(),
      generateStructured: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('mock'),
      getModelInfo: jest.fn().mockReturnValue({ name: 'mock-model', version: '1.0' }),
    } as any;

    // Mock AIProviderFactory to return our mock provider
    const { AIProviderFactory } = require('@car-finder/ai');
    AIProviderFactory.createFromEnvironment.mockReturnValue(mockProvider);

    // Setup default mock responses for PromptLoader
    (PromptLoader.loadPrompt as jest.Mock).mockResolvedValue({
      name: 'test-prompt',
      role: 'Test role',
      task: 'Test task',
      instructions: ['Test instruction'],
      inputSchema: {},
      outputFormat: {},
      raw: '',
    });

    (PromptLoader.buildPrompt as jest.Mock).mockReturnValue('Built prompt text');

    // Create AIService instance
    aiService = new AIService();

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
        'Rodzaj paliwa': 'Gasoline',
        'Skrzynia biegów': 'Automatic',
        'Moc': '132',
        'Pojemność skokowa': '1800',
      }),
      sourceEquipment: '{}',
      sourcePhotos: '[]',
      title: 'Test Vehicle',
      description: 'Test description',
      features: [],
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
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Setup mock user criteria
    mockCriteria = {
      budgetEur: { min: 10000, max: 15000 },
      preferredFeatures: ['air_conditioning', 'parking_sensors'],
      useCase: 'daily commute',
      priorityFactors: ['fuel_efficiency', 'reliability'],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use factory to create provider from environment', () => {
      const { AIProviderFactory } = require('@car-finder/ai');

      expect(AIProviderFactory.createFromEnvironment).toHaveBeenCalled();
    });
  });

  describe('generatePersonalFitScore', () => {
    it('should generate valid fit score', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        score: 8,
        reasoning: 'Good match',
        strengths: ['Within budget'],
        concerns: [],
        dealBreakers: [],
      });

      const score = await aiService.generatePersonalFitScore(mockVehicle, mockCriteria);

      expect(score).toBe(8);
      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('personal-fit-score');
      expect(mockProvider.generateStructured).toHaveBeenCalled();
    });

    it('should extract vehicle data correctly', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        score: 7,
        reasoning: 'Test',
        strengths: [],
        concerns: [],
        dealBreakers: [],
      });

      await aiService.generatePersonalFitScore(mockVehicle, mockCriteria);

      const buildPromptCall = (PromptLoader.buildPrompt as jest.Mock).mock.calls[0];
      const variables = buildPromptCall[1];

      expect(variables.vehicle).toBeDefined();
      expect(variables.vehicle.make).toBe('Toyota');
      expect(variables.vehicle.model).toBe('Corolla');
      expect(variables.vehicle.fuelType).toBe('Gasoline');
      expect(variables.vehicle.transmissionType).toBe('Automatic');
      expect(variables.criteria).toEqual(mockCriteria);
    });

    it('should throw ValidationError for invalid score', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        score: 15, // Invalid: > 10
        reasoning: 'Test',
        strengths: [],
        concerns: [],
        dealBreakers: [],
      });

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle AIError from provider', async () => {
      mockProvider.generateStructured.mockRejectedValue(new AIError('AI provider error'));

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow(AIError);
    });

    it('should handle RateLimitError from provider', async () => {
      mockProvider.generateStructured.mockRejectedValue(new RateLimitError('Rate limit exceeded'));

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('generatePriorityRating', () => {
    it('should generate valid priority rating', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        rating: 9,
        summary: 'Excellent vehicle worth considering',
      });

      const result = await aiService.generatePriorityRating(mockVehicle);

      expect(result.rating).toBe(9);
      expect(result.summary).toBe('Excellent vehicle worth considering');
      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('priority-rating');
    });

    it('should include AI analysis fields in vehicle data', async () => {
      const vehicleWithAnalysis = {
        ...mockVehicle,
        personalFitScore: 8,
        aiDataSanityCheck: 'No issues detected',
        marketValueScore: '-5%',
      };

      mockProvider.generateStructured.mockResolvedValue({
        rating: 8,
        summary: 'Test summary',
      });

      await aiService.generatePriorityRating(vehicleWithAnalysis);

      const buildPromptCall = (PromptLoader.buildPrompt as jest.Mock).mock.calls[0];
      const variables = buildPromptCall[1];

      expect(variables.vehicle.personalFitScore).toBe(8);
      expect(variables.vehicle.aiDataSanityCheck).toBe('No issues detected');
      expect(variables.vehicle.marketValueScore).toBe('-5%');
    });

    it('should throw ValidationError for invalid rating', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        rating: -1, // Invalid: < 0
        summary: 'Test',
      });

      await expect(aiService.generatePriorityRating(mockVehicle)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for empty summary', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        rating: 7,
        summary: '', // Invalid: empty
      });

      await expect(aiService.generatePriorityRating(mockVehicle)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('generateMechanicReport', () => {
    it('should generate mechanic report', async () => {
      const mockReport = '# Mechanic Report\n\nTest report content';

      mockProvider.generateStructured.mockResolvedValue({
        report: mockReport,
      });

      const report = await aiService.generateMechanicReport(mockVehicle);

      expect(report).toBe(mockReport);
      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('mechanic-report');
    });

    it('should extract relevant vehicle data for mechanic analysis', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        report: 'Test report',
      });

      await aiService.generateMechanicReport(mockVehicle);

      const buildPromptCall = (PromptLoader.buildPrompt as jest.Mock).mock.calls[0];
      const variables = buildPromptCall[1];

      expect(variables.vehicle.make).toBe('Toyota');
      expect(variables.vehicle.model).toBe('Corolla');
      expect(variables.vehicle.year).toBe(2017);
      expect(variables.vehicle.mileageKm).toBe(95000);
    });

    it('should throw ValidationError for empty report', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        report: '', // Invalid: empty
      });

      await expect(aiService.generateMechanicReport(mockVehicle)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('generateDataSanityCheck', () => {
    it('should generate sanity check report', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        consistencyScore: 8,
        flags: ['Minor issue'],
        warnings: [],
        trustLevel: 'high',
        summary: 'Data looks good',
      });

      const result = await aiService.generateDataSanityCheck(mockVehicle);

      expect(result).toContain('Consistency Score: 8/10');
      expect(result).toContain('Trust Level: HIGH');
      expect(result).toContain('Data looks good');
      expect(result).toContain('FLAGS:');
      expect(result).toContain('Minor issue');
      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('sanity-check');
    });

    it('should format warnings correctly', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        consistencyScore: 3,
        flags: [],
        warnings: ['Critical issue 1', 'Critical issue 2'],
        trustLevel: 'low',
        summary: 'Multiple issues detected',
      });

      const result = await aiService.generateDataSanityCheck(mockVehicle);

      expect(result).toContain('WARNINGS:');
      expect(result).toContain('Critical issue 1');
      expect(result).toContain('Critical issue 2');
    });

    it('should handle response with no flags or warnings', async () => {
      mockProvider.generateStructured.mockResolvedValue({
        consistencyScore: 10,
        flags: [],
        warnings: [],
        trustLevel: 'high',
        summary: 'Perfect consistency',
      });

      const result = await aiService.generateDataSanityCheck(mockVehicle);

      expect(result).toContain('Consistency Score: 10/10');
      expect(result).toContain('Perfect consistency');
      expect(result).not.toContain('FLAGS:');
      expect(result).not.toContain('WARNINGS:');
    });
  });

  describe('error handling', () => {
    it('should log errors and rethrow AIError', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockProvider.generateStructured.mockRejectedValue(new AIError('Test AI error'));

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow(AIError);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should wrap unknown errors in AIError', async () => {
      mockProvider.generateStructured.mockRejectedValue(new Error('Unknown error'));

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow(AIError);
    });

    it('should handle prompt loading errors', async () => {
      (PromptLoader.loadPrompt as jest.Mock).mockRejectedValue(
        new Error('Prompt file not found')
      );

      await expect(
        aiService.generatePersonalFitScore(mockVehicle, mockCriteria)
      ).rejects.toThrow();
    });
  });

  describe('vehicle data extraction', () => {
    it('should handle missing sourceParameters fields gracefully', async () => {
      const vehicleWithMinimalData = {
        ...mockVehicle,
        sourceParameters: JSON.stringify({}),
      };

      mockProvider.generateStructured.mockResolvedValue({
        score: 5,
        reasoning: 'Test',
        strengths: [],
        concerns: [],
        dealBreakers: [],
      });

      await aiService.generatePersonalFitScore(vehicleWithMinimalData, mockCriteria);

      const buildPromptCall = (PromptLoader.buildPrompt as jest.Mock).mock.calls[0];
      const variables = buildPromptCall[1];

      expect(variables.vehicle.make).toBe('Unknown');
      expect(variables.vehicle.model).toBe('Unknown');
      expect(variables.vehicle.fuelType).toBe('Unknown');
    });

    it('should handle malformed JSON in sourceParameters', async () => {
      const vehicleWithBadData = {
        ...mockVehicle,
        sourceParameters: 'not valid json',
      };

      mockProvider.generateStructured.mockResolvedValue({
        score: 5,
        reasoning: 'Test',
        strengths: [],
        concerns: [],
        dealBreakers: [],
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await aiService.generatePersonalFitScore(vehicleWithBadData, mockCriteria);

      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
