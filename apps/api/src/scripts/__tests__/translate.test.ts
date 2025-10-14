/**
 * Unit tests for translate.ts
 */

import { hasRequiredFeatures, loadSearchConfig } from '../translate';
import { Vehicle } from '@car-finder/types';
import * as path from 'path';
import * as fs from 'fs';

// Mock WorkspaceUtils
jest.mock('@car-finder/services', () => ({
  WorkspaceUtils: {
    loadEnvFromRoot: jest.fn(),
    findWorkspaceRoot: jest.fn(() => '/mock/workspace/root'),
  },
}));

describe('translate.ts', () => {
  describe('hasRequiredFeatures', () => {
    it('should return false for vehicle with no features', () => {
      const vehicle = { features: [] } as Vehicle;
      const requiredFeatures = ['Klimatyzacja'];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(false);
    });

    it('should return true if vehicle has at least one required feature (exact match)', () => {
      const vehicle = { features: ['Klimatyzacja', 'ABS'] } as Vehicle;
      const requiredFeatures = ['Klimatyzacja'];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(true);
    });

    it('should return true if vehicle has at least one required feature (partial match)', () => {
      const vehicle = { features: ['Klimatyzacja automatyczna', 'ABS'] } as Vehicle;
      const requiredFeatures = ['Klimatyzacja'];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(true);
    });

    it('should return false if vehicle has none of the required features', () => {
      const vehicle = { features: ['ABS', 'ESP', 'Poduszki powietrzne'] } as Vehicle;
      const requiredFeatures = ['Klimatyzacja', 'Klimatyzacja automatyczna'];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const vehicle = { features: ['KLIMATYZACJA'] } as Vehicle;
      const requiredFeatures = ['klimatyzacja'];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(true);
    });

    it('should return true if no required features configured (empty array)', () => {
      const vehicle = { features: ['ABS'] } as Vehicle;
      const requiredFeatures: string[] = [];

      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(true);
    });

    it('should work with multiple required features - ANY match logic', () => {
      const vehicle = { features: ['ESP', 'Klimatyzacja dwustrefowa', 'ABS'] } as Vehicle;
      const requiredFeatures = [
        'Klimatyzacja',
        'Klimatyzacja automatyczna',
        'Klimatyzacja dwustrefowa'
      ];

      // Should match because vehicle has "Klimatyzacja dwustrefowa"
      expect(hasRequiredFeatures(vehicle, requiredFeatures)).toBe(true);
    });
  });

  describe('loadSearchConfig', () => {
    beforeEach(() => {
      // Clean up any existing mocks
      jest.clearAllMocks();
    });

    it('should load translationModel and requiredFeatures from search-config.json', () => {
      // Mock file system
      const mockConfig = {
        translationModel: 'gemini-2.0-flash-exp',
        requiredFeatures: ['Klimatyzacja', 'Klimatyzacja automatyczna'],
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

      const config = loadSearchConfig();

      expect(config.translationModel).toBe('gemini-2.0-flash-exp');
      expect(config.requiredFeatures).toEqual(['Klimatyzacja', 'Klimatyzacja automatyczna']);
    });

    it('should throw error if search-config.json is not found', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => loadSearchConfig()).toThrow('Configuration file not found or invalid');
    });
  });
});
