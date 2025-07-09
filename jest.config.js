export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/bin/',
    '<rootDir>/node_modules/'
  ],
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: '50%',
  forceExit: true,
  detectOpenHandles: true,
  testPathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'bin/',
    'examples/',
    'benchmark/',
    'docs/',
    'infrastructure/',
    'archive/',
    'tests/.*\\.test\\.ts$',
    'tests/.*\\.spec\\.ts$'
  ],
  globalSetup: undefined,
  globalTeardown: undefined
};