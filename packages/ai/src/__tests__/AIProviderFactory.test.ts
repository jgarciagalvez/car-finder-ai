/**
 * Tests for AIProviderFactory
 */

import { AIProviderFactory, EnhancedAIProvider } from '../factory/AIProviderFactory';
import { GeminiProvider } from '../providers/GeminiProvider';
import { 
  AIProviderConfig, 
  ValidationError, 
  AuthenticationError 
} from '../interfaces';

// Mock the GeminiProvider
jest.mock('../providers/GeminiProvider');

describe('AIProviderFactory', () => {
  let mockGeminiProvider: jest.Mocked<GeminiProvider>;

  beforeEach(() => {
    // Reset the factory registry
    jest.clearAllMocks();
    
    // Mock GeminiProvider
    mockGeminiProvider = {
      generateText: jest.fn(),
      chat: jest.fn(),
      generateStructured: jest.fn(),
      generateResponse: jest.fn(),
      chatResponse: jest.fn(),
      countTokens: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('gemini'),
      getModelInfo: jest.fn().mockReturnValue({
        name: 'gemini-pro',
        provider: 'gemini',
        version: '1.0',
        maxTokens: 30720,
        supportedFeatures: ['text-generation', 'chat']
      }),
      isReady: jest.fn().mockResolvedValue(true),
      testConnection: jest.fn().mockResolvedValue(true)
    } as any;

    (GeminiProvider as jest.MockedClass<typeof GeminiProvider>).mockImplementation(() => mockGeminiProvider);
  });

  describe('createProvider', () => {
    it('should create Gemini provider with valid config', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key',
        model: 'gemini-pro'
      };

      const provider = AIProviderFactory.createProvider(config);

      expect(provider).toBe(mockGeminiProvider);
      expect(GeminiProvider).toHaveBeenCalledWith(config);
    });

    it('should throw ValidationError for missing provider', () => {
      const config = {
        apiKey: 'test-api-key'
      } as AIProviderConfig;

      expect(() => AIProviderFactory.createProvider(config)).toThrow(ValidationError);
      expect(() => AIProviderFactory.createProvider(config)).toThrow('Provider type is required');
    });

    it('should throw ValidationError for unknown provider', () => {
      const config: AIProviderConfig = {
        provider: 'unknown' as any,
        apiKey: 'test-api-key'
      };

      expect(() => AIProviderFactory.createProvider(config)).toThrow(ValidationError);
      expect(() => AIProviderFactory.createProvider(config)).toThrow('Unknown provider: unknown');
    });

    it('should handle provider creation errors', () => {
      (GeminiProvider as jest.MockedClass<typeof GeminiProvider>).mockImplementation(() => {
        throw new Error('Provider creation failed');
      });

      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key'
      };

      expect(() => AIProviderFactory.createProvider(config)).toThrow(ValidationError);
      expect(() => AIProviderFactory.createProvider(config)).toThrow('Failed to create provider');
    });

    it('should pass through authentication errors', () => {
      (GeminiProvider as jest.MockedClass<typeof GeminiProvider>).mockImplementation(() => {
        throw new AuthenticationError('Invalid API key');
      });

      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'invalid-key'
      };

      expect(() => AIProviderFactory.createProvider(config)).toThrow(AuthenticationError);
    });
  });

  describe('createFromEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create provider from environment variables', () => {
      process.env.GEMINI_API_KEY = 'env-api-key';
      process.env.AI_PROVIDER = 'gemini';
      process.env.AI_MODEL = 'gemini-pro';
      process.env.AI_RATE_LIMIT_RPM = '30';

      const provider = AIProviderFactory.createFromEnvironment();

      expect(provider).toBe(mockGeminiProvider);
      expect(GeminiProvider).toHaveBeenCalledWith({
        provider: 'gemini',
        apiKey: 'env-api-key',
        model: 'gemini-pro',
        rateLimitConfig: {
          requestsPerMinute: 30,
          retryAttempts: 3,
          retryDelayMs: 1000
        },
        timeout: 30000
      });
    });

    it('should use default provider when not specified', () => {
      process.env.GEMINI_API_KEY = 'env-api-key';

      const provider = AIProviderFactory.createFromEnvironment();

      expect(provider).toBe(mockGeminiProvider);
      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gemini' // Default provider
        })
      );
    });

    it('should throw AuthenticationError when API key is missing', () => {
      delete process.env.GEMINI_API_KEY;
      process.env.AI_PROVIDER = 'gemini';

      expect(() => AIProviderFactory.createFromEnvironment()).toThrow(AuthenticationError);
      expect(() => AIProviderFactory.createFromEnvironment()).toThrow('API key not found for provider');
    });

    it('should parse numeric environment variables', () => {
      process.env.GEMINI_API_KEY = 'env-api-key';
      process.env.AI_RATE_LIMIT_RPM = '120';
      process.env.AI_MAX_RETRIES = '5';
      process.env.AI_RETRY_DELAY_MS = '2000';
      process.env.AI_TIMEOUT_MS = '60000';

      AIProviderFactory.createFromEnvironment();

      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimitConfig: {
            requestsPerMinute: 120,
            retryAttempts: 5,
            retryDelayMs: 2000
          },
          timeout: 60000
        })
      );
    });
  });

  describe('provider registry', () => {
    it('should list available providers', () => {
      const providers = AIProviderFactory.getAvailableProviders();
      expect(providers).toContain('gemini');
    });

    it('should get provider information', () => {
      const info = AIProviderFactory.getProviderInfo('gemini');
      
      expect(info).toEqual({
        name: 'Google Gemini',
        factory: expect.any(Function),
        description: expect.any(String),
        supportedFeatures: expect.any(Array)
      });
    });

    it('should return undefined for unknown provider info', () => {
      const info = AIProviderFactory.getProviderInfo('unknown');
      expect(info).toBeUndefined();
    });

    it('should list all providers with details', () => {
      const providers = AIProviderFactory.listProviders();
      
      expect(providers).toEqual([
        {
          id: 'gemini',
          name: 'Google Gemini',
          factory: expect.any(Function),
          description: expect.any(String),
          supportedFeatures: expect.any(Array)
        }
      ]);
    });

    it('should check provider availability', () => {
      expect(AIProviderFactory.isProviderAvailable('gemini')).toBe(true);
      expect(AIProviderFactory.isProviderAvailable('unknown')).toBe(false);
    });
  });

  describe('default provider management', () => {
    it('should get default provider', () => {
      const defaultProvider = AIProviderFactory.getDefaultProvider();
      expect(defaultProvider).toBe('gemini');
    });

    it('should set default provider', () => {
      AIProviderFactory.setDefaultProvider('gemini');
      expect(AIProviderFactory.getDefaultProvider()).toBe('gemini');
    });

    it('should throw error when setting unknown default provider', () => {
      expect(() => AIProviderFactory.setDefaultProvider('unknown')).toThrow(ValidationError);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key',
        model: 'gemini-pro'
      };

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing provider', () => {
      const config = {
        apiKey: 'test-api-key'
      } as AIProviderConfig;

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Provider type is required');
    });

    it('should detect unknown provider', () => {
      const config: AIProviderConfig = {
        provider: 'unknown' as any,
        apiKey: 'test-api-key'
      };

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown provider: unknown');
    });

    it('should detect missing API key', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: ''
      };

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    it('should validate timeout', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key',
        timeout: 500 // Too low
      };

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be at least 1000ms');
    });

    it('should validate rate limit configuration', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key',
        rateLimitConfig: {
          requestsPerMinute: 0, // Invalid
          retryAttempts: -1, // Invalid
          retryDelayMs: -100 // Invalid
        }
      };

      const result = AIProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Requests per minute must be greater than 0');
      expect(result.errors).toContain('Retry attempts cannot be negative');
      expect(result.errors).toContain('Retry delay cannot be negative');
    });
  });

  describe('createEnhancedProvider', () => {
    it('should create enhanced provider with rate limiting', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key',
        rateLimitConfig: {
          requestsPerMinute: 60,
          retryAttempts: 3,
          retryDelayMs: 1000
        }
      };

      const enhancedProvider = AIProviderFactory.createEnhancedProvider(config);
      
      expect(enhancedProvider).toBeInstanceOf(EnhancedAIProvider);
    });

    it('should create enhanced provider without rate limiting', () => {
      const config: AIProviderConfig = {
        provider: 'gemini',
        apiKey: 'test-api-key'
      };

      const enhancedProvider = AIProviderFactory.createEnhancedProvider(config);
      
      expect(enhancedProvider).toBeInstanceOf(EnhancedAIProvider);
    });
  });
});

describe('EnhancedAIProvider', () => {
  let mockBaseProvider: jest.Mocked<GeminiProvider>;
  let enhancedProvider: EnhancedAIProvider;
  let config: AIProviderConfig;

  beforeEach(() => {
    mockBaseProvider = {
      generateText: jest.fn().mockResolvedValue('enhanced text'),
      chat: jest.fn().mockResolvedValue('enhanced chat'),
      generateStructured: jest.fn().mockResolvedValue({ result: 'enhanced' }),
      generateResponse: jest.fn().mockResolvedValue({
        content: 'enhanced response',
        model: 'gemini-pro'
      }),
      chatResponse: jest.fn().mockResolvedValue({
        content: 'enhanced chat response',
        model: 'gemini-pro'
      }),
      countTokens: jest.fn().mockResolvedValue({ tokens: 10, characters: 50 }),
      getProviderName: jest.fn().mockReturnValue('gemini'),
      getModelInfo: jest.fn().mockReturnValue({
        name: 'gemini-pro',
        provider: 'gemini',
        version: '1.0',
        maxTokens: 30720,
        supportedFeatures: ['text-generation', 'chat']
      }),
      isReady: jest.fn().mockResolvedValue(true),
      testConnection: jest.fn().mockResolvedValue(true)
    } as any;

    config = {
      provider: 'gemini',
      apiKey: 'test-api-key',
      rateLimitConfig: {
        requestsPerMinute: 60,
        retryAttempts: 3,
        retryDelayMs: 1000
      }
    };

    enhancedProvider = new EnhancedAIProvider(mockBaseProvider, config);
  });

  it('should delegate calls to base provider', async () => {
    const result = await enhancedProvider.generateText('test prompt');
    
    expect(result).toBe('enhanced text');
    expect(mockBaseProvider.generateText).toHaveBeenCalledWith('test prompt', undefined);
  });

  it('should delegate chat calls to base provider', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const result = await enhancedProvider.chat(messages);
    
    expect(result).toBe('enhanced chat');
    expect(mockBaseProvider.chat).toHaveBeenCalledWith(messages, undefined);
  });

  it('should delegate structured generation to base provider', async () => {
    const schema = { type: 'object' as const, properties: {} };
    const result = await enhancedProvider.generateStructured('prompt', schema);
    
    expect(result).toEqual({ result: 'enhanced' });
    expect(mockBaseProvider.generateStructured).toHaveBeenCalledWith('prompt', schema, undefined);
  });

  it('should provide provider information', () => {
    expect(enhancedProvider.getProviderName()).toBe('gemini');
    expect(enhancedProvider.getModelInfo()).toEqual({
      name: 'gemini-pro',
      provider: 'gemini',
      version: '1.0',
      maxTokens: 30720,
      supportedFeatures: ['text-generation', 'chat']
    });
  });

  it('should delegate readiness checks', async () => {
    const isReady = await enhancedProvider.isReady();
    const connectionTest = await enhancedProvider.testConnection();
    
    expect(isReady).toBe(true);
    expect(connectionTest).toBe(true);
    expect(mockBaseProvider.isReady).toHaveBeenCalled();
    expect(mockBaseProvider.testConnection).toHaveBeenCalled();
  });

  it('should provide rate limiter status when configured', () => {
    const status = enhancedProvider.getRateLimiterStatus();
    expect(status).toBeDefined();
  });

  it('should provide retry configuration', () => {
    const retryConfig = enhancedProvider.getRetryConfig();
    expect(retryConfig).toBeDefined();
    expect(retryConfig?.maxAttempts).toBe(3);
  });
});
