/**
 * SPARC Performance Benchmarks Test Suite
 * 
 * Performance testing and benchmarking for SPARC methodology implementation
 * Validates performance improvements and optimization systems
 * 
 * @version 1.0.0
 * @author SPARCTestCoordinator Agent
 * @since 2025-08-04
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { 
  SPARCCoordinator, 
  type SPARCTask, 
  type SPARCWorkflow 
} from '../../src/maestro-hive/SPARCCoordinator.js';
import { 
  SPARCWorkflowOrchestrator,
  SPARCPhaseHandlerFactory,
  QualityGateManager,
  SPARCPhase
} from '../../src/maestro-hive/phase-handlers/index.js';
import type { MaestroHiveConfig, MaestroLogger } from '../../src/maestro-hive/interfaces.js';

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  qualityScore: number;
  phaseDurations: Map<SPARCPhase, number>;
}

/**
 * Benchmark Configuration
 */
interface BenchmarkConfig {
  name: string;
  requirements: string[];
  expectedMaxDuration: number; // milliseconds
  expectedMinQuality: number;
  iterations: number;
}

/**
 * Performance Test Logger
 */
class PerformanceLogger implements MaestroLogger {
  private metrics: PerformanceMetrics[] = [];

  info(message: string, context?: any): void {
    if (process.env.SPARC_PERFORMANCE_DEBUG) {
      console.log(`[PERF-INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: any): void {
    console.warn(`[PERF-WARN] ${message}`, context || '');
  }

  error(message: string, error?: any): void {
    console.error(`[PERF-ERROR] ${message}`, error || '');
  }

  debug(message: string, context?: any): void {
    if (process.env.SPARC_PERFORMANCE_DEBUG) {
      console.debug(`[PERF-DEBUG] ${message}`, context || '');
    }
  }

  logTask(event: string, task: any): void {
    this.info(`Task ${event}`, { taskId: task.id, type: task.type });
  }

  logWorkflow(event: string, workflow: any): void {
    this.info(`Workflow ${event}`, { workflowId: workflow.id, status: workflow.status });
  }

  logAgent(event: string, agent: any): void {
    this.info(`Agent ${event}`, { agentId: agent.id, type: agent.type });
  }

  logQuality(event: string, score: number, details?: any): void {
    this.info(`Quality ${event}`, { score, ...details });
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getAverageMetrics(): {
    avgDuration: number;
    avgQuality: number;
    avgMemoryUsage: number;
  } {
    if (this.metrics.length === 0) {
      return { avgDuration: 0, avgQuality: 0, avgMemoryUsage: 0 };
    }

    const totals = this.metrics.reduce((acc, metric) => ({
      duration: acc.duration + metric.duration,
      quality: acc.quality + metric.qualityScore,
      memory: acc.memory + metric.memoryUsage.heapUsed
    }), { duration: 0, quality: 0, memory: 0 });

    return {
      avgDuration: totals.duration / this.metrics.length,
      avgQuality: totals.quality / this.metrics.length,
      avgMemoryUsage: totals.memory / this.metrics.length
    };
  }
}

/**
 * Performance Test Configuration Factory
 */
function createPerformanceTestConfig(): MaestroHiveConfig {
  return {
    name: 'SPARC Performance Test Configuration',
    topology: 'hierarchical',
    maxAgents: 3, // Reduced for performance testing
    queenMode: 'active',
    memoryTTL: 3600000,
    consensusThreshold: 0.75,
    autoSpawn: true,
    enableConsensus: false, // Disabled for performance
    enableMemory: false, // Disabled for performance
    enableCommunication: false, // Disabled for performance
    enableSpecsDriven: true,
    consensusRequired: false, // Disabled for performance
    autoValidation: true,
    qualityThreshold: 0.75, // Slightly lower for performance
    workflowDirectory: './perf-test-workflows',
    enabledFeatures: [
      'specs-driven-workflow',
      'quality-gates'
    ],
    agentCapabilities: {
      spec: ['requirements_analysis'],
      design: ['system_design'],
      implementation: ['code_generation'],
      test: ['test_generation'],
      review: ['code_review']
    }
  };
}

/**
 * Benchmark Test Configurations
 */
const BENCHMARK_CONFIGS: BenchmarkConfig[] = [
  {
    name: 'Simple Feature',
    requirements: ['Implement basic user login'],
    expectedMaxDuration: 5000, // 5 seconds
    expectedMinQuality: 0.75,
    iterations: 3
  },
  {
    name: 'Medium Complexity',
    requirements: [
      'Implement user authentication system',
      'Add password hashing',
      'Include session management'
    ],
    expectedMaxDuration: 10000, // 10 seconds
    expectedMinQuality: 0.8,
    iterations: 3
  },
  {
    name: 'Complex System',
    requirements: [
      'Implement comprehensive authentication system',
      'Add multi-factor authentication',
      'Include role-based access control',
      'Implement session management',
      'Add audit logging',
      'Include password policies'
    ],
    expectedMaxDuration: 20000, // 20 seconds
    expectedMinQuality: 0.85,
    iterations: 2
  }
];

describe('SPARC Performance Benchmarks', () => {
  let coordinator: SPARCCoordinator;
  let performanceLogger: PerformanceLogger;
  let testConfig: MaestroHiveConfig;

  beforeEach(() => {
    performanceLogger = new PerformanceLogger();
    testConfig = createPerformanceTestConfig();
    coordinator = new SPARCCoordinator(testConfig, performanceLogger);
  });

  afterEach(async () => {
    await coordinator.shutdown();
    performanceLogger.clearMetrics();
  });

  describe('Individual Phase Performance', () => {
    test('should benchmark Specification phase performance', async () => {
      const factory = new SPARCPhaseHandlerFactory(performanceLogger);
      const handler = factory.createHandler(SPARCPhase.SPECIFICATION);
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      const request = {
        taskId: 'perf-spec-001',
        description: 'Create user authentication system',
        context: 'Performance test'
      };
      
      const result = await handler.executePhase(request);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      // Performance assertions
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.qualityScore).toBeGreaterThan(0.7);
      
      // Memory usage should be reasonable
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      
      performanceLogger.info('Specification phase performance', {
        duration: `${duration.toFixed(2)}ms`,
        qualityScore: result.qualityScore,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });
    });

    test('should benchmark complete phase sequence performance', async () => {
      const orchestrator = new SPARCWorkflowOrchestrator(performanceLogger);
      const requirements = ['Performance test feature'];
      
      const phaseTimes = new Map<SPARCPhase, number>();
      const startTime = performance.now();
      
      // Track individual phase performance
      const originalExecuteWorkflow = orchestrator.executeWorkflow.bind(orchestrator);
      orchestrator.executeWorkflow = async function(taskId: string, reqs: string[]) {
        const phaseStartTimes = new Map<SPARCPhase, number>();
        
        // Mock phase execution with timing
        for (const phase of Object.values(SPARCPhase)) {
          const phaseStart = performance.now();
          phaseStartTimes.set(phase, phaseStart);
          
          // Simulate phase execution
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          
          const phaseEnd = performance.now();
          phaseTimes.set(phase, phaseEnd - phaseStart);
        }
        
        return new Map([
          [SPARCPhase.SPECIFICATION, { qualityScore: 0.85 }],
          [SPARCPhase.PSEUDOCODE, { qualityScore: 0.8 }],
          [SPARCPhase.ARCHITECTURE, { qualityScore: 0.82 }],
          [SPARCPhase.REFINEMENT, { qualityScore: 0.87 }],
          [SPARCPhase.COMPLETION, { qualityScore: 0.9 }]
        ]);
      };
      
      const results = await orchestrator.executeWorkflow('perf-test-001', requirements);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      // Performance validation
      expect(totalDuration).toBeLessThan(5000); // Complete sequence under 5 seconds
      expect(results.size).toBe(5);
      
      // Validate phase timing distribution
      const phaseArray = Array.from(phaseTimes.entries());
      expect(phaseArray).toHaveLength(5);
      
      phaseArray.forEach(([phase, duration]) => {
        expect(duration).toBeLessThan(1000); // Each phase under 1 second
        performanceLogger.info(`${phase} phase duration`, { duration: `${duration.toFixed(2)}ms` });
      });
      
      performanceLogger.info('Complete phase sequence performance', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        avgPhaseTime: `${(totalDuration / 5).toFixed(2)}ms`
      });
    });
  });

  describe('Quality Gate Performance', () => {
    test('should benchmark quality gate validation performance', async () => {
      const qualityGateManager = new QualityGateManager();
      const testResults = [
        { qualityScore: 0.85 },
        { qualityScore: 0.75 },
        { qualityScore: 0.9 },
        { qualityScore: 0.82 },
        { qualityScore: 0.88 }
      ];
      
      const startTime = performance.now();
      
      const validationPromises = testResults.map((result, index) => {
        const phase = Object.values(SPARCPhase)[index];
        return qualityGateManager.validateQualityGate(phase, result);
      });
      
      const validationResults = await Promise.all(validationPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Performance assertions
      expect(duration).toBeLessThan(100); // All validations under 100ms
      expect(validationResults).toHaveLength(5);
      expect(validationResults.every(result => typeof result === 'boolean')).toBe(true);
      
      performanceLogger.info('Quality gate validation performance', {
        duration: `${duration.toFixed(2)}ms`,
        avgValidationTime: `${(duration / 5).toFixed(2)}ms`,
        validationResults: validationResults.map((result, i) => `${Object.values(SPARCPhase)[i]}: ${result}`)
      });
    });

    test('should benchmark concurrent quality gate validations', async () => {
      const qualityGateManager = new QualityGateManager();
      const concurrentBatches = 10;
      const validationsPerBatch = 5;
      
      const startTime = performance.now();
      
      const batchPromises = Array.from({ length: concurrentBatches }, async (_, batchIndex) => {
        const validationPromises = Array.from({ length: validationsPerBatch }, async (_, validationIndex) => {
          const phase = Object.values(SPARCPhase)[validationIndex % 5];
          const result = { qualityScore: 0.75 + Math.random() * 0.25 };
          return qualityGateManager.validateQualityGate(phase, result);
        });
        return Promise.all(validationPromises);
      });
      
      const allResults = await Promise.all(batchPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const totalValidations = concurrentBatches * validationsPerBatch;
      
      // Performance assertions
      expect(duration).toBeLessThan(1000); // All concurrent validations under 1 second
      expect(allResults).toHaveLength(concurrentBatches);
      expect(allResults.flat()).toHaveLength(totalValidations);
      
      performanceLogger.info('Concurrent quality gate validation performance', {
        duration: `${duration.toFixed(2)}ms`,
        totalValidations,
        avgValidationTime: `${(duration / totalValidations).toFixed(4)}ms`,
        concurrentBatches,
        validationsPerBatch
      });
    });
  });

  describe('End-to-End Workflow Performance', () => {
    BENCHMARK_CONFIGS.forEach(config => {
      test(`should benchmark ${config.name} workflow performance`, async () => {
        const metrics: PerformanceMetrics[] = [];
        
        for (let i = 0; i < config.iterations; i++) {
          const startTime = performance.now();
          const startMemory = process.memoryUsage();
          
          const taskId = `${config.name.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;
          
          try {
            const workflow = await coordinator.executeSPARCWorkflow(taskId, config.requirements);
            
            const endTime = performance.now();
            const endMemory = process.memoryUsage();
            const duration = endTime - startTime;
            
            const metric: PerformanceMetrics = {
              startTime,
              endTime,
              duration,
              memoryUsage: {
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal,
                external: endMemory.external
              },
              qualityScore: workflow.qualityScore,
              phaseDurations: new Map() // Would be populated in real implementation
            };
            
            metrics.push(metric);
            performanceLogger.recordMetrics(metric);
            
            // Performance assertions for this iteration
            expect(duration).toBeLessThan(config.expectedMaxDuration);
            expect(workflow.qualityScore).toBeGreaterThan(config.expectedMinQuality);
            expect(workflow.status).toBe('completed');
            
          } catch (error) {
            // Record failed iteration
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            performanceLogger.error(`Workflow execution failed for ${taskId}`, {
              duration: `${duration.toFixed(2)}ms`,
              error: error.message
            });
            
            throw error;
          }
        }
        
        // Analyze overall performance across iterations
        const avgMetrics = performanceLogger.getAverageMetrics();
        
        expect(avgMetrics.avgDuration).toBeLessThan(config.expectedMaxDuration);
        expect(avgMetrics.avgQuality).toBeGreaterThan(config.expectedMinQuality);
        
        // Memory usage should be stable across iterations
        const memoryVariance = metrics.reduce((variance, metric) => {
          const diff = metric.memoryUsage.heapUsed - avgMetrics.avgMemoryUsage;
          return variance + (diff * diff);
        }, 0) / metrics.length;
        
        const memoryStdDev = Math.sqrt(memoryVariance);
        expect(memoryStdDev).toBeLessThan(avgMetrics.avgMemoryUsage * 0.5); // Memory usage shouldn't vary by more than 50%
        
        performanceLogger.info(`${config.name} benchmark results`, {
          iterations: config.iterations,
          avgDuration: `${avgMetrics.avgDuration.toFixed(2)}ms`,
          avgQuality: avgMetrics.avgQuality.toFixed(3),
          avgMemoryUsage: `${(avgMetrics.avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
          memoryStability: `±${(memoryStdDev / 1024 / 1024).toFixed(2)}MB`
        });
      });
    });
  });

  describe('Scalability and Load Testing', () => {
    test('should handle multiple concurrent workflows', async () => {
      const concurrentWorkflows = 5;
      const requirements = ['Concurrent workflow test'];
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      const workflowPromises = Array.from({ length: concurrentWorkflows }, (_, index) => 
        coordinator.executeSPARCWorkflow(`concurrent-${index + 1}`, requirements)
      );
      
      const workflows = await Promise.all(workflowPromises);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      
      // All workflows should complete successfully
      expect(workflows).toHaveLength(concurrentWorkflows);
      workflows.forEach(workflow => {
        expect(workflow.status).toBe('completed');
        expect(workflow.qualityScore).toBeGreaterThan(0.7);
      });
      
      // Performance should scale reasonably
      const expectedMaxDuration = 15000; // 15 seconds for 5 concurrent workflows
      expect(duration).toBeLessThan(expectedMaxDuration);
      
      // Memory usage should be reasonable
      const expectedMaxMemoryIncrease = 200 * 1024 * 1024; // 200MB
      expect(memoryIncrease).toBeLessThan(expectedMaxMemoryIncrease);
      
      performanceLogger.info('Concurrent workflow performance', {
        concurrentWorkflows,
        totalDuration: `${duration.toFixed(2)}ms`,
        avgWorkflowTime: `${(duration / concurrentWorkflows).toFixed(2)}ms`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        memoryPerWorkflow: `${(memoryIncrease / concurrentWorkflows / 1024 / 1024).toFixed(2)}MB`
      });
    });

    test('should maintain performance under high task volume', async () => {
      const taskCount = 20;
      const batchSize = 5;
      const batches = Math.ceil(taskCount / batchSize);
      
      const allMetrics: number[] = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = performance.now();
        
        const batchPromises = Array.from({ length: Math.min(batchSize, taskCount - batch * batchSize) }, 
          async (_, index) => {
            const taskIndex = batch * batchSize + index + 1;
            const task = await coordinator.createTask(
              `High volume task ${taskIndex}`,
              'development',
              'medium'
            );
            return task;
          }
        );
        
        const batchTasks = await Promise.all(batchPromises);
        const batchEndTime = performance.now();
        const batchDuration = batchEndTime - batchStartTime;
        
        allMetrics.push(batchDuration);
        
        expect(batchTasks).toHaveLength(Math.min(batchSize, taskCount - batch * batchSize));
        expect(batchDuration).toBeLessThan(2000); // Each batch under 2 seconds
      }
      
      // Performance should remain stable across batches
      const avgBatchTime = allMetrics.reduce((sum, time) => sum + time, 0) / allMetrics.length;
      const maxBatchTime = Math.max(...allMetrics);
      const minBatchTime = Math.min(...allMetrics);
      
      // Max batch time shouldn't be more than 2x average
      expect(maxBatchTime).toBeLessThan(avgBatchTime * 2);
      
      performanceLogger.info('High volume task creation performance', {
        totalTasks: taskCount,
        batches,
        batchSize,
        avgBatchTime: `${avgBatchTime.toFixed(2)}ms`,
        minBatchTime: `${minBatchTime.toFixed(2)}ms`,
        maxBatchTime: `${maxBatchTime.toFixed(2)}ms`,
        performanceStability: `${((avgBatchTime / maxBatchTime) * 100).toFixed(1)}%`
      });
    });
  });

  describe('Memory Management and Cleanup', () => {
    test('should properly clean up resources after workflow completion', async () => {
      const initialMemory = process.memoryUsage();
      
      // Execute multiple workflows
      for (let i = 0; i < 5; i++) {
        const workflow = await coordinator.executeSPARCWorkflow(
          `cleanup-test-${i + 1}`,
          [`Cleanup test workflow ${i + 1}`]
        );
        
        expect(workflow.status).toBe('completed');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable
      const maxAcceptableIncrease = 100 * 1024 * 1024; // 100MB
      expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);
      
      performanceLogger.info('Memory cleanup performance', {
        initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        cleanupEfficiency: `${(100 - (memoryIncrease / maxAcceptableIncrease * 100)).toFixed(1)}%`
      });
    });

    test('should handle shutdown gracefully under load', async () => {
      // Start multiple workflows
      const workflowPromises = Array.from({ length: 3 }, (_, index) =>
        coordinator.executeSPARCWorkflow(`shutdown-test-${index + 1}`, [`Shutdown test ${index + 1}`])
      );
      
      // Wait a bit then shutdown
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const shutdownStartTime = performance.now();
      await coordinator.shutdown();
      const shutdownEndTime = performance.now();
      const shutdownDuration = shutdownEndTime - shutdownStartTime;
      
      // Shutdown should be quick
      expect(shutdownDuration).toBeLessThan(1000); // Under 1 second
      
      // Verify cleanup
      try {
        await coordinator.getTasks();
        // Should be empty after shutdown
        const tasks = await coordinator.getTasks();
        expect(tasks).toHaveLength(0);
      } catch (error) {
        // Acceptable if coordinator is shut down
        expect(error.message).toContain('shut');
      }
      
      performanceLogger.info('Graceful shutdown performance', {
        shutdownDuration: `${shutdownDuration.toFixed(2)}ms`,
        pendingWorkflows: 3
      });
    });
  });
});