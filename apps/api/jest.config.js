/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  
  // Module resolution for monorepo cross-package testing
  moduleNameMapper: {
    '^@car-finder/types$': '<rootDir>/../../packages/types/src',
    '^@car-finder/db$': '<rootDir>/../../packages/db/src',
    '^@car-finder/services$': '<rootDir>/../../packages/services/src',
    '^@car-finder/services/(.*)$': '<rootDir>/../../packages/services/src/$1',
  },
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000, // 30 seconds for integration tests with Puppeteer
  
  // Puppeteer specific configuration
  globalSetup: undefined,
  globalTeardown: undefined,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
};
