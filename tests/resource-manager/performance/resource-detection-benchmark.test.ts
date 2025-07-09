/**
 * Performance tests for Resource Detection
 * Benchmarks resource detection speed and efficiency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, TestUtils } from '../fixtures/test-fixtures';

// These imports will fail initially (TDD approach)
import {
  ResourceDetector,
  ResourceSnapshot
} from '../../../src/resource-manager/core/resource-detector';

describe('Resource Detection Performance', () => {
  let detector: ResourceDetector;
  let mockPlatformAdapter: any;

  beforeEach(() => {
    mockPlatformAdapter = TestUtils.createMockPlatformAdapter();
    detector = new ResourceDetector(mockPlatformAdapter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Detection Speed Benchmarks', () => {
    it('should detect all resources within 500ms', async () => {
      // Setup mock responses
      mockPlatformAdapter.executeCommand
        .mockResolvedValueOnce('cpu mock response')
        .mockResolvedValueOnce('memory mock response')
        .mockResolvedValueOnce('disk mock response')
        .mockResolvedValueOnce('network mock response');

      const startTime = performance.now();
      
      await detector.detectAll();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should handle high-frequency detection calls efficiently', async () => {
      const iterations = 100;
      const maxDurationPerCall = 50; // ms

      mockPlatformAdapter.executeCommand.mockResolvedValue('mock response');

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await detector.detectAll();
      }

      const endTime = performance.now();
      const averageDuration = (endTime - startTime) / iterations;

      expect(averageDuration).toBeLessThan(maxDurationPerCall);
    });

    it('should cache resource detection results effectively', async () => {
      mockPlatformAdapter.executeCommand.mockResolvedValue('cached response');

      // First call - should hit the system
      const firstCallStart = performance.now();
      await detector.detectAll();
      const firstCallDuration = performance.now() - firstCallStart;

      // Second call - should use cache
      const secondCallStart = performance.now();
      await detector.detectAll();
      const secondCallDuration = performance.now() - secondCallStart;

      expect(secondCallDuration).toBeLessThan(firstCallDuration / 2);
    });

    it('should optimize batch resource detection', async () => {
      const batchSize = 10;
      mockPlatformAdapter.executeCommand.mockResolvedValue('batch response');

      // Individual calls
      const individualStart = performance.now();
      for (let i = 0; i < batchSize; i++) {
        await detector.detectAll();
      }
      const individualDuration = performance.now() - individualStart;

      // Batch call
      const batchStart = performance.now();
      await detector.detectAllBatch(batchSize);
      const batchDuration = performance.now() - batchStart;

      expect(batchDuration).toBeLessThan(individualDuration / 2);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should maintain stable memory usage during continuous monitoring', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      mockPlatformAdapter.executeCommand.mockResolvedValue('memory test response');

      for (let i = 0; i < iterations; i++) {
        await detector.detectAll();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should limit history size to prevent memory leaks', async () => {
      const maxHistorySize = 100;
      detector.setMaxHistorySize(maxHistorySize);

      mockPlatformAdapter.executeCommand.mockResolvedValue('history test response');

      // Generate more entries than the limit
      for (let i = 0; i < maxHistorySize * 2; i++) {
        await detector.detectAll();
      }

      const history = detector.getHistory();
      expect(history.length).toBe(maxHistorySize);
    });
  });

  describe('Concurrency Benchmarks', () => {
    it('should handle concurrent detection requests efficiently', async () => {
      const concurrentRequests = 50;
      mockPlatformAdapter.executeCommand.mockResolvedValue('concurrent response');

      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () => 
        detector.detectAll()
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time despite concurrency
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should prevent resource detection race conditions', async () => {
      mockPlatformAdapter.executeCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('race test'), 100))
      );

      const results = await Promise.all([
        detector.detectAll(),
        detector.detectAll(),
        detector.detectAll()
      ]);

      // All results should be consistent
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });

  describe('Platform-Specific Performance', () => {
    it('should optimize for Linux command execution', async () => {
      mockPlatformAdapter.platform = 'linux';
      mockPlatformAdapter.executeCommand.mockResolvedValue('linux optimized response');

      const startTime = performance.now();
      await detector.detectAll();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(300); // Linux should be fastest
    });

    it('should handle Windows command overhead', async () => {
      mockPlatformAdapter.platform = 'win32';
      mockPlatformAdapter.executeCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('windows response'), 150))
      );

      const startTime = performance.now();
      await detector.detectAll();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(600); // Windows may be slower
    });

    it('should optimize for macOS system calls', async () => {
      mockPlatformAdapter.platform = 'darwin';
      mockPlatformAdapter.executeCommand.mockResolvedValue('macos optimized response');

      const startTime = performance.now();
      await detector.detectAll();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(400); // macOS should be reasonably fast
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on command execution errors', async () => {
      mockPlatformAdapter.executeCommand.mockRejectedValue(
        new Error('Command failed')
      );

      const startTime = performance.now();

      try {
        await detector.detectAll();
      } catch (error) {
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(100); // Should fail quickly
      }
    });

    it('should handle timeout errors efficiently', async () => {
      mockPlatformAdapter.executeCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      const startTime = performance.now();

      try {
        await detector.detectAll({ timeout: 1000 });
      } catch (error) {
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(1200); // Should timeout quickly
      }
    });
  });

  describe('Scalability Benchmarks', () => {
    it('should scale linearly with system resources', async () => {
      const testSizes = [1, 10, 100, 1000];
      const durations: number[] = [];

      for (const size of testSizes) {
        mockPlatformAdapter.executeCommand.mockResolvedValue(`scale test ${size}`);
        
        const startTime = performance.now();
        
        for (let i = 0; i < size; i++) {
          await detector.detectAll();
        }
        
        const duration = performance.now() - startTime;
        durations.push(duration / size); // Average per operation
      }

      // Performance should not degrade significantly with scale
      const firstAvg = durations[0];
      const lastAvg = durations[durations.length - 1];
      
      expect(lastAvg).toBeLessThan(firstAvg * 3); // Max 3x degradation
    });

    it('should handle system resource pressure gracefully', async () => {
      // Simulate high system load
      mockPlatformAdapter.executeCommand.mockImplementation(() => {
        const delay = Math.random() * 500; // 0-500ms random delay
        return new Promise(resolve => 
          setTimeout(() => resolve('pressure test'), delay)
        );
      });

      const startTime = performance.now();
      
      await detector.detectAll();
      
      const duration = performance.now() - startTime;
      
      // Should still complete within reasonable time under pressure
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Optimization Benchmarks', () => {
    it('should benefit from result caching', async () => {
      const cacheHits = 100;
      mockPlatformAdapter.executeCommand.mockResolvedValue('cache test');

      // Prime the cache
      await detector.detectAll();

      const startTime = performance.now();
      
      for (let i = 0; i < cacheHits; i++) {
        await detector.detectAll();
      }
      
      const duration = performance.now() - startTime;
      const avgDuration = duration / cacheHits;

      expect(avgDuration).toBeLessThan(10); // Should be very fast with cache
    });

    it('should optimize command batching', async () => {
      const batchOperations = ['cpu', 'memory', 'disk', 'network'];
      
      // Individual operations
      const individualStart = performance.now();
      for (const operation of batchOperations) {
        mockPlatformAdapter.executeCommand.mockResolvedValue(`${operation} response`);
        await detector[`detect${operation.charAt(0).toUpperCase() + operation.slice(1)}`]();
      }
      const individualDuration = performance.now() - individualStart;

      // Batched operation
      const batchStart = performance.now();
      mockPlatformAdapter.executeCommand.mockResolvedValue('batch response');
      await detector.detectAll();
      const batchDuration = performance.now() - batchStart;

      expect(batchDuration).toBeLessThan(individualDuration);
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('should handle typical monitoring workload', async () => {
      const monitoringInterval = 5000; // 5 seconds
      const monitoringDuration = 60000; // 1 minute
      const expectedCalls = monitoringDuration / monitoringInterval;

      mockPlatformAdapter.executeCommand.mockResolvedValue('monitoring response');

      const startTime = performance.now();
      
      for (let i = 0; i < expectedCalls; i++) {
        await detector.detectAll();
        await TestUtils.delay(50); // Simulate processing time
      }
      
      const duration = performance.now() - startTime;
      const avgCallDuration = duration / expectedCalls;

      expect(avgCallDuration).toBeLessThan(200); // Should be efficient
    });

    it('should handle burst detection requests', async () => {
      const burstSize = 20;
      const burstInterval = 100; // 100ms between bursts
      const burstCount = 5;

      mockPlatformAdapter.executeCommand.mockResolvedValue('burst response');

      const startTime = performance.now();

      for (let burst = 0; burst < burstCount; burst++) {
        const burstPromises = Array.from({ length: burstSize }, () => 
          detector.detectAll()
        );
        
        await Promise.all(burstPromises);
        await TestUtils.delay(burstInterval);
      }

      const duration = performance.now() - startTime;
      const totalCalls = burstSize * burstCount;
      const avgCallDuration = duration / totalCalls;

      expect(avgCallDuration).toBeLessThan(100); // Should handle bursts efficiently
    });

    it('should maintain performance under memory pressure', async () => {
      // Simulate memory pressure
      const memoryPressure = Array.from({ length: 1000000 }, () => 
        Math.random().toString(36)
      );

      mockPlatformAdapter.executeCommand.mockResolvedValue('memory pressure response');

      const startTime = performance.now();
      await detector.detectAll();
      const duration = performance.now() - startTime;

      // Should still perform reasonably under memory pressure
      expect(duration).toBeLessThan(1000);

      // Clean up
      memoryPressure.length = 0;
    });
  });
});