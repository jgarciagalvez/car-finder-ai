/**
 * Retry handler with exponential backoff for AI operations
 */

import { 
  AIError, 
  RateLimitError, 
  NetworkError, 
  TimeoutError,
  AuthenticationError,
  ValidationError 
} from '../interfaces';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attempt: number;
  error: Error;
  nextDelayMs?: number;
}

/**
 * Retry handler with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'NetworkError',
        'TimeoutError',
        'RateLimitError',
        'AIError'
      ],
      ...config
    };
  }

  /**
   * Execute a function with retry logic
   */
  public async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: RetryAttempt) => void
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Calculate delay for next attempt
        const delayMs = this.calculateDelay(attempt, lastError);

        // Call retry callback if provided
        if (onRetry) {
          onRetry({
            attempt,
            error: lastError,
            nextDelayMs: delayMs
          });
        }

        // Wait before retrying
        await this.sleep(delayMs);
      }
    }

    // All attempts failed, throw the last error
    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Never retry authentication or validation errors
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      return false;
    }

    // Always retry rate limit errors (with appropriate delay)
    if (error instanceof RateLimitError) {
      return true;
    }

    // Always retry network and timeout errors
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return true;
    }

    // Check if it's a retryable AI error
    if (error instanceof AIError) {
      return error.retryable;
    }

    // Check by error name/type
    return this.config.retryableErrors.some(retryableType => 
      error.constructor.name === retryableType || 
      error.name === retryableType
    );
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, error: Error): number {
    // Special handling for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      return Math.min(error.retryAfter * 1000, this.config.maxDelayMs);
    }

    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = this.config.baseDelayMs * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Add jitter to prevent thundering herd (±25% random variation)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const delayWithJitter = exponentialDelay + jitter;

    // Ensure delay is within bounds
    return Math.min(Math.max(delayWithJitter, this.config.baseDelayMs), this.config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  public getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  public updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a retry handler with specific configuration for AI operations
   */
  public static forAI(config?: Partial<RetryConfig>): RetryHandler {
    return new RetryHandler({
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'NetworkError',
        'TimeoutError', 
        'RateLimitError',
        'AIError'
      ],
      ...config
    });
  }

  /**
   * Create a retry handler with aggressive retry for network issues
   */
  public static forNetwork(config?: Partial<RetryConfig>): RetryHandler {
    return new RetryHandler({
      maxAttempts: 5,
      baseDelayMs: 500,
      maxDelayMs: 10000,
      backoffMultiplier: 1.5,
      retryableErrors: [
        'NetworkError',
        'TimeoutError'
      ],
      ...config
    });
  }

  /**
   * Create a retry handler with conservative retry for rate limits
   */
  public static forRateLimit(config?: Partial<RetryConfig>): RetryHandler {
    return new RetryHandler({
      maxAttempts: 2,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      retryableErrors: [
        'RateLimitError'
      ],
      ...config
    });
  }
}
