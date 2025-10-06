/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
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
  moduleNameMapping: {
    '^@car-finder/types$': '<rootDir>/../types/src',
    '^@car-finder/db$': '<rootDir>/../db/src',
    '^@car-finder/services$': '<rootDir>/../services/src',
    '^@car-finder/services/(.*)$': '<rootDir>/../services/src/$1',
  },
  
  // Coverage and reporting
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Test timeout for integration tests
  testTimeout: 15000,
};
