/**
 * Google Gemini AI provider implementation
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import { 
  ChatMessage, 
  GenerationOptions, 
  ModelInfo, 
  AIProviderConfig,
  AIResponse,
  GenerationSchema,
  AIError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError
} from '../interfaces';

/**
 * Gemini AI provider implementation
 */
export class GeminiProvider extends BaseProvider {
  private genAI!: GoogleGenerativeAI;
  private model!: GenerativeModel;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.defaultModel = config.model || 'gemini-pro';
    this.initializeGemini();
  }

  /**
   * Initialize Gemini AI client
   */
  private initializeGemini(): void {
    try {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.defaultModel });
    } catch (error) {
      throw new AuthenticationError(
        `Failed to initialize Gemini client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GEMINI_INIT_ERROR'
      );
    }
  }

  /**
   * Initialize model information
   */
  protected initializeModelInfo(): ModelInfo {
    return {
      name: this.defaultModel || 'gemini-pro',
      provider: 'gemini',
      version: '1.0',
      maxTokens: 30720, // Gemini Pro context window
      supportedFeatures: [
        'text-generation',
        'chat',
        'structured-output',
        'token-counting'
      ]
    };
  }

  /**
   * Convert generation options to Gemini format
   */
  private convertGenerationOptions(options?: GenerationOptions): GenerationConfig {
    if (!options) return {};

    const config: GenerationConfig = {};

    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    if (options.maxTokens !== undefined) {
      config.maxOutputTokens = options.maxTokens;
    }

    if (options.topP !== undefined) {
      config.topP = options.topP;
    }

    if (options.topK !== undefined) {
      config.topK = options.topK;
    }

    if (options.stopSequences !== undefined) {
      config.stopSequences = options.stopSequences;
    }

    return config;
  }

  /**
   * Handle Gemini API errors and convert to our error types
   */
  private handleGeminiError(error: any): never {
    const message = error?.message || 'Unknown Gemini API error';
    const status = error?.status || error?.code;

    // Authentication errors
    if (status === 401 || message.includes('API key')) {
      throw new AuthenticationError(
        `Gemini authentication failed: ${message}`,
        'GEMINI_AUTH_ERROR'
      );
    }

    // Rate limiting errors
    if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
      const retryAfter = error?.retryAfter || 60; // Default to 60 seconds
      throw new RateLimitError(
        `Gemini rate limit exceeded: ${message}`,
        retryAfter,
        'GEMINI_RATE_LIMIT'
      );
    }

    // Network errors
    if (status >= 500 || message.includes('network') || message.includes('timeout')) {
      throw new NetworkError(
        `Gemini network error: ${message}`,
        'GEMINI_NETWORK_ERROR'
      );
    }

    // Validation errors
    if (status === 400 || message.includes('invalid')) {
      throw new ValidationError(
        `Gemini validation error: ${message}`,
        undefined,
        'GEMINI_VALIDATION_ERROR'
      );
    }

    // Generic AI error
    throw new AIError(
      `Gemini API error: ${message}`,
      undefined,
      'GEMINI_API_ERROR',
      status,
      status >= 500 // Retry on server errors
    );
  }

  /**
   * Single-turn text generation
   */
  public async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    this.validatePrompt(prompt);
    this.validateGenerationOptions(options);

    try {
      const generationConfig = this.convertGenerationOptions(options);
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new AIError('Empty response from Gemini API', undefined, 'EMPTY_RESPONSE');
      }

      return text;
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  /**
   * Multi-turn conversation
   */
  public async chat(messages: ChatMessage[], options?: GenerationOptions): Promise<string> {
    if (!messages || messages.length === 0) {
      throw new ValidationError('Messages array cannot be empty', 'messages');
    }

    this.validateGenerationOptions(options);

    try {
      const generationConfig = this.convertGenerationOptions(options);
      
      // Convert our ChatMessage format to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const result = await this.model.generateContent({
        contents,
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new AIError('Empty response from Gemini API', undefined, 'EMPTY_RESPONSE');
      }

      return text;
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  /**
   * Structured data generation (JSON)
   */
  public async generateStructured<T>(
    prompt: string, 
    schema: GenerationSchema, 
    options?: GenerationOptions
  ): Promise<T> {
    this.validatePrompt(prompt);
    this.validateGenerationOptions(options);

    // Add JSON formatting instructions to the prompt
    const structuredPrompt = `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema, null, 2)}\n\nResponse:`;

    try {
      const text = await this.generateText(structuredPrompt, options);
      
      // Try to extract JSON from the response
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        const parsed = JSON.parse(jsonText);
        return parsed as T;
      } catch (parseError) {
        throw new ValidationError(
          `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
          'response',
          'JSON_PARSE_ERROR'
        );
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AIError) {
        throw error;
      }
      this.handleGeminiError(error);
    }
  }

  /**
   * Advanced response with metadata
   */
  public async generateResponse(prompt: string, options?: GenerationOptions): Promise<AIResponse> {
    this.validatePrompt(prompt);
    this.validateGenerationOptions(options);

    try {
      const generationConfig = this.convertGenerationOptions(options);
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new AIError('Empty response from Gemini API', undefined, 'EMPTY_RESPONSE');
      }

      // Extract usage information if available
      const usage = response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount
      } : undefined;

      return {
        content: text,
        model: this.defaultModel,
        usage,
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
        metadata: {
          provider: 'gemini',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  /**
   * Multi-turn conversation with full response metadata
   */
  public async chatResponse(messages: ChatMessage[], options?: GenerationOptions): Promise<AIResponse> {
    if (!messages || messages.length === 0) {
      throw new ValidationError('Messages array cannot be empty', 'messages');
    }

    this.validateGenerationOptions(options);

    try {
      const generationConfig = this.convertGenerationOptions(options);
      
      // Convert our ChatMessage format to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const result = await this.model.generateContent({
        contents,
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new AIError('Empty response from Gemini API', undefined, 'EMPTY_RESPONSE');
      }

      // Extract usage information if available
      const usage = response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount
      } : undefined;

      return {
        content: text,
        model: this.defaultModel,
        usage,
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
        metadata: {
          provider: 'gemini',
          timestamp: new Date().toISOString(),
          conversationLength: messages.length
        }
      };
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  /**
   * Map Gemini finish reason to our standard format
   */
  private mapFinishReason(reason?: string): AIResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * Count tokens using Gemini's token counting
   */
  public async countTokens(text: string): Promise<import('../interfaces').TokenCount> {
    try {
      const result = await this.model.countTokens(text);
      
      return {
        tokens: result.totalTokens,
        characters: text.length,
        estimatedCost: undefined // Could be calculated based on Gemini pricing
      };
    } catch (error) {
      // Fallback to base implementation if token counting fails
      return super.countTokens(text);
    }
  }

  /**
   * Test connection to Gemini API
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
   * Check if provider is ready
   */
  public async isReady(): Promise<boolean> {
    const baseReady = await super.isReady();
    if (!baseReady) return false;

    try {
      // Test if we can initialize the model
      return this.model !== undefined;
    } catch {
      return false;
    }
  }
}
