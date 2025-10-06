/**
 * Jest setup file for services package
 * Initializes service registry and test environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeEach(() => {
  // Clear global service registry before each test
  const { clearGlobalRegistry } = require('./src/registry');
  clearGlobalRegistry();
});

afterEach(() => {
  // Clean up after each test
  const { clearGlobalRegistry } = require('./src/registry');
  clearGlobalRegistry();
});

// Global test utilities
global.testUtils = require('./src/utils/TestUtils').TestUtils;
