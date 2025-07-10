/**
 * TransparencyLayer Test Suite
 * Tests for the transparency layer that provides visibility and debugging capabilities
 * Following TDD principles - all tests should initially fail
 */

import { TransparencyLayer } from '../../../features/core/TransparencyLayer';
import { Feature, FeatureEvent, DebugInfo, PerformanceMetrics } from '../../../features/types';
import { EventEmitter } from 'events';

describe('TransparencyLayer', () => {
  let transparencyLayer: TransparencyLayer;
  let mockEventBus: EventEmitter;

  beforeEach(() => {
    mockEventBus = new EventEmitter();
    transparencyLayer = new TransparencyLayer(mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventBus.removeAllListeners();
    transparencyLayer.clear();
  });

  describe('Event Tracking', () => {
    it('should track feature events', () => {
      const event: FeatureEvent = {
        type: 'activation',
        featureId: 'test-feature',
        timestamp: Date.now(),
        data: { status: 'success' },
      };

      transparencyLayer.trackEvent(event);
      const events = transparencyLayer.getEvents('test-feature');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject(event);
    });

    it('should filter events by type', () => {
      const activationEvent: FeatureEvent = {
        type: 'activation',
        featureId: 'test-feature',
        timestamp: Date.now(),
        data: { status: 'success' },
      };

      const deactivationEvent: FeatureEvent = {
        type: 'deactivation',
        featureId: 'test-feature',
        timestamp: Date.now() + 1000,
        data: { status: 'success' },
      };

      transparencyLayer.trackEvent(activationEvent);
      transparencyLayer.trackEvent(deactivationEvent);

      const activationEvents = transparencyLayer.getEvents('test-feature', { type: 'activation' });
      
      expect(activationEvents).toHaveLength(1);
      expect(activationEvents[0].type).toBe('activation');
    });

    it('should filter events by time range', () => {
      const now = Date.now();
      
      const oldEvent: FeatureEvent = {
        type: 'activation',
        featureId: 'test-feature',
        timestamp: now - 10000,
        data: { status: 'success' },
      };

      const recentEvent: FeatureEvent = {
        type: 'activation',
        featureId: 'test-feature',
        timestamp: now - 1000,
        data: { status: 'success' },
      };

      transparencyLayer.trackEvent(oldEvent);
      transparencyLayer.trackEvent(recentEvent);

      const recentEvents = transparencyLayer.getEvents('test-feature', {
        since: now - 5000,
      });

      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].timestamp).toBe(recentEvent.timestamp);
    });

    it('should limit event history per feature', () => {
      transparencyLayer = new TransparencyLayer(mockEventBus, { maxEventsPerFeature: 10 });

      for (let i = 0; i < 15; i++) {
        transparencyLayer.trackEvent({
          type: 'activation',
          featureId: 'test-feature',
          timestamp: Date.now() + i,
          data: { index: i },
        });
      }

      const events = transparencyLayer.getEvents('test-feature');
      
      expect(events).toHaveLength(10);
      expect(events[0].data.index).toBe(5); // Oldest events should be removed
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation performance', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const result = await transparencyLayer.measurePerformance(
        'test-feature',
        'activation',
        operation
      );

      expect(result).toBe('result');

      const metrics = transparencyLayer.getPerformanceMetrics('test-feature');
      
      expect(metrics.operations).toHaveProperty('activation');
      expect(metrics.operations.activation.count).toBe(1);
      expect(metrics.operations.activation.totalTime).toBeGreaterThan(90);
      expect(metrics.operations.activation.averageTime).toBeGreaterThan(90);
    });

    it('should calculate performance statistics', async () => {
      const operation = async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
      };

      // Run operation multiple times with different delays
      await transparencyLayer.measurePerformance('test-feature', 'process', () => operation(50));
      await transparencyLayer.measurePerformance('test-feature', 'process', () => operation(100));
      await transparencyLayer.measurePerformance('test-feature', 'process', () => operation(150));

      const metrics = transparencyLayer.getPerformanceMetrics('test-feature');
      const processMetrics = metrics.operations.process;

      expect(processMetrics.count).toBe(3);
      expect(processMetrics.averageTime).toBeGreaterThan(90);
      expect(processMetrics.averageTime).toBeLessThan(110);
      expect(processMetrics.minTime).toBeGreaterThan(45);
      expect(processMetrics.maxTime).toBeGreaterThan(145);
    });

    it('should track memory usage', () => {
      const memorySnapshot = {
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
      };

      transparencyLayer.trackMemoryUsage('test-feature', memorySnapshot);
      
      const metrics = transparencyLayer.getPerformanceMetrics('test-feature');
      
      expect(metrics.memory).toMatchObject({
        current: memorySnapshot,
        peak: memorySnapshot,
      });
    });

    it('should track peak memory usage', () => {
      const snapshot1 = {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
      };

      const snapshot2 = {
        heapUsed: 70 * 1024 * 1024, // Higher usage
        heapTotal: 100 * 1024 * 1024,
        external: 15 * 1024 * 1024,
      };

      const snapshot3 = {
        heapUsed: 60 * 1024 * 1024, // Lower than peak
        heapTotal: 100 * 1024 * 1024,
        external: 12 * 1024 * 1024,
      };

      transparencyLayer.trackMemoryUsage('test-feature', snapshot1);
      transparencyLayer.trackMemoryUsage('test-feature', snapshot2);
      transparencyLayer.trackMemoryUsage('test-feature', snapshot3);
      
      const metrics = transparencyLayer.getPerformanceMetrics('test-feature');
      
      expect(metrics.memory.current).toMatchObject(snapshot3);
      expect(metrics.memory.peak).toMatchObject(snapshot2);
    });
  });

  describe('Debug Information', () => {
    it('should attach debug info to features', () => {
      const debugInfo: DebugInfo = {
        stackTrace: 'at Function.activate (feature.js:10:5)',
        context: {
          user: 'test-user',
          environment: 'development',
        },
        timestamp: Date.now(),
      };

      transparencyLayer.attachDebugInfo('test-feature', debugInfo);
      const retrievedInfo = transparencyLayer.getDebugInfo('test-feature');

      expect(retrievedInfo).toMatchObject(debugInfo);
    });

    it('should capture error information', () => {
      const error = new Error('Feature activation failed');
      error.stack = 'Error: Feature activation failed\n    at activate (feature.js:10:5)';

      transparencyLayer.captureError('test-feature', error, {
        operation: 'activation',
        params: { timeout: 5000 },
      });

      const errorInfo = transparencyLayer.getErrors('test-feature');
      
      expect(errorInfo).toHaveLength(1);
      expect(errorInfo[0]).toMatchObject({
        message: 'Feature activation failed',
        stack: error.stack,
        context: {
          operation: 'activation',
          params: { timeout: 5000 },
        },
      });
    });

    it('should maintain error history with limit', () => {
      transparencyLayer = new TransparencyLayer(mockEventBus, { maxErrorsPerFeature: 5 });

      for (let i = 0; i < 10; i++) {
        transparencyLayer.captureError(
          'test-feature',
          new Error(`Error ${i}`),
          { index: i }
        );
      }

      const errors = transparencyLayer.getErrors('test-feature');
      
      expect(errors).toHaveLength(5);
      expect(errors[0].message).toBe('Error 5'); // Oldest errors removed
    });
  });

  describe('Real-time Monitoring', () => {
    it('should emit transparency events', (done) => {
      mockEventBus.on('transparency:event', (data) => {
        expect(data).toMatchObject({
          featureId: 'test-feature',
          event: {
            type: 'activation',
            featureId: 'test-feature',
          },
        });
        done();
      });

      transparencyLayer.trackEvent({
        type: 'activation',
        featureId: 'test-feature',
        timestamp: Date.now(),
        data: {},
      });
    });

    it('should emit performance alerts', (done) => {
      transparencyLayer = new TransparencyLayer(mockEventBus, {
        performanceThresholds: {
          operationTime: 100,
        },
      });

      mockEventBus.on('transparency:performance-alert', (alert) => {
        expect(alert).toMatchObject({
          featureId: 'test-feature',
          operation: 'slow-operation',
          duration: expect.any(Number),
          threshold: 100,
        });
        expect(alert.duration).toBeGreaterThan(100);
        done();
      });

      transparencyLayer.measurePerformance(
        'test-feature',
        'slow-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      );
    });

    it('should emit memory alerts', (done) => {
      transparencyLayer = new TransparencyLayer(mockEventBus, {
        performanceThresholds: {
          memoryUsage: 100 * 1024 * 1024, // 100MB
        },
      });

      mockEventBus.on('transparency:memory-alert', (alert) => {
        expect(alert).toMatchObject({
          featureId: 'test-feature',
          usage: 150 * 1024 * 1024,
          threshold: 100 * 1024 * 1024,
        });
        done();
      });

      transparencyLayer.trackMemoryUsage('test-feature', {
        heapUsed: 150 * 1024 * 1024, // 150MB - above threshold
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
      });
    });
  });

  describe('Data Export and Reporting', () => {
    it('should export all transparency data for a feature', () => {
      // Add various data
      transparencyLayer.trackEvent({
        type: 'activation',
        featureId: 'test-feature',
        timestamp: Date.now(),
        data: { status: 'success' },
      });

      transparencyLayer.measurePerformance(
        'test-feature',
        'operation',
        async () => 'result'
      );

      transparencyLayer.captureError(
        'test-feature',
        new Error('Test error'),
        { context: 'test' }
      );

      const exportData = transparencyLayer.exportFeatureData('test-feature');
      
      expect(exportData).toHaveProperty('featureId', 'test-feature');
      expect(exportData).toHaveProperty('events');
      expect(exportData).toHaveProperty('performance');
      expect(exportData).toHaveProperty('errors');
      expect(exportData.events).toHaveLength(1);
      expect(exportData.errors).toHaveLength(1);
    });

    it('should generate summary report', async () => {
      // Add test data
      await transparencyLayer.measurePerformance('feature-1', 'op1', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await transparencyLayer.measurePerformance('feature-2', 'op2', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      transparencyLayer.captureError('feature-1', new Error('Error 1'));
      transparencyLayer.captureError('feature-2', new Error('Error 2'));
      transparencyLayer.captureError('feature-2', new Error('Error 3'));

      const report = transparencyLayer.generateSummaryReport();
      
      expect(report.totalFeatures).toBe(2);
      expect(report.totalEvents).toBeGreaterThanOrEqual(0);
      expect(report.totalErrors).toBe(3);
      expect(report.features).toHaveLength(2);
      
      const feature2Report = report.features.find(f => f.featureId === 'feature-2');
      expect(feature2Report?.errorCount).toBe(2);
    });

    it('should clear data for specific feature', () => {
      transparencyLayer.trackEvent({
        type: 'activation',
        featureId: 'feature-1',
        timestamp: Date.now(),
        data: {},
      });

      transparencyLayer.trackEvent({
        type: 'activation',
        featureId: 'feature-2',
        timestamp: Date.now(),
        data: {},
      });

      transparencyLayer.clearFeatureData('feature-1');
      
      expect(transparencyLayer.getEvents('feature-1')).toHaveLength(0);
      expect(transparencyLayer.getEvents('feature-2')).toHaveLength(1);
    });
  });

  describe('Integration with Feature Lifecycle', () => {
    it('should automatically track feature lifecycle events', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn(),
        deactivate: jest.fn(),
      };

      transparencyLayer.registerFeature(feature);
      transparencyLayer.onFeatureActivate(feature.id);
      transparencyLayer.onFeatureDeactivate(feature.id);

      const events = transparencyLayer.getEvents(feature.id);
      
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('activation');
      expect(events[1].type).toBe('deactivation');
    });

    it('should track feature dependencies', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        dependencies: ['dep-1', 'dep-2'],
        activate: jest.fn(),
        deactivate: jest.fn(),
      };

      transparencyLayer.registerFeature(feature);
      transparencyLayer.trackDependencyResolution(feature.id, 'dep-1', true);
      transparencyLayer.trackDependencyResolution(feature.id, 'dep-2', false);

      const debugInfo = transparencyLayer.getDebugInfo(feature.id);
      
      expect(debugInfo?.dependencies).toMatchObject({
        'dep-1': { resolved: true },
        'dep-2': { resolved: false },
      });
    });
  });
});