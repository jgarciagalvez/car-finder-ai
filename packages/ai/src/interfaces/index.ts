/**
 * AI Provider Abstraction Layer - Interface Exports
 */

// Core provider interface
export type { IAIProvider } from './IAIProvider';

// Type definitions
export type {
  ChatMessage,
  GenerationOptions,
  ModelInfo,
  RateLimitConfig,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  GenerationSchema,
  PromptTemplate,
  TokenCount
} from './types';

// Error types
export {
  AIErrorType,
  AIError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  TimeoutError
} from './errors';

// Default export for CommonJS compatibility
import * as errors from './errors';
export default errors;
