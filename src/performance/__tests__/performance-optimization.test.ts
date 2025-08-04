/**
 * Performance Optimization Test Suite
 * 
 * Comprehensive tests for all performance optimization components:
 * - Advanced Performance Optimizer
 * - Large File Optimizer
 * - Integration Layer
 * - Cache Performance
 * - Resource Management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { AdvancedPerformanceOptimizer, DEFAULT_PERFORMANCE_CONFIG } from '../advanced-performance-optimizer';
import { LargeFileOptimizer, createLargeFileOptimizer } from '../large-file-optimizer';
import { IntegratedPerformanceSystem, createIntegratedPerformanceSystem } from '../performance-integration';
import { MemoryCache } from '../../memory/cache';
import { TTLMap } from '../../swarm/optimizations/ttl-map';
import { PerformanceBenchmarker } from '../../maestro-hive/performance-benchmarker';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockCoordinator = {
  validate: jest.fn().mockResolvedValue({ valid: true, score: 0.9 }),
  generateContent: jest.fn().mockResolvedValue('Generated content'),
  task: jest.fn().mockResolvedValue({ success: true })
};

describe('Performance Optimization System', () => {
  let tempDir: string;
  let testFiles: { [key: string]: string };
  
  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = join(tmpdir(), `perf-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create test files of various sizes
    testFiles = {
      small: join(tempDir, 'small-file.ts'),
      medium: join(tempDir, 'medium-file.ts'),
      large: join(tempDir, 'large-file.ts')
    };

    // Small file (100 lines)
    const smallContent = Array(100).fill(0).map((_, i) => 
      `// Line ${i + 1}\nexport function func${i}() { return ${i}; }`
    ).join('\n');

    // Medium file (500 lines)
    const mediumContent = Array(500).fill(0).map((_, i) => 
      `// Line ${i + 1}\nexport class Class${i} { private value = ${i}; }`
    ).join('\n');

    // Large file (1000 lines)
    const largeContent = Array(1000).fill(0).map((_, i) => 
      `// Line ${i + 1}\nexport interface Interface${i} { property${i}: number; }`
    ).join('\n');

    await fs.writeFile(testFiles.small, smallContent);
    await fs.writeFile(testFiles.medium, mediumContent);
    await fs.writeFile(testFiles.large, largeContent);
  });

  afterEach(async () => {
    // Cleanup temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('AdvancedPerformanceOptimizer', () => {
    let optimizer: AdvancedPerformanceOptimizer;
    let memoryCache: MemoryCache;
    let benchmarker: PerformanceBenchmarker;

    beforeEach(() => {
      memoryCache = new MemoryCache(10 * 1024 * 1024, mockLogger); // 10MB
      benchmarker = new PerformanceBenchmarker();
      optimizer = new AdvancedPerformanceOptimizer(
        DEFAULT_PERFORMANCE_CONFIG,
        memoryCache,
        benchmarker,
        mockCoordinator as any
      );
    });

    afterEach(() => {
      optimizer.cleanup();
    });

    it('should initialize with correct configuration', () => {
      expect(optimizer).toBeDefined();
      const stats = optimizer.getStatistics();
      expect(stats).toHaveProperty('optimizationHistory');
      expect(stats).toHaveProperty('cacheWarming');
      expect(stats).toHaveProperty('prefetching');
    });

    it('should run optimization and return results', async () => {
      const result = await optimizer.optimize();
      
      expect(result).toHaveProperty('optimizationId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('appliedOptimizations');
      expect(result).toHaveProperty('recommendations');

      expect(result.appliedOptimizations.length).toBeGreaterThan(0);
    }, 15000); // 15 second timeout for comprehensive optimization

    it('should record access patterns for prefetching', () => {
      optimizer.recordAccess('test-key', ['related-key-1', 'related-key-2']);
      
      const stats = optimizer.getStatistics();
      expect(stats.prefetching.patternsLearned).toBeGreaterThan(0);
    });

    it('should process large files with streaming', async () => {
      const processor = async (chunk: string) => {
        return chunk.toUpperCase();
      };

      const result = await optimizer.processLargeFile(testFiles.large, processor);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle cache warming', async () => {
      // Test cache warming functionality
      const initialStats = memoryCache.getMetrics();
      
      await optimizer.optimize();
      
      const finalStats = memoryCache.getMetrics();
      expect(finalStats.entries).toBeGreaterThanOrEqual(initialStats.entries);
    });
  });

  describe('LargeFileOptimizer', () => {
    let optimizer: LargeFileOptimizer;
    let ttlCache: TTLMap<string, any>;

    beforeEach(() => {
      ttlCache = new TTLMap({
        defaultTTL: 300000, // 5 minutes
        maxSize: 100
      });
      optimizer = createLargeFileOptimizer(ttlCache, 4);
    });

    afterEach(() => {
      optimizer.cleanup();
      ttlCache.destroy();
    });

    it('should optimize large files with chunking', async () => {
      const context = {
        filePath: testFiles.large,
        operation: 'analyze' as const,
        options: {
          useCache: true,
          parallel: true,
          streaming: false,
          chunkSize: 64 * 1024
        }
      };

      const metrics = await optimizer.optimizeFile(testFiles.large, context);
      
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('chunksProcessed');
      expect(metrics).toHaveProperty('parallelEfficiency');
      expect(metrics).toHaveProperty('improvements');

      expect(metrics.chunksProcessed).toBeGreaterThan(0);
      expect(metrics.parallelEfficiency).toBeGreaterThan(0);
    });

    it('should process multiple files in parallel', async () => {
      const files = [testFiles.medium, testFiles.large];
      const context = {
        filePath: '',
        operation: 'analyze' as const,
        options: {
          useCache: true,
          parallel: true,
          streaming: false,
          chunkSize: 32 * 1024
        }
      };

      const startTime = performance.now();
      const results = await optimizer.optimizeFiles(files, context);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(2);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      results.forEach(result => {
        expect(result).toHaveProperty('processingTime');
        expect(result).toHaveProperty('improvements');
      });
    });

    it('should utilize cache for repeated operations', async () => {
      const context = {
        filePath: testFiles.medium,
        operation: 'parse' as const,
        options: {
          useCache: true,
          parallel: false,
          streaming: false,
          chunkSize: 64 * 1024
        }
      };

      // First optimization
      const firstResult = await optimizer.optimizeFile(testFiles.medium, context);
      
      // Second optimization (should use cache)
      const secondResult = await optimizer.optimizeFile(testFiles.medium, context);

      expect(secondResult.processingTime).toBeLessThan(firstResult.processingTime);
      expect(secondResult.cacheHitRate).toBeGreaterThan(firstResult.cacheHitRate);
    });

    it('should provide comprehensive statistics', () => {
      const stats = optimizer.getStatistics();
      
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('parallelProcessor');
      expect(stats).toHaveProperty('optimizationHistory');
      expect(stats).toHaveProperty('averageMetrics');
      expect(stats).toHaveProperty('fileMetadata');

      expect(Array.isArray(stats.optimizationHistory)).toBe(true);
      expect(Array.isArray(stats.fileMetadata)).toBe(true);
    });
  });

  describe('IntegratedPerformanceSystem', () => {
    let system: IntegratedPerformanceSystem;

    beforeEach(() => {
      system = createIntegratedPerformanceSystem(
        mockCoordinator as any,
        mockLogger as any,
        {
          enableAutoOptimization: false, // Disable for testing
          enableBenchmarking: false, // Speed up tests
          cacheWarmingEnabled: true,
          predictivePrefetchingEnabled: true,
          parallelProcessingEnabled: true
        }
      );
    });

    afterEach(async () => {
      await system.cleanup();
    });

    it('should initialize integrated system', () => {
      expect(system).toBeDefined();
      
      const stats = system.getStatistics();
      expect(stats).toHaveProperty('session');
      expect(stats).toHaveProperty('optimizers');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('autoOptimization');
    });

    it('should run comprehensive optimization', async () => {
      const metrics = await system.optimize('test');
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('session');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('recommendations');

      expect(metrics.session.operationsCount).toBeGreaterThanOrEqual(0);
      expect(metrics.cache.hitRates).toHaveProperty('overall');
    }, 15000);

    it('should record operations and trigger optimizations', async () => {
      const initialStats = system.getStatistics();
      const initialOperations = initialStats.session.operationsCount;

      system.recordOperation('test-operation', 100, true, {
        relatedKeys: ['key1', 'key2']
      });

      const updatedStats = system.getStatistics();
      expect(updatedStats.session.operationsCount).toBe(initialOperations + 1);
    });

    it('should process large files with integrated optimization', async () => {
      const processor = async (content: string) => {
        return `Processed: ${content.substring(0, 100)}...`;
      };

      const result = await system.processLargeFile(testFiles.large, processor);
      expect(result).toBeDefined();
      expect(result.startsWith('Processed:')).toBe(true);
    });

    it('should handle resource monitoring events', (done) => {
      system.on('memoryWarning', (data) => {
        expect(data).toHaveProperty('usage');
        expect(data).toHaveProperty('threshold');
        done();
      });

      // Simulate memory warning
      system.emit('memoryPressure', {
        usage: 100 * 1024 * 1024,
        threshold: 80 * 1024 * 1024
      });
    });

    it('should provide comprehensive statistics', () => {
      const stats = system.getStatistics();
      
      expect(stats.session).toHaveProperty('id');
      expect(stats.session).toHaveProperty('duration');
      expect(stats.session).toHaveProperty('operationsCount');

      expect(stats.optimizers).toHaveProperty('advanced');
      expect(stats.optimizers).toHaveProperty('largeFile');
      expect(stats.optimizers).toHaveProperty('benchmarker');

      expect(stats.cache).toHaveProperty('memory');
      expect(stats.cache).toHaveProperty('ttl');

      expect(stats.autoOptimization).toHaveProperty('enabled');
      expect(stats.autoOptimization).toHaveProperty('schedule');
    });
  });

  describe('Cache Performance', () => {
    let memoryCache: MemoryCache;
    let ttlCache: TTLMap<string, any>;

    beforeEach(() => {
      memoryCache = new MemoryCache(1024 * 1024, mockLogger); // 1MB
      ttlCache = new TTLMap({
        defaultTTL: 60000, // 1 minute
        maxSize: 100
      });
    });

    afterEach(() => {
      memoryCache.clear();
      ttlCache.destroy();
    });

    it('should achieve target cache hit rates', () => {
      const testData = Array(50).fill(0).map((_, i) => ({
        id: `test-${i}`,
        agentId: 'test',
        sessionId: 'test-session',
        type: 'test',
        content: `Test content ${i}`,
        context: { index: i },
        tags: ['test'],
        timestamp: Date.now(),
        version: 1
      }));

      // Populate cache
      testData.forEach(data => {
        memoryCache.set(data.id, data);
        ttlCache.set(data.id, data);
      });

      // Test cache hits
      let memoryHits = 0;
      let ttlHits = 0;

      testData.forEach(data => {
        if (memoryCache.get(data.id)) memoryHits++;
        if (ttlCache.get(data.id)) ttlHits++;
      });

      expect(memoryHits / testData.length).toBeGreaterThan(0.9); // 90%+ hit rate
      expect(ttlHits / testData.length).toBeGreaterThan(0.9); // 90%+ hit rate
    });

    it('should handle cache eviction properly', () => {
      const smallCache = new MemoryCache(1024, mockLogger); // Very small cache
      
      // Fill beyond capacity
      Array(20).fill(0).forEach((_, i) => {
        smallCache.set(`key-${i}`, {
          id: `key-${i}`,
          agentId: 'test',
          sessionId: 'test',
          type: 'test',
          content: 'x'.repeat(100), // 100 bytes each
          context: {},
          tags: [],
          timestamp: Date.now(),
          version: 1
        });
      });

      const metrics = smallCache.getMetrics();
      expect(metrics.entries).toBeLessThan(20); // Should have evicted some entries
      expect(metrics.size).toBeLessThanOrEqual(1024); // Should stay within limit
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const ttlCache = new TTLMap({ defaultTTL: 300000, maxSize: 100 });
      const optimizer = createLargeFileOptimizer(ttlCache, 4);

      try {
        const context = {
          filePath: testFiles.large,
          operation: 'analyze' as const,
          options: {
            useCache: false, // Force actual processing
            parallel: true,
            streaming: false,
            chunkSize: 64 * 1024
          }
        };

        const startTime = performance.now();
        const metrics = await optimizer.optimizeFile(testFiles.large, context);
        const duration = performance.now() - startTime;

        // Performance targets
        expect(duration).toBeLessThan(10000); // < 10 seconds
        expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB
        expect(metrics.parallelEfficiency).toBeGreaterThan(0.5); // > 50% efficiency

        // Cache performance (if enabled)
        if (context.options.useCache) {
          expect(metrics.cacheHitRate).toBeGreaterThan(0.8); // > 80% hit rate
        }
      } finally {
        optimizer.cleanup();
        ttlCache.destroy();
      }
    }, 15000);
  });

  describe('Resource Management', () => {
    it('should manage memory usage effectively', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const system = createIntegratedPerformanceSystem(
        mockCoordinator as any,
        mockLogger as any,
        {
          enableAutoOptimization: false,
          enableBenchmarking: false
        }
      );

      try {
        // Perform operations that could consume memory
        await system.optimize('memory-test');
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Should not consume excessive memory (< 50MB increase)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        
      } finally {
        await system.cleanup();
      }
    });

    it('should handle concurrent operations without resource exhaustion', async () => {
      const system = createIntegratedPerformanceSystem(
        mockCoordinator as any,
        mockLogger as any,
        { maxParallelOperations: 4 }
      );

      try {
        const operations = Array(10).fill(0).map(async (_, i) => {
          return system.processLargeFile(testFiles.medium, async (content) => {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 100));
            return `Processed operation ${i}`;
          });
        });

        const results = await Promise.all(operations);
        expect(results).toHaveLength(10);
        results.forEach((result, i) => {
          expect(result).toBe(`Processed operation ${i}`);
        });

      } finally {
        await system.cleanup();
      }
    }, 10000);
  });
});