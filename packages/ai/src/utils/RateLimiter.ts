/**
 * Rate limiter utility for AI API requests
 */

import { RateLimitConfig, RateLimitError } from '../interfaces';

/**
 * Request record for tracking rate limits
 */
interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * Rate limiter implementation with sliding window
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private requestHistory: RequestRecord[] = [];
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...{
        requestsPerMinute: 60,
        retryAttempts: 3,
        retryDelayMs: 1000
      },
      ...config
    };
  }

  /**
   * Check if a request can be made immediately
   */
  public canMakeRequest(): boolean {
    this.cleanupOldRequests();
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds
    
    const recentRequests = this.requestHistory.filter(
      record => record.timestamp > oneMinuteAgo
    );
    
    const totalRequests = recentRequests.reduce((sum, record) => sum + record.count, 0);
    
    return totalRequests < this.config.requestsPerMinute;
  }

  /**
   * Record a successful request
   */
  public recordRequest(): void {
    const now = Date.now();
    this.requestHistory.push({
      timestamp: now,
      count: 1
    });
    
    // Keep history manageable
    this.cleanupOldRequests();
  }

  /**
   * Wait for rate limit to allow request
   */
  public async waitForAvailability(): Promise<void> {
    if (this.canMakeRequest()) {
      return;
    }

    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Execute a function with rate limiting
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForAvailability();
    
    try {
      const result = await fn();
      this.recordRequest();
      return result;
    } catch (error) {
      // Don't record failed requests against rate limit
      throw error;
    }
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): {
    requestsInLastMinute: number;
    requestsRemaining: number;
    resetTime: number;
  } {
    this.cleanupOldRequests();
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = this.requestHistory.filter(
      record => record.timestamp > oneMinuteAgo
    );
    
    const requestsInLastMinute = recentRequests.reduce((sum, record) => sum + record.count, 0);
    const requestsRemaining = Math.max(0, this.config.requestsPerMinute - requestsInLastMinute);
    
    // Find the oldest request in the current window to determine reset time
    const oldestRequest = recentRequests.length > 0 ? 
      Math.min(...recentRequests.map(r => r.timestamp)) : now;
    const resetTime = oldestRequest + 60000; // 60 seconds from oldest request
    
    return {
      requestsInLastMinute,
      requestsRemaining,
      resetTime
    };
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (this.canMakeRequest()) {
        const resolve = this.requestQueue.shift();
        if (resolve) {
          resolve();
        }
      } else {
        // Wait for the next available slot
        const status = this.getStatus();
        const waitTime = Math.max(1000, status.resetTime - Date.now());
        await this.sleep(Math.min(waitTime, 5000)); // Max 5 second wait
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clean up old request records
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp > oneMinuteAgo
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  public reset(): void {
    this.requestHistory = [];
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
