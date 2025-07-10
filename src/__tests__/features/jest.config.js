/**
 * Jest configuration for feature system tests
 */

export default {
  displayName: 'Feature System Tests',
  preset: '../../../jest.config.js',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  collectCoverageFrom: [
    '<rootDir>/../../features/**/*.ts',
    '<rootDir>/../../features/**/*.js',
    '!<rootDir>/../../features/**/*.d.ts',
    '!<rootDir>/../../features/**/*.test.ts',
    '!<rootDir>/../../features/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};