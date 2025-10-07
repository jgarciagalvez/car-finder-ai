/**
 * Tests for GeminiProvider
 */

import { GeminiProvider } from '../providers/GeminiProvider';
import { 
  AIProviderConfig, 
  AuthenticationError, 
  ValidationError,
  ChatMessage 
} from '../interfaces';

// Mock the Google Generative AI SDK
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockCountTokens = jest.fn();
  
  const mockModel = {
    generateContent: mockGenerateContent,
    countTokens: mockCountTokens
  };

  const mockGenAI = {
    getGenerativeModel: jest.fn(() => mockModel)
  };

  return {
    GoogleGenerativeAI: jest.fn(() => mockGenAI),
    __mockModel: mockModel,
    __mockGenAI: mockGenAI,
    __mockGenerateContent: mockGenerateContent,
    __mockCountTokens: mockCountTokens
  };
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let config: AIProviderConfig;
  let mockGenerateContent: jest.Mock;
  let mockCountTokens: jest.Mock;

  beforeEach(() => {
    config = {
      provider: 'gemini',
      apiKey: 'test-api-key',
      model: 'gemini-pro'
    };

    // Get mocked functions
    const { __mockGenerateContent, __mockCountTokens } = require('@google/generative-ai');
    mockGenerateContent = __mockGenerateContent;
    mockCountTokens = __mockCountTokens;

    // Reset mocks
    jest.clearAllMocks();

    provider = new GeminiProvider(config);
  });

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('should throw AuthenticationError with empty API key', () => {
      const invalidConfig = { ...config, apiKey: '' };
      expect(() => new GeminiProvider(invalidConfig)).toThrow(ValidationError);
    });

    it('should throw AuthenticationError with missing API key', () => {
      const invalidConfig = { ...config, apiKey: undefined as any };
      expect(() => new GeminiProvider(invalidConfig)).toThrow(ValidationError);
    });

    it('should use default model when not specified', () => {
      const configWithoutModel = { ...config };
      delete (configWithoutModel as any).model;
      const providerWithoutModel = new GeminiProvider(configWithoutModel);
      
      const modelInfo = providerWithoutModel.getModelInfo();
      expect(modelInfo.name).toBe('gemini-pro');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Generated text response'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateText('Test prompt');
      
      expect(result).toBe('Generated text response');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }],
        generationConfig: {}
      });
    });

    it('should handle generation options', async () => {
      const mockResponse = {
        response: {
          text: () => 'Generated text with options'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const options = {
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        topK: 40
      };

      await provider.generateText('Test prompt', options);
      
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
          topP: 0.9,
          topK: 40
        }
      });
    });

    it('should throw ValidationError for empty prompt', async () => {
      await expect(provider.generateText('')).rejects.toThrow(ValidationError);
      await expect(provider.generateText('   ')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid options', async () => {
      await expect(provider.generateText('Test', { temperature: -1 })).rejects.toThrow(ValidationError);
      await expect(provider.generateText('Test', { temperature: 3 })).rejects.toThrow(ValidationError);
      await expect(provider.generateText('Test', { maxTokens: 0 })).rejects.toThrow(ValidationError);
    });

    it('should handle API errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(provider.generateText('Test prompt')).rejects.toThrow();
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        response: {
          text: () => ''
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(provider.generateText('Test prompt')).rejects.toThrow('Empty response from Gemini API');
    });
  });

  describe('chat', () => {
    it('should handle chat conversation', async () => {
      const mockResponse = {
        response: {
          text: () => 'Chat response'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const result = await provider.chat(messages);
      
      expect(result).toBe('Chat response');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi there!' }] },
          { role: 'user', parts: [{ text: 'How are you?' }] }
        ],
        generationConfig: {}
      });
    });

    it('should throw ValidationError for empty messages', async () => {
      await expect(provider.chat([])).rejects.toThrow(ValidationError);
    });

    it('should handle single message', async () => {
      const mockResponse = {
        response: {
          text: () => 'Single message response'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Single message' }
      ];

      const result = await provider.chat(messages);
      expect(result).toBe('Single message response');
    });
  });

  describe('generateStructured', () => {
    it('should generate structured JSON response', async () => {
      const mockResponse = {
        response: {
          text: () => '{"name": "John", "age": 30}'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          age: { type: 'number' as const }
        }
      };

      const result = await provider.generateStructured<{name: string, age: number}>('Generate person data', schema);
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockResponse = {
        response: {
          text: () => '```json\n{"result": "success"}\n```'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const schema = {
        type: 'object' as const,
        properties: {
          result: { type: 'string' as const }
        }
      };

      const result = await provider.generateStructured<{result: string}>('Generate result', schema);
      
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw ValidationError for invalid JSON', async () => {
      const mockResponse = {
        response: {
          text: () => 'Invalid JSON response'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const schema = {
        type: 'object' as const,
        properties: {
          test: { type: 'string' as const }
        }
      };

      await expect(provider.generateStructured('Test', schema)).rejects.toThrow(ValidationError);
    });
  });

  describe('generateResponse', () => {
    it('should return full AI response with metadata', async () => {
      const mockResponse = {
        response: {
          text: () => 'Full response text',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30
          },
          candidates: [{
            finishReason: 'STOP'
          }]
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateResponse('Test prompt');
      
      expect(result).toMatchObject({
        content: 'Full response text',
        model: 'gemini-pro',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        },
        finishReason: 'stop',
        metadata: {
          provider: 'gemini'
        }
      });
    });

    it('should handle response without usage metadata', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response without metadata',
          candidates: [{
            finishReason: 'STOP'
          }]
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateResponse('Test prompt');
      
      expect(result.content).toBe('Response without metadata');
      expect(result.usage).toBeUndefined();
    });
  });

  describe('countTokens', () => {
    it('should count tokens using Gemini API', async () => {
      mockCountTokens.mockResolvedValue({ totalTokens: 15 });

      const result = await provider.countTokens('Test text for counting');
      
      expect(result).toEqual({
        tokens: 15,
        characters: 'Test text for counting'.length,
        estimatedCost: undefined
      });
      expect(mockCountTokens).toHaveBeenCalledWith('Test text for counting');
    });

    it('should fallback to base implementation on error', async () => {
      mockCountTokens.mockRejectedValue(new Error('Token counting failed'));

      const result = await provider.countTokens('Test text');
      
      // Should fallback to base implementation (rough estimation)
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.characters).toBe('Test text'.length);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hello'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return true when properly configured', async () => {
      const result = await provider.isReady();
      expect(result).toBe(true);
    });

    it('should return false with empty API key', async () => {
      // Create a provider with valid key first
      const validProvider = new GeminiProvider({
        provider: 'gemini',
        apiKey: 'valid-key',
        model: 'gemini-pro'
      });

      // Mock the config property directly
      Object.defineProperty(validProvider, 'config', {
        value: {
          provider: 'gemini',
          apiKey: '',
          model: 'gemini-pro'
        },
        writable: true
      });

      const result = await validProvider.isReady();
      expect(result).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should return correct model information', () => {
      const modelInfo = provider.getModelInfo();
      
      expect(modelInfo).toEqual({
        name: 'gemini-pro',
        provider: 'gemini',
        version: '1.0',
        maxTokens: 30720,
        supportedFeatures: [
          'text-generation',
          'chat',
          'structured-output',
          'token-counting'
        ]
      });
    });
  });
});
