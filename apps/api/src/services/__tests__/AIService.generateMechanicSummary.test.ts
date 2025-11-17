/**
 * Unit tests for AIService.generateMechanicSummary()
 * Tests the new concise mechanic summary generation
 */

import { AIService } from '../AIService';
import { Vehicle } from '@car-finder/types';
import { AIProviderFactory, PromptLoader } from '@car-finder/ai';

// Mock the AI provider factory
jest.mock('@car-finder/ai', () => ({
  AIProviderFactory: {
    createFromEnvironment: jest.fn(),
  },
  PromptLoader: {
    loadPrompt: jest.fn(),
    buildPrompt: jest.fn(),
  },
  AIError: class AIError extends Error {},
  RateLimitError: class RateLimitError extends Error {},
  ValidationError: class ValidationError extends Error {},
}));

const mockPromptLoader = PromptLoader as jest.Mocked<typeof PromptLoader>;

describe('AIService.generateMechanicSummary', () => {
  let mockProvider: any;
  let aiService: AIService;

  beforeEach(() => {
    // Create mock provider
    mockProvider = {
      generateStructured: jest.fn(),
    };

    // Mock the factory to return our mock provider
    (AIProviderFactory.createFromEnvironment as jest.Mock).mockReturnValue(mockProvider);

    // Mock PromptLoader
    mockPromptLoader.loadPrompt.mockResolvedValue({
      outputFormat: { type: 'object', properties: { summary: { type: 'string' } } },
    });
    mockPromptLoader.buildPrompt.mockReturnValue('Test prompt');

    // Create AIService instance
    aiService = new AIService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockVehicle = (overrides?: Partial<Vehicle>): Vehicle => ({
    id: 'test-vehicle-id',
    source: 'otomoto',
    sourceId: '12345',
    sourceUrl: 'https://example.com/vehicle/12345',
    sourceCreatedAt: new Date('2024-01-01'),
    sourceTitle: 'BMW 320i 2012',
    sourceDescriptionHtml: '<p>Well-maintained vehicle</p>',
    sourceParameters: {
      'Marka pojazdu': 'BMW',
      'Model pojazdu': '320i',
      'Rok produkcji': '2012',
      'Przebieg': '150000',
      'Rodzaj paliwa': 'Benzyna',
      'Skrzynia biegów': 'Automatyczna',
      'Moc': '184',
      'Pojemność skokowa': '2000',
    },
    sourceEquipment: {},
    sourcePhotos: [],
    title: 'BMW 320i 2012',
    description: 'Well-maintained vehicle',
    features: [],
    pricePln: 45000,
    priceEur: 10000,
    year: 2012,
    mileage: 150000,
    sellerInfo: { name: 'Test Seller', id: 'seller-123', type: 'private', location: 'Warsaw', memberSince: '2020-01-01' },
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

  it('should generate a concise mechanic summary', async () => {
    const mockSummary = `- The **2012 BMW 320i (N20 engine)** has a **critical timing chain defect** that can cause catastrophic engine failure.
- Main issues: **turbocharger wastegate rattle**, **cooling system leaks** (water pump/thermostat), **oil leaks** (valve cover gasket).
- Based on "well-maintained": **verify complete service records** especially timing chain replacement documentation.`;

    mockProvider.generateStructured.mockResolvedValue({
      summary: mockSummary,
    });

    const vehicle = createMockVehicle();
    const result = await aiService.generateMechanicSummary(vehicle);

    expect(result).toBe(mockSummary);
    expect(mockProvider.generateStructured).toHaveBeenCalledTimes(1);
  });

  it('should validate summary is not empty', async () => {
    mockProvider.generateStructured.mockResolvedValue({
      summary: '',
    });

    const vehicle = createMockVehicle();

    await expect(aiService.generateMechanicSummary(vehicle)).rejects.toThrow('Empty summary returned from AI provider');
  });

  it('should validate summary has content after trimming', async () => {
    mockProvider.generateStructured.mockResolvedValue({
      summary: '   \n\n   ',
    });

    const vehicle = createMockVehicle();

    await expect(aiService.generateMechanicSummary(vehicle)).rejects.toThrow('Empty summary returned from AI provider');
  });

  it('should handle markdown bullet list format', async () => {
    const mockSummary = `- First point
- Second point
- Third point`;

    mockProvider.generateStructured.mockResolvedValue({
      summary: mockSummary,
    });

    const vehicle = createMockVehicle();
    const result = await aiService.generateMechanicSummary(vehicle);

    expect(result).toContain('- First point');
    expect(result).toContain('- Second point');
    expect(result).toContain('- Third point');
  });

  it('should extract vehicle data correctly for prompt', async () => {
    mockProvider.generateStructured.mockResolvedValue({
      summary: '- Test summary',
    });

    const vehicle = createMockVehicle({
      year: 2015,
      mileage: 120000,
    });

    await aiService.generateMechanicSummary(vehicle);

    // Verify the prompt was built with correct vehicle data
    expect(mockPromptLoader.buildPrompt).toHaveBeenCalled();
    const buildArgs = mockPromptLoader.buildPrompt.mock.calls[0];
    const vehicleData = buildArgs[1].vehicle;

    expect(vehicleData.year).toBe(2015);
    expect(vehicleData.mileageKm).toBe(120000);
  });

  it('should handle AI provider errors gracefully', async () => {
    mockProvider.generateStructured.mockRejectedValue(new Error('AI provider error'));

    const vehicle = createMockVehicle();

    await expect(aiService.generateMechanicSummary(vehicle)).rejects.toThrow('Failed to generate Mechanic Summary');
  });
});
