/**
 * AI Provider Factory for creating and managing AI provider instances
 */

import {
  IAIProvider,
  AIProviderConfig,
  ValidationError,
  AuthenticationError
} from '../interfaces';
import { GeminiProvider } from '../providers';

/**
 * Provider registry entry
 */
interface ProviderRegistryEntry {
  name: string;
  factory: (config: AIProviderConfig) => IAIProvider;
  description: string;
  supportedFeatures: string[];
}

/**
 * AI Provider Factory
 */
export class AIProviderFactory {
  private static registry: Map<string, ProviderRegistryEntry> = new Map();
  private static defaultProvider: string = 'gemini';

  /**
   * Initialize the factory with default providers
   */
  static {
    // Register Gemini provider
    AIProviderFactory.registerProvider('gemini', {
      name: 'Google Gemini',
      factory: (config: AIProviderConfig) => new GeminiProvider(config),
      description: 'Google Gemini AI provider with text generation and chat capabilities',
      supportedFeatures: [
        'text-generation',
        'chat',
        'structured-output',
        'token-counting'
      ]
    });
  }

  /**
   * Register a new provider
   */
  public static registerProvider(
    id: string, 
    entry: ProviderRegistryEntry
  ): void {
    this.registry.set(id, entry);
  }

  /**
   * Create provider instance
   */
  public static createProvider(config: AIProviderConfig): IAIProvider {
    if (!config.provider) {
      throw new ValidationError('Provider type is required', 'provider');
    }

    const entry = this.registry.get(config.provider);
    if (!entry) {
      throw new ValidationError(
        `Unknown provider: ${config.provider}. Available providers: ${this.getAvailableProviders().join(', ')}`,
        'provider'
      );
    }

    try {
      return entry.factory(config);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new ValidationError(
        `Failed to create provider '${config.provider}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'provider'
      );
    }
  }

  /**
   * Create provider from environment variables
   * @param modelName Optional model name override (if not provided, uses AI_MODEL env var)
   */
  public static createFromEnvironment(modelName?: string): IAIProvider {
    const provider = process.env.AI_PROVIDER || this.defaultProvider;
    const apiKey = this.getApiKeyFromEnvironment(provider);
    const model = modelName || process.env.AI_MODEL;

    const config: AIProviderConfig = {
      provider: provider as AIProviderConfig['provider'],
      apiKey,
      model,
      rateLimitConfig: {
        requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_RPM || '60'),
        retryAttempts: parseInt(process.env.AI_MAX_RETRIES || '3'),
        retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS || '1000')
      },
      timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000')
    };

    return this.createProvider(config);
  }

  /**
   * Get API key from environment for specific provider
   */
  private static getApiKeyFromEnvironment(provider: string): string {
    let apiKey: string | undefined;

    switch (provider) {
      case 'gemini':
        apiKey = process.env.GEMINI_API_KEY;
        break;
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      default:
        apiKey = process.env.AI_API_KEY;
    }

    if (!apiKey) {
      throw new AuthenticationError(
        `API key not found for provider '${provider}'. Please set the appropriate environment variable.`,
        'MISSING_API_KEY'
      );
    }

    return apiKey;
  }

  /**
   * Get available providers
   */
  public static getAvailableProviders(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get provider information
   */
  public static getProviderInfo(providerId: string): ProviderRegistryEntry | undefined {
    return this.registry.get(providerId);
  }

  /**
   * List all registered providers with their information
   */
  public static listProviders(): Array<{ id: string } & ProviderRegistryEntry> {
    return Array.from(this.registry.entries()).map(([id, entry]) => ({
      id,
      ...entry
    }));
  }

  /**
   * Check if provider is available
   */
  public static isProviderAvailable(providerId: string): boolean {
    return this.registry.has(providerId);
  }

  /**
   * Set default provider
   */
  public static setDefaultProvider(providerId: string): void {
    if (!this.registry.has(providerId)) {
      throw new ValidationError(
        `Cannot set default provider to '${providerId}': provider not registered`,
        'provider'
      );
    }
    this.defaultProvider = providerId;
  }

  /**
   * Get default provider
   */
  public static getDefaultProvider(): string {
    return this.defaultProvider;
  }

  /**
   * Create provider with rate limiting and retry logic
   */
  public static createEnhancedProvider(config: AIProviderConfig): EnhancedAIProvider {
    const baseProvider = this.createProvider(config);
    return new EnhancedAIProvider(baseProvider, config);
  }

  /**
   * Validate provider configuration
   */
  public static validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider type is required');
    } else if (!this.registry.has(config.provider)) {
      errors.push(`Unknown provider: ${config.provider}`);
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    if (config.rateLimitConfig) {
      const rateLimitConfig = config.rateLimitConfig;
      
      if (rateLimitConfig.requestsPerMinute < 1) {
        errors.push('Requests per minute must be greater than 0');
      }

      if (rateLimitConfig.retryAttempts < 0) {
        errors.push('Retry attempts cannot be negative');
      }

      if (rateLimitConfig.retryDelayMs < 0) {
        errors.push('Retry delay cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Enhanced AI provider with built-in rate limiting and retry logic
 */
export class EnhancedAIProvider implements IAIProvider {
  private baseProvider: IAIProvider;
  private rateLimiter?: import('../utils').RateLimiter;
  private retryHandler?: import('../utils').RetryHandler;

  constructor(baseProvider: IAIProvider, config: AIProviderConfig) {
    this.baseProvider = baseProvider;

    // Initialize rate limiter if configured
    if (config.rateLimitConfig) {
      const { RateLimiter } = require('../utils');
      this.rateLimiter = new RateLimiter(config.rateLimitConfig);
    }

    // Initialize retry handler
    const { RetryHandler } = require('../utils');
    this.retryHandler = RetryHandler.forAI(
      config.rateLimitConfig ? {
        maxAttempts: config.rateLimitConfig.retryAttempts,
        baseDelayMs: config.rateLimitConfig.retryDelayMs
      } : undefined
    );
  }

  /**
   * Execute with rate limiting and retry logic
   */
  private async executeWithEnhancements<T>(fn: () => Promise<T>): Promise<T> {
    const wrappedFn = this.rateLimiter ? 
      () => this.rateLimiter!.execute(fn) : 
      fn;

    return this.retryHandler ? 
      this.retryHandler.execute(wrappedFn) : 
      wrappedFn();
  }

  // Implement IAIProvider interface with enhancements
  public async generateText(prompt: string, options?: import('../interfaces').GenerationOptions): Promise<string> {
    return this.executeWithEnhancements(() => this.baseProvider.generateText(prompt, options));
  }

  public async chat(messages: import('../interfaces').ChatMessage[], options?: import('../interfaces').GenerationOptions): Promise<string> {
    return this.executeWithEnhancements(() => this.baseProvider.chat(messages, options));
  }

  public async generateStructured<T>(prompt: string, schema: import('../interfaces').GenerationSchema, options?: import('../interfaces').GenerationOptions): Promise<T> {
    return this.executeWithEnhancements(() => this.baseProvider.generateStructured<T>(prompt, schema, options));
  }

  public async generateResponse(prompt: string, options?: import('../interfaces').GenerationOptions): Promise<import('../interfaces').AIResponse> {
    return this.executeWithEnhancements(() => this.baseProvider.generateResponse(prompt, options));
  }

  public async chatResponse(messages: import('../interfaces').ChatMessage[], options?: import('../interfaces').GenerationOptions): Promise<import('../interfaces').AIResponse> {
    return this.executeWithEnhancements(() => this.baseProvider.chatResponse(messages, options));
  }

  public async countTokens(text: string): Promise<import('../interfaces').TokenCount> {
    return this.executeWithEnhancements(() => this.baseProvider.countTokens(text));
  }

  public getProviderName(): string {
    return this.baseProvider.getProviderName();
  }

  public getModelInfo(): import('../interfaces').ModelInfo {
    return this.baseProvider.getModelInfo();
  }

  public async isReady(): Promise<boolean> {
    return this.baseProvider.isReady();
  }

  public async testConnection(): Promise<boolean> {
    return this.executeWithEnhancements(() => this.baseProvider.testConnection());
  }

  /**
   * Get rate limiter status
   */
  public getRateLimiterStatus() {
    return this.rateLimiter?.getStatus();
  }

  /**
   * Get retry handler configuration
   */
  public getRetryConfig() {
    return this.retryHandler?.getConfig();
  }
}
