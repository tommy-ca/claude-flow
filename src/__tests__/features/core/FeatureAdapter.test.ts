/**
 * FeatureAdapter Test Suite
 * Tests for the feature adapter system that bridges features with the main application
 * Following TDD principles - all tests should initially fail
 */

import { FeatureAdapter } from '../../../features/core/FeatureAdapter';
import { Feature, AdapterContext, AdapterOptions } from '../../../features/types';
import { EventEmitter } from 'events';

describe('FeatureAdapter', () => {
  let adapter: FeatureAdapter;
  let mockContext: AdapterContext;
  let mockEventBus: EventEmitter;

  beforeEach(() => {
    mockEventBus = new EventEmitter();
    mockContext = {
      eventBus: mockEventBus,
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
    };

    adapter = new FeatureAdapter(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventBus.removeAllListeners();
  });

  describe('Adapter Initialization', () => {
    it('should initialize adapter with context', () => {
      expect(adapter.getContext()).toBe(mockContext);
      expect(adapter.isInitialized()).toBe(true);
    });

    it('should register default services', () => {
      const services = adapter.getAvailableServices();
      
      expect(services).toContain('eventBus');
      expect(services).toContain('logger');
      expect(services).toContain('config');
    });

    it('should allow custom service registration', () => {
      const customService = {
        name: 'customService',
        instance: { doSomething: jest.fn() },
      };

      adapter.registerService(customService.name, customService.instance);
      
      expect(adapter.getService('customService')).toBe(customService.instance);
      expect(adapter.getAvailableServices()).toContain('customService');
    });
  });

  describe('Feature Adaptation', () => {
    it('should adapt a feature to the application context', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      
      expect(adaptedFeature).toHaveProperty('id', 'test-feature');
      expect(adaptedFeature).toHaveProperty('context');
      expect(adaptedFeature).toHaveProperty('emit');
      expect(adaptedFeature).toHaveProperty('getService');
    });

    it('should inject context methods into adapted feature', async () => {
      const activate = jest.fn().mockImplementation(function(this: any) {
        // Access injected context methods
        this.emit('feature:activated', { id: this.id });
        const logger = this.getService('logger');
        logger.info(`Feature ${this.id} activated`);
      });

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate,
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      const eventSpy = jest.fn();
      mockEventBus.on('feature:activated', eventSpy);

      await adaptedFeature.activate();

      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-feature' });
      expect(mockContext.logger.info).toHaveBeenCalledWith('Feature test-feature activated');
    });

    it('should preserve feature methods and properties', () => {
      const customMethod = jest.fn();
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        customMethod,
        customProperty: 'test-value',
      };

      const adaptedFeature = adapter.adapt(feature);
      
      expect(adaptedFeature.customMethod).toBe(customMethod);
      expect(adaptedFeature.customProperty).toBe('test-value');
    });
  });

  describe('Service Injection', () => {
    it('should provide access to registered services', () => {
      const mockDatabase = {
        query: jest.fn(),
        insert: jest.fn(),
      };

      adapter.registerService('database', mockDatabase);

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          const db = this.getService('database');
          db.query('SELECT * FROM features');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      adaptedFeature.activate();

      expect(mockDatabase.query).toHaveBeenCalledWith('SELECT * FROM features');
    });

    it('should throw error for non-existent service', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          this.getService('nonExistentService');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      
      expect(() => adaptedFeature.activate()).toThrow('Service nonExistentService not found');
    });

    it('should support lazy service loading', () => {
      const lazyService = jest.fn().mockReturnValue({
        doWork: jest.fn(),
      });

      adapter.registerLazyService('lazyService', lazyService);

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          const service = this.getService('lazyService');
          service.doWork();
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      adaptedFeature.activate();

      expect(lazyService).toHaveBeenCalled();
      
      // Second call should use cached instance
      adaptedFeature.activate();
      expect(lazyService).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Communication', () => {
    it('should enable feature-to-feature communication via events', () => {
      const feature1: Feature = {
        id: 'feature-1',
        name: 'Feature 1',
        version: '1.0.0',
        description: 'First feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          this.on('data:request', (callback: Function) => {
            callback({ data: 'response from feature-1' });
          });
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const feature2: Feature = {
        id: 'feature-2',
        name: 'Feature 2',
        version: '1.0.0',
        description: 'Second feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          return new Promise((resolve) => {
            this.emit('data:request', (response: any) => {
              this.receivedData = response;
              resolve(undefined);
            });
          });
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adapted1 = adapter.adapt(feature1);
      const adapted2 = adapter.adapt(feature2);

      adapted1.activate();
      adapted2.activate();

      expect(adapted2.receivedData).toEqual({ data: 'response from feature-1' });
    });

    it('should support event namespacing for features', () => {
      const eventSpy = jest.fn();
      mockEventBus.on('feature:test-feature:custom-event', eventSpy);

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          this.emitNamespaced('custom-event', { data: 'test' });
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      adaptedFeature.activate();

      expect(eventSpy).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Isolation and Security', () => {
    it('should isolate feature contexts', () => {
      const feature1: Feature = {
        id: 'feature-1',
        name: 'Feature 1',
        version: '1.0.0',
        description: 'First feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          this.privateData = 'secret';
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const feature2: Feature = {
        id: 'feature-2',
        name: 'Feature 2',
        version: '1.0.0',
        description: 'Second feature',
        activate: jest.fn().mockImplementation(function(this: any) {
          // Should not have access to feature1's private data
          return this.privateData;
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adapted1 = adapter.adapt(feature1);
      const adapted2 = adapter.adapt(feature2);

      adapted1.activate();
      const result = adapted2.activate();

      expect(result).toBeUndefined();
      expect(adapted1.privateData).toBe('secret');
      expect(adapted2.privateData).toBeUndefined();
    });

    it('should validate service access permissions', () => {
      const restrictedService = { secure: true };
      
      adapter.registerService('restricted', restrictedService, {
        permissions: ['admin'],
      });

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        permissions: ['user'],
        activate: jest.fn().mockImplementation(function(this: any) {
          this.getService('restricted');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      
      expect(() => adaptedFeature.activate()).toThrow('Insufficient permissions to access service: restricted');
    });
  });

  describe('Adapter Options', () => {
    it('should apply adapter options during adaptation', () => {
      const options: AdapterOptions = {
        sandbox: true,
        timeout: 5000,
        retryCount: 3,
      };

      adapter = new FeatureAdapter(mockContext, options);

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      
      expect(adaptedFeature.__adapterOptions).toEqual(options);
    });

    it('should enforce timeout on feature operations', async () => {
      const options: AdapterOptions = {
        timeout: 100,
      };

      adapter = new FeatureAdapter(mockContext, options);

      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(resolve, 200);
          });
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      
      await expect(adaptedFeature.activate()).rejects.toThrow('Operation timed out');
    });

    it('should retry failed operations based on retry count', async () => {
      const options: AdapterOptions = {
        retryCount: 3,
        retryDelay: 10,
      };

      adapter = new FeatureAdapter(mockContext, options);

      let attempts = 0;
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve();
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const adaptedFeature = adapter.adapt(feature);
      await adaptedFeature.activate();

      expect(attempts).toBe(3);
    });
  });

  describe('Lifecycle Management', () => {
    it('should track adapted features', () => {
      const feature1: Feature = {
        id: 'feature-1',
        name: 'Feature 1',
        version: '1.0.0',
        description: 'First feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const feature2: Feature = {
        id: 'feature-2',
        name: 'Feature 2',
        version: '1.0.0',
        description: 'Second feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      adapter.adapt(feature1);
      adapter.adapt(feature2);

      const adaptedFeatures = adapter.getAdaptedFeatures();
      
      expect(adaptedFeatures).toHaveLength(2);
      expect(adaptedFeatures.map(f => f.id)).toContain('feature-1');
      expect(adaptedFeatures.map(f => f.id)).toContain('feature-2');
    });

    it('should clean up resources on adapter disposal', async () => {
      const cleanup = jest.fn();
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        cleanup,
      };

      adapter.adapt(feature);
      await adapter.dispose();

      expect(cleanup).toHaveBeenCalled();
      expect(adapter.getAdaptedFeatures()).toHaveLength(0);
    });
  });
});