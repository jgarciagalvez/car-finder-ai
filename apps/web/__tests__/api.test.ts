import { fetchVehicles, fetchVehicleById, checkApiHealth, translateVehicle, analyzeVehicle, updateVehicle, ApiError } from '@/lib/api';

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

  describe('fetchVehicleById', () => {
    const mockVehicle = {
      id: '123',
      title: 'Test Vehicle',
      description: 'A nice car',
      source: 'otomoto',
      sourceUrl: 'https://otomoto.pl/123',
      pricePln: 50000,
      priceEur: 12000,
      year: 2020,
      mileage: 50000,
      features: ['air_conditioning', 'leather_seats'],
      sellerInfo: {
        name: 'John Doe',
        type: 'private',
        location: 'Warsaw',
        memberSince: '2019',
      },
      personalFitScore: 85,
      marketValueScore: '-5%',
      aiPriorityRating: 8,
      aiPrioritySummary: 'Good value',
      aiMechanicReport: '## Report\nNo major issues found.',
      status: 'new',
      personalNotes: null,
      photos: ['photo1.jpg', 'photo2.jpg'],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
    };

    it('should fetch vehicle by ID successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await fetchVehicleById('123');
      expect(result).toEqual(mockVehicle);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle 404 error when vehicle not found', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Vehicle not found' }),
      });

      await expect(fetchVehicleById('999')).rejects.toThrow(ApiError);
    });

    it('should handle 500 server error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database error' }),
      });

      await expect(fetchVehicleById('123')).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchVehicleById('123')).rejects.toThrow(ApiError);
    });

    it('should parse and return complete Vehicle object', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await fetchVehicleById('123');

      // Verify all important fields are present
      expect(result.id).toBe('123');
      expect(result.title).toBe('Test Vehicle');
      expect(result.personalFitScore).toBe(85);
      expect(result.marketValueScore).toBe('-5%');
      expect(result.aiMechanicReport).toBe('## Report\nNo major issues found.');
      expect(result.sellerInfo).toEqual({
        name: 'John Doe',
        type: 'private',
        location: 'Warsaw',
        memberSince: '2019',
      });
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

  describe('translateVehicle', () => {
    const mockVehicle = {
      id: '123',
      title: 'Test Vehicle',
      description: 'Translated description',
      source: 'otomoto',
      pricePln: 50000,
      priceEur: 12000,
      year: 2020,
      mileage: 50000,
    };

    it('should translate vehicle without force flag', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await translateVehicle('123');
      expect(result).toEqual(mockVehicle);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123/translate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should translate vehicle with force flag', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await translateVehicle('123', true);
      expect(result).toEqual(mockVehicle);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123/translate?force=true',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle 404 error when vehicle not found', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Vehicle not found' }),
      });

      await expect(translateVehicle('999')).rejects.toThrow(ApiError);
    });

    it('should handle 500 error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Translation failed' }),
      });

      await expect(translateVehicle('123')).rejects.toThrow(ApiError);
    });
  });

  describe('analyzeVehicle', () => {
    const mockVehicle = {
      id: '123',
      title: 'Test Vehicle',
      aiPriorityRating: 85,
      personalFitScore: 90,
      marketValueScore: '-5%',
      aiPrioritySummary: 'Good deal',
      source: 'otomoto',
      pricePln: 50000,
      priceEur: 12000,
      year: 2020,
      mileage: 50000,
    };

    it('should analyze vehicle without force flag', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await analyzeVehicle('123');
      expect(result).toEqual(mockVehicle);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123/analyze',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should analyze vehicle with force flag', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const result = await analyzeVehicle('123', true);
      expect(result).toEqual(mockVehicle);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123/analyze?force=true',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle 404 error when vehicle not found', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Vehicle not found' }),
      });

      await expect(analyzeVehicle('999')).rejects.toThrow(ApiError);
    });

    it('should handle 500 error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Analysis failed' }),
      });

      await expect(analyzeVehicle('123')).rejects.toThrow(ApiError);
    });
  });

  describe('updateVehicle', () => {
    const mockVehicle = {
      id: '123',
      title: 'Test Vehicle',
      status: 'to_contact',
      personalNotes: 'Looks promising',
      source: 'otomoto',
      pricePln: 50000,
      priceEur: 12000,
      year: 2020,
      mileage: 50000,
    };

    it('should update vehicle status only', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockVehicle, status: 'to_contact' }),
      });

      const result = await updateVehicle('123', { status: 'to_contact' });
      expect(result.status).toBe('to_contact');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'to_contact' }),
        })
      );
    });

    it('should update vehicle personalNotes only', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockVehicle, personalNotes: 'Updated notes' }),
      });

      const result = await updateVehicle('123', { personalNotes: 'Updated notes' });
      expect(result.personalNotes).toBe('Updated notes');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ personalNotes: 'Updated notes' }),
        })
      );
    });

    it('should update both status and personalNotes', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockVehicle,
          status: 'contacted',
          personalNotes: 'Called and spoke with seller'
        }),
      });

      const result = await updateVehicle('123', {
        status: 'contacted',
        personalNotes: 'Called and spoke with seller'
      });
      expect(result.status).toBe('contacted');
      expect(result.personalNotes).toBe('Called and spoke with seller');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vehicles/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'contacted',
            personalNotes: 'Called and spoke with seller'
          }),
        })
      );
    });

    it('should handle 400 error for invalid status', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid status value' }),
      });

      await expect(updateVehicle('123', { status: 'invalid_status' })).rejects.toThrow(ApiError);
    });

    it('should handle 404 error when vehicle not found', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Vehicle not found' }),
      });

      await expect(updateVehicle('999', { status: 'to_contact' })).rejects.toThrow(ApiError);
    });

    it('should handle 500 server error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database update failed' }),
      });

      await expect(updateVehicle('123', { status: 'to_contact' })).rejects.toThrow(ApiError);
    });
  });
});
