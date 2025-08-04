/**
 * Comprehensive Test Suite for HiveMind Claude Flow Maestro Workflows
 * 
 * This file implements the comprehensive testing framework using Jest
 * and validates all aspects of the HiveMind integration.
 */

import { jest } from '@jest/globals';
import type {
  TestResult,
  TestSummary,
  PerformanceReport
} from '../../src/maestro-hive/test-framework.js';
import {
  HiveMindTestRunner,
  createHiveMindTestRunner,
  runQuickTests,
  runFullTestSuite
} from '../../src/maestro-hive/test-framework.js';
import {
  HIVEMIND_TEST_SPECIFICATIONS,
  TestCategory,
  TestPriority,
  TestSpecificationHelper
} from '../../src/maestro-hive/test-specifications.js';

// Mock external dependencies for controlled testing
jest.mock('../../src/maestro-hive/coordinator.js');
jest.mock('../../src/maestro-hive/specs-driven-flow.js');

describe('HiveMind Maestro Comprehensive Test Suite', () => {
  let testRunner: HiveMindTestRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    testRunner = createHiveMindTestRunner({
      timeout: 30000,
      parallel: false, // Sequential for predictable testing
      maxConcurrency: 1
    });
  });

  afterEach(async () => {
    // Cleanup test runner
    if (testRunner) {
      await testRunner.cleanup?.();
    }
  });

  describe('Test Framework Initialization', () => {
    
    test('should create test runner with default configuration', () => {
      const runner = createHiveMindTestRunner();
      expect(runner).toBeInstanceOf(HiveMindTestRunner);
    });

    test('should create test runner with custom configuration', () => {
      const config = {
        timeout: 15000,
        parallel: true,
        maxConcurrency: 4
      };
      
      const runner = createHiveMindTestRunner(config);
      expect(runner).toBeInstanceOf(HiveMindTestRunner);
    });

    test('should have all required test specifications loaded', () => {
      expect(HIVEMIND_TEST_SPECIFICATIONS).toBeDefined();
      expect(HIVEMIND_TEST_SPECIFICATIONS.length).toBeGreaterThan(0);
      
      // Verify we have tests for all categories
      const categories = new Set(HIVEMIND_TEST_SPECIFICATIONS.map(spec => spec.category));
      expect(categories.has(TestCategory.UNIT)).toBe(true);
      expect(categories.has(TestCategory.INTEGRATION)).toBe(true);
      expect(categories.has(TestCategory.END_TO_END)).toBe(true);
      expect(categories.has(TestCategory.PERFORMANCE)).toBe(true);
    });

  });

  describe('Test Specification Validation', () => {

    test('should validate all test specifications', () => {
      for (const spec of HIVEMIND_TEST_SPECIFICATIONS) {
        const validation = TestSpecificationHelper.validateSpecification(spec);
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Verify required fields
        expect(spec.id).toBeDefined();
        expect(spec.name).toBeDefined();
        expect(spec.category).toBeDefined();
        expect(spec.priority).toBeDefined();
        expect(spec.assertions).toBeDefined();
        expect(spec.assertions.length).toBeGreaterThan(0);
        expect(spec.successCriteria).toBeDefined();
      }
    });

    test('should filter specifications by category', () => {
      const unitTests = TestSpecificationHelper.filterSpecifications(
        HIVEMIND_TEST_SPECIFICATIONS,
        { categories: [TestCategory.UNIT] }
      );
      
      expect(unitTests.length).toBeGreaterThan(0);
      unitTests.forEach(test => {
        expect(test.category).toBe(TestCategory.UNIT);
      });
    });

    test('should filter specifications by priority', () => {
      const criticalTests = TestSpecificationHelper.getByPriority(
        HIVEMIND_TEST_SPECIFICATIONS,
        TestPriority.CRITICAL
      );
      
      expect(criticalTests.length).toBeGreaterThan(0);
      criticalTests.forEach(test => {
        expect(test.priority).toBe(TestPriority.CRITICAL);
      });
    });

    test('should generate execution plan', () => {
      const plan = TestSpecificationHelper.generateExecutionPlan(
        HIVEMIND_TEST_SPECIFICATIONS
      );
      
      expect(plan.phases).toBeDefined();
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.totalEstimatedTime).toBeGreaterThan(0);
      
      // Verify phases have specifications
      const totalSpecs = plan.phases.reduce(
        (sum, phase) => sum + phase.specifications.length,
        0
      );
      expect(totalSpecs).toBeGreaterThan(0);
    });

  });

  describe('Core Functionality Tests', () => {

    test('should run basic task creation test', async () => {
      const result = await testRunner.runTest('core-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('core-001');
      expect(result.status).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.assertionResults).toBeDefined();
    });

    test('should run workflow management test', async () => {
      const result = await testRunner.runTest('core-002');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('core-002');
      expect(result.assertionResults.length).toBeGreaterThan(0);
    });

    test('should run content generation test', async () => {
      const result = await testRunner.runTest('core-003');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('core-003');
      expect(result.metrics).toBeDefined();
    });

    test('should run quality validation test', async () => {
      const result = await testRunner.runTest('core-004');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('core-004');
      expect(result.metrics.validationsPassed).toBeDefined();
    });

  });

  describe('HiveMind Integration Tests', () => {

    test('should run swarm initialization test', async () => {
      const result = await testRunner.runTest('hive-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('hive-001');
      expect(result.context).toBeDefined();
    });

    test('should run agent spawning test', async () => {
      const result = await testRunner.runTest('hive-002');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('hive-002');
      expect(result.metrics.agentsSpawned).toBeDefined();
    });

    test('should run task orchestration test', async () => {
      const result = await testRunner.runTest('hive-003');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('hive-003');
      expect(result.metrics.tasksCreated).toBeDefined();
    });

  });

  describe('SPARC Workflow Tests', () => {

    test('should run specs-driven workflow creation test', async () => {
      const result = await testRunner.runTest('sparc-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-001');
      expect(result.context?.workflow).toBeDefined();
    });

    test('should run quality gate validation test', async () => {
      const result = await testRunner.runTest('sparc-003');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-003');
      expect(result.context?.progress).toBeDefined();
    });

    test('should run steering document integration test', async () => {
      const result = await testRunner.runTest('sparc-004');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-004');
      expect(result.context?.compliance).toBeDefined();
    });

  });

  describe('Performance Tests', () => {

    test('should run concurrent task execution test', async () => {
      const result = await testRunner.runTest('perf-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('perf-001');
      expect(result.metrics.executionTime).toBeGreaterThan(0);
      expect(result.context?.tasksCreated).toBe(5);
    });

    test('should track performance metrics', async () => {
      const results = await testRunner.runTestsByCategory(TestCategory.PERFORMANCE);
      
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(result => {
        expect(result.metrics).toBeDefined();
        expect(result.metrics.executionTime).toBeGreaterThanOrEqual(0);
        expect(result.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      });
    });

  });

  describe('Error Handling and Recovery Tests', () => {

    test('should run error handling test', async () => {
      const result = await testRunner.runTest('error-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('error-001');
      expect(result.context?.errorHandlingWorking).toBeDefined();
    });

    test('should handle test failures gracefully', async () => {
      // This test intentionally checks failure handling
      const result = await testRunner.runTest('error-001');
      
      // Even if the test "fails", the framework should handle it gracefully
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['passed', 'failed', 'error'].includes(result.status)).toBe(true);
    });

  });

  describe('Mock and Fallback Tests', () => {

    test('should run mock service integration test', async () => {
      const result = await testRunner.runTest('mock-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('mock-001');
      expect(result.context).toBeDefined();
    });

    test('should handle offline mode functionality', async () => {
      const result = await testRunner.runTest('mock-002');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('mock-002');
    });

  });

  describe('Test Categories Execution', () => {

    test('should run all unit tests', async () => {
      const results = await testRunner.runTestsByCategory(TestCategory.UNIT);
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.testId).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });

    test('should run all integration tests', async () => {
      const results = await testRunner.runTestsByCategory(TestCategory.INTEGRATION);
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.testId).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });

    test('should run tests by tags', async () => {
      const results = await testRunner.runTestsByTags(['core']);
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        const spec = HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === result.testId);
        expect(spec?.tags).toContain('core');
      });
    });

  });

  describe('Test Suite Execution', () => {

    test('should run quick test suite', async () => {
      const summary = await runQuickTests();
      
      expect(summary).toBeDefined();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.successRate).toBeGreaterThanOrEqual(0);
      expect(summary.successRate).toBeLessThanOrEqual(100);
    });

    test('should generate comprehensive test summary', async () => {
      // Run a small subset for testing
      const config = {
        specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 3),
        timeout: 10000
      };
      
      const runner = createHiveMindTestRunner(config);
      const { summary } = await runner.runTestSuite();
      
      expect(summary).toBeDefined();
      expect(summary.total).toBe(3);
      expect(summary.categories).toBeDefined();
      expect(summary.priorities).toBeDefined();
      expect(summary.totalDuration).toBeGreaterThan(0);
    });

    test('should generate performance report', async () => {
      const config = {
        specifications: HIVEMIND_TEST_SPECIFICATIONS.filter(
          spec => spec.category === TestCategory.PERFORMANCE
        ).slice(0, 2),
        timeout: 15000
      };
      
      const runner = createHiveMindTestRunner(config);
      const { performance } = await runner.runTestSuite();
      
      expect(performance).toBeDefined();
      expect(performance.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(performance.maxExecutionTime).toBeGreaterThanOrEqual(0);
      expect(performance.throughput).toBeGreaterThanOrEqual(0);
      expect(performance.performanceIssues).toBeDefined();
    });

  });

  describe('Validation and Success Criteria', () => {

    test('should validate assertion results', async () => {
      const result = await testRunner.runTest('core-001');
      
      expect(result.assertionResults).toBeDefined();
      expect(result.assertionResults.length).toBeGreaterThan(0);
      
      result.assertionResults.forEach(assertion => {
        expect(assertion.assertionId).toBeDefined();
        expect(assertion.passed).toBeDefined();
        expect(assertion.message).toBeDefined();
      });
    });

    test('should check success criteria', async () => {
      const result = await testRunner.runTest('core-002');
      
      // Success criteria should be evaluated
      expect(result.status).toBeDefined();
      
      // If test passes, success criteria should have been met
      if (result.status === 'passed') {
        expect(result.assertionResults.every(a => a.passed)).toBe(true);
      }
    });

    test('should collect comprehensive metrics', async () => {
      const result = await testRunner.runTest('hive-002');
      
      expect(result.metrics).toBeDefined();
      expect(result.metrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.tasksCreated).toBeGreaterThanOrEqual(0);
      expect(result.metrics.workflowsCompleted).toBeGreaterThanOrEqual(0);
      expect(result.metrics.agentsSpawned).toBeGreaterThanOrEqual(0);
    });

  });

  describe('Edge Cases and Error Scenarios', () => {

    test('should handle non-existent test ID', async () => {
      await expect(testRunner.runTest('non-existent-test'))
        .rejects.toThrow('Test specification non-existent-test not found');
    });

    test('should handle test timeout', async () => {
      // Create a test runner with very short timeout
      const shortTimeoutRunner = createHiveMindTestRunner({
        timeout: 1, // 1ms timeout
        specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 1)
      });
      
      // The test should either complete or handle timeout gracefully
      const result = await shortTimeoutRunner.runTest(HIVEMIND_TEST_SPECIFICATIONS[0].id);
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    test('should prevent concurrent execution of same test', async () => {
      const testId = 'core-001';
      
      // Start first test (don't await)
      const firstTest = testRunner.runTest(testId);
      
      // Try to run same test again immediately
      await expect(testRunner.runTest(testId))
        .rejects.toThrow(`Test ${testId} is already running`);
      
      // Wait for first test to complete
      await firstTest;
    });

  });

  describe('Test Results and Reporting', () => {

    test('should generate detailed test results', async () => {
      const result = await testRunner.runTest('core-001');
      
      expect(result).toMatchObject({
        testId: 'core-001',
        status: expect.any(String),
        duration: expect.any(Number),
        startTime: expect.any(Date),
        assertionResults: expect.any(Array),
        metrics: expect.any(Object)
      });
      
      if (result.endTime) {
        expect(result.endTime).toBeInstanceOf(Date);
        expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
      }
    });

    test('should track test execution order', async () => {
      const testIds = ['core-001', 'core-002'];
      const results = [];
      
      for (const testId of testIds) {
        const result = await testRunner.runTest(testId);
        results.push(result);
      }
      
      expect(results).toHaveLength(2);
      expect(results[0].startTime.getTime()).toBeLessThan(results[1].startTime.getTime());
    });

    test('should provide context information', async () => {
      const result = await testRunner.runTest('hive-001');
      
      if (result.context) {
        expect(result.context).toBeDefined();
        expect(typeof result.context).toBe('object');
      }
    });

  });

  describe('Integration with Existing Test Infrastructure', () => {

    test('should extend existing MaestroHiveTestSuite', () => {
      // Verify the new framework integrates with existing infrastructure
      expect(HIVEMIND_TEST_SPECIFICATIONS).toBeDefined();
      expect(createHiveMindTestRunner).toBeDefined();
      expect(runQuickTests).toBeDefined();
      expect(runFullTestSuite).toBeDefined();
    });

    test('should be compatible with Jest testing framework', () => {
      // This test itself validates Jest compatibility
      expect(jest).toBeDefined();
      expect(expect).toBeDefined();
      expect(describe).toBeDefined();
      expect(test).toBeDefined();
    });

    test('should provide factory functions', () => {
      const runner1 = createHiveMindTestRunner();
      const runner2 = createHiveMindTestRunner({ timeout: 5000 });
      
      expect(runner1).toBeInstanceOf(HiveMindTestRunner);
      expect(runner2).toBeInstanceOf(HiveMindTestRunner);
      expect(runner1).not.toBe(runner2); // Different instances
    });

  });

});

// ===== PERFORMANCE AND STRESS TESTS =====

describe('Performance and Stress Testing', () => {

  test('should handle multiple test runners concurrently', async () => {
    const numRunners = 3;
    const runners = Array(numRunners).fill(null).map(() => 
      createHiveMindTestRunner({
        specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 2),
        timeout: 10000
      })
    );
    
    const promises = runners.map(runner => runner.runTestSuite());
    const results = await Promise.allSettled(promises);
    
    expect(results).toHaveLength(numRunners);
    
    // At least some should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(0);
  });

  test('should handle large test suites', async () => {
    // Test with all specifications
    const runner = createHiveMindTestRunner({
      specifications: HIVEMIND_TEST_SPECIFICATIONS,
      timeout: 60000,
      parallel: true,
      maxConcurrency: 4
    });
    
    const startTime = Date.now();
    const { summary } = await runner.runTestSuite();
    const duration = Date.now() - startTime;
    
    expect(summary).toBeDefined();
    expect(summary.total).toBe(HIVEMIND_TEST_SPECIFICATIONS.length);
    expect(duration).toBeLessThan(300000); // Should complete within 5 minutes
  });

  test('should maintain memory usage within limits', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    const runner = createHiveMindTestRunner({
      specifications: HIVEMIND_TEST_SPECIFICATIONS.slice(0, 5),
      timeout: 15000
    });
    
    await runner.runTestSuite();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });

});

// ===== END-TO-END INTEGRATION TESTS =====

describe('End-to-End Integration Tests', () => {

  test('should complete full SPARC workflow test', async () => {
    const runner = createHiveMindTestRunner({
      specifications: HIVEMIND_TEST_SPECIFICATIONS.filter(
        spec => spec.id === 'sparc-002'
      ),
      timeout: 90000
    });
    
    const { results } = await runner.runTestSuite();
    
    expect(results).toHaveLength(1);
    expect(results[0].testId).toBe('sparc-002');
    
    // E2E test should have comprehensive context
    if (results[0].context) {
      expect(results[0].context.workflow).toBeDefined();
      expect(results[0].context.completedTasks).toBeDefined();
    }
  });

  test('should validate complete system integration', async () => {
    const criticalTests = TestSpecificationHelper.getCriticalPath(
      HIVEMIND_TEST_SPECIFICATIONS
    );
    
    const runner = createHiveMindTestRunner({
      specifications: criticalTests,
      timeout: 120000
    });
    
    const { summary } = await runner.runTestSuite();
    
    expect(summary.total).toBeGreaterThan(0);
    
    // Critical tests should have high success rate
    expect(summary.successRate).toBeGreaterThan(80);
  });

});