/**
 * Feature System Integration Tests
 * Tests the interaction between all feature system components
 * Following TDD principles - all tests should initially fail
 */

import { FeatureManager } from '../../../features/core/FeatureManager';
import { FeatureAdapter } from '../../../features/core/FeatureAdapter';
import { TransparencyLayer } from '../../../features/core/TransparencyLayer';
import { ConfigurationManager } from '../../../features/core/Configuration';
import { Feature, FeatureConfig } from '../../../features/types';
import { EventEmitter } from 'events';
import { createMockAdapterContext, delay, waitForEvent } from '../utils/test-helpers';

describe('Feature System Integration', () => {
  let featureManager: FeatureManager;
  let featureAdapter: FeatureAdapter;
  let transparencyLayer: TransparencyLayer;
  let configManager: ConfigurationManager;
  let eventBus: EventEmitter;
  let context: any;

  beforeEach(() => {
    eventBus = new EventEmitter();
    context = createMockAdapterContext({ eventBus });
    
    featureManager = new FeatureManager();
    featureAdapter = new FeatureAdapter(context);
    transparencyLayer = new TransparencyLayer(eventBus);
    configManager = new ConfigurationManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventBus.removeAllListeners();
  });

  describe('Complete Feature Lifecycle', () => {
    it('should handle complete feature lifecycle with all components', async () => {
      // Define a test feature
      const testFeature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'Integration test feature',
        configSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', minLength: 10 },
            timeout: { type: 'number', default: 5000 },
          },
          required: ['apiKey'],
        },
        configure: jest.fn().mockResolvedValue(undefined),
        activate: jest.fn().mockImplementation(async function(this: any) {
          // Use adapter context
          this.emit('feature:started', { id: this.id });
          const logger = this.getService('logger');
          logger.info(`Feature ${this.id} activated`);
        }),
        deactivate: jest.fn().mockImplementation(async function(this: any) {
          this.emit('feature:stopped', { id: this.id });
        }),
      };

      // Step 1: Register configuration schema
      configManager.registerSchema(testFeature.id, testFeature.configSchema);

      // Step 2: Set and validate configuration
      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key-12345',
          timeout: 3000,
        },
      };

      configManager.setConfig(testFeature.id, config);
      const validation = configManager.validateConfig(testFeature.id, config);
      expect(validation.valid).toBe(true);

      // Step 3: Adapt the feature
      const adaptedFeature = featureAdapter.adapt(testFeature);

      // Step 4: Register feature with transparency tracking
      transparencyLayer.registerFeature(testFeature);
      featureManager.register(adaptedFeature);

      // Step 5: Configure the feature
      await featureManager.configure(testFeature.id, config);
      expect(testFeature.configure).toHaveBeenCalledWith(config);

      // Step 6: Activate with performance tracking
      const activationPromise = transparencyLayer.measurePerformance(
        testFeature.id,
        'activation',
        () => featureManager.activate(testFeature.id)
      );

      // Wait for activation event
      const [, activationEvent] = await Promise.all([
        activationPromise,
        waitForEvent(eventBus, 'feature:started'),
      ]);

      expect(activationEvent).toEqual({ id: 'test-feature' });
      expect(context.logger.info).toHaveBeenCalledWith('Feature test-feature activated');

      // Verify transparency data
      const events = transparencyLayer.getEvents(testFeature.id);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'activation',
          featureId: testFeature.id,
        })
      );

      const metrics = transparencyLayer.getPerformanceMetrics(testFeature.id);
      expect(metrics.operations.activation).toBeDefined();
      expect(metrics.operations.activation.count).toBe(1);

      // Step 7: Deactivate
      await featureManager.deactivate(testFeature.id);

      // Verify complete lifecycle
      expect(featureManager.isActive(testFeature.id)).toBe(false);
      const allEvents = transparencyLayer.getEvents(testFeature.id);
      expect(allEvents).toContainEqual(
        expect.objectContaining({
          type: 'deactivation',
        })
      );
    });
  });

  describe('Multi-Feature Orchestration', () => {
    it('should coordinate multiple features with dependencies', async () => {
      // Create a feature hierarchy
      const baseFeature: Feature = {
        id: 'base-feature',
        name: 'Base Feature',
        version: '1.0.0',
        description: 'Base feature providing core functionality',
        activate: jest.fn().mockImplementation(async function(this: any) {
          await delay(50); // Simulate work
          this.emit('base:ready');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const middlewareFeature: Feature = {
        id: 'middleware-feature',
        name: 'Middleware Feature',
        version: '1.0.0',
        description: 'Middleware layer',
        dependencies: ['base-feature'],
        activate: jest.fn().mockImplementation(async function(this: any) {
          // Wait for base to be ready
          await new Promise(resolve => {
            this.once('base:ready', resolve);
          });
          await delay(30);
          this.emit('middleware:ready');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const appFeature: Feature = {
        id: 'app-feature',
        name: 'Application Feature',
        version: '1.0.0',
        description: 'Main application feature',
        dependencies: ['middleware-feature'],
        activate: jest.fn().mockImplementation(async function(this: any) {
          // Wait for middleware to be ready
          await new Promise(resolve => {
            this.once('middleware:ready', resolve);
          });
          this.emit('app:ready');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      // Adapt all features
      const adaptedBase = featureAdapter.adapt(baseFeature);
      const adaptedMiddleware = featureAdapter.adapt(middlewareFeature);
      const adaptedApp = featureAdapter.adapt(appFeature);

      // Register all features
      [adaptedBase, adaptedMiddleware, adaptedApp].forEach(feature => {
        transparencyLayer.registerFeature(feature);
        featureManager.register(feature);
      });

      // Track activation order
      const activationOrder: string[] = [];
      eventBus.on('transparency:event', (data) => {
        if (data.event.type === 'activation') {
          activationOrder.push(data.featureId);
        }
      });

      // Activate the top-level feature (should cascade)
      await featureManager.activate('app-feature');

      // Verify activation order
      expect(activationOrder).toEqual([
        'base-feature',
        'middleware-feature',
        'app-feature',
      ]);

      // Verify all features are active
      expect(featureManager.isActive('base-feature')).toBe(true);
      expect(featureManager.isActive('middleware-feature')).toBe(true);
      expect(featureManager.isActive('app-feature')).toBe(true);

      // Track deactivation order
      const deactivationOrder: string[] = [];
      eventBus.on('transparency:event', (data) => {
        if (data.event.type === 'deactivation') {
          deactivationOrder.push(data.featureId);
        }
      });

      // Deactivate base feature (should cascade)
      await featureManager.deactivate('base-feature');

      // Verify deactivation order (reverse of activation)
      expect(deactivationOrder).toEqual([
        'app-feature',
        'middleware-feature',
        'base-feature',
      ]);

      // Verify all features are inactive
      expect(featureManager.isActive('base-feature')).toBe(false);
      expect(featureManager.isActive('middleware-feature')).toBe(false);
      expect(featureManager.isActive('app-feature')).toBe(false);
    });
  });

  describe('Configuration Changes', () => {
    it('should handle dynamic configuration updates', async () => {
      const configChangeEvents: any[] = [];
      
      const configurableFeature: Feature = {
        id: 'configurable-feature',
        name: 'Configurable Feature',
        version: '1.0.0',
        description: 'Feature that responds to config changes',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        configure: jest.fn().mockImplementation(async function(this: any, config: FeatureConfig) {
          this.emit('config:updated', { 
            featureId: this.id,
            config,
          });
        }),
      };

      // Set up configuration watching
      eventBus.on('config:updated', (event) => {
        configChangeEvents.push(event);
      });

      // Adapt and register
      const adapted = featureAdapter.adapt(configurableFeature);
      featureManager.register(adapted);
      transparencyLayer.registerFeature(adapted);

      // Initial configuration
      const initialConfig: FeatureConfig = {
        enabled: true,
        settings: {
          mode: 'development',
          logLevel: 'debug',
        },
      };

      await featureManager.configure('configurable-feature', initialConfig);
      await featureManager.activate('configurable-feature');

      // Update configuration while active
      const updatedConfig: FeatureConfig = {
        enabled: true,
        settings: {
          mode: 'production',
          logLevel: 'error',
        },
      };

      await featureManager.configure('configurable-feature', updatedConfig);

      // Verify configuration updates
      expect(configChangeEvents).toHaveLength(2);
      expect(configChangeEvents[1].config).toEqual(updatedConfig);

      // Check transparency tracking
      const events = transparencyLayer.getEvents('configurable-feature');
      const configEvents = events.filter(e => e.type === 'configuration');
      expect(configEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and track feature errors gracefully', async () => {
      const errorEvents: any[] = [];
      
      const faultyFeature: Feature = {
        id: 'faulty-feature',
        name: 'Faulty Feature',
        version: '1.0.0',
        description: 'Feature that throws errors',
        activate: jest.fn().mockImplementation(async function(this: any) {
          await delay(10);
          throw new Error('Activation failed: Database connection error');
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      // Listen for error events
      eventBus.on('transparency:error', (error) => {
        errorEvents.push(error);
      });

      // Adapt and register
      const adapted = featureAdapter.adapt(faultyFeature);
      featureManager.register(adapted);
      transparencyLayer.registerFeature(adapted);

      // Attempt activation (should fail)
      try {
        await transparencyLayer.measurePerformance(
          'faulty-feature',
          'activation',
          () => featureManager.activate('faulty-feature')
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Database connection error');
      }

      // Verify error tracking
      const errors = transparencyLayer.getErrors('faulty-feature');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Database connection error');

      // Verify feature is not active
      expect(featureManager.isActive('faulty-feature')).toBe(false);

      // Verify performance metrics still tracked despite error
      const metrics = transparencyLayer.getPerformanceMetrics('faulty-feature');
      expect(metrics.operations.activation).toBeDefined();
      expect(metrics.operations.activation.failures).toBe(1);
    });

    it('should rollback dependent features on activation failure', async () => {
      const rollbackOrder: string[] = [];
      
      const workingFeature: Feature = {
        id: 'working-feature',
        name: 'Working Feature',
        version: '1.0.0',
        description: 'Feature that works',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockImplementation(async function(this: any) {
          rollbackOrder.push(this.id);
        }),
      };

      const failingFeature: Feature = {
        id: 'failing-feature',
        name: 'Failing Feature',
        version: '1.0.0',
        description: 'Feature that fails',
        dependencies: ['working-feature'],
        activate: jest.fn().mockRejectedValue(new Error('Activation error')),
        deactivate: jest.fn().mockImplementation(async function(this: any) {
          rollbackOrder.push(this.id);
        }),
      };

      // Adapt and register
      [workingFeature, failingFeature].forEach(feature => {
        const adapted = featureAdapter.adapt(feature);
        featureManager.register(adapted);
        transparencyLayer.registerFeature(adapted);
      });

      // Attempt to activate failing feature
      try {
        await featureManager.activate('failing-feature');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Activation error');
      }

      // Verify rollback occurred
      expect(rollbackOrder).toEqual(['working-feature']);
      expect(featureManager.isActive('working-feature')).toBe(false);
      expect(featureManager.isActive('failing-feature')).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track and alert on performance issues', async () => {
      const performanceAlerts: any[] = [];
      
      transparencyLayer = new TransparencyLayer(eventBus, {
        performanceThresholds: {
          operationTime: 100, // 100ms threshold
        },
      });

      const slowFeature: Feature = {
        id: 'slow-feature',
        name: 'Slow Feature',
        version: '1.0.0',
        description: 'Feature with slow operations',
        activate: jest.fn().mockImplementation(async () => {
          await delay(150); // Exceeds threshold
        }),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      // Listen for performance alerts
      eventBus.on('transparency:performance-alert', (alert) => {
        performanceAlerts.push(alert);
      });

      // Adapt and register
      const adapted = featureAdapter.adapt(slowFeature);
      featureManager.register(adapted);
      transparencyLayer.registerFeature(adapted);

      // Activate with performance tracking
      await transparencyLayer.measurePerformance(
        'slow-feature',
        'activation',
        () => featureManager.activate('slow-feature')
      );

      // Verify performance alert was triggered
      expect(performanceAlerts).toHaveLength(1);
      expect(performanceAlerts[0]).toMatchObject({
        featureId: 'slow-feature',
        operation: 'activation',
        threshold: 100,
      });
      expect(performanceAlerts[0].duration).toBeGreaterThan(100);

      // Generate performance report
      const report = transparencyLayer.generateSummaryReport();
      const featureReport = report.features.find(f => f.featureId === 'slow-feature');
      
      expect(featureReport).toBeDefined();
      expect(featureReport?.performanceIssues).toBeGreaterThan(0);
    });
  });
});