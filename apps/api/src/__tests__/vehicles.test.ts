import request from 'supertest';
import express from 'express';
import vehiclesRouter from '../routes/vehicles';
import { ServiceRegistry, MockVehicleRepository } from '@car-finder/services';

// Mock the ServiceRegistry
jest.mock('@car-finder/services', () => {
  const actualServices = jest.requireActual('@car-finder/services');
  return {
    ...actualServices,
    ServiceRegistry: {
      getVehicleRepository: jest.fn(),
    },
  };
});

const app = express();
app.use(express.json());
app.use('/api/vehicles', vehiclesRouter);

describe('Vehicles API', () => {
  let mockVehicleRepository: MockVehicleRepository;

  beforeEach(() => {
    mockVehicleRepository = new MockVehicleRepository();
    (ServiceRegistry.getVehicleRepository as jest.Mock).mockReturnValue(mockVehicleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockVehicleRepository.clearAll();
  });

  describe('GET /api/vehicles', () => {
    it('should return all vehicles', async () => {
      const mockVehicles = [
        {
          id: 'test-id-1',
          title: 'Test Vehicle 1',
          source: 'otomoto',
          pricePln: 50000,
          priceEur: 12000,
          year: 2020,
          mileage: 50000,
          status: 'new',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
      ];

      for (const vehicle of mockVehicles) {
        await mockVehicleRepository.insertVehicle(MockVehicleRepository.createTestVehicle(vehicle));
      }

      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 'test-id-1',
        title: 'Test Vehicle 1',
        source: 'otomoto',
        pricePln: 50000,
        priceEur: 12000,
      });
    });

    it('should return empty array when no vehicles exist', async () => {
      // mockVehicleRepository starts empty by default

      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockVehicleRepository.setMockError('getAllVehicles', new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/vehicles')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        message: 'Failed to fetch vehicles from database',
      });
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('should return a specific vehicle', async () => {
      const mockVehicle = {
        id: 'test-id-1',
        title: 'Test Vehicle',
        source: 'otomoto',
        pricePln: 50000,
        priceEur: 12000,
        year: 2020,
        mileage: 50000,
        status: 'new',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      await mockVehicleRepository.insertVehicle(MockVehicleRepository.createTestVehicle(mockVehicle));

      const response = await request(app)
        .get('/api/vehicles/test-id-1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'test-id-1',
        title: 'Test Vehicle',
        source: 'otomoto',
      });
    });

    it('should return 404 for non-existent vehicle', async () => {
      // mockVehicleRepository starts empty by default

      const response = await request(app)
        .get('/api/vehicles/999')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Vehicle not found',
      });
    });
  });

  describe('PATCH /api/vehicles/:id', () => {
    it('should update vehicle status', async () => {
      const mockVehicle = {
        id: 'test-id-1',
        title: 'Test Vehicle',
        source: 'otomoto',
        status: 'new',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      await mockVehicleRepository.insertVehicle(MockVehicleRepository.createTestVehicle(mockVehicle));

      const response = await request(app)
        .patch('/api/vehicles/test-id-1')
        .send({ status: 'contacted' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'test-id-1',
        status: 'contacted',
      });
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/vehicles/1')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad request',
        message: 'Invalid status value',
      });
    });

    it('should return 404 for non-existent vehicle', async () => {
      // mockVehicleRepository starts empty by default

      const response = await request(app)
        .patch('/api/vehicles/999')
        .send({ status: 'contacted' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Vehicle not found',
      });
    });
  });
});
