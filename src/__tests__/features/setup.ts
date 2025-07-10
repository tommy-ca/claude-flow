/**
 * Test setup for feature system tests
 * Configures Jest environment and custom matchers
 */

import { featureMatchers } from './utils/test-helpers';

// Add custom matchers to Jest
expect.extend(featureMatchers);

// Configure test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.FEATURE_SYSTEM_ENV = 'test';
  
  // Increase test timeout for integration tests
  jest.setTimeout(10000);
});

// Clean up after all tests
afterAll(() => {
  // Clear any remaining timers
  jest.clearAllTimers();
});

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock console methods to reduce noise in tests
  mockConsole: () => {
    const originalConsole = { ...console };
    
    beforeEach(() => {
      console.log = jest.fn();
      console.error = jest.fn();
      console.warn = jest.fn();
      console.info = jest.fn();
    });
    
    afterEach(() => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    });
  },
};

// Extend Jest matchers TypeScript definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeActivated(): R;
      toBeDeactivated(): R;
      toHaveBeenCalledBefore(other: jest.Mock): R;
      toHaveBeenCalledAfter(other: jest.Mock): R;
    }
  }
  
  namespace NodeJS {
    interface Global {
      testUtils: {
        waitFor: (ms: number) => Promise<void>;
        mockConsole: () => void;
      };
    }
  }
}