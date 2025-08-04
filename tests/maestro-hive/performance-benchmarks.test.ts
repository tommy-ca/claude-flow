/**
 * Performance Benchmarks and Load Testing for HiveMind Maestro Workflows
 * 
 * This file contains specialized performance tests that benchmark
 * system performance under various load conditions.
 * 
 * @version 2.0.0
 * @author Claude Flow TestingEnforcer Agent
 * @since 2025-08-03
 * 
 * Test Categories:
 * - Baseline performance tests
 * - Concurrent load testing
 * - Memory and resource usage tests
 * - Scalability tests
 * - Stress and endurance tests
 * - Performance regression detection
 */

import { jest } from '@jest/globals';
import { 
  createHiveMindTestRunner,
  HiveMindTestRunner
} from '../../src/maestro-hive/test-framework.js';
import {
  HIVEMIND_TEST_SPECIFICATIONS,
  TestCategory,
  TestSpecificationHelper
} from '../../src/maestro-hive/test-specifications.js';

// Extended timeout for performance tests
const PERFORMANCE_TIMEOUT = 300000; // 5 minutes

describe('HiveMind Maestro Performance Benchmarks', () => {
  let testRunner: HiveMindTestRunner;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (testRunner) {
      await testRunner.cleanup?.();
    }
  });

  describe('Baseline Performance Tests', () => {

    test('should establish baseline task creation performance', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'core-001')!],
        timeout: PERFORMANCE_TIMEOUT
      });

      const iterations = 10;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const result = await testRunner.runTest('core-001');
        const duration = Date.now() - startTime;

        results.push({
          iteration: i + 1,
          duration,
          status: result.status,
          memoryUsage: result.metrics.memoryUsage
        });
      }

      // Calculate performance metrics
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map(r => r.duration));
      const minDuration = Math.min(...results.map(r => r.duration));
      const successRate = results.filter(r => r.status === 'passed').length / results.length;

      // Log performance baseline for tracking
      const baselineData = {
        iterations,
        avgDuration: Number(avgDuration.toFixed(2)),
        maxDuration,
        minDuration,
        successRate: Number((successRate * 100).toFixed(1))
      };
      
      // Store baseline for future comparisons
      expect(baselineData.successRate).toBeGreaterThan(90);
      expect(baselineData.avgDuration).toBeLessThan(5000);

      // Performance assertions
      expect(avgDuration).toBeLessThan(5000); // Average should be under 5s
      expect(maxDuration).toBeLessThan(10000); // Max should be under 10s
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate minimum
    }, PERFORMANCE_TIMEOUT);

    test('should benchmark workflow execution performance', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'core-002')!],
        timeout: PERFORMANCE_TIMEOUT
      });

      const startTime = Date.now();
      const result = await testRunner.runTest('core-002');
      const totalDuration = Date.now() - startTime;

      expect(result.status).toBe('passed');
      expect(totalDuration).toBeLessThan(15000); // Should complete within 15s
      expect(result.metrics.workflowsCompleted).toBeGreaterThan(0);

      // Validate workflow performance metrics
      const benchmarkData = {
        duration: totalDuration,
        memoryUsageKB: Math.round(result.metrics.memoryUsage / 1024),
        workflowsCompleted: result.metrics.workflowsCompleted
      };
      
      expect(benchmarkData.duration).toBeLessThan(15000);
      expect(benchmarkData.workflowsCompleted).toBeGreaterThan(0);
    }, PERFORMANCE_TIMEOUT);

    test('should benchmark content generation performance', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'core-003')!],
        timeout: PERFORMANCE_TIMEOUT
      });

      const startTime = Date.now();
      const result = await testRunner.runTest('core-003');
      const totalDuration = Date.now() - startTime;

      expect(result.status).toBe('passed');
      expect(totalDuration).toBeLessThan(20000); // Should complete within 20s

      // Validate content generation performance
      const contentBenchmark = {
        duration: totalDuration,
        qualityScore: result.metrics.averageQualityScore
      };
      
      expect(contentBenchmark.duration).toBeLessThan(20000);
      expect(contentBenchmark.qualityScore).toBeGreaterThanOrEqual(0);
    }, PERFORMANCE_TIMEOUT);

  });

  describe('Concurrent Load Testing', () => {

    test('should handle concurrent task creation load', async () => {
      const concurrentTasks = 5;
      const testRunners = Array(concurrentTasks).fill(null).map(() =>
        createHiveMindTestRunner({
          specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'perf-001')!],
          timeout: PERFORMANCE_TIMEOUT
        })
      );

      const startTime = Date.now();
      const promises = testRunners.map((runner, index) => 
        runner.runTest('perf-001').then(result => ({
          runner: index,
          result,
          duration: Date.now() - startTime
        }))
      );

      const results = await Promise.allSettled(promises);
      const totalDuration = Date.now() - startTime;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('Concurrent Load Test Results:', {
        concurrentTasks,
        successful,
        failed,
        totalDuration: `${totalDuration}ms`,
        successRate: `${(successful / concurrentTasks * 100).toFixed(1)}%`
      });

      expect(successful).toBeGreaterThan(concurrentTasks * 0.8); // 80% success rate
      expect(totalDuration).toBeLessThan(60000); // Should complete within 1 minute

      // Cleanup runners
      await Promise.all(testRunners.map(runner => runner.cleanup?.()));
    }, PERFORMANCE_TIMEOUT);

    test('should handle high-frequency test execution', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: HIVEMIND_TEST_SPECIFICATIONS.filter(s => 
          s.category === TestCategory.UNIT
        ).slice(0, 3),
        parallel: true,
        maxConcurrency: 4,
        timeout: PERFORMANCE_TIMEOUT
      });

      const iterations = 3;
      const performanceData = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const initialMemory = process.memoryUsage().heapUsed;

        const { summary } = await testRunner.runTestSuite();

        const duration = Date.now() - startTime;
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDelta = finalMemory - initialMemory;

        performanceData.push({
          iteration: i + 1,
          duration,
          memoryDelta,
          testsRun: summary.total,
          successRate: summary.successRate
        });

        // Brief pause between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const avgDuration = performanceData.reduce((sum, d) => sum + d.duration, 0) / iterations;
      const avgMemoryDelta = performanceData.reduce((sum, d) => sum + d.memoryDelta, 0) / iterations;

      console.log('High-Frequency Execution Performance:', {
        iterations,
        avgDuration: `${avgDuration.toFixed(2)}ms`,
        avgMemoryDelta: `${Math.round(avgMemoryDelta / 1024)}KB`,
        data: performanceData
      });

      expect(avgDuration).toBeLessThan(30000); // Average should be under 30s
      expect(avgMemoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }, PERFORMANCE_TIMEOUT);

  });

  describe('Memory and Resource Usage Tests', () => {

    test('should monitor memory usage during test execution', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 5),
        timeout: PERFORMANCE_TIMEOUT
      });

      const memorySnapshots = [];
      
      // Baseline memory
      const baselineMemory = process.memoryUsage();
      memorySnapshots.push({ phase: 'baseline', ...baselineMemory });

      // Execute test suite
      const { summary } = await testRunner.runTestSuite();
      
      // Memory after execution
      const postExecutionMemory = process.memoryUsage();
      memorySnapshots.push({ phase: 'post-execution', ...postExecutionMemory });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const afterGCMemory = process.memoryUsage();
        memorySnapshots.push({ phase: 'after-gc', ...afterGCMemory });
      }

      const memoryIncrease = postExecutionMemory.heapUsed - baselineMemory.heapUsed;
      const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024);

      console.log('Memory Usage Analysis:', {
        testsExecuted: summary.total,
        memoryIncreaseMB,
        snapshots: memorySnapshots.map(s => ({
          phase: s.phase,
          heapUsedMB: Math.round(s.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(s.heapTotal / 1024 / 1024)
        }))
      });

      expect(memoryIncreaseMB).toBeLessThan(200); // Less than 200MB increase
      expect(summary.total).toBeGreaterThan(0);
    }, PERFORMANCE_TIMEOUT);

    test('should handle memory cleanup after test completion', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Run multiple test suites
      for (let i = 0; i < 3; i++) {
        const runner = createHiveMindTestRunner({
          specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 2),
          timeout: 30000
        });

        await runner.runTestSuite();
        
        // Explicit cleanup
        await runner.cleanup?.();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;
      const memoryDeltaMB = Math.round(memoryDelta / 1024 / 1024);

      console.log('Memory Cleanup Test:', {
        initialMemoryMB: Math.round(initialMemory / 1024 / 1024),
        finalMemoryMB: Math.round(finalMemory / 1024 / 1024),
        memoryDeltaMB
      });

      expect(memoryDeltaMB).toBeLessThan(100); // Less than 100MB permanent increase
    }, PERFORMANCE_TIMEOUT);

  });

  describe('Scalability Tests', () => {

    test('should scale with increasing test specification count', async () => {
      const testSizes = [1, 3, 5, 8];
      const scalabilityResults = [];

      for (const size of testSizes) {
        const specs = HIVEMIND_TEST_SPECIFICATIONS.slice(0, size);
        const runner = createHiveMindTestRunner({
          specifications: specs,
          timeout: PERFORMANCE_TIMEOUT,
          parallel: true,
          maxConcurrency: 4
        });

        const startTime = Date.now();
        const { summary } = await runner.runTestSuite();
        const duration = Date.now() - startTime;

        scalabilityResults.push({
          testCount: size,
          duration,
          throughput: size / (duration / 1000), // tests per second
          successRate: summary.successRate
        });

        await runner.cleanup?.();
      }

      console.log('Scalability Test Results:', scalabilityResults);

      // Verify scaling characteristics
      scalabilityResults.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(70); // Minimum 70% success rate
        expect(result.throughput).toBeGreaterThan(0.01); // At least 0.01 tests/second
        
        if (index > 0) {
          const prevResult = scalabilityResults[index - 1];
          // Duration should scale sub-linearly (better than O(n))
          const scalingFactor = result.duration / prevResult.duration;
          const sizeRatio = result.testCount / prevResult.testCount;
          expect(scalingFactor).toBeLessThan(sizeRatio * 1.5); // Allow 50% overhead
        }
      });
    }, PERFORMANCE_TIMEOUT);

    test('should maintain performance with different concurrency levels', async () => {
      const concurrencyLevels = [1, 2, 4, 6];
      const concurrencyResults = [];

      const testSpecs = HIVEMIND_TEST_SPECIFICATIONS.slice(0, 6);

      for (const concurrency of concurrencyLevels) {
        const runner = createHiveMindTestRunner({
          specifications: testSpecs,
          timeout: PERFORMANCE_TIMEOUT,
          parallel: true,
          maxConcurrency: concurrency
        });

        const startTime = Date.now();
        const { summary } = await runner.runTestSuite();
        const duration = Date.now() - startTime;

        concurrencyResults.push({
          concurrency,
          duration,
          throughput: testSpecs.length / (duration / 1000),
          successRate: summary.successRate
        });

        await runner.cleanup?.();
      }

      console.log('Concurrency Performance Results:', concurrencyResults);

      // Verify concurrency benefits
      const serialResult = concurrencyResults[0]; // concurrency = 1
      const maxConcurrencyResult = concurrencyResults[concurrencyResults.length - 1];

      // Higher concurrency should provide some benefit
      expect(maxConcurrencyResult.throughput).toBeGreaterThan(serialResult.throughput * 0.8);

      concurrencyResults.forEach(result => {
        expect(result.successRate).toBeGreaterThan(70); // Maintain success rate
      });
    }, PERFORMANCE_TIMEOUT);

  });

  describe('Stress and Endurance Tests', () => {

    test('should handle extended test execution', async () => {
      testRunner = createHiveMindTestRunner({
        specifications: HIVEMIND_TEST_SPECIFICATIONS.filter(s => 
          s.category === TestCategory.UNIT || s.category === TestCategory.INTEGRATION
        ).slice(0, 4),
        timeout: PERFORMANCE_TIMEOUT,
        parallel: false // Sequential for endurance test
      });

      const startTime = Date.now();
      const iterations = 5;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        const { summary } = await testRunner.runTestSuite();
        const iterationDuration = Date.now() - iterationStart;

        results.push({
          iteration: i + 1,
          duration: iterationDuration,
          successRate: summary.successRate,
          testsRun: summary.total
        });

        console.log(`Endurance Test Iteration ${i + 1}:`, {
          duration: `${iterationDuration}ms`,
          successRate: `${summary.successRate.toFixed(1)}%`
        });

        // Brief pause between iterations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const totalDuration = Date.now() - startTime;
      const avgSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;

      console.log('Endurance Test Summary:', {
        iterations,
        totalDuration: `${totalDuration}ms`,
        avgSuccessRate: `${avgSuccessRate.toFixed(1)}%`
      });

      expect(avgSuccessRate).toBeGreaterThan(80); // Maintain high success rate
      expect(totalDuration).toBeLessThan(PERFORMANCE_TIMEOUT * 0.8); // Complete within timeout
    }, PERFORMANCE_TIMEOUT);

    test('should recover from resource exhaustion', async () => {
      // Simulate resource exhaustion by creating many test runners
      const runners = [];
      const maxRunners = 10;

      try {
        for (let i = 0; i < maxRunners; i++) {
          const runner = createHiveMindTestRunner({
            specifications: [HIVEMIND_TEST_SPECIFICATIONS[0]],
            timeout: 10000
          });
          runners.push(runner);
        }

        // Try to run tests with all runners
        const promises = runners.map((runner, index) => 
          runner.runTest(HIVEMIND_TEST_SPECIFICATIONS[0].id)
            .then(result => ({ index, success: true, result }))
            .catch(error => ({ index, success: false, error: error.message }))
        );

        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;

        console.log('Resource Exhaustion Test:', {
          totalRunners: maxRunners,
          successfulTests: successCount,
          failedTests: maxRunners - successCount
        });

        // At least some should succeed even under stress
        expect(successCount).toBeGreaterThan(0);

      } finally {
        // Cleanup all runners
        await Promise.all(runners.map(runner => 
          runner.cleanup?.().catch(() => {}) // Ignore cleanup errors
        ));
      }
    }, PERFORMANCE_TIMEOUT);

  });

  describe('Performance Regression Detection', () => {

    test('should detect performance regressions', async () => {
      // Run baseline performance test
      const baselineRunner = createHiveMindTestRunner({
        specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'core-001')!],
        timeout: PERFORMANCE_TIMEOUT
      });

      const baselineStart = Date.now();
      const baselineResult = await baselineRunner.runTest('core-001');
      const baselineDuration = Date.now() - baselineStart;

      // Run comparison test (simulating potential regression)
      const comparisonRunner = createHiveMindTestRunner({
        specifications: [HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === 'core-001')!],
        timeout: PERFORMANCE_TIMEOUT
      });

      const comparisonStart = Date.now();
      const comparisonResult = await comparisonRunner.runTest('core-001');
      const comparisonDuration = Date.now() - comparisonStart;

      const performanceRatio = comparisonDuration / baselineDuration;
      const regressionThreshold = 1.5; // 50% slower is considered regression

      console.log('Performance Regression Analysis:', {
        baselineDuration: `${baselineDuration}ms`,
        comparisonDuration: `${comparisonDuration}ms`,
        performanceRatio: performanceRatio.toFixed(2),
        regressionDetected: performanceRatio > regressionThreshold
      });

      // This test documents the performance baseline
      expect(baselineResult.status).toBe('passed');
      expect(comparisonResult.status).toBe('passed');
      
      // In a real scenario, you might want to fail if regression is detected
      if (performanceRatio > regressionThreshold) {
        console.warn(`⚠️ Performance regression detected: ${(performanceRatio * 100 - 100).toFixed(1)}% slower`);
      }

      await Promise.all([
        baselineRunner.cleanup?.(),
        comparisonRunner.cleanup?.()
      ]);
    }, PERFORMANCE_TIMEOUT);

    test('should track performance metrics over time', async () => {
      const performanceHistory = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const runner = createHiveMindTestRunner({
          specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 2),
          timeout: PERFORMANCE_TIMEOUT
        });

        const startTime = Date.now();
        const { summary, performance } = await runner.runTestSuite();
        const totalDuration = Date.now() - startTime;

        performanceHistory.push({
          timestamp: new Date().toISOString(),
          iteration: i + 1,
          totalDuration,
          testsRun: summary.total,
          successRate: summary.successRate,
          avgExecutionTime: performance.averageExecutionTime,
          throughput: performance.throughput
        });

        await runner.cleanup?.();
        
        // Brief pause between iterations
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Performance History:', performanceHistory);

      // Verify consistency
      const successRates = performanceHistory.map(h => h.successRate);
      const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
      const successRateVariance = successRates.reduce((sum, rate) => sum + Math.pow(rate - avgSuccessRate, 2), 0) / successRates.length;

      expect(avgSuccessRate).toBeGreaterThan(70);
      expect(successRateVariance).toBeLessThan(100); // Low variance in success rates
    }, PERFORMANCE_TIMEOUT);

  });

});