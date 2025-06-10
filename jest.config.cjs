/**
 * Jest configuration for Digital Samba MCP Server
 * Configured for ES modules (package.json has "type": "module")
 * Based on Jest ESM documentation from Context7
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^node-fetch$': '<rootDir>/tests/mocks/node-fetch.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol|node-fetch))'
  ],
  testTimeout: 30000, // 30 seconds timeout per test
  // Global setup/teardown timeout
  globalSetup: undefined,
  globalTeardown: undefined,
};
