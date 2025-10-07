/**
 * Core AI provider interface for the abstraction layer
 */

import { 
  ChatMessage, 
  GenerationOptions, 
  ModelInfo, 
  AIResponse,
  GenerationSchema,
  TokenCount 
} from './types';

/**
 * Main interface for AI providers
 * All AI providers must implement this interface to ensure consistent behavior
 */
export interface IAIProvider {
  /**
   * Single-turn text generation
   * @param prompt The input prompt for text generation
   * @param options Optional generation parameters
   * @returns Promise resolving to generated text
   */
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;

  /**
   * Multi-turn conversation
   * @param messages Array of conversation messages
   * @param options Optional generation parameters
   * @returns Promise resolving to AI response
   */
  chat(messages: ChatMessage[], options?: GenerationOptions): Promise<string>;

  /**
   * Structured data generation (JSON)
   * @param prompt The input prompt for structured generation
   * @param schema JSON schema defining the expected structure
   * @param options Optional generation parameters
   * @returns Promise resolving to parsed structured data
   */
  generateStructured<T>(
    prompt: string, 
    schema: GenerationSchema, 
    options?: GenerationOptions
  ): Promise<T>;

  /**
   * Advanced response with metadata
   * @param prompt The input prompt
   * @param options Optional generation parameters
   * @returns Promise resolving to full AI response with metadata
   */
  generateResponse(prompt: string, options?: GenerationOptions): Promise<AIResponse>;

  /**
   * Multi-turn conversation with full response metadata
   * @param messages Array of conversation messages
   * @param options Optional generation parameters
   * @returns Promise resolving to full AI response with metadata
   */
  chatResponse(messages: ChatMessage[], options?: GenerationOptions): Promise<AIResponse>;

  /**
   * Count tokens in text for cost estimation
   * @param text The text to count tokens for
   * @returns Promise resolving to token count information
   */
  countTokens(text: string): Promise<TokenCount>;

  /**
   * Get provider name
   * @returns The name of the AI provider (e.g., 'gemini', 'openai')
   */
  getProviderName(): string;

  /**
   * Get model information
   * @returns Information about the current model
   */
  getModelInfo(): ModelInfo;

  /**
   * Check if the provider is properly configured and ready
   * @returns Promise resolving to true if ready, false otherwise
   */
  isReady(): Promise<boolean>;

  /**
   * Test the provider connection
   * @returns Promise resolving to true if connection is successful
   */
  testConnection(): Promise<boolean>;
}
