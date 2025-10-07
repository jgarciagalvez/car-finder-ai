/**
 * Integration tests for Gemini provider with real API
 * These tests require a valid GEMINI_API_KEY environment variable
 */

import { GeminiProvider } from '../../providers/GeminiProvider';
import { AIProviderFactory } from '../../factory/AIProviderFactory';
import { AIProviderConfig, ChatMessage } from '../../interfaces';

// Skip integration tests if no API key is available
const hasApiKey = !!process.env.GEMINI_API_KEY;
const describeIntegration = hasApiKey ? describe : describe.skip;

describeIntegration('Gemini Integration Tests', () => {
  let provider: GeminiProvider;
  let config: AIProviderConfig;

  beforeAll(() => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Skipping Gemini integration tests: GEMINI_API_KEY not set');
      return;
    }

    config = {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-pro',
      rateLimitConfig: {
        requestsPerMinute: 10, // Conservative for testing
        retryAttempts: 2,
        retryDelayMs: 1000
      },
      timeout: 30000
    };

    provider = new GeminiProvider(config);
  });

  describe('provider initialization', () => {
    it('should initialize successfully with valid API key', () => {
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('should report as ready', async () => {
      const isReady = await provider.isReady();
      expect(isReady).toBe(true);
    });

    it('should pass connection test', async () => {
      const connectionTest = await provider.testConnection();
      expect(connectionTest).toBe(true);
    }, 15000); // Longer timeout for network call
  });

  describe('text generation', () => {
    it('should generate text from simple prompt', async () => {
      const result = await provider.generateText('Say hello in a friendly way.');
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.toLowerCase()).toContain('hello');
    }, 15000);

    it('should respect generation options', async () => {
      const result = await provider.generateText(
        'Write a very short greeting.',
        { maxTokens: 10, temperature: 0.1 }
      );
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // With low temperature and max tokens, should be short and consistent
      expect(result.split(' ').length).toBeLessThanOrEqual(15);
    }, 15000);

    it('should handle longer prompts', async () => {
      const longPrompt = `
        Please analyze the following scenario and provide a brief summary:
        A person is looking to buy a used car. They have a budget of €15,000
        and need a reliable vehicle for daily commuting. They prefer fuel-efficient
        cars and are considering both petrol and hybrid options.
        What advice would you give them?
      `;

      const result = await provider.generateText(longPrompt);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
      expect(result.toLowerCase()).toMatch(/car|vehicle|budget|fuel/);
    }, 20000);
  });

  describe('chat functionality', () => {
    it('should handle single-turn conversation', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is the capital of France?' }
      ];

      const result = await provider.chat(messages);
      
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('paris');
    }, 15000);

    it('should handle multi-turn conversation', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, I need help with car buying.' },
        { role: 'model', content: 'Hello! I\'d be happy to help you with car buying. What specific questions do you have?' },
        { role: 'user', content: 'What should I check when buying a used car?' }
      ];

      const result = await provider.chat(messages);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
      expect(result.toLowerCase()).toMatch(/check|inspect|condition|history/);
    }, 20000);

    it('should maintain conversation context', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'I\'m looking at a 2018 Toyota Camry with 50,000 miles.' },
        { role: 'model', content: 'That sounds like a good option. The 2018 Camry is known for reliability.' },
        { role: 'user', content: 'What price range should I expect for it?' }
      ];

      const result = await provider.chat(messages);
      
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toMatch(/price|cost|\$|€|thousand|range/);
    }, 20000);
  });

  describe('structured generation', () => {
    it('should generate valid JSON structure', async () => {
      const schema = {
        type: 'object' as const,
        properties: {
          recommendation: { type: 'string' as const },
          confidence: { type: 'number' as const },
          reasons: {
            type: 'array' as const,
            items: { type: 'string' as const }
          }
        },
        required: ['recommendation', 'confidence']
      };

      const prompt = `
        Analyze this car listing and provide a structured recommendation:
        2019 Honda Civic, 35,000 miles, €18,000, good condition, single owner.
      `;

      const result = await provider.generateStructured<{
        recommendation: string;
        confidence: number;
        reasons?: string[];
      }>(prompt, schema);
      
      expect(typeof result).toBe('object');
      expect(typeof result.recommendation).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.recommendation.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, 25000);

    it('should handle complex nested structures', async () => {
      const schema = {
        type: 'object' as const,
        properties: {
          vehicle: {
            type: 'object' as const,
            properties: {
              make: { type: 'string' as const },
              model: { type: 'string' as const },
              year: { type: 'number' as const }
            }
          },
          analysis: {
            type: 'object' as const,
            properties: {
              marketValue: { type: 'string' as const },
              condition: { type: 'string' as const },
              recommendation: { type: 'string' as const }
            }
          }
        }
      };

      const prompt = `
        Extract vehicle information and provide analysis for:
        "2020 BMW X3 with 25,000 miles, asking price €35,000"
      `;

      const result = await provider.generateStructured<{
        vehicle: { make: string; model: string; year: number };
        analysis: { marketValue: string; condition: string; recommendation: string };
      }>(prompt, schema);
      
      expect(typeof result).toBe('object');
      expect(result.vehicle).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(typeof result.vehicle.make).toBe('string');
      expect(typeof result.vehicle.year).toBe('number');
    }, 25000);
  });

  describe('advanced response features', () => {
    it('should return response with metadata', async () => {
      const response = await provider.generateResponse('Explain hybrid cars briefly.');
      
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.model).toBe('gemini-pro');
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.provider).toBe('gemini');
      
      // Usage metadata might be available
      if (response.usage) {
        expect(typeof response.usage.totalTokens).toBe('number');
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      }
    }, 15000);

    it('should return chat response with metadata', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What are the benefits of electric vehicles?' }
      ];

      const response = await provider.chatResponse(messages);
      
      expect(response.content).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.model).toBe('gemini-pro');
      expect(response.metadata?.conversationLength).toBe(1);
    }, 15000);
  });

  describe('token counting', () => {
    it('should count tokens accurately', async () => {
      const text = 'This is a test sentence for token counting.';
      const tokenCount = await provider.countTokens(text);
      
      expect(tokenCount.tokens).toBeGreaterThan(0);
      expect(tokenCount.characters).toBe(text.length);
      expect(tokenCount.tokens).toBeLessThan(text.length); // Tokens should be fewer than characters
    }, 10000);

    it('should handle longer text', async () => {
      const longText = `
        The automotive industry is undergoing a significant transformation
        with the rise of electric vehicles, autonomous driving technology,
        and new mobility services. Traditional automakers are adapting
        their strategies to compete with new entrants and changing consumer
        preferences. This shift represents both challenges and opportunities
        for the industry as a whole.
      `.trim();

      const tokenCount = await provider.countTokens(longText);
      
      expect(tokenCount.tokens).toBeGreaterThan(20);
      expect(tokenCount.characters).toBe(longText.length);
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array(5).fill(null).map((_, i) => 
        provider.generateText(`Count to ${i + 1}`)
      );

      // All requests should eventually succeed (with rate limiting/retry)
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    }, 60000); // Longer timeout to account for rate limiting delays
  });

  describe('factory integration', () => {
    it('should create provider via factory from environment', () => {
      const factoryProvider = AIProviderFactory.createFromEnvironment();
      
      expect(factoryProvider).toBeInstanceOf(GeminiProvider);
      expect(factoryProvider.getProviderName()).toBe('gemini');
    });

    it('should create enhanced provider with rate limiting', async () => {
      const enhancedProvider = AIProviderFactory.createEnhancedProvider(config);
      
      const result = await enhancedProvider.generateText('Test enhanced provider');
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // Should have rate limiter status
      const status = enhancedProvider.getRateLimiterStatus();
      expect(status).toBeDefined();
    }, 15000);
  });
});
