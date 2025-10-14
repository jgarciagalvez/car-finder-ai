/**
 * Unit tests for analyze.ts
 */

import { getRequiredAnalysisSteps } from '../analyze';
import { Vehicle } from '@car-finder/types';

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
      sellerInfo: { name: 'Test Seller', phone: '123456789' },
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
        aiMechanicReport: 'Report complete',
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
        aiMechanicReport: 'Report complete',
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
});
