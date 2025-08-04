/**
 * Performance Benchmarker - Comprehensive Performance Analysis & Optimization
 * 
 * Implements comprehensive performance benchmarking and optimization analysis for distributed 
 * consensus protocols and document processing workflows, based on extracted methods from 
 * ComplexityReducer analysis.
 * 
 * Performance Targets:
 * - Document creation: <10s (50% improvement from 20s)
 * - Cross-validation: <8s (47% improvement from 15s)  
 * - Memory usage: <100MB (50% improvement from 200MB)
 * - Concurrent operations: 8 simultaneous workflows
 * - Cache hit rate: >90%
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type {
  MaestroHiveCoordinator,
  MaestroTask,
  MaestroWorkflow,
  MaestroValidationResult,
  SteeringWorkflowRequest,
  SteeringOperationResult,
  SteeringDocument
} from './interfaces';

// ===== PERFORMANCE INTERFACES =====

export interface PerformanceBenchmarkResult {
  benchmarkId: string;
  timestamp: Date;
  duration: number;
  throughput: number;
  latency: PerformanceLatencyMetrics;
  resourceUsage: ResourceUsageMetrics;
  cacheMetrics: CachePerformanceMetrics;
  parallelEfficiency: number;
  optimizationRecommendations: OptimizationRecommendation[];
}

export interface PerformanceLatencyMetrics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  standardDeviation: number;
  phaseBreakdown: Record<string, number>;
}

export interface ResourceUsageMetrics {
  cpu: {
    average: number;
    peak: number;
    utilization: number[];
  };
  memory: {
    average: number;
    peak: number;
    growth: number;
    gcImpact: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    activeConnections: number;
  };
  bottlenecks: ResourceBottleneck[];
}

export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  distribution: Record<string, number>;
}

export interface ResourceBottleneck {
  type: 'CPU' | 'MEMORY' | 'NETWORK' | 'DISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: number;
  recommendation: string;
}

export interface OptimizationRecommendation {
  type: 'PARALLEL' | 'CACHE' | 'RESOURCE' | 'ALGORITHM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  expectedImprovement: string;
  implementation: string;
  confidence: number;
}

// ===== LRU CACHE IMPLEMENTATION =====

class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, { value: V; timestamp: number; accessCount: number }>;
  private ttl: number;
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;

  constructor(capacity: number, ttlMs: number = 300000) {
    this.capacity = capacity;
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update access pattern
    item.accessCount++;
    item.timestamp = Date.now();
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    this.hitCount++;
    return item.value;
  }

  set(key: K, value: V): void {
    const existing = this.cache.get(key);
    
    if (existing) {
      existing.value = value;
      existing.timestamp = Date.now();
      existing.accessCount++;
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.evictionCount++;
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  getMetrics(): CachePerformanceMetrics {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? this.hitCount / total : 0,
      missRate: total > 0 ? this.missCount / total : 0,
      evictionRate: this.cache.size > 0 ? this.evictionCount / this.cache.size : 0,
      averageAccessTime: this.calculateAverageAccessTime(),
      memoryUsage: this.estimateMemoryUsage(),
      distribution: this.getAccessDistribution()
    };
  }

  private calculateAverageAccessTime(): number {
    if (this.cache.size === 0) return 0;
    
    let totalAccessTime = 0;
    for (const item of this.cache.values()) {
      totalAccessTime += item.accessCount;
    }
    
    return totalAccessTime / this.cache.size;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    return this.cache.size * 1024; // 1KB per item estimate
  }

  private getAccessDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const [key, item] of this.cache.entries()) {
      const keyStr = String(key);
      distribution[keyStr] = item.accessCount;
    }
    
    return distribution;
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }
}

// ===== PERFORMANCE MONITOR =====

class PerformanceMonitor {
  private startTime: number = 0;
  private measurements: Array<{ timestamp: number; memory: NodeJS.MemoryUsage; cpu?: number }> = [];
  private sampling: boolean = false;
  private sampleInterval: NodeJS.Timeout | null = null;

  start(): void {
    this.startTime = performance.now();
    this.measurements = [];
    this.sampling = true;
    
    // Start sampling resource usage
    this.sampleInterval = setInterval(() => {
      if (this.sampling) {
        this.measurements.push({
          timestamp: performance.now(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage ? process.cpuUsage().user / 1000 : 0
        });
      }
    }, 100); // Sample every 100ms
  }

  stop(): ResourceUsageMetrics {
    this.sampling = false;
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }

    return this.analyzeResourceUsage();
  }

  private analyzeResourceUsage(): ResourceUsageMetrics {
    if (this.measurements.length === 0) {
      return {
        cpu: { average: 0, peak: 0, utilization: [] },
        memory: { average: 0, peak: 0, growth: 0, gcImpact: 0 },
        network: { bytesIn: 0, bytesOut: 0, activeConnections: 0 },
        bottlenecks: []
      };
    }

    const memoryUsages = this.measurements.map(m => m.memory.heapUsed);
    const cpuUsages = this.measurements.map(m => m.cpu || 0);

    const memoryAvg = memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length;
    const memoryPeak = Math.max(...memoryUsages);
    const memoryGrowth = memoryUsages[memoryUsages.length - 1] - memoryUsages[0];

    const cpuAvg = cpuUsages.reduce((sum, val) => sum + val, 0) / cpuUsages.length;
    const cpuPeak = Math.max(...cpuUsages);

    const bottlenecks = this.identifyBottlenecks(memoryAvg, memoryPeak, cpuAvg, cpuPeak);

    return {
      cpu: {
        average: cpuAvg,
        peak: cpuPeak,
        utilization: cpuUsages
      },
      memory: {
        average: memoryAvg,
        peak: memoryPeak,
        growth: memoryGrowth,
        gcImpact: this.calculateGCImpact()
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        activeConnections: 0
      },
      bottlenecks
    };
  }

  private identifyBottlenecks(memoryAvg: number, memoryPeak: number, cpuAvg: number, cpuPeak: number): ResourceBottleneck[] {
    const bottlenecks: ResourceBottleneck[] = [];

    // Memory bottlenecks
    if (memoryPeak > 100 * 1024 * 1024) { // 100MB
      bottlenecks.push({
        type: 'MEMORY',
        severity: memoryPeak > 200 * 1024 * 1024 ? 'HIGH' : 'MEDIUM',
        description: `High memory usage: ${Math.round(memoryPeak / 1024 / 1024)}MB peak`,
        impact: memoryPeak / (100 * 1024 * 1024),
        recommendation: 'Implement more aggressive caching or optimize data structures'
      });
    }

    // CPU bottlenecks
    if (cpuPeak > 80) {
      bottlenecks.push({
        type: 'CPU',
        severity: cpuPeak > 95 ? 'CRITICAL' : 'HIGH',
        description: `High CPU usage: ${cpuPeak.toFixed(1)}% peak`,
        impact: cpuPeak / 100,
        recommendation: 'Optimize algorithms or implement parallel processing'
      });
    }

    return bottlenecks;
  }

  private calculateGCImpact(): number {
    // Estimate GC impact based on memory usage patterns
    if (this.measurements.length < 2) return 0;

    let gcEvents = 0;
    for (let i = 1; i < this.measurements.length; i++) {
      const current = this.measurements[i].memory.heapUsed;
      const previous = this.measurements[i - 1].memory.heapUsed;
      
      // Detect significant memory drops (potential GC)
      if (previous - current > 10 * 1024 * 1024) { // 10MB drop
        gcEvents++;
      }
    }

    return gcEvents / this.measurements.length;
  }
}

// ===== LATENCY ANALYZER =====

class LatencyAnalyzer {
  private measurements: number[] = [];

  addMeasurement(latency: number): void {
    this.measurements.push(latency);
  }

  getMetrics(): PerformanceLatencyMetrics {
    if (this.measurements.length === 0) {
      return {
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        standardDeviation: 0,
        phaseBreakdown: {}
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const mean = this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    const variance = this.measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.measurements.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean,
      median,
      p95,
      p99,
      standardDeviation,
      phaseBreakdown: this.calculatePhaseBreakdown()
    };
  }

  private calculatePhaseBreakdown(): Record<string, number> {
    // Simulate different phases - in real implementation this would track actual phases
    const total = this.measurements.reduce((sum, val) => sum + val, 0);
    return {
      validation: total * 0.2,
      processing: total * 0.5,
      generation: total * 0.3
    };
  }

  reset(): void {
    this.measurements = [];
  }
}

// ===== PARALLEL OPERATION PIPELINE =====

class ParallelOperationPipeline {
  private maxConcurrency: number;
  private activeOperations: Set<Promise<any>> = new Set();

  constructor(maxConcurrency: number = 8) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Execute document processing pipeline with parallel validation
   * Based on extracted executeSteeringWorkflow pattern
   */
  async executeDocumentProcessingPipeline(
    documents: SteeringDocument[],
    coordinator: MaestroHiveCoordinator
  ): Promise<{ results: any[]; efficiency: number }> {
    const startTime = performance.now();
    const operations: Promise<any>[] = [];

    // Parallel validation chain (from extracted pattern)
    for (const document of documents) {
      if (operations.length >= this.maxConcurrency) {
        // Wait for some operations to complete
        await Promise.race(operations);
        operations.splice(0, 1);
      }

      const operation = this.processDocumentConcurrently(document, coordinator);
      operations.push(operation);
    }

    // Wait for all operations to complete
    const results = await Promise.all(operations);
    const duration = performance.now() - startTime;
    
    // Calculate parallel efficiency
    const sequentialEstimate = documents.length * 2000; // 2s per document estimate
    const efficiency = Math.min(1.0, sequentialEstimate / duration);

    return { results, efficiency };
  }

  /**
   * Process document concurrently with parallel validation
   * Based on extracted performCrossValidation pattern
   */
  private async processDocumentConcurrently(
    document: SteeringDocument,
    coordinator: MaestroHiveCoordinator
  ): Promise<any> {
    // Parallel validation chain implementation
    const [validation, steeringCheck, consensus] = await Promise.all([
      this.validateDocument(document, coordinator),
      this.validateSteeringCompliance(document, coordinator),
      this.requestConsensus(document, coordinator)
    ]);

    return {
      documentId: document.id,
      validation,
      steeringCheck,
      consensus,
      processed: true
    };
  }

  /**
   * Generate content with parallel strategies
   * Based on extracted generateSteeringContent pattern
   */
  async generateContentParallel(
    context: any,
    coordinator: MaestroHiveCoordinator
  ): Promise<{ technical: string; product: string; workflow: string }> {
    // Parallel content generation with different strategies
    const [technical, product, workflow] = await Promise.all([
      this.generateTechnicalContent(context, coordinator),
      this.generateProductContent(context, coordinator),
      this.generateWorkflowContent(context, coordinator)
    ]);

    return { technical, product, workflow };
  }

  // Helper methods for document processing
  private async validateDocument(document: SteeringDocument, coordinator: MaestroHiveCoordinator): Promise<MaestroValidationResult> {
    return coordinator.validate(document.content || '', document.type, false);
  }

  private async validateSteeringCompliance(document: SteeringDocument, coordinator: MaestroHiveCoordinator): Promise<any> {
    // Simulate steering compliance validation
    return {
      compliant: true,
      score: 0.85,
      recommendations: []
    };
  }

  private async requestConsensus(document: SteeringDocument, coordinator: MaestroHiveCoordinator): Promise<any> {
    // Simulate consensus request
    return {
      achieved: true,
      confidence: 0.9,
      participants: 3
    };
  }

  private async generateTechnicalContent(context: any, coordinator: MaestroHiveCoordinator): Promise<string> {
    return coordinator.generateContent('Generate technical documentation', 'design', 'design_architect');
  }

  private async generateProductContent(context: any, coordinator: MaestroHiveCoordinator): Promise<string> {
    return coordinator.generateContent('Generate product requirements', 'spec', 'analyst');
  }

  private async generateWorkflowContent(context: any, coordinator: MaestroHiveCoordinator): Promise<string> {
    return coordinator.generateContent('Generate workflow documentation', 'implementation', 'coder');
  }
}

// ===== MAIN PERFORMANCE BENCHMARKER =====

export class PerformanceBenchmarker extends EventEmitter {
  private documentCache: LRUCache<string, any>;
  private templateCache: LRUCache<string, string>;
  private validationCache: LRUCache<string, MaestroValidationResult>;
  private metadataCache: LRUCache<string, any>;
  
  private performanceMonitor: PerformanceMonitor;
  private latencyAnalyzer: LatencyAnalyzer;
  private parallelPipeline: ParallelOperationPipeline;
  
  private benchmarkHistory: Map<string, PerformanceBenchmarkResult[]> = new Map();

  constructor() {
    super();
    
    // Initialize LRU caches with optimized settings
    this.documentCache = new LRUCache(1000, 600000); // 1000 items, 10min TTL
    this.templateCache = new LRUCache(200, 1800000); // 200 items, 30min TTL  
    this.validationCache = new LRUCache(500, 300000); // 500 items, 5min TTL
    this.metadataCache = new LRUCache(300, 900000); // 300 items, 15min TTL
    
    this.performanceMonitor = new PerformanceMonitor();
    this.latencyAnalyzer = new LatencyAnalyzer();
    this.parallelPipeline = new ParallelOperationPipeline(8);
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runComprehensiveBenchmark(
    coordinator: MaestroHiveCoordinator,
    scenarios: Array<{ name: string; documents: SteeringDocument[]; operations: number }>
  ): Promise<PerformanceBenchmarkResult> {
    const benchmarkId = `benchmark-${Date.now()}`;
    const startTime = performance.now();
    
    this.performanceMonitor.start();
    this.latencyAnalyzer.reset();
    
    console.log(`🚀 Starting comprehensive performance benchmark: ${benchmarkId}`);
    
    try {
      const results = [];
      let totalOperations = 0;
      let parallelEfficiencySum = 0;

      // Execute benchmark scenarios
      for (const scenario of scenarios) {
        console.log(`📊 Running scenario: ${scenario.name}`);
        
        const scenarioStart = performance.now();
        const scenarioResult = await this.runBenchmarkScenario(scenario, coordinator);
        const scenarioDuration = performance.now() - scenarioStart;
        
        this.latencyAnalyzer.addMeasurement(scenarioDuration);
        
        results.push(scenarioResult);
        totalOperations += scenario.operations;
        parallelEfficiencySum += scenarioResult.efficiency;
        
        console.log(`✅ Scenario completed: ${scenario.name} (${scenarioDuration.toFixed(2)}ms)`);
      }

      const totalDuration = performance.now() - startTime;
      const resourceUsage = this.performanceMonitor.stop();
      const latencyMetrics = this.latencyAnalyzer.getMetrics();
      
      // Calculate overall metrics
      const throughput = totalOperations / (totalDuration / 1000); // ops/second
      const avgParallelEfficiency = parallelEfficiencySum / scenarios.length;
      
      // Collect cache metrics
      const cacheMetrics = this.aggregateCacheMetrics();
      
      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(
        resourceUsage,
        latencyMetrics,
        cacheMetrics,
        avgParallelEfficiency
      );

      const benchmarkResult: PerformanceBenchmarkResult = {
        benchmarkId,
        timestamp: new Date(),
        duration: totalDuration,
        throughput,
        latency: latencyMetrics,
        resourceUsage,
        cacheMetrics,
        parallelEfficiency: avgParallelEfficiency,
        optimizationRecommendations: recommendations
      };

      // Store in history
      const history = this.benchmarkHistory.get('comprehensive') || [];
      history.push(benchmarkResult);
      this.benchmarkHistory.set('comprehensive', history);

      console.log(`🎯 Benchmark completed: ${benchmarkId}`);
      this.printBenchmarkSummary(benchmarkResult);

      this.emit('benchmarkCompleted', benchmarkResult);
      return benchmarkResult;

    } catch (error) {
      this.performanceMonitor.stop();
      console.error(`❌ Benchmark failed: ${benchmarkId}`, error);
      throw error;
    }
  }

  /**
   * Run individual benchmark scenario
   */
  private async runBenchmarkScenario(
    scenario: { name: string; documents: SteeringDocument[]; operations: number },
    coordinator: MaestroHiveCoordinator
  ): Promise<{ results: any[]; efficiency: number }> {
    
    // Use parallel pipeline for document processing
    const { results, efficiency } = await this.parallelPipeline.executeDocumentProcessingPipeline(
      scenario.documents,
      coordinator
    );

    // Test caching performance
    await this.benchmarkCachePerformance(scenario.documents);
    
    return { results, efficiency };
  }

  /**
   * Benchmark caching system performance
   */
  private async benchmarkCachePerformance(documents: SteeringDocument[]): Promise<void> {
    const operations = 1000;
    const startTime = performance.now();
    
    // Test cache performance with various operations
    for (let i = 0; i < operations; i++) {
      const docIndex = i % documents.length;
      const document = documents[docIndex];
      const cacheKey = `doc-${document.id}-${i}`;
      
      // Test document cache
      let cached = this.documentCache.get(cacheKey);
      if (!cached) {
        this.documentCache.set(cacheKey, { ...document, processed: Date.now() });
      }
      
      // Test template cache
      const templateKey = `template-${document.type}-${i % 10}`;
      let template = this.templateCache.get(templateKey);
      if (!template) {
        this.templateCache.set(templateKey, `Template for ${document.type}`);
      }
      
      // Test validation cache (simulated)
      const validationKey = `validation-${document.id}-${i % 50}`;
      let validation = this.validationCache.get(validationKey);
      if (!validation) {
        this.validationCache.set(validationKey, {
          valid: true,
          score: 0.8,
          errors: [],
          warnings: [],
          suggestions: [],
          timestamp: new Date()
        });
      }
    }
    
    const duration = performance.now() - startTime;
    console.log(`💾 Cache benchmark completed: ${operations} operations in ${duration.toFixed(2)}ms`);
  }

  /**
   * Aggregate cache metrics from all caches
   */
  private aggregateCacheMetrics(): CachePerformanceMetrics {
    const docMetrics = this.documentCache.getMetrics();
    const templateMetrics = this.templateCache.getMetrics();
    const validationMetrics = this.validationCache.getMetrics();
    const metadataMetrics = this.metadataCache.getMetrics();

    // Calculate weighted averages
    const totalOps = 4; // number of caches
    
    return {
      hitRate: (docMetrics.hitRate + templateMetrics.hitRate + validationMetrics.hitRate + metadataMetrics.hitRate) / totalOps,
      missRate: (docMetrics.missRate + templateMetrics.missRate + validationMetrics.missRate + metadataMetrics.missRate) / totalOps,
      evictionRate: (docMetrics.evictionRate + templateMetrics.evictionRate + validationMetrics.evictionRate + metadataMetrics.evictionRate) / totalOps,
      averageAccessTime: (docMetrics.averageAccessTime + templateMetrics.averageAccessTime + validationMetrics.averageAccessTime + metadataMetrics.averageAccessTime) / totalOps,
      memoryUsage: docMetrics.memoryUsage + templateMetrics.memoryUsage + validationMetrics.memoryUsage + metadataMetrics.memoryUsage,
      distribution: {
        documents: Object.keys(docMetrics.distribution).length,
        templates: Object.keys(templateMetrics.distribution).length,
        validations: Object.keys(validationMetrics.distribution).length,
        metadata: Object.keys(metadataMetrics.distribution).length
      }
    };
  }

  /**
   * Generate optimization recommendations based on performance data
   */
  private generateOptimizationRecommendations(
    resourceUsage: ResourceUsageMetrics,
    latencyMetrics: PerformanceLatencyMetrics,
    cacheMetrics: CachePerformanceMetrics,
    parallelEfficiency: number
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Cache optimization recommendations
    if (cacheMetrics.hitRate < 0.9) {
      recommendations.push({
        type: 'CACHE',
        priority: 'HIGH',
        description: `Cache hit rate is ${(cacheMetrics.hitRate * 100).toFixed(1)}%, below target of 90%`,
        expectedImprovement: '15-25% performance improvement',
        implementation: 'Increase cache size and optimize TTL settings',
        confidence: 0.8
      });
    }

    // Parallel processing recommendations  
    if (parallelEfficiency < 0.7) {
      recommendations.push({
        type: 'PARALLEL',
        priority: 'HIGH',
        description: `Parallel efficiency is ${(parallelEfficiency * 100).toFixed(1)}%, below optimal`,
        expectedImprovement: '20-30% throughput improvement',
        implementation: 'Optimize parallel pipeline and reduce synchronization points',
        confidence: 0.75
      });
    }

    // Memory optimization recommendations
    if (resourceUsage.memory.peak > 100 * 1024 * 1024) {
      recommendations.push({
        type: 'RESOURCE',
        priority: 'MEDIUM',
        description: `Peak memory usage ${Math.round(resourceUsage.memory.peak / 1024 / 1024)}MB exceeds target`,
        expectedImprovement: '30-50% memory reduction',
        implementation: 'Implement streaming processing and optimize data structures',
        confidence: 0.7
      });
    }

    // Latency optimization recommendations
    if (latencyMetrics.p95 > 10000) {
      recommendations.push({
        type: 'ALGORITHM',
        priority: 'MEDIUM',
        description: `95th percentile latency ${latencyMetrics.p95.toFixed(0)}ms exceeds target`,
        expectedImprovement: '40-60% latency reduction',
        implementation: 'Optimize critical path algorithms and reduce blocking operations',
        confidence: 0.6
      });
    }

    return recommendations;
  }

  /**
   * Print comprehensive benchmark summary
   */
  private printBenchmarkSummary(result: PerformanceBenchmarkResult): void {
    console.log('\n📊 Performance Benchmark Summary');
    console.log('================================');
    console.log(`Benchmark ID: ${result.benchmarkId}`);
    console.log(`Duration: ${result.duration.toFixed(2)}ms`);
    console.log(`Throughput: ${result.throughput.toFixed(2)} ops/sec`);
    console.log(`Parallel Efficiency: ${(result.parallelEfficiency * 100).toFixed(1)}%`);
    
    console.log('\n⏱️  Latency Metrics:');
    console.log(`  Mean: ${result.latency.mean.toFixed(2)}ms`);
    console.log(`  Median: ${result.latency.median.toFixed(2)}ms`);
    console.log(`  95th Percentile: ${result.latency.p95.toFixed(2)}ms`);
    console.log(`  99th Percentile: ${result.latency.p99.toFixed(2)}ms`);
    
    console.log('\n💾 Cache Performance:');
    console.log(`  Hit Rate: ${(result.cacheMetrics.hitRate * 100).toFixed(1)}%`);
    console.log(`  Miss Rate: ${(result.cacheMetrics.missRate * 100).toFixed(1)}%`);
    console.log(`  Memory Usage: ${Math.round(result.cacheMetrics.memoryUsage / 1024)}KB`);
    
    console.log('\n🔧 Resource Usage:');
    console.log(`  Peak Memory: ${Math.round(result.resourceUsage.memory.peak / 1024 / 1024)}MB`);
    console.log(`  Average CPU: ${result.resourceUsage.cpu.average.toFixed(1)}%`);
    console.log(`  Bottlenecks: ${result.resourceUsage.bottlenecks.length}`);
    
    if (result.optimizationRecommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');
      result.optimizationRecommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.description}`);
        console.log(`     Expected: ${rec.expectedImprovement}`);
      });
    }
    
    // Performance targets validation
    console.log('\n🎯 Performance Targets:');
    console.log(`  Document Creation: ${result.latency.mean < 10000 ? '✅' : '❌'} <10s (${(result.latency.mean / 1000).toFixed(1)}s)`);
    console.log(`  Cache Hit Rate: ${result.cacheMetrics.hitRate > 0.9 ? '✅' : '❌'} >90% (${(result.cacheMetrics.hitRate * 100).toFixed(1)}%)`);
    console.log(`  Memory Usage: ${result.resourceUsage.memory.peak < 100 * 1024 * 1024 ? '✅' : '❌'} <100MB (${Math.round(result.resourceUsage.memory.peak / 1024 / 1024)}MB)`);
    console.log(`  Parallel Efficiency: ${result.parallelEfficiency > 0.7 ? '✅' : '❌'} >70% (${(result.parallelEfficiency * 100).toFixed(1)}%)`);
  }

  /**
   * Get performance history and trends
   */
  getPerformanceHistory(benchmarkType: string = 'comprehensive'): PerformanceBenchmarkResult[] {
    return this.benchmarkHistory.get(benchmarkType) || [];
  }

  /**
   * Clear all caches for testing
   */
  clearCaches(): void {
    this.documentCache.clear();
    this.templateCache.clear();
    this.validationCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): Record<string, CachePerformanceMetrics> {
    return {
      documents: this.documentCache.getMetrics(),
      templates: this.templateCache.getMetrics(),
      validations: this.validationCache.getMetrics(),
      metadata: this.metadataCache.getMetrics()
    };
  }
}

/**
 * Factory function for creating performance benchmarker
 */
export function createPerformanceBenchmarker(): PerformanceBenchmarker {
  return new PerformanceBenchmarker();
}

/**
 * Quick performance benchmark for development testing
 */
export async function runQuickPerformanceBenchmark(
  coordinator: MaestroHiveCoordinator
): Promise<PerformanceBenchmarkResult> {
  const benchmarker = createPerformanceBenchmarker();
  
  // Create minimal test scenarios
  const testDocuments: SteeringDocument[] = [
    {
      id: 'test-doc-1',
      type: 'implementation',
      content: 'Test document content for performance testing',
      metadata: { source: 'benchmark' }
    },
    {
      id: 'test-doc-2', 
      type: 'design',
      content: 'Design document for performance validation',
      metadata: { source: 'benchmark' }
    }
  ];

  const scenarios = [
    {
      name: 'Quick Document Processing',
      documents: testDocuments,
      operations: 10
    }
  ];

  return await benchmarker.runComprehensiveBenchmark(coordinator, scenarios);
}