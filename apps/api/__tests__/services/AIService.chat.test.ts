import { AIService, ChatContext } from '../../src/services/AIService';
import { AIProviderFactory, PromptLoader } from '@car-finder/ai';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import type { Vehicle, ChatMessage } from '@car-finder/types';

// Mock dependencies
jest.mock('@car-finder/ai');

describe('AIService.chat()', () => {
  let aiService: AIService;
  let mockProvider: any;

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
    description: 'Great car with all the features you need',
    features: ['air_conditioning', 'leather_seats'],
    pricePln: 150000,
    priceEur: 35000,
    year: 2020,
    mileage: 50000,
    sellerInfo: {
      name: 'John Doe',
      id: null,
      type: 'private',
      location: 'Warsaw',
      memberSince: '2019',
    },
    photos: [],
    personalFitScore: 85,
    marketValueScore: '-5%',
    aiPriorityRating: 8,
    aiPrioritySummary: 'Excellent value for money',
    aiMechanicReport: '## Report\nNo major issues',
    aiDataSanityCheck: 'All data consistent',
    status: 'new',
    personalNotes: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrompt = {
    name: 'communication-assistant',
    role: 'Automotive communication specialist',
    task: 'Assist with vehicle communication',
    instructions: ['Draft messages', 'Translate replies'],
    inputSchema: {},
    outputFormat: {},
    raw: '# Communication Assistant\n\nYou are a multilingual automotive communication specialist.',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProvider = {
      chat: jest.fn(),
      generateText: jest.fn(),
      generateStructured: jest.fn(),
    };

    (AIProviderFactory.createFromEnvironment as jest.Mock).mockReturnValue(mockProvider);
    (PromptLoader.loadPrompt as jest.Mock).mockResolvedValue(mockPrompt);

    aiService = new AIService();
  });

  describe('without vehicle context', () => {
    it('should generate chat response without vehicle data', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const history: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi! How can I help?' },
      ];
      const userMessage = 'Tell me about buying cars';

      mockProvider.chat.mockResolvedValueOnce('Here is advice about buying cars...');

      const result = await aiService.chat(context, history, userMessage);

      expect(result).toBe('Here is advice about buying cars...');
      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('communication-assistant');
      expect(mockProvider.chat).toHaveBeenCalled();
    });

    it('should build conversation messages correctly', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const history: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there!' },
      ];
      const userMessage = 'Help me';

      mockProvider.chat.mockResolvedValueOnce('I am here to help');

      await aiService.chat(context, history, userMessage);

      const callArgs = mockProvider.chat.mock.calls[0][0];

      // Should include system message, confirmation, history, and user message
      expect(callArgs.length).toBeGreaterThan(history.length);
      expect(callArgs[0].role).toBe('user'); // System message
      expect(callArgs[0].content).toContain('Communication Assistant');
      expect(callArgs[1].role).toBe('model'); // Confirmation
      expect(callArgs[callArgs.length - 1].content).toBe('Help me'); // User message
    });
  });

  describe('with vehicle context', () => {
    it('should generate chat response with vehicle data', async () => {
      const context: ChatContext = { view: 'detail', vehicleId: '123' };
      const history: ChatMessage[] = [];
      const userMessage = 'Should I buy this car?';

      mockProvider.chat.mockResolvedValueOnce('Based on the vehicle data, this is a good buy...');

      const result = await aiService.chat(context, history, userMessage, mockVehicle);

      expect(result).toBe('Based on the vehicle data, this is a good buy...');
      expect(mockProvider.chat).toHaveBeenCalled();
    });

    it('should include vehicle context in system message', async () => {
      const context: ChatContext = { view: 'detail', vehicleId: '123' };
      const history: ChatMessage[] = [];
      const userMessage = 'Tell me about this car';

      mockProvider.chat.mockResolvedValueOnce('Here is information about the car');

      await aiService.chat(context, history, userMessage, mockVehicle);

      const callArgs = mockProvider.chat.mock.calls[0][0];
      const systemMessage = callArgs[0].content;

      // System message should include vehicle details
      expect(systemMessage).toContain('BMW X5 2020');
      expect(systemMessage).toContain('150,000'); // pricePln
      expect(systemMessage).toContain('35,000'); // priceEur
      expect(systemMessage).toContain('2020'); // year
      expect(systemMessage).toContain('50,000'); // mileage
      expect(systemMessage).toContain('John Doe'); // seller name
      expect(systemMessage).toContain('Warsaw'); // location
      expect(systemMessage).toContain('85/100'); // personal fit score
      expect(systemMessage).toContain('-5%'); // market value score
      expect(systemMessage).toContain('Excellent value for money'); // AI summary
    });

    it('should handle vehicle with missing optional fields', async () => {
      const vehicleWithNulls: Vehicle = {
        ...mockVehicle,
        description: '',
        sellerInfo: {
          name: null,
          id: null,
          type: null,
          location: null,
          memberSince: null,
        },
        personalFitScore: null,
        marketValueScore: null,
        aiPrioritySummary: null,
      };

      const context: ChatContext = { view: 'detail', vehicleId: '123' };
      mockProvider.chat.mockResolvedValueOnce('Response');

      await aiService.chat(context, [], 'Test', vehicleWithNulls);

      const callArgs = mockProvider.chat.mock.calls[0][0];
      const systemMessage = callArgs[0].content;

      // Should still contain basic info
      expect(systemMessage).toContain('BMW X5 2020');
      expect(systemMessage).toContain('N/A'); // For null seller fields
    });
  });

  describe('conversation history handling', () => {
    it('should preserve conversation history in correct order', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const history: ChatMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'model', content: 'First response' },
        { role: 'user', content: 'Second message' },
        { role: 'model', content: 'Second response' },
      ];
      const userMessage = 'Third message';

      mockProvider.chat.mockResolvedValueOnce('Third response');

      await aiService.chat(context, history, userMessage);

      const callArgs = mockProvider.chat.mock.calls[0][0];

      // Find where history starts (after system message and confirmation)
      const historyStart = callArgs.findIndex((msg: ChatMessage) => msg.content === 'First message');

      expect(historyStart).toBeGreaterThan(0);
      expect(callArgs[historyStart].content).toBe('First message');
      expect(callArgs[historyStart + 1].content).toBe('First response');
      expect(callArgs[historyStart + 2].content).toBe('Second message');
      expect(callArgs[historyStart + 3].content).toBe('Second response');
      expect(callArgs[callArgs.length - 1].content).toBe('Third message');
    });

    it('should handle empty conversation history', async () => {
      const context: ChatContext = { view: 'dashboard' };
      mockProvider.chat.mockResolvedValueOnce('First response');

      await aiService.chat(context, [], 'First message');

      const callArgs = mockProvider.chat.mock.calls[0][0];

      // Should have system message, confirmation, and user message
      expect(callArgs.length).toBe(3);
      expect(callArgs[0].role).toBe('user');
      expect(callArgs[1].role).toBe('model');
      expect(callArgs[2].role).toBe('user');
      expect(callArgs[2].content).toBe('First message');
    });
  });

  describe('error handling', () => {
    it('should throw ValidationError when AI returns empty response', async () => {
      const context: ChatContext = { view: 'dashboard' };
      mockProvider.chat.mockResolvedValueOnce('');

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when AI returns whitespace-only response', async () => {
      const context: ChatContext = { view: 'dashboard' };
      mockProvider.chat.mockResolvedValueOnce('   \n\t   ');

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(ValidationError);
    });

    it('should propagate AIError from provider', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const error = new AIError('AI service failed');
      mockProvider.chat.mockRejectedValueOnce(error);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(AIError);
    });

    it('should propagate RateLimitError from provider', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const error = new RateLimitError('Rate limit exceeded');
      mockProvider.chat.mockRejectedValueOnce(error);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(RateLimitError);
    });

    it('should propagate ValidationError from provider', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const error = new ValidationError('Invalid input');
      mockProvider.chat.mockRejectedValueOnce(error);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(ValidationError);
    });

    it('should wrap unknown errors in AIError', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const error = new Error('Unknown error');
      mockProvider.chat.mockRejectedValueOnce(error);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow(AIError);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow('Failed to generate chat response: Unknown error');
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const context: ChatContext = { view: 'dashboard' };
      const error = new Error('Test error');
      mockProvider.chat.mockRejectedValueOnce(error);

      await expect(
        aiService.chat(context, [], 'Test message')
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error generating chat response:',
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe('prompt loading', () => {
    it('should load communication-assistant prompt', async () => {
      const context: ChatContext = { view: 'dashboard' };
      mockProvider.chat.mockResolvedValueOnce('Response');

      await aiService.chat(context, [], 'Test');

      expect(PromptLoader.loadPrompt).toHaveBeenCalledWith('communication-assistant');
    });

    it('should use prompt raw content in system message', async () => {
      const context: ChatContext = { view: 'dashboard' };
      mockProvider.chat.mockResolvedValueOnce('Response');

      await aiService.chat(context, [], 'Test');

      const callArgs = mockProvider.chat.mock.calls[0][0];
      const systemMessage = callArgs[0].content;

      expect(systemMessage).toContain('Communication Assistant');
      expect(systemMessage).toContain('multilingual automotive communication specialist');
    });
  });

  describe('response format', () => {
    it('should return markdown-formatted response from AI', async () => {
      const context: ChatContext = { view: 'dashboard' };
      const markdownResponse = '## Response\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2';
      mockProvider.chat.mockResolvedValueOnce(markdownResponse);

      const result = await aiService.chat(context, [], 'Test');

      expect(result).toBe(markdownResponse);
      expect(result).toContain('##');
      expect(result).toContain('**');
      expect(result).toContain('*');
      expect(result).toContain('-');
    });

    it('should return Polish text in response', async () => {
      const context: ChatContext = { view: 'detail', vehicleId: '123' };
      const polishResponse = 'Dzień dobry,\n\nChciałbym zapytać o historię serwisową pojazdu.\n\nPozdrawiam';
      mockProvider.chat.mockResolvedValueOnce(polishResponse);

      const result = await aiService.chat(context, [], 'Draft a message in Polish', mockVehicle);

      expect(result).toBe(polishResponse);
      expect(result).toContain('Dzień dobry');
      expect(result).toContain('Pozdrawiam');
    });
  });
});
