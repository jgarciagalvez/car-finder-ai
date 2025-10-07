/**
 * Tests for RateLimiter
 */

import { RateLimiter } from '../utils/RateLimiter';
import { RateLimitConfig } from '../interfaces';

// Mock setTimeout and Date for testing
jest.useFakeTimers();

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let config: RateLimitConfig;

  beforeEach(() => {
    config = {
      requestsPerMinute: 3,
      retryAttempts: 2,
      retryDelayMs: 1000
    };
    rateLimiter = new RateLimiter(config);
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('constructor', () => {
    it('should create rate limiter with default config', () => {
      const defaultLimiter = new RateLimiter({} as RateLimitConfig);
      expect(defaultLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = { requestsPerMinute: 10 };
      const limiter = new RateLimiter(customConfig as RateLimitConfig);
      expect(limiter).toBeInstanceOf(RateLimiter);
    });
  });

  describe('canMakeRequest', () => {
    it('should allow requests under the limit', () => {
      expect(rateLimiter.canMakeRequest()).toBe(true);
      
      rateLimiter.recordRequest();
      expect(rateLimiter.canMakeRequest()).toBe(true);
      
      rateLimiter.recordRequest();
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });

    it('should deny requests over the limit', () => {
      // Make 3 requests (at the limit)
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });

    it('should allow requests after time window passes', () => {
      // Fill up the rate limit
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      expect(rateLimiter.canMakeRequest()).toBe(false);
      
      // Advance time by 61 seconds (past the 60-second window)
      jest.advanceTimersByTime(61000);
      
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });

  describe('recordRequest', () => {
    it('should record successful requests', () => {
      const initialStatus = rateLimiter.getStatus();
      expect(initialStatus.requestsInLastMinute).toBe(0);
      
      rateLimiter.recordRequest();
      
      const statusAfterRequest = rateLimiter.getStatus();
      expect(statusAfterRequest.requestsInLastMinute).toBe(1);
    });

    it('should maintain request history', () => {
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      const status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(2);
      expect(status.requestsRemaining).toBe(1);
    });
  });

  describe('waitForAvailability', () => {
    it('should resolve immediately when requests are available', async () => {
      const promise = rateLimiter.waitForAvailability();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should queue requests when rate limit is reached', async () => {
      // Fill up the rate limit
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      const promise = rateLimiter.waitForAvailability();
      
      // Should not resolve immediately
      let resolved = false;
      promise.then(() => { resolved = true; });
      
      await jest.advanceTimersByTimeAsync(1000);
      expect(resolved).toBe(false);
      
      // Advance time to clear the window
      await jest.advanceTimersByTimeAsync(60000);
      expect(resolved).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute function when rate limit allows', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await rateLimiter.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      const status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(1);
    });

    it('should not record failed requests', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(rateLimiter.execute(mockFn)).rejects.toThrow('Test error');
      
      const status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(0);
    });

    it('should queue execution when rate limit is reached', async () => {
      const mockFn = jest.fn().mockResolvedValue('queued');
      
      // Fill up the rate limit
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      const promise = rateLimiter.execute(mockFn);
      
      // Function should not be called immediately
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFn).not.toHaveBeenCalled();
      
      // Advance time to clear the window
      await jest.advanceTimersByTimeAsync(60000);
      
      const result = await promise;
      expect(result).toBe('queued');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const initialStatus = rateLimiter.getStatus();
      
      expect(initialStatus).toMatchObject({
        requestsInLastMinute: 0,
        requestsRemaining: 3,
        resetTime: expect.any(Number)
      });
    });

    it('should update status after requests', () => {
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      const status = rateLimiter.getStatus();
      
      expect(status.requestsInLastMinute).toBe(2);
      expect(status.requestsRemaining).toBe(1);
    });

    it('should calculate reset time correctly', () => {
      const beforeRequest = Date.now();
      rateLimiter.recordRequest();
      const status = rateLimiter.getStatus();
      
      // Reset time should be approximately 60 seconds from the request
      const expectedResetTime = beforeRequest + 60000;
      expect(status.resetTime).toBeGreaterThanOrEqual(expectedResetTime - 100);
      expect(status.resetTime).toBeLessThanOrEqual(expectedResetTime + 100);
    });
  });

  describe('reset', () => {
    it('should clear all request history', () => {
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      let status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(2);
      
      rateLimiter.reset();
      
      status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(0);
      expect(status.requestsRemaining).toBe(3);
    });

    it('should clear request queue', async () => {
      // Fill up the rate limit
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      
      const mockFn = jest.fn().mockResolvedValue('test');
      const promise = rateLimiter.execute(mockFn);
      
      rateLimiter.reset();
      
      // After reset, should be able to make requests immediately
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update rate limit configuration', () => {
      rateLimiter.updateConfig({ requestsPerMinute: 10 });
      
      // Should now allow more requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordRequest();
      }
      
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });

    it('should merge with existing configuration', () => {
      const originalConfig = rateLimiter.getStatus();
      
      rateLimiter.updateConfig({ requestsPerMinute: 5 });
      
      // Other config values should remain unchanged
      const status = rateLimiter.getStatus();
      expect(status.requestsRemaining).toBe(5);
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests correctly', async () => {
      const mockFn = jest.fn().mockResolvedValue('concurrent');
      
      // Start multiple requests simultaneously
      const promises = Array(5).fill(null).map(() => rateLimiter.execute(mockFn));
      
      // Advance time to process queue
      await jest.advanceTimersByTimeAsync(70000);
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r === 'concurrent')).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(5);
    });

    it('should respect rate limits with concurrent requests', async () => {
      const mockFn = jest.fn().mockResolvedValue('limited');
      
      // Start requests that exceed the rate limit
      const promises = Array(6).fill(null).map(() => rateLimiter.execute(mockFn));
      
      // Allow some time for initial requests to process
      await jest.advanceTimersByTimeAsync(100);
      
      // Should have processed some requests but not all due to rate limiting
      const initialCalls = mockFn.mock.calls.length;
      expect(initialCalls).toBeGreaterThan(0);
      expect(initialCalls).toBeLessThanOrEqual(6);
      
      // Advance time to allow remaining requests
      await jest.advanceTimersByTimeAsync(70000);
      
      await Promise.all(promises);
      expect(mockFn).toHaveBeenCalledTimes(6);
    });
  });
});
