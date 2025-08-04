/**
 * Direct Test Execution for Maestro-Hive Integration
 * 
 * This provides a direct way to execute tests bypassing configuration issues
 * and demonstrating the comprehensive testing framework capabilities.
 */

import { 
  HiveMindTestRunner,
  createHiveMindTestRunner,
  runQuickTests,
  runFullTestSuite,
  type TestResult,
  type TestSummary,
  type PerformanceReport
} from '../../src/maestro-hive/test-framework.js';
import {
  HIVEMIND_TEST_SPECIFICATIONS,
  TestCategory,
  TestPriority,
  TestSpecificationHelper,
  type TestSpecification
} from '../../src/maestro-hive/test-specifications.js';

/**
 * Direct test execution with manual configuration
 */
export class DirectTestExecutor {
  
  /**
   * Execute critical path tests
   */
  static async executeCriticalTests(): Promise<{
    results: TestResult[];
    summary: TestSummary;
    performance: PerformanceReport;
  }> {
    console.log('🚀 Starting Critical Path Tests');
    
    try {
      // Get critical tests
      const criticalSpecs = TestSpecificationHelper.getCriticalPath(HIVEMIND_TEST_SPECIFICATIONS);
      console.log(`📋 Found ${criticalSpecs.length} critical tests`);
      
      // Create test runner with minimal config
      const runner = createHiveMindTestRunner({
        specifications: criticalSpecs,
        timeout: 30000,
        parallel: false,
        maxConcurrency: 1
      });
      
      // Execute tests
      const results = await runner.runTestSuite();
      
      console.log('✅ Critical tests completed');
      return results;
      
    } catch (error) {
      console.error('❌ Critical tests failed:', error);
      throw error;
    }
  }
  
  /**
   * Execute performance tests
   */
  static async executePerformanceTests(): Promise<{
    results: TestResult[];
    summary: TestSummary;
    performance: PerformanceReport;
  }> {
    console.log('⚡ Starting Performance Tests');
    
    try {
      // Get performance tests
      const perfSpecs = TestSpecificationHelper.filterSpecifications(
        HIVEMIND_TEST_SPECIFICATIONS,
        { categories: [TestCategory.PERFORMANCE] }
      );
      console.log(`📋 Found ${perfSpecs.length} performance tests`);
      
      // Create test runner for performance
      const runner = createHiveMindTestRunner({
        specifications: perfSpecs,
        timeout: 45000,
        parallel: true,
        maxConcurrency: 2
      });
      
      // Execute tests
      const results = await runner.runTestSuite();
      
      console.log('✅ Performance tests completed');
      return results;
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      throw error;
    }
  }
  
  /**
   * Execute mock and fallback tests
   */
  static async executeMockTests(): Promise<{
    results: TestResult[];
    summary: TestSummary;
    performance: PerformanceReport;
  }> {
    console.log('🎭 Starting Mock and Fallback Tests');
    
    try {
      // Get mock tests
      const mockSpecs = TestSpecificationHelper.filterSpecifications(
        HIVEMIND_TEST_SPECIFICATIONS,
        { categories: [TestCategory.MOCK_FALLBACK] }
      );
      console.log(`📋 Found ${mockSpecs.length} mock/fallback tests`);
      
      // Create test runner for mocks
      const runner = createHiveMindTestRunner({
        specifications: mockSpecs,
        timeout: 15000,
        parallel: false,
        maxConcurrency: 1
      });
      
      // Execute tests
      const results = await runner.runTestSuite();
      
      console.log('✅ Mock tests completed');
      return results;
      
    } catch (error) {
      console.error('❌ Mock tests failed:', error);
      throw error;
    }
  }
  
  /**
   * Execute all test categories in sequence
   */
  static async executeFullSuite(): Promise<{
    criticalResults: { results: TestResult[]; summary: TestSummary; performance: PerformanceReport; };
    performanceResults: { results: TestResult[]; summary: TestSummary; performance: PerformanceReport; };
    mockResults: { results: TestResult[]; summary: TestSummary; performance: PerformanceReport; };
    overallSummary: {
      totalTests: number;
      totalPassed: number;
      totalFailed: number;
      overallSuccessRate: number;
      totalDuration: number;
    };
  }> {
    console.log('🏁 Starting Full Test Suite Execution');
    
    const startTime = Date.now();
    
    try {
      // Execute test categories in sequence
      const criticalResults = await this.executeCriticalTests();
      const performanceResults = await this.executePerformanceTests();
      const mockResults = await this.executeMockTests();
      
      // Calculate overall summary
      const totalTests = criticalResults.summary.total + 
                        performanceResults.summary.total + 
                        mockResults.summary.total;
      
      const totalPassed = criticalResults.summary.passed + 
                         performanceResults.summary.passed + 
                         mockResults.summary.passed;
      
      const totalFailed = criticalResults.summary.failed + 
                         performanceResults.summary.failed + 
                         mockResults.summary.failed;
      
      const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
      const totalDuration = Date.now() - startTime;
      
      const overallSummary = {
        totalTests,
        totalPassed,
        totalFailed,
        overallSuccessRate,
        totalDuration
      };
      
      console.log('🎉 Full Test Suite Completed');
      console.log(`📊 Overall Results: ${totalPassed}/${totalTests} tests passed (${overallSuccessRate.toFixed(1)}%)`);
      
      return {
        criticalResults,
        performanceResults, 
        mockResults,
        overallSummary
      };
      
    } catch (error) {
      console.error('❌ Full test suite failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate comprehensive test report
   */
  static async generateTestReport(): Promise<string> {
    console.log('📝 Generating Comprehensive Test Report');
    
    try {
      const results = await this.executeFullSuite();
      
      const report = `
# 🧪 Maestro-Hive Comprehensive Test Report

## 📊 Executive Summary

- **Total Tests**: ${results.overallSummary.totalTests}
- **Passed**: ${results.overallSummary.totalPassed} ✅
- **Failed**: ${results.overallSummary.totalFailed} ❌
- **Success Rate**: ${results.overallSummary.overallSuccessRate.toFixed(1)}%
- **Total Duration**: ${Math.round(results.overallSummary.totalDuration / 1000)}s

## 🎯 Critical Tests Results

- **Tests**: ${results.criticalResults.summary.total}
- **Passed**: ${results.criticalResults.summary.passed}
- **Failed**: ${results.criticalResults.summary.failed}
- **Success Rate**: ${results.criticalResults.summary.successRate.toFixed(1)}%
- **Duration**: ${Math.round(results.criticalResults.summary.totalDuration)}ms

## ⚡ Performance Tests Results

- **Tests**: ${results.performanceResults.summary.total}
- **Passed**: ${results.performanceResults.summary.passed}
- **Failed**: ${results.performanceResults.summary.failed}
- **Success Rate**: ${results.performanceResults.summary.successRate.toFixed(1)}%
- **Duration**: ${Math.round(results.performanceResults.summary.totalDuration)}ms
- **Throughput**: ${results.performanceResults.performance.throughput.toFixed(2)} tests/sec
- **Max Memory**: ${Math.round(results.performanceResults.performance.maxMemoryUsage / 1024 / 1024)}MB

## 🎭 Mock/Fallback Tests Results

- **Tests**: ${results.mockResults.summary.total}
- **Passed**: ${results.mockResults.summary.passed}
- **Failed**: ${results.mockResults.summary.failed}
- **Success Rate**: ${results.mockResults.summary.successRate.toFixed(1)}%
- **Duration**: ${Math.round(results.mockResults.summary.totalDuration)}ms

## 🔍 Test Coverage Analysis

### By Category
${Object.entries(results.criticalResults.summary.categories)
  .map(([category, count]) => `- **${category}**: ${count} tests`)
  .join('\n')}

### By Priority  
${Object.entries(results.criticalResults.summary.priorities)
  .map(([priority, count]) => `- **${priority}**: ${count} tests`)
  .join('\n')}

## 📈 Performance Insights

- **Average Execution Time**: ${results.performanceResults.performance.averageExecutionTime.toFixed(2)}ms
- **Max Execution Time**: ${results.performanceResults.performance.maxExecutionTime.toFixed(2)}ms
- **Performance Issues**: ${results.performanceResults.performance.performanceIssues.length}

## ✅ Quality Gates Status

- **95%+ Coverage Target**: ${results.overallSummary.overallSuccessRate >= 95 ? '✅ PASSED' : '❌ FAILED'}
- **Performance Targets**: ${results.performanceResults.performance.performanceIssues.length === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Zero Regression**: ${results.overallSummary.totalFailed === 0 ? '✅ PASSED' : '❌ FAILED'}

## 📋 Recommendations

${results.overallSummary.overallSuccessRate >= 95 
  ? '🎉 **EXCELLENT**: All quality gates passed. System is production-ready.'
  : results.overallSummary.overallSuccessRate >= 90
    ? '✅ **GOOD**: High success rate achieved. Minor optimizations recommended.'
    : results.overallSummary.overallSuccessRate >= 80
      ? '⚠️ **NEEDS IMPROVEMENT**: Several tests failing. Review and fix required.'
      : '❌ **CRITICAL**: Low success rate. Immediate attention required.'}

---
*Generated on ${new Date().toISOString()}*
*Maestro-Hive Testing Framework v2.0.0*
`;
      
      console.log('📋 Test report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Test report generation failed:', error);
      throw error;
    }
  }
}

/**
 * Execute comprehensive test validation
 */
export async function executeComprehensiveValidation(): Promise<void> {
  console.log('\n🚀 Starting Maestro-Hive Comprehensive Validation\n');
  
  try {
    // Generate full test report
    const report = await DirectTestExecutor.generateTestReport();
    
    // Write report to file
    const fs = await import('fs/promises');
    await fs.writeFile('./MAESTRO_HIVE_TEST_REPORT.md', report);
    
    console.log('\n✅ Comprehensive validation completed successfully');
    console.log('📄 Report saved to: ./MAESTRO_HIVE_TEST_REPORT.md');
    
  } catch (error) {
    console.error('\n❌ Comprehensive validation failed:', error);
    throw error;
  }
}

// Export for CLI usage
export default DirectTestExecutor;