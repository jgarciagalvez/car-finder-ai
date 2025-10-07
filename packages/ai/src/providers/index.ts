/**
 * AI Providers - Export all provider implementations
 */

export { BaseProvider } from './BaseProvider';
export { GeminiProvider } from './GeminiProvider';

// Default export for CommonJS compatibility
export default {
  BaseProvider: require('./BaseProvider').BaseProvider,
  GeminiProvider: require('./GeminiProvider').GeminiProvider
};
