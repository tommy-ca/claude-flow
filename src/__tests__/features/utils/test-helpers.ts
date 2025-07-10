/**
 * Test Helpers and Utilities
 * Common utilities for feature system testing
 */

import { Feature, FeatureConfig, AdapterContext } from '../../../features/types';
import { EventEmitter } from 'events';

/**
 * Creates a mock feature for testing
 */
export function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'mock-feature',
    name: 'Mock Feature',
    version: '1.0.0',
    description: 'A mock feature for testing',
    activate: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Creates a mock adapter context for testing
 */
export function createMockAdapterContext(overrides?: Partial<AdapterContext>): AdapterContext {
  const eventBus = new EventEmitter();
  
  return {
    eventBus,
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    config: {
      version: '1.0.0',
      environment: 'test',
    },
    services: new Map(),
    ...overrides,
  };
}

/**
 * Creates a mock feature configuration
 */
export function createMockConfig(overrides?: Partial<FeatureConfig>): FeatureConfig {
  return {
    enabled: true,
    settings: {},
    ...overrides,
  };
}

/**
 * Waits for an event to be emitted
 */
export function waitForEvent(
  emitter: EventEmitter,
  eventName: string,
  timeout = 1000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Creates a spy that tracks method calls with timing information
 */
export function createTimingSpy() {
  const calls: Array<{ timestamp: number; args: any[] }> = [];
  
  const spy = jest.fn().mockImplementation((...args) => {
    calls.push({
      timestamp: Date.now(),
      args,
    });
  });

  return Object.assign(spy, {
    calls,
    wasCalledBefore(otherSpy: ReturnType<typeof createTimingSpy>): boolean {
      if (this.calls.length === 0 || otherSpy.calls.length === 0) {
        return false;
      }
      return this.calls[0].timestamp < otherSpy.calls[0].timestamp;
    },
    wasCalledAfter(otherSpy: ReturnType<typeof createTimingSpy>): boolean {
      if (this.calls.length === 0 || otherSpy.calls.length === 0) {
        return false;
      }
      return this.calls[0].timestamp > otherSpy.calls[0].timestamp;
    },
  });
}

/**
 * Delays execution for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock storage provider
 */
export function createMockStorage() {
  const storage = new Map<string, any>();
  
  return {
    save: jest.fn().mockImplementation((key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    load: jest.fn().mockImplementation((key: string) => {
      return Promise.resolve(storage.get(key) || null);
    }),
    delete: jest.fn().mockImplementation((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn().mockImplementation(() => {
      storage.clear();
      return Promise.resolve();
    }),
    _storage: storage, // Expose for testing
  };
}

/**
 * Custom Jest matchers for feature testing
 */
export const featureMatchers = {
  toBeActivated(received: Feature) {
    const pass = (received.activate as jest.Mock).mock.calls.length > 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected feature not to be activated`
          : `Expected feature to be activated`,
    };
  },
  
  toBeDeactivated(received: Feature) {
    const pass = (received.deactivate as jest.Mock).mock.calls.length > 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected feature not to be deactivated`
          : `Expected feature to be deactivated`,
    };
  },
  
  toHaveBeenCalledBefore(
    received: jest.Mock,
    other: jest.Mock
  ) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        pass: false,
        message: () => `One or both functions were not called`,
      };
    }
    
    const pass = Math.min(...receivedCalls) < Math.min(...otherCalls);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received.getMockName()} not to be called before ${other.getMockName()}`
          : `Expected ${received.getMockName()} to be called before ${other.getMockName()}`,
    };
  },
  
  toHaveBeenCalledAfter(
    received: jest.Mock,
    other: jest.Mock
  ) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    if (receivedCalls.length === 0 || otherCalls.length === 0) {
      return {
        pass: false,
        message: () => `One or both functions were not called`,
      };
    }
    
    const pass = Math.min(...receivedCalls) > Math.max(...otherCalls);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received.getMockName()} not to be called after ${other.getMockName()}`
          : `Expected ${received.getMockName()} to be called after ${other.getMockName()}`,
    };
  },
};

/**
 * Test data fixtures
 */
export const fixtures = {
  features: {
    basic: createMockFeature({
      id: 'basic-feature',
      name: 'Basic Feature',
    }),
    
    withDependencies: createMockFeature({
      id: 'dependent-feature',
      name: 'Dependent Feature',
      dependencies: ['base-feature'],
    }),
    
    withConfiguration: createMockFeature({
      id: 'configurable-feature',
      name: 'Configurable Feature',
      configure: jest.fn().mockResolvedValue(undefined),
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          timeout: { type: 'number' },
        },
        required: ['apiKey'],
      },
    }),
    
    withHooks: createMockFeature({
      id: 'hook-feature',
      name: 'Feature with Hooks',
      onBeforeActivate: jest.fn().mockResolvedValue(undefined),
      onAfterActivate: jest.fn().mockResolvedValue(undefined),
      onBeforeDeactivate: jest.fn().mockResolvedValue(undefined),
      onAfterDeactivate: jest.fn().mockResolvedValue(undefined),
    }),
  },
  
  configs: {
    basic: createMockConfig({
      enabled: true,
      settings: {
        debug: false,
      },
    }),
    
    withApiKey: createMockConfig({
      enabled: true,
      settings: {
        apiKey: 'test-api-key-12345',
        timeout: 5000,
      },
    }),
    
    disabled: createMockConfig({
      enabled: false,
      settings: {},
    }),
  },
};

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurer {
  private marks: Map<string, number> = new Map();
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) {
      throw new Error(`Start mark '${startMark}' not found`);
    }
    
    if (endMark && !this.marks.has(endMark)) {
      throw new Error(`End mark '${endMark}' not found`);
    }
    
    return (end || performance.now()) - start;
  }
  
  clear(): void {
    this.marks.clear();
  }
}

/**
 * Memory usage tracker for tests
 */
export class MemoryTracker {
  private snapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  
  snapshot(): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    this.snapshots.push({ timestamp: Date.now(), usage });
    return usage;
  }
  
  getGrowth(): number {
    if (this.snapshots.length < 2) {
      return 0;
    }
    
    const first = this.snapshots[0].usage.heapUsed;
    const last = this.snapshots[this.snapshots.length - 1].usage.heapUsed;
    
    return last - first;
  }
  
  clear(): void {
    this.snapshots = [];
  }
}