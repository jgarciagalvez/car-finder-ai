/**
 * AI Provider Abstraction Layer - Main Exports
 * 
 * This package provides a unified interface for AI operations with support for
 * multiple providers, rate limiting, retry logic, and prompt engineering utilities.
 */

// Core interfaces and types
export * from './interfaces';

// Provider implementations
export * from './providers';

// Factory for creating providers
export * from './factory';

// Utilities for AI operations
export * from './utils';

// Re-export commonly used items for convenience
export type { IAIProvider } from './interfaces/IAIProvider';
export { GeminiProvider } from './providers/GeminiProvider';
export { AIProviderFactory } from './factory/AIProviderFactory';
export { PromptBuilder, SystemMessageType } from './utils/PromptBuilder';
