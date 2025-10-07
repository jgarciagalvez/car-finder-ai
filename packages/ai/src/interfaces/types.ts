/**
 * Core types for AI provider abstraction layer
 */

/**
 * Chat message structure for conversational AI
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Generation options for AI requests
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

/**
 * Model information
 */
export interface ModelInfo {
  name: string;
  provider: string;
  version?: string;
  maxTokens?: number;
  supportedFeatures: string[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay?: number;
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic'; // Future extensibility
  apiKey: string;
  model?: string;
  rateLimitConfig?: RateLimitConfig;
  baseUrl?: string; // For custom endpoints
  timeout?: number; // Request timeout in milliseconds
}

/**
 * AI request context for structured operations
 */
export interface AIRequest {
  prompt: string;
  options?: GenerationOptions;
  context?: Record<string, any>;
}

/**
 * AI response structure
 */
export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call';
  metadata?: Record<string, any>;
}

/**
 * Structured generation schema for JSON responses
 */
export interface GenerationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, GenerationSchema>;
  items?: GenerationSchema;
  required?: string[];
  description?: string;
}

/**
 * Prompt template for reusable prompts
 */
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
  category?: string;
}

/**
 * Token count estimation
 */
export interface TokenCount {
  tokens: number;
  characters: number;
  estimatedCost?: number;
}
