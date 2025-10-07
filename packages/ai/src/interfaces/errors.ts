/**
 * AI-specific error types for the provider abstraction layer
 */

export enum AIErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Base AI error class
 */
export class AIError extends Error {
  public readonly type: AIErrorType;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: AIErrorType = AIErrorType.UNKNOWN,
    code?: string,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }
}

/**
 * Rate limiting error - thrown when API rate limits are exceeded
 */
export class RateLimitError extends AIError {
  public readonly retryAfter?: number; // seconds to wait before retry

  constructor(message: string, retryAfter?: number, code?: string) {
    super(message, AIErrorType.RATE_LIMIT, code, 429, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Authentication error - thrown when API key is invalid or missing
 */
export class AuthenticationError extends AIError {
  constructor(message: string, code?: string) {
    super(message, AIErrorType.AUTHENTICATION, code, 401, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends AIError {
  public readonly field?: string;

  constructor(message: string, field?: string, code?: string) {
    super(message, AIErrorType.VALIDATION, code, 400, false);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Network error - thrown when network requests fail
 */
export class NetworkError extends AIError {
  constructor(message: string, code?: string) {
    super(message, AIErrorType.NETWORK, code, undefined, true);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error - thrown when requests exceed timeout limits
 */
export class TimeoutError extends AIError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, code?: string) {
    super(message, AIErrorType.TIMEOUT, code, 408, true);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
