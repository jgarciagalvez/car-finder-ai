// Jest setup file for API tests

// Increase timeout for Puppeteer tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Mock console.log to reduce test output noise
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
export const TEST_URLS = {
  VALID_HTML: 'https://example.com',
  VALID_JSON: 'https://jsonplaceholder.typicode.com/posts/1',
  SLOW_RESPONSE: 'https://httpbin.org/delay/2',
  NOT_FOUND: 'https://httpbin.org/status/404',
  SERVER_ERROR: 'https://httpbin.org/status/500',
  INVALID_URL: 'https://this-domain-does-not-exist-12345.com'
};

export const createMockScraperConfig = () => ({
  delayRange: { min: 100, max: 200 }, // Faster delays for testing
  timeout: 10000, // 10 second timeout for tests
  maxRetries: 2, // Fewer retries for faster tests
  stealthMode: true
});
