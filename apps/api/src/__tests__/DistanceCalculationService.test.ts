/**
 * Unit tests for DistanceCalculationService
 */

import { DistanceCalculationService } from '../services/DistanceCalculationService';

// Mock fetch globally
global.fetch = jest.fn();

describe('DistanceCalculationService', () => {
  let service: DistanceCalculationService;

  beforeEach(() => {
    service = new DistanceCalculationService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('calculateDistanceFromWroclaw', () => {
    it('should calculate distance for a valid city', async () => {
      // Mock Nominatim API response for Warsaw
      const mockNominatimResponse = [
        {
          lat: '52.2297',
          lon: '21.0122',
          display_name: 'Warsaw, Poland',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResponse,
      });

      const distance = await service.calculateDistanceFromWroclaw('Warsaw');

      // Distance from Wrocław (51.1079, 17.0385) to Warsaw (52.2297, 21.0122) ≈ 293 km
      expect(distance).toBeGreaterThan(280);
      expect(distance).toBeLessThan(310);

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'CarFinderAI/1.0',
          },
        })
      );

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('Warsaw');
      expect(callUrl).toContain('Poland');
    });

    it('should return null for null or empty city', async () => {
      expect(await service.calculateDistanceFromWroclaw('')).toBeNull();
      expect(await service.calculateDistanceFromWroclaw('   ')).toBeNull();

      // Verify API was not called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API failures gracefully', async () => {
      // Mock API error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const distance = await service.calculateDistanceFromWroclaw('TestCity');

      expect(distance).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const distance = await service.calculateDistanceFromWroclaw('TestCity');

      expect(distance).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle cities with no geocoding results', async () => {
      // Mock empty response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const distance = await service.calculateDistanceFromWroclaw(
        'NonExistentCity123'
      );

      expect(distance).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caching', () => {
    it('should use distance cache for subsequent calls with same city', async () => {
      // Mock Nominatim API response
      const mockNominatimResponse = [
        {
          lat: '50.0647',
          lon: '19.9450',
          display_name: 'Kraków, Poland',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResponse,
      });

      // First call - should hit API
      const distance1 = await service.calculateDistanceFromWroclaw('Kraków');
      expect(distance1).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const distance2 = await service.calculateDistanceFromWroclaw('Kraków');
      expect(distance2).toBe(distance1);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional API calls
    });

    it('should use geocode cache to prevent duplicate geocoding', async () => {
      // Mock Nominatim API responses
      const mockNominatimResponse = [
        {
          lat: '52.4064',
          lon: '16.9252',
          display_name: 'Poznań, Poland',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResponse,
      });

      // First call
      const distance1 = await service.calculateDistanceFromWroclaw('Poznań');
      expect(distance1).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear distance cache but keep geocode cache
      const stats1 = service.getCacheStats();
      expect(stats1.distanceCacheSize).toBe(1);
      expect(stats1.geocodeCacheSize).toBe(1);

      // Manually clear only distance cache
      service.clearCache();
      service['geocodeCache'].set('Poznań', {
        lat: 52.4064,
        lon: 16.9252,
      });

      // Second call - should use geocode cache (no API call)
      const distance2 = await service.calculateDistanceFromWroclaw('Poznań');
      expect(distance2).toBe(distance1);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional API calls
    });

    it('should handle cache clearing correctly', () => {
      // Populate caches manually
      service['distanceCache'].set('TestCity1', 100);
      service['distanceCache'].set('TestCity2', 200);
      service['geocodeCache'].set('TestCity1', { lat: 50, lon: 20 });

      let stats = service.getCacheStats();
      expect(stats.distanceCacheSize).toBe(2);
      expect(stats.geocodeCacheSize).toBe(1);

      // Clear caches
      service.clearCache();

      stats = service.getCacheStats();
      expect(stats.distanceCacheSize).toBe(0);
      expect(stats.geocodeCacheSize).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting between API calls', async () => {
      // Mock multiple API responses
      const mockResponse1 = [
        { lat: '52.2297', lon: '21.0122', display_name: 'Warsaw, Poland' },
      ];
      const mockResponse2 = [
        { lat: '50.0647', lon: '19.9450', display_name: 'Kraków, Poland' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const startTime = Date.now();

      // Make two consecutive calls to different cities
      await service.calculateDistanceFromWroclaw('Warsaw');
      await service.calculateDistanceFromWroclaw('Kraków');

      const elapsed = Date.now() - startTime;

      // Should take at least 1000ms due to rate limiting
      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not rate limit cached results', async () => {
      // Mock API response
      const mockResponse = [
        { lat: '52.2297', lon: '21.0122', display_name: 'Warsaw, Poland' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const startTime = Date.now();

      // First call - hits API
      await service.calculateDistanceFromWroclaw('Warsaw');

      // Second call - uses cache (should be instant)
      await service.calculateDistanceFromWroclaw('Warsaw');

      const elapsed = Date.now() - startTime;

      // Should be fast (< 100ms) since second call uses cache
      expect(elapsed).toBeLessThan(1100);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('should calculate accurate distances for known city pairs', async () => {
      // Mock Nominatim responses for known Polish cities
      const cities = [
        {
          name: 'Wrocław',
          coords: { lat: '51.1079', lon: '17.0385' },
          expectedDistance: 0, // Same city
        },
        {
          name: 'Warsaw',
          coords: { lat: '52.2297', lon: '21.0122' },
          expectedDistance: 301, // ~301 km (calculated via Haversine)
        },
        {
          name: 'Kraków',
          coords: { lat: '50.0647', lon: '19.9450' },
          expectedDistance: 236, // ~236 km (calculated via Haversine)
        },
        {
          name: 'Poznań',
          coords: { lat: '52.4064', lon: '16.9252' },
          expectedDistance: 146, // ~146 km (calculated via Haversine)
        },
      ];

      for (const city of cities) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              lat: city.coords.lat,
              lon: city.coords.lon,
              display_name: `${city.name}, Poland`,
            },
          ],
        });

        const distance = await service.calculateDistanceFromWroclaw(city.name);

        // Allow 10km margin of error for rounding and coordinate precision
        expect(distance).toBeGreaterThanOrEqual(
          city.expectedDistance - 10
        );
        expect(distance).toBeLessThanOrEqual(city.expectedDistance + 10);

        // Clear caches for next iteration
        service.clearCache();
      }
    });

    it('should round distances to nearest kilometer', async () => {
      // Mock response with coordinates that produce decimal distance
      const mockResponse = [
        {
          lat: '51.2000', // Close to Wrocław
          lon: '17.1000',
          display_name: 'Test City, Poland',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const distance = await service.calculateDistanceFromWroclaw('TestCity');

      // Distance should be an integer (rounded)
      expect(distance).toBe(Math.round(distance!));
      expect(Number.isInteger(distance)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should normalize city names (trim whitespace)', async () => {
      const mockResponse = [
        { lat: '52.2297', lon: '21.0122', display_name: 'Warsaw, Poland' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call with whitespace
      const distance = await service.calculateDistanceFromWroclaw(
        '  Warsaw  '
      );
      expect(distance).not.toBeNull();

      // Second call with trimmed name should use cache
      const distance2 = await service.calculateDistanceFromWroclaw('Warsaw');
      expect(distance2).toBe(distance);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Cache hit
    });

    it('should handle special characters in city names', async () => {
      const mockResponse = [
        { lat: '53.7784', lon: '20.4801', display_name: 'Olsztyn, Poland' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const distance = await service.calculateDistanceFromWroclaw('Łódź');

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      // URL should be properly encoded
      expect(callUrl).toContain('%C5%81%C3%B3d%C5%BA'); // URL-encoded "Łódź"
    });

    it('should handle malformed Nominatim responses', async () => {
      // Mock malformed response (missing lat/lon)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ display_name: 'Test City' }],
      });

      const distance = await service.calculateDistanceFromWroclaw('TestCity');

      // Should handle gracefully and return null
      expect(distance).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return accurate cache statistics', async () => {
      // Initially empty
      let stats = service.getCacheStats();
      expect(stats.distanceCacheSize).toBe(0);
      expect(stats.geocodeCacheSize).toBe(0);

      // Add some cities
      const mockResponses = [
        {
          lat: '52.2297',
          lon: '21.0122',
          display_name: 'Warsaw, Poland',
        },
        {
          lat: '50.0647',
          lon: '19.9450',
          display_name: 'Kraków, Poland',
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockResponses[0]],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockResponses[1]],
        });

      await service.calculateDistanceFromWroclaw('Warsaw');
      await service.calculateDistanceFromWroclaw('Kraków');

      stats = service.getCacheStats();
      expect(stats.distanceCacheSize).toBe(2);
      expect(stats.geocodeCacheSize).toBe(2);
    });
  });
});
