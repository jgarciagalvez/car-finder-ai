import { fetchVehicles, checkApiHealth, ApiError } from '@/lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchVehicles', () => {
    it('should fetch vehicles successfully', async () => {
      const mockVehicles = [
        {
          id: '1',
          title: 'Test Vehicle',
          source: 'otomoto',
          pricePln: 50000,
          priceEur: 12000,
          year: 2020,
          mileage: 50000,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicles,
      });

      const result = await fetchVehicles();
      expect(result).toEqual(mockVehicles);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database error' }),
      });

      await expect(fetchVehicles()).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchVehicles()).rejects.toThrow(ApiError);
    });
  });

  describe('checkApiHealth', () => {
    it('should check API health successfully', async () => {
      const mockHealth = {
        status: 'ok',
        message: 'API is running',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      });

      const result = await checkApiHealth();
      expect(result).toEqual(mockHealth);
    });
  });
});
