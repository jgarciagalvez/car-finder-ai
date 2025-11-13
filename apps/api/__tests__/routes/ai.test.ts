import request from 'supertest';
import express from 'express';
import aiRouter from '../../src/routes/ai';
import { ServiceRegistry } from '@car-finder/services';
import { AIService } from '../../src/services/AIService';
import type { Vehicle, ChatMessage } from '@car-finder/types';

// Mock dependencies
jest.mock('@car-finder/services');
jest.mock('../../src/services/AIService');

const app = express();
app.use(express.json());
app.use('/api/ai', aiRouter);

describe('POST /api/ai/chat', () => {
  const mockVehicle: Vehicle = {
    id: '123',
    source: 'otomoto',
    sourceId: 'otomoto-123',
    sourceUrl: 'https://otomoto.pl/123',
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
    aiDataSanityCheck: null,
    status: 'new',
    personalNotes: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversationHistory: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'model', content: 'Hi! How can I help you?' },
  ];

  let mockVehicleRepository: any;
  let mockAIService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVehicleRepository = {
      findVehicleById: jest.fn(),
    };

    mockAIService = {
      chat: jest.fn(),
    };

    (ServiceRegistry.getVehicleRepository as jest.Mock).mockResolvedValue(mockVehicleRepository);
    (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);
  });

  it('should return 200 with AI response on success without vehicle context', async () => {
    mockAIService.chat.mockResolvedValueOnce('Here is my response');

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: mockConversationHistory,
        userMessage: 'Tell me about cars',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      aiResponse: 'Here is my response',
    });
    expect(mockAIService.chat).toHaveBeenCalledWith(
      { view: 'dashboard' },
      mockConversationHistory,
      'Tell me about cars',
      undefined
    );
  });

  it('should return 200 with AI response including vehicle context', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockAIService.chat.mockResolvedValueOnce('Based on this vehicle, here is my advice');

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'detail', vehicleId: '123' },
        conversationHistory: [],
        userMessage: 'Should I buy this car?',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      aiResponse: 'Based on this vehicle, here is my advice',
    });
    expect(mockVehicleRepository.findVehicleById).toHaveBeenCalledWith('123');
    expect(mockAIService.chat).toHaveBeenCalledWith(
      { view: 'detail', vehicleId: '123' },
      [],
      'Should I buy this car?',
      mockVehicle
    );
  });

  it('should return 400 when context is missing', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad request');
    expect(response.body.message).toContain('Missing required fields');
  });

  it('should return 400 when conversationHistory is missing', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        userMessage: 'Hello',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad request');
  });

  it('should return 400 when userMessage is missing', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad request');
  });

  it('should return 400 when context.view is invalid', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'invalid' },
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad request');
    expect(response.body.message).toContain('Invalid context.view');
  });

  it('should return 404 when vehicle ID is provided but not found', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'detail', vehicleId: '999' },
        conversationHistory: [],
        userMessage: 'Tell me about this car',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Vehicle not found');
    expect(response.body.message).toContain('No vehicle found with ID: 999');
  });

  it('should return 429 when rate limit is exceeded', async () => {
    const rateLimitError = new Error('rate limit exceeded');
    mockAIService.chat.mockRejectedValueOnce(rateLimitError);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Rate limit exceeded');
  });

  it('should return 429 when quota is exceeded', async () => {
    const quotaError = new Error('quota exceeded');
    mockAIService.chat.mockRejectedValueOnce(quotaError);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Rate limit exceeded');
  });

  it('should return 400 for validation errors', async () => {
    const validationError = new Error('validation failed');
    mockAIService.chat.mockRejectedValueOnce(validationError);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad request');
  });

  it('should return 500 for unknown AI service errors', async () => {
    const unknownError = new Error('Something went wrong');
    mockAIService.chat.mockRejectedValueOnce(unknownError);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
        userMessage: 'Hello',
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');
    expect(response.body.message).toContain('Failed to generate AI chat response');
  });

  it('should handle empty conversation history', async () => {
    mockAIService.chat.mockResolvedValueOnce('Hello! How can I help?');

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: [],
        userMessage: 'Hi',
      });

    expect(response.status).toBe(200);
    expect(mockAIService.chat).toHaveBeenCalledWith(
      { view: 'dashboard' },
      [],
      'Hi',
      undefined
    );
  });

  it('should handle long conversation history', async () => {
    const longHistory: ChatMessage[] = Array(20).fill(null).map((_, i) => ({
      role: i % 2 === 0 ? 'user' : 'model',
      content: `Message ${i}`,
    })) as ChatMessage[];

    mockAIService.chat.mockResolvedValueOnce('Response to long conversation');

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'dashboard' },
        conversationHistory: longHistory,
        userMessage: 'Continue',
      });

    expect(response.status).toBe(200);
    expect(mockAIService.chat).toHaveBeenCalledWith(
      { view: 'dashboard' },
      longHistory,
      'Continue',
      undefined
    );
  });

  it('should pass vehicle context correctly to AI service', async () => {
    mockVehicleRepository.findVehicleById.mockResolvedValueOnce(mockVehicle);
    mockAIService.chat.mockResolvedValueOnce('Response with vehicle context');

    await request(app)
      .post('/api/ai/chat')
      .send({
        context: { view: 'detail', vehicleId: '123' },
        conversationHistory: [],
        userMessage: 'Tell me about this car',
      });

    expect(mockAIService.chat).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'detail', vehicleId: '123' }),
      [],
      'Tell me about this car',
      expect.objectContaining({
        id: '123',
        title: 'BMW X5 2020',
        pricePln: 150000,
      })
    );
  });
});
