/**
 * Base provider class with shared functionality
 */

import { 
  IAIProvider, 
  ModelInfo, 
  AIProviderConfig,
  GenerationOptions,
  TokenCount,
  ValidationError
} from '../interfaces';

/**
 * Abstract base class for AI providers
 * Provides common functionality and validation
 */
export abstract class BaseProvider implements IAIProvider {
  protected config: AIProviderConfig;
  protected modelInfo: ModelInfo;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.validateConfig(config);
    this.modelInfo = this.initializeModelInfo();
  }

  /**
   * Validate provider configuration
   */
  protected validateConfig(config: AIProviderConfig): void {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ValidationError('API key is required', 'apiKey');
    }

    if (!config.provider) {
      throw new ValidationError('Provider type is required', 'provider');
    }

    if (config.timeout && config.timeout < 1000) {
      throw new ValidationError('Timeout must be at least 1000ms', 'timeout');
    }
  }

  /**
   * Validate generation options
   */
  protected validateGenerationOptions(options?: GenerationOptions): void {
    if (!options) return;

    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new ValidationError('Temperature must be between 0 and 2', 'temperature');
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens < 1) {
        throw new ValidationError('Max tokens must be greater than 0', 'maxTokens');
      }
    }

    if (options.topP !== undefined) {
      if (options.topP < 0 || options.topP > 1) {
        throw new ValidationError('TopP must be between 0 and 1', 'topP');
      }
    }

    if (options.topK !== undefined) {
      if (options.topK < 1) {
        throw new ValidationError('TopK must be greater than 0', 'topK');
      }
    }
  }

  /**
   * Validate prompt input
   */
  protected validatePrompt(prompt: string): void {
    if (!prompt || prompt.trim() === '') {
      throw new ValidationError('Prompt cannot be empty', 'prompt');
    }

    if (prompt.length > 100000) { // 100k character limit
      throw new ValidationError('Prompt exceeds maximum length of 100,000 characters', 'prompt');
    }
  }

  /**
   * Initialize model information - to be implemented by subclasses
   */
  protected abstract initializeModelInfo(): ModelInfo;

  /**
   * Get provider name
   */
  public getProviderName(): string {
    return this.config.provider;
  }

  /**
   * Get model information
   */
  public getModelInfo(): ModelInfo {
    return this.modelInfo;
  }

  /**
   * Basic token counting (rough estimation)
   * Subclasses should override with provider-specific implementation
   */
  public async countTokens(text: string): Promise<TokenCount> {
    // Rough estimation: ~4 characters per token for English text
    const characters = text.length;
    const tokens = Math.ceil(characters / 4);
    
    return {
      tokens,
      characters,
      estimatedCost: undefined // To be calculated by specific providers
    };
  }

  /**
   * Default connection test - to be overridden by subclasses
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.generateText('Hello', { maxTokens: 5 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if provider is ready - to be overridden by subclasses
   */
  public async isReady(): Promise<boolean> {
    return this.config.apiKey !== undefined && this.config.apiKey.trim() !== '';
  }

  // Abstract methods that must be implemented by subclasses
  public abstract generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  public abstract chat(messages: import('../interfaces').ChatMessage[], options?: GenerationOptions): Promise<string>;
  public abstract generateStructured<T>(prompt: string, schema: import('../interfaces').GenerationSchema, options?: GenerationOptions): Promise<T>;
  public abstract generateResponse(prompt: string, options?: GenerationOptions): Promise<import('../interfaces').AIResponse>;
  public abstract chatResponse(messages: import('../interfaces').ChatMessage[], options?: GenerationOptions): Promise<import('../interfaces').AIResponse>;
}
