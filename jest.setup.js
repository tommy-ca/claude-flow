/**
 * Jest Setup File - CI/CD Compatible
 * Configure test environment with minimal dependencies
 */

// Set test environment flags
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.CLAUDE_FLOW_TEST_MODE = 'true';
process.env.CLAUDE_FLOW_DISABLE_TELEMETRY = 'true';

// Ensure Jest globals are available (commented out to avoid warnings)
// import '@jest/globals';

// Mock console methods to reduce test noise
const originalConsole = { ...console };
global.originalConsole = originalConsole;

// Create a minimal console that doesn't spam output
global.console = {
  ...originalConsole,
  log: () => {},
  info: () => {},
  warn: () => {},
  error: originalConsole.error, // Keep error for debugging
  debug: () => {}
};

// Mock performance object for test utilities
global.performance = {
  measureTime: async (fn) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }
};

// Handle unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  originalConsole.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Simple mock for missing modules
global.mockRequire = (moduleName) => {
  const mocks = {
    'fs-extra': {
      pathExists: () => Promise.resolve(true),
      ensureDir: () => Promise.resolve(),
      copy: () => Promise.resolve(),
      move: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      readJson: () => Promise.resolve({}),
      writeJson: () => Promise.resolve()
    },
    'node-pty': {
      spawn: () => ({
        onData: () => {},
        write: () => {},
        resize: () => {},
        kill: () => {},
        pid: 12345
      })
    },
    'better-sqlite3': class MockDatabase {
      constructor() {
        this.memory = new Map();
      }
      prepare() {
        return {
          run: () => ({ changes: 1 }),
          get: () => ({}),
          all: () => []
        };
      }
      close() {}
    },
    'inquirer': {
      prompt: () => Promise.resolve({})
    }
  };
  
  return mocks[moduleName] || {};
};

// Mock problematic native modules - ensure jest is available
if (typeof jest !== 'undefined') {
  jest.mock('node-pty', () => ({
    spawn: () => ({
      onData: () => {},
      write: () => {},
      resize: () => {},
      kill: () => {},
      pid: 12345
    })
  }), { virtual: true });

  jest.mock('better-sqlite3', () => {
    return class MockDatabase {
      constructor() {
        this.memory = new Map();
      }
      prepare() {
        return {
          run: () => ({ changes: 1 }),
          get: () => ({}),
          all: () => []
        };
      }
      close() {}
    };
  }, { virtual: true });

  jest.mock('inquirer', () => ({
    prompt: () => Promise.resolve({})
  }), { virtual: true });
}