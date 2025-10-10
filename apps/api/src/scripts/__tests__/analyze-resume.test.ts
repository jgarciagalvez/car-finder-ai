/**
 * Tests for resume logic in analyze.ts
 */

import { getRequiredAnalysisSteps, isRetryableError, getErrorType } from '../analyze';
import { Vehicle } from '@car-finder/types';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';

describe('getRequiredAnalysisSteps', () => {
  // Helper to create minimal vehicle object
  const createVehicle = (overrides: Partial<Vehicle>): Vehicle => ({
    id: 'test-id',
    source: 'otomoto',
    sourceId: 'test-source-id',
    sourceUrl: 'https://test.com',
    sourceCreatedAt: new Date(),
    sourceTitle: 'Test Vehicle',
    sourceDescriptionHtml: '<p>Test</p>',
    sourceParameters: {},
    sourceEquipment: [],
    sourcePhotos: [],
    title: 'Test Vehicle',
    description: null,
    features: [],
    pricePln: 50000,
    priceEur: 12000,
    year: 2015,
    mileage: 150000,
    sellerInfo: { name: 'Test Seller', phone: null, location: null },
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

  test('should return all steps for vehicle with no analysis', () => {
    const vehicle = createVehicle({
      description: null,
      features: [],
      aiDataSanityCheck: null,
      personalFitScore: null,
      aiMechanicReport: null,
      marketValueScore: null,
      aiPriorityRating: null,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toEqual([
      'translate',
      'sanity_check',
      'fit_score',
      'mechanic_report',
      'market_value',
      'priority_rating',
    ]);
  });

  test('should return 5 steps when translation is complete', () => {
    const vehicle = createVehicle({
      description: 'Translated description',
      features: ['AC', 'GPS'],
      aiDataSanityCheck: null,
      personalFitScore: null,
      aiMechanicReport: null,
      marketValueScore: null,
      aiPriorityRating: null,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toEqual([
      'sanity_check',
      'fit_score',
      'mechanic_report',
      'market_value',
      'priority_rating',
    ]);
    expect(steps).not.toContain('translate');
  });

  test('should return only priority_rating when all other steps complete', () => {
    const vehicle = createVehicle({
      description: 'Translated',
      features: ['AC'],
      aiDataSanityCheck: 'Looks good',
      personalFitScore: 8,
      aiMechanicReport: 'Check tires',
      marketValueScore: 'Good Deal',
      aiPriorityRating: null,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toEqual(['priority_rating']);
  });

  test('should return empty array when all analysis is complete', () => {
    const vehicle = createVehicle({
      description: 'Translated',
      features: ['AC'],
      aiDataSanityCheck: 'Looks good',
      personalFitScore: 8,
      aiMechanicReport: 'Check tires',
      marketValueScore: 'Good Deal',
      aiPriorityRating: 7,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toEqual([]);
  });

  test('should include translate if description is null', () => {
    const vehicle = createVehicle({
      description: null,
      features: ['AC'],
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toContain('translate');
  });

  test('should NOT include translate if description exists (even if features empty)', () => {
    const vehicle = createVehicle({
      description: 'Has description',
      features: [],
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    // Features being empty array doesn't trigger translate if description exists
    expect(steps).not.toContain('translate');
  });

  test('should include fit_score if personalFitScore is null', () => {
    const vehicle = createVehicle({
      personalFitScore: null,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toContain('fit_score');
  });

  test('should include fit_score if personalFitScore is undefined', () => {
    const vehicle = createVehicle({
      personalFitScore: undefined,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).toContain('fit_score');
  });

  test('should not include fit_score if personalFitScore is 0', () => {
    const vehicle = createVehicle({
      description: 'Test',
      features: ['AC'],
      personalFitScore: 0,
      aiDataSanityCheck: 'Good',
      aiMechanicReport: 'Check',
      marketValueScore: 'Good',
      aiPriorityRating: 5,
    });

    const steps = getRequiredAnalysisSteps(vehicle);

    expect(steps).not.toContain('fit_score');
  });
});

describe('isRetryableError', () => {
  test('should return true for RateLimitError', () => {
    const error = new RateLimitError('Rate limit exceeded');
    expect(isRetryableError(error)).toBe(true);
  });

  test('should return false for ValidationError', () => {
    const error = new ValidationError('Invalid data');
    expect(isRetryableError(error)).toBe(false);
  });

  test('should return true for AIError with status 500', () => {
    const error = new AIError('Server error', undefined, undefined, 500, false);
    expect(isRetryableError(error)).toBe(true);
  });

  test('should return true for AIError with status 503', () => {
    const error = new AIError('Service unavailable', undefined, undefined, 503, false);
    expect(isRetryableError(error)).toBe(true);
  });

  test('should return false for AIError with status 400', () => {
    const error = new AIError('Bad request', undefined, undefined, 400, false);
    expect(isRetryableError(error)).toBe(false);
  });

  test('should return false for AIError with status 401', () => {
    const error = new AIError('Unauthorized', undefined, undefined, 401, false);
    expect(isRetryableError(error)).toBe(false);
  });

  test('should return false for generic Error', () => {
    const error = new Error('Generic error');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('getErrorType', () => {
  test('should return RateLimitError for RateLimitError', () => {
    const error = new RateLimitError('Rate limit');
    expect(getErrorType(error)).toBe('RateLimitError');
  });

  test('should return AIError for AIError', () => {
    const error = new AIError('AI failed');
    expect(getErrorType(error)).toBe('AIError');
  });

  test('should return ValidationError for ValidationError', () => {
    const error = new ValidationError('Validation failed');
    expect(getErrorType(error)).toBe('ValidationError');
  });

  test('should return Error for generic Error', () => {
    const error = new Error('Generic');
    expect(getErrorType(error)).toBe('Error');
  });
});
