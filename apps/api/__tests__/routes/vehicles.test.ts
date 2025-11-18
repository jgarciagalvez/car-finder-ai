import request from 'supertest';
import express from 'express';
import vehiclesRouter from '../../src/routes/vehicles';
import { ServiceRegistry } from '@car-finder/services';
import type { Vehicle } from '@car-finder/types';

// Mock dependencies
jest.mock('@car-finder/services');

const app = express();
app.use(express.json());
app.use('/api/vehicles', vehiclesRouter);

describe('POST /api/vehicles/:id/check-existence', () => {
  const mockVehicle: Vehicle = {
    id: '123',
    source: 'otomoto',
    sourceId: 'otomoto-123',
    sourceUrl: 'https://www.otomoto.pl/oferta/test-vehicle-ID123.html',
    sourceCreatedAt: new Date('2023-01-01'),
    sourceTitle: 'BMW X5 2020',
    sourceDescriptionHtml: '<p>Great car</p>',
    sourceParameters: {},
    sourceEquipment: {},
    sourcePhotos: [],
    title: 'BMW X5 2020',
    description: 'Great car',
    features: [],
    pricePln: 150000,
    priceEur: 35000,
    year: 2020,
    mileage: 50000,
    sellerInfo: {
      name: 'John Doe',
      id: null,
      type: 'private',
      location: 'Warsaw',
      memberSince: null,
    },
    photos: [],
    personalFitScore: 85,
    marketValueScore: '-5%',
    aiPriorityRating: 8,
    aiPrioritySummary: 'Good value',
    aiMechanicReport: null,
    virtualMechanicSummary: null,
    aiDataSanityCheck: null,
    distanceFromWroclaw: 150,
    status: 'new',
    personalNotes: null,
    isRemovedFromSource: false,
    lastExistenceCheck: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockVehicleRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockVehicleRepository = {
      findVehicleById: jest.fn(),
      updateVehicle: jest.fn(),
    };

    (ServiceRegistry.getVehicleRepository as jest.Mock).mockResolvedValue(mockVehicleRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return 200 and set isRemovedFromSource=false when vehicle exists (200 response)', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch to return 200
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.vehicleId).toBe('123');
    expect(response.body.isRemovedFromSource).toBe(false);
    expect(response.body.httpStatus).toBe(200);
    expect(response.body.message).toBe('Vehicle still available');
    expect(response.body.lastExistenceCheck).toBeDefined();

    expect(mockVehicleRepository.updateVehicle).toHaveBeenCalledWith('123', {
      isRemovedFromSource: false,
      lastExistenceCheck: expect.any(String),
    });
  });

  it('should return 200 and set isRemovedFromSource=true when vehicle returns 404', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch to return 404
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 404,
      ok: false,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.vehicleId).toBe('123');
    expect(response.body.isRemovedFromSource).toBe(true);
    expect(response.body.httpStatus).toBe(404);
    expect(response.body.message).toBe('Vehicle removed from Otomoto');

    expect(mockVehicleRepository.updateVehicle).toHaveBeenCalledWith('123', {
      isRemovedFromSource: true,
      lastExistenceCheck: expect.any(String),
    });
  });

  it('should return 200 and set isRemovedFromSource=true when vehicle returns 410 (Gone)', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch to return 410
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 410,
      ok: false,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.isRemovedFromSource).toBe(true);
    expect(response.body.httpStatus).toBe(410);
    expect(response.body.message).toBe('Vehicle removed from Otomoto');
  });

  it('should return 404 when vehicle ID does not exist in database', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/api/vehicles/999/check-existence')
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Vehicle not found');
    expect(response.body.message).toContain('No vehicle found with ID: 999');
  });

  it('should return 500 when fetch throws network error', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);

    // Mock fetch to throw network error
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Network error');
    expect(response.body.message).toContain('network issue');

    // Should not update database on network error
    expect(mockVehicleRepository.updateVehicle).not.toHaveBeenCalled();
  });

  it('should follow redirects and check final response status', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch with redirect option (fetch follows redirects by default)
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.isRemovedFromSource).toBe(false);

    // Verify fetch was called with redirect: 'follow'
    expect(global.fetch).toHaveBeenCalledWith(
      mockVehicle.sourceUrl,
      expect.objectContaining({
        method: 'HEAD',
        redirect: 'follow',
      })
    );
  });

  it('should use HEAD request method', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'HEAD',
      })
    );
  });

  it('should update lastExistenceCheck timestamp in ISO format', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    // Check ISO format
    const lastCheck = response.body.lastExistenceCheck;
    expect(new Date(lastCheck).toISOString()).toBe(lastCheck);
  });

  it('should handle 3xx status codes as vehicle existing', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch to return 301 (redirect)
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 301,
      ok: false,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    // 3xx is not 404/410, so vehicle still exists
    expect(response.body.isRemovedFromSource).toBe(false);
  });

  it('should handle 5xx status codes as vehicle existing (server error, not removal)', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockVehicleRepository.updateVehicle.mockResolvedValueOnce(undefined);

    // Mock fetch to return 500
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 500,
      ok: false,
    });

    const response = await request(app)
      .post('/api/vehicles/123/check-existence')
      .send();

    // 5xx is not 404/410, so we assume vehicle exists (server issue, not removal)
    expect(response.body.isRemovedFromSource).toBe(false);
  });
});
