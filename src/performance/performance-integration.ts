/**
 * Performance Integration Layer
 * 
 * Integrates all performance optimization components into a unified system:
 * - Advanced Performance Optimizer (caching, prefetching, streaming)
 * - Large File Optimizer (chunking, parallel processing)
 * - Existing Performance Benchmarker (metrics, monitoring)
 * - Memory Cache (LRU eviction)
 * - TTL Map (time-based expiration)
 * 
 * Provides a single interface for comprehensive performance optimization
 * with intelligent coordination between all components.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { AdvancedPerformanceOptimizer, PerformanceOptimizationConfig, DEFAULT_PERFORMANCE_CONFIG } from './advanced-performance-optimizer.js';
import { LargeFileOptimizer, OptimizationMetrics, ProcessingContext, optimizeKnownLargeFiles } from './large-file-optimizer.js';
import { PerformanceBenchmarker, PerformanceBenchmarkResult, CachePerformanceMetrics } from '../maestro-hive/performance-benchmarker.js';
import { MemoryCache } from '../memory/cache.js';
import { TTLMap } from '../swarm/optimizations/ttl-map.js';
import type { MaestroHiveCoordinator, SteeringDocument } from '../maestro-hive/interfaces.js';
import type { ILogger } from '../core/logger.js';

// ===== INTEGRATION INTERFACES =====

export interface PerformanceSystemConfig extends PerformanceOptimizationConfig {
  enableLargeFileOptimization: boolean;
  enableBenchmarking: boolean;
  enableAutoOptimization: boolean;
  optimizationSchedule: {
    enabled: boolean;
    interval: number; // milliseconds
    triggers: ('memory_pressure' | 'cpu_pressure' | 'cache_miss' | 'scheduled')[];
  };
  thresholds: {
    largeFileSize: number; // bytes
    memoryPressure: number; // bytes
    cpuPressure: number; // percentage
    cacheMissRate: number; // percentage
  };
}

export interface ComprehensiveMetrics {
  timestamp: Date;
  session: {
    id: string;
    duration: number;
    operationsCount: number;
  };
  performance: {
    benchmarkResult?: PerformanceBenchmarkResult;
    optimizationMetrics: OptimizationMetrics[];
    resourceUsage: {
      memory: { current: number; peak: number; average: number };
      cpu: { current: number; peak: number; average: number };
    };
  };
  cache: {
    memory: CachePerformanceMetrics;
    ttl: any;
    multiLevel: any;
    hitRates: { overall: number; l1: number; l2: number; l3: number };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface OptimizationPlan {
  id: string;
  timestamp: Date;
  trigger: string;
  phases: OptimizationPhase[];
  estimatedDuration: number;
  expectedImprovements: {
    performance: number;
    memory: number;
    cache: number;
  };
}

export interface OptimizationPhase {
  name: string;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
  enabled: boolean;
}

// ===== PERFORMANCE SYSTEM =====

export class IntegratedPerformanceSystem extends EventEmitter {
  private advancedOptimizer: AdvancedPerformanceOptimizer;
  private largeFileOptimizer: LargeFileOptimizer;
  private performanceBenchmarker: PerformanceBenchmarker;
  private memoryCache: MemoryCache;
  private ttlCache: TTLMap<string, any>;

  private sessionId: string;
  private sessionStartTime: number;
  private operationsCount = 0;
  private autoOptimizationEnabled = false;
  private autoOptimizationTimer?: NodeJS.Timeout;
  private metricsHistory: ComprehensiveMetrics[] = [];
  private resourceMonitor?: NodeJS.Timeout;

  constructor(
    private config: PerformanceSystemConfig,
    private coordinator: MaestroHiveCoordinator,
    private logger: ILogger
  ) {
    super();

    this.sessionId = `perf-session-${Date.now()}`;
    this.sessionStartTime = performance.now();

    // Initialize caching system
    this.ttlCache = new TTLMap({
      defaultTTL: 600000, // 10 minutes
      cleanupInterval: 60000, // 1 minute
      maxSize: 1000
    });

    this.memoryCache = new MemoryCache(
      100 * 1024 * 1024, // 100MB max size
      logger
    );

    // Initialize optimizers
    this.performanceBenchmarker = new PerformanceBenchmarker();
    this.largeFileOptimizer = new LargeFileOptimizer(this.ttlCache, config.maxParallelOperations);
    this.advancedOptimizer = new AdvancedPerformanceOptimizer(
      config,
      this.memoryCache,
      this.performanceBenchmarker,
      coordinator
    );

    this.setupEventHandlers();
    this.startResourceMonitoring();

    if (config.enableAutoOptimization) {
      this.enableAutoOptimization();
    }

    logger.info('🚀 Integrated Performance System initialized', {
      sessionId: this.sessionId,
      config: {
        cacheWarming: config.cacheWarmingEnabled,
        prefetching: config.predictivePrefetchingEnabled,
        largeFileOptimization: config.enableLargeFileOptimization,
        autoOptimization: config.enableAutoOptimization
      }
    });
  }

  /**
   * Run comprehensive performance optimization
   */
  async optimize(trigger: string = 'manual'): Promise<ComprehensiveMetrics> {
    const startTime = performance.now();
    this.logger.info('🎯 Starting comprehensive performance optimization', { trigger });

    try {
      const plan = await this.createOptimizationPlan(trigger);
      this.logger.info('📋 Optimization plan created', { phases: plan.phases.length });

      const results: any = {
        optimizationMetrics: [],
        benchmarkResult: undefined
      };

      // Phase 1: Advanced optimization (caching, prefetching, etc.)
      if (plan.phases.some(p => p.name === 'advanced-optimization' && p.enabled)) {
        this.logger.info('🔧 Phase 1: Advanced optimization...');
        const advancedResult = await this.advancedOptimizer.optimize();
        results.advancedOptimization = advancedResult;
      }

      // Phase 2: Large file optimization
      if (this.config.enableLargeFileOptimization && 
          plan.phases.some(p => p.name === 'large-file-optimization' && p.enabled)) {
        this.logger.info('📄 Phase 2: Large file optimization...');
        const largeFileResults = await this.optimizeLargeFiles();
        results.optimizationMetrics.push(...largeFileResults);
      }

      // Phase 3: Performance benchmarking
      if (this.config.enableBenchmarking && 
          plan.phases.some(p => p.name === 'benchmarking' && p.enabled)) {
        this.logger.info('📊 Phase 3: Performance benchmarking...');
        const benchmarkResult = await this.runPerformanceBenchmark();
        results.benchmarkResult = benchmarkResult;
      }

      // Phase 4: Cache optimization
      if (plan.phases.some(p => p.name === 'cache-optimization' && p.enabled)) {
        this.logger.info('💾 Phase 4: Cache optimization...');
        await this.optimizeCaches();
      }

      const metrics = await this.generateComprehensiveMetrics(results);
      this.metricsHistory.push(metrics);

      const duration = performance.now() - startTime;
      this.logger.info('✅ Comprehensive optimization completed', {
        duration: `${duration.toFixed(2)}ms`,
        improvements: metrics.recommendations.priority
      });

      this.emit('optimizationComplete', metrics);
      return metrics;

    } catch (error) {
      this.logger.error('❌ Comprehensive optimization failed', error);
      throw error;
    }
  }

  /**
   * Optimize large files specifically
   */
  async optimizeLargeFiles(): Promise<OptimizationMetrics[]> {
    try {
      const results = await optimizeKnownLargeFiles(this.largeFileOptimizer);
      
      this.logger.info('📄 Large file optimization completed', {
        filesOptimized: results.length,
        averageImprovement: results.reduce((sum, r) => sum + r.improvements.timeReduction, 0) / results.length
      });

      return results;
    } catch (error) {
      this.logger.error('❌ Large file optimization failed', error);
      return [];
    }
  }

  /**
   * Run performance benchmark
   */
  async runPerformanceBenchmark(): Promise<PerformanceBenchmarkResult> {
    // Create test scenarios for benchmarking
    const testDocuments: SteeringDocument[] = [
      {
        id: 'bench-doc-1',
        type: 'implementation',
        content: 'Test document for performance benchmarking',
        metadata: { source: 'benchmark', size: 'large' }
      },
      {
        id: 'bench-doc-2',
        type: 'design',
        content: 'Design document for benchmark testing',
        metadata: { source: 'benchmark', size: 'medium' }
      }
    ];

    const scenarios = [
      {
        name: 'Document Processing Benchmark',
        documents: testDocuments,
        operations: 50
      },
      {
        name: 'Cache Performance Benchmark',
        documents: testDocuments,
        operations: 100
      }
    ];

    return this.performanceBenchmarker.runComprehensiveBenchmark(this.coordinator, scenarios);
  }

  /**
   * Optimize caches
   */
  async optimizeCaches(): Promise<void> {
    // Memory cache optimization
    const memoryMetrics = this.memoryCache.getMetrics();
    if (memoryMetrics.hitRate < this.config.cacheTargets.hitRate) {
      this.logger.info('💾 Optimizing memory cache settings');
      this.memoryCache.performMaintenance();
    }

    // TTL cache optimization
    const ttlStats = this.ttlCache.getStats();
    if (ttlStats.hitRate < this.config.cacheTargets.hitRate) {
      this.logger.info('⏰ Optimizing TTL cache settings');
      // TTL cache cleanup is automatic, but we can trigger it
    }

    this.logger.info('💾 Cache optimization completed');
  }

  /**
   * Record operation for analytics and optimization
   */
  recordOperation(operation: string, duration: number, cacheHit: boolean, metadata?: any): void {
    this.operationsCount++;
    
    // Record for predictive prefetching
    if (metadata?.relatedKeys) {
      this.advancedOptimizer.recordAccess(operation, metadata.relatedKeys);
    }

    // Check if auto-optimization should be triggered
    if (this.shouldTriggerAutoOptimization()) {
      this.triggerAutoOptimization('operation_threshold');
    }
  }

  /**
   * Process large file with optimization
   */
  async processLargeFile(filePath: string, operation: (content: string) => Promise<string>): Promise<string> {
    const stats = require('fs').statSync(filePath);
    
    if (stats.size > this.config.thresholds.largeFileSize) {
      this.logger.info('📄 Processing large file with optimization', { 
        file: filePath, 
        size: `${Math.round(stats.size / 1024 / 1024)}MB` 
      });
      
      return this.advancedOptimizer.processLargeFile(filePath, operation);
    }

    // Process normally for smaller files
    const content = require('fs').readFileSync(filePath, 'utf8');
    return operation(content);
  }

  /**
   * Create optimization plan based on current state
   */
  private async createOptimizationPlan(trigger: string): Promise<OptimizationPlan> {
    const currentMetrics = await this.getCurrentMetrics();
    const phases: OptimizationPhase[] = [];

    // Determine which phases to enable based on current state
    const memoryPressure = currentMetrics.memory > this.config.thresholds.memoryPressure;
    const cpuPressure = currentMetrics.cpu > this.config.thresholds.cpuPressure;
    const cacheMissing = currentMetrics.cacheMissRate > this.config.thresholds.cacheMissRate;

    phases.push({
      name: 'advanced-optimization',
      description: 'Cache warming, prefetching, and advanced optimizations',
      estimatedDuration: 5000,
      dependencies: [],
      enabled: cacheMissing || trigger === 'manual'
    });

    phases.push({
      name: 'large-file-optimization',
      description: 'Optimize processing of large files',
      estimatedDuration: 3000,
      dependencies: [],
      enabled: this.config.enableLargeFileOptimization
    });

    phases.push({
      name: 'benchmarking',
      description: 'Performance benchmarking and analysis',
      estimatedDuration: 10000,
      dependencies: ['advanced-optimization'],
      enabled: this.config.enableBenchmarking && (trigger === 'manual' || trigger === 'scheduled')
    });

    phases.push({
      name: 'cache-optimization',
      description: 'Cache maintenance and optimization',
      estimatedDuration: 2000,
      dependencies: [],
      enabled: cacheMissing || memoryPressure
    });

    const totalDuration = phases
      .filter(p => p.enabled)
      .reduce((sum, p) => sum + p.estimatedDuration, 0);

    return {
      id: `plan-${Date.now()}`,
      timestamp: new Date(),
      trigger,
      phases,
      estimatedDuration: totalDuration,
      expectedImprovements: {
        performance: cacheMissing ? 0.3 : 0.1,
        memory: memoryPressure ? 0.2 : 0.05,
        cache: cacheMissing ? 0.4 : 0.1
      }
    };
  }

  /**
   * Generate comprehensive metrics
   */
  private async generateComprehensiveMetrics(results: any): Promise<ComprehensiveMetrics> {
    const memoryUsage = process.memoryUsage();
    const cacheStats = {
      memory: this.memoryCache.getMetrics(),
      ttl: this.ttlCache.getStats()
    };

    const recommendations = this.generateRecommendations(cacheStats, memoryUsage);

    return {
      timestamp: new Date(),
      session: {
        id: this.sessionId,
        duration: performance.now() - this.sessionStartTime,
        operationsCount: this.operationsCount
      },
      performance: {
        benchmarkResult: results.benchmarkResult,
        optimizationMetrics: results.optimizationMetrics || [],
        resourceUsage: {
          memory: {
            current: memoryUsage.heapUsed,
            peak: memoryUsage.heapTotal,
            average: memoryUsage.heapUsed // Simplified
          },
          cpu: {
            current: 0, // Would need actual CPU monitoring
            peak: 0,
            average: 0
          }
        }
      },
      cache: {
        memory: cacheStats.memory,
        ttl: cacheStats.ttl,
        multiLevel: {}, // Would get from large file optimizer
        hitRates: {
          overall: (cacheStats.memory.hitRate + cacheStats.ttl.hitRate) / 2,
          l1: cacheStats.memory.hitRate,
          l2: cacheStats.ttl.hitRate,
          l3: 0
        }
      },
      recommendations
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(cacheStats: any, memoryUsage: NodeJS.MemoryUsage): ComprehensiveMetrics['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Memory pressure check
    if (memoryUsage.heapUsed > this.config.thresholds.memoryPressure) {
      immediate.push('High memory usage detected - consider garbage collection');
      priority = 'high';
    }

    // Cache performance check
    const overallHitRate = (cacheStats.memory.hitRate + cacheStats.ttl.hitRate) / 2;
    if (overallHitRate < this.config.cacheTargets.hitRate) {
      shortTerm.push(`Cache hit rate is ${(overallHitRate * 100).toFixed(1)}% - optimize cache settings`);
      if (priority === 'low') priority = 'medium';
    }

    // Long-term recommendations
    if (this.operationsCount > 1000) {
      longTerm.push('Consider implementing more aggressive caching for frequently accessed operations');
    }

    if (immediate.length === 0 && shortTerm.length === 0) {
      immediate.push('System performance is within optimal parameters');
    }

    return { immediate, shortTerm, longTerm, priority };
  }

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<{ memory: number; cpu: number; cacheMissRate: number }> {
    const memoryUsage = process.memoryUsage().heapUsed;
    const cacheStats = this.memoryCache.getMetrics();
    
    return {
      memory: memoryUsage,
      cpu: 0, // Would need actual CPU monitoring
      cacheMissRate: 1 - cacheStats.hitRate
    };
  }

  /**
   * Check if auto-optimization should be triggered
   */
  private shouldTriggerAutoOptimization(): boolean {
    if (!this.config.enableAutoOptimization) return false;

    const triggers = this.config.optimizationSchedule.triggers;
    
    // Check various trigger conditions
    if (triggers.includes('memory_pressure')) {
      const memoryUsage = process.memoryUsage().heapUsed;
      if (memoryUsage > this.config.thresholds.memoryPressure) return true;
    }

    if (triggers.includes('cache_miss')) {
      const cacheStats = this.memoryCache.getMetrics();
      if ((1 - cacheStats.hitRate) > this.config.thresholds.cacheMissRate) return true;
    }

    return false;
  }

  /**
   * Trigger auto-optimization
   */
  private async triggerAutoOptimization(trigger: string): Promise<void> {
    if (this.autoOptimizationEnabled) {
      this.logger.info('🤖 Auto-optimization triggered', { trigger });
      try {
        await this.optimize(trigger);
      } catch (error) {
        this.logger.error('❌ Auto-optimization failed', error);
      }
    }
  }

  /**
   * Enable auto-optimization
   */
  private enableAutoOptimization(): void {
    this.autoOptimizationEnabled = true;

    if (this.config.optimizationSchedule.enabled) {
      this.autoOptimizationTimer = setInterval(() => {
        this.triggerAutoOptimization('scheduled');
      }, this.config.optimizationSchedule.interval);
    }

    this.logger.info('🤖 Auto-optimization enabled');
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    if (this.config.resourceMonitoring.enabled) {
      this.resourceMonitor = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;
        
        if (memoryUsage > this.config.resourceMonitoring.memoryThreshold) {
          this.emit('memoryPressure', { usage: memoryUsage, threshold: this.config.resourceMonitoring.memoryThreshold });
        }
      }, this.config.resourceMonitoring.interval);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.advancedOptimizer.on('memoryWarning', (data) => {
      this.logger.warn('⚠️ Memory warning from advanced optimizer', data);
      this.emit('memoryWarning', data);
    });

    this.largeFileOptimizer.on('fileOptimized', (data) => {
      this.logger.info('📄 Large file optimized', data);
      this.emit('fileOptimized', data);
    });

    this.performanceBenchmarker.on('benchmarkCompleted', (result) => {
      this.logger.info('📊 Benchmark completed', { 
        id: result.benchmarkId, 
        throughput: result.throughput 
      });
      this.emit('benchmarkCompleted', result);
    });
  }

  /**
   * Get comprehensive system statistics
   */
  getStatistics() {
    return {
      session: {
        id: this.sessionId,
        duration: performance.now() - this.sessionStartTime,
        operationsCount: this.operationsCount
      },
      optimizers: {
        advanced: this.advancedOptimizer.getStatistics(),
        largeFile: this.largeFileOptimizer.getStatistics(),
        benchmarker: this.performanceBenchmarker.getPerformanceHistory()
      },
      cache: {
        memory: this.memoryCache.getMetrics(),
        ttl: this.ttlCache.getStats()
      },
      metricsHistory: this.metricsHistory,
      autoOptimization: {
        enabled: this.autoOptimizationEnabled,
        schedule: this.config.optimizationSchedule
      }
    };
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup(): Promise<void> {
    this.logger.info('🧹 Cleaning up performance system');

    if (this.autoOptimizationTimer) {
      clearInterval(this.autoOptimizationTimer);
    }

    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }

    this.advancedOptimizer.cleanup();
    this.largeFileOptimizer.cleanup();
    this.ttlCache.destroy();
    this.memoryCache.clear();

    this.removeAllListeners();
    this.logger.info('✅ Performance system cleanup completed');
  }
}

/**
 * Default configuration for integrated performance system
 */
export const DEFAULT_INTEGRATED_CONFIG: PerformanceSystemConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  enableLargeFileOptimization: true,
  enableBenchmarking: true,
  enableAutoOptimization: true,
  optimizationSchedule: {
    enabled: true,
    interval: 300000, // 5 minutes
    triggers: ['memory_pressure', 'cache_miss', 'scheduled']
  },
  thresholds: {
    largeFileSize: 1024 * 1024, // 1MB
    memoryPressure: 80 * 1024 * 1024, // 80MB
    cpuPressure: 75, // 75%
    cacheMissRate: 0.2 // 20%
  }
};

/**
 * Factory function for creating integrated performance system
 */
export function createIntegratedPerformanceSystem(
  coordinator: MaestroHiveCoordinator,
  logger: ILogger,
  config: Partial<PerformanceSystemConfig> = {}
): IntegratedPerformanceSystem {
  const finalConfig = { ...DEFAULT_INTEGRATED_CONFIG, ...config };
  return new IntegratedPerformanceSystem(finalConfig, coordinator, logger);
}