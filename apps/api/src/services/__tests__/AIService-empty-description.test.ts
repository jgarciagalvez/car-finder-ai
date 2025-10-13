/**
 * Tests for empty description handling in AIService
 */

import { AIService } from '../AIService';
import { Vehicle } from '@car-finder/types';

// Mock the AI provider to avoid real API calls
jest.mock('@car-finder/ai', () => {
  const actual = jest.requireActual('@car-finder/ai');
  return {
    ...actual,
    AIProviderFactory: {
      createFromEnvironment: jest.fn(() => ({
        generateStructured: jest.fn(),
      })),
    },
  };
});

describe('AIService - Empty Description Handling', () => {
  let aiService: AIService;

  // Helper to create minimal vehicle
  const createVehicle = (overrides: Partial<Vehicle>): Vehicle => ({
    id: 'test-vehicle-id',
    source: 'otomoto',
    sourceId: 'source-123',
    sourceUrl: 'https://test.com/vehicle',
    sourceCreatedAt: new Date(),
    sourceTitle: 'Test Vehicle',
    sourceDescriptionHtml: '<p>Test description</p>',
    sourceParameters: {
      equipment: ['Klimatyzacja', 'GPS'],
    },
    sourceEquipment: {
      'Komfort': ['Klimatyzacja', 'GPS'],
    },
    sourcePhotos: [],
    title: 'Test Vehicle',
    description: null,
    features: [],
    pricePln: 50000,
    priceEur: 12000,
    year: 2015,
    mileage: 150000,
    sellerInfo: { name: 'Seller', phone: null, location: null },
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
    ...overrides,
  });

  beforeEach(() => {
    aiService = new AIService();
  });

  test('should return placeholder for null sourceDescriptionHtml', async () => {
    const vehicle = createVehicle({
      sourceDescriptionHtml: null as any,
      sourceEquipment: {},
    });

    const result = await aiService.translateVehicleContent(vehicle);

    expect(result.description).toBe('No description provided by seller.');
    expect(result.features).toEqual([]);
  });

  test('should return placeholder for empty string sourceDescriptionHtml', async () => {
    const vehicle = createVehicle({
      sourceDescriptionHtml: '',
      sourceEquipment: {},
    });

    const result = await aiService.translateVehicleContent(vehicle);

    expect(result.description).toBe('No description provided by seller.');
    expect(result.features).toEqual([]);
  });

  test('should return placeholder for whitespace-only sourceDescriptionHtml', async () => {
    const vehicle = createVehicle({
      sourceDescriptionHtml: '   \n\t  ',
      sourceEquipment: {},
    });

    const result = await aiService.translateVehicleContent(vehicle);

    expect(result.description).toBe('No description provided by seller.');
    expect(result.features).toEqual([]);
  });

  test('should still translate features when description is empty', async () => {
    const vehicle = createVehicle({
      sourceDescriptionHtml: null as any,
      sourceEquipment: {
        'Komfort': ['Klimatyzacja'], // Polish feature
      },
    });

    const result = await aiService.translateVehicleContent(vehicle);

    expect(result.description).toBe('No description provided by seller.');
    // Features should still be processed (dictionary translation)
    expect(result.features).toEqual(['Air conditioning']);
  });
});
