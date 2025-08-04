/**
 * Test Utilities and Helper Functions
 * 
 * Centralized utilities for testing framework to reduce duplication
 * and improve maintainability.
 * 
 * @version 1.0.0
 * @author Claude Flow TestingEnforcer Agent
 */

import type { TestResult, TestMetrics, TestError } from './test-specifications.js';

// ===== PERFORMANCE UTILITIES =====

/**
 * Performance measurement utility
 */
export class PerformanceMeasurer {
  private startTime: number = 0;
  private measurements: Map<string, number> = new Map();

  start(label?: string): void {
    this.startTime = Date.now();
    if (label) {
      this.measurements.set(`${label}_start`, this.startTime);
    }
  }

  end(label?: string): number {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    if (label) {
      this.measurements.set(`${label}_end`, endTime);
      this.measurements.set(`${label}_duration`, duration);
    }
    
    return duration;
  }

  getMeasurement(label: string): number | undefined {
    return this.measurements.get(label);
  }

  getAllMeasurements(): Record<string, number> {
    return Object.fromEntries(this.measurements);
  }

  clear(): void {
    this.measurements.clear();
    this.startTime = 0;
  }
}

// ===== MEMORY UTILITIES =====

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private baseline: NodeJS.MemoryUsage | null = null;
  private snapshots: Array<{ label: string; usage: NodeJS.MemoryUsage; timestamp: number }> = [];

  setBaseline(): void {
    this.baseline = process.memoryUsage();
  }

  takeSnapshot(label: string): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    this.snapshots.push({
      label,
      usage,
      timestamp: Date.now()
    });
    return usage;
  }

  getMemoryDelta(): { heapUsed: number; heapTotal: number; external: number } | null {
    if (!this.baseline) return null;
    
    const current = process.memoryUsage();
    return {
      heapUsed: current.heapUsed - this.baseline.heapUsed,
      heapTotal: current.heapTotal - this.baseline.heapTotal,
      external: current.external - this.baseline.external
    };
  }

  getSnapshots(): Array<{ label: string; usage: NodeJS.MemoryUsage; timestamp: number }> {
    return [...this.snapshots];
  }

  clear(): void {
    this.baseline = null;
    this.snapshots = [];
  }
}

// ===== TEST RESULT UTILITIES =====

/**
 * Test result aggregator and analyzer
 */
export class TestResultAnalyzer {
  
  /**
   * Calculate success rate from test results
   */
  static calculateSuccessRate(results: TestResult[]): number {
    if (results.length === 0) return 0;
    const passed = results.filter(r => r.status === 'passed').length;
    return (passed / results.length) * 100;
  }

  /**
   * Calculate average duration
   */
  static calculateAverageDuration(results: TestResult[]): number {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.duration, 0);
    return total / results.length;
  }

  /**
   * Find performance outliers
   */
  static findPerformanceOutliers(results: TestResult[], threshold: number = 2): TestResult[] {
    const durations = results.map(r => r.duration);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const stdDev = Math.sqrt(
      durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length
    );
    
    return results.filter(r => Math.abs(r.duration - avg) > threshold * stdDev);
  }

  /**
   * Group results by category
   */
  static groupByCategory(results: TestResult[], specifications: any[]): Record<string, TestResult[]> {
    const groups: Record<string, TestResult[]> = {};
    
    for (const result of results) {
      const spec = specifications.find(s => s.id === result.testId);
      if (spec) {
        const category = spec.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(result);
      }
    }
    
    return groups;
  }

  /**
   * Generate summary statistics
   */
  static generateSummaryStats(results: TestResult[]): {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const durations = results.map(r => r.duration);
    
    return {
      total: results.length,
      passed,
      failed,
      errors,
      avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate: this.calculateSuccessRate(results)
    };
  }
}

// ===== VALIDATION UTILITIES =====

/**
 * Test validation helpers
 */
export class TestValidationHelpers {
  
  /**
   * Validate test result structure
   */
  static validateTestResult(result: any): result is TestResult {
    return (
      result &&
      typeof result.testId === 'string' &&
      typeof result.status === 'string' &&
      typeof result.duration === 'number' &&
      result.startTime instanceof Date &&
      Array.isArray(result.assertionResults) &&
      typeof result.metrics === 'object'
    );
  }

  /**
   * Validate test metrics structure
   */
  static validateTestMetrics(metrics: any): metrics is TestMetrics {
    return (
      metrics &&
      typeof metrics.executionTime === 'number' &&
      typeof metrics.memoryUsage === 'number' &&
      typeof metrics.cpuUsage === 'number' &&
      typeof metrics.tasksCreated === 'number' &&
      typeof metrics.workflowsCompleted === 'number' &&
      typeof metrics.agentsSpawned === 'number'
    );
  }

  /**
   * Validate test error structure
   */
  static validateTestError(error: any): error is TestError {
    return (
      error &&
      typeof error.type === 'string' &&
      typeof error.message === 'string'
    );
  }

  /**
   * Check if test result meets success criteria
   */
  static meetsSuccessCriteria(result: TestResult, criteria: any): boolean {
    if (!criteria) return true;

    // Check execution time
    if (criteria.maxExecutionTime && result.metrics.executionTime > criteria.maxExecutionTime) {
      return false;
    }

    // Check memory usage
    if (criteria.maxMemoryUsage && result.metrics.memoryUsage > criteria.maxMemoryUsage) {
      return false;
    }

    // Check quality score
    if (criteria.minQualityScore && result.metrics.averageQualityScore < criteria.minQualityScore) {
      return false;
    }

    // Check task completion
    if (criteria.requiredTasks && result.metrics.tasksCreated < criteria.requiredTasks) {
      return false;
    }

    // Check workflow completion
    if (criteria.requiredWorkflows && result.metrics.workflowsCompleted < criteria.requiredWorkflows) {
      return false;
    }

    return true;
  }
}

// ===== CLEANUP UTILITIES =====

/**
 * Resource cleanup helper
 */
export class ResourceCleanupHelper {
  private cleanupTasks: Array<() => Promise<void> | void> = [];

  /**
   * Register cleanup task
   */
  register(task: () => Promise<void> | void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Execute all cleanup tasks
   */
  async executeAll(): Promise<void> {
    const errors: Error[] = [];

    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      throw new Error(`Cleanup failed with ${errors.length} errors: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Clear all registered tasks
   */
  clear(): void {
    this.cleanupTasks = [];
  }

  /**
   * Get count of registered tasks
   */
  getTaskCount(): number {
    return this.cleanupTasks.length;
  }
}

// ===== LOGGING UTILITIES =====

/**
 * Test-specific logger with structured output
 */
export class TestLogger {
  private prefix: string;
  private verbose: boolean;

  constructor(prefix: string = 'TEST', verbose: boolean = true) {
    this.prefix = prefix;
    this.verbose = verbose;
  }

  info(message: string, context?: any): void {
    if (this.verbose) {
      console.log(`[${this.prefix}-INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  }

  warn(message: string, context?: any): void {
    console.warn(`[${this.prefix}-WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  error(message: string, error?: any): void {
    console.error(`[${this.prefix}-ERROR] ${message}`, error);
  }

  debug(message: string, context?: any): void {
    if (this.verbose) {
      console.log(`[${this.prefix}-DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  }

  success(message: string, context?: any): void {
    if (this.verbose) {
      console.log(`[${this.prefix}-SUCCESS] ✅ ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  }

  failure(message: string, context?: any): void {
    console.log(`[${this.prefix}-FAILURE] ❌ ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }
}

// ===== EXPORT ALL UTILITIES =====

export {
  PerformanceMeasurer,
  MemoryTracker,
  TestResultAnalyzer,
  TestValidationHelpers,
  ResourceCleanupHelper,
  TestLogger
};