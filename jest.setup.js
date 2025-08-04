
process.env.CLAUDE_FLOW_ENV = 'production';
process.env.NODE_ENV = 'test';

// Mock logger configuration for tests
jest.mock('../src/core/logger.js', () => ({
  Logger: {
    getInstance: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    })
  }
}));
