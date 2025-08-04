#!/usr/bin/env tsx
/**
 * Comprehensive Test Runner Script for HiveMind Maestro Workflows
 * 
 * This script provides a command-line interface for running the comprehensive
 * test suite with various options and configurations.
 */

import { Command } from 'commander';
import { 
  createHiveMindTestRunner,
  runQuickTests,
  runFullTestSuite
} from '../src/maestro-hive/test-framework.js';
import {
  HIVEMIND_TEST_SPECIFICATIONS,
  TestCategory,
  TestPriority,
  TestSpecificationHelper,
  DEFAULT_TEST_SUITE_CONFIG
} from '../src/maestro-hive/test-specifications.js';

// CLI Program setup
const program = new Command();

program
  .name('run-comprehensive-tests')
  .description('Run comprehensive tests for HiveMind Claude Flow maestro workflows')
  .version('1.0.0');

// Quick test command
program
  .command('quick')
  .description('Run critical path tests quickly')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '30000')
  .action(async (options) => {
    console.log('🚀 Running Quick Test Suite...\n');
    
    try {
      const startTime = Date.now();
      const summary = await runQuickTests();
      const duration = Date.now() - startTime;
      
      console.log('\n📊 Quick Test Results Summary:');
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
      console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`Duration: ${duration}ms`);
      
      if (options.verbose) {
        console.log('\n📂 Results by Category:');
        Object.entries(summary.categories).forEach(([category, count]) => {
          console.log(`  ${category}: ${count}`);
        });
      }
      
      process.exit(summary.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Quick test suite failed:', error);
      process.exit(1);
    }
  });

// Full test suite command
program
  .command('full')
  .description('Run complete test suite')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '300000')
  .option('--parallel', 'Run tests in parallel', false)
  .option('--concurrency <n>', 'Set maximum concurrency level', '4')
  .option('--performance', 'Include performance tracking', false)
  .action(async (options) => {
    console.log('🚀 Running Full Test Suite...\n');
    
    try {
      const startTime = Date.now();
      const { results, summary, performance } = await runFullTestSuite();
      const duration = Date.now() - startTime;
      
      console.log('\n📊 Full Test Suite Results:');
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
      console.log(`Errors: ${summary.errors} ${summary.errors > 0 ? '💥' : '✅'}`);
      console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`Total Duration: ${duration}ms`);
      console.log(`Average Test Duration: ${Math.round(summary.averageDuration)}ms`);
      
      if (options.verbose) {
        console.log('\n📂 Results by Category:');
        Object.entries(summary.categories).forEach(([category, count]) => {
          console.log(`  ${category}: ${count}`);
        });
        
        console.log('\n⚡ Results by Priority:');
        Object.entries(summary.priorities).forEach(([priority, count]) => {
          console.log(`  ${priority}: ${count}`);
        });
      }
      
      if (options.performance && performance) {
        console.log('\n🔍 Performance Report:');
        console.log(`Average Execution Time: ${performance.averageExecutionTime.toFixed(2)}ms`);
        console.log(`Max Execution Time: ${performance.maxExecutionTime}ms`);
        console.log(`Throughput: ${performance.throughput.toFixed(2)} tests/second`);
        console.log(`Average Memory Usage: ${Math.round(performance.averageMemoryUsage / 1024)}KB`);
        
        if (performance.performanceIssues.length > 0) {
          console.log('\n⚠️ Performance Issues:');
          performance.performanceIssues.forEach(issue => {
            console.log(`  - ${issue}`);
          });
        }
      }
      
      if (summary.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => r.status === 'failed').forEach(result => {
          console.log(`  - ${result.testId}: ${result.error?.message || 'Test failed'}`);
        });
      }
      
      process.exit(summary.failed > 0 || summary.errors > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Full test suite failed:', error);
      process.exit(1);
    }
  });

// Category-specific test commands
program
  .command('category <category>')
  .description('Run tests for a specific category')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '60000')
  .action(async (category, options) => {
    const categoryEnum = category.toUpperCase() as keyof typeof TestCategory;
    
    if (!TestCategory[categoryEnum]) {
      console.error(`❌ Unknown category: ${category}`);
      console.log('Available categories:', Object.values(TestCategory).join(', '));
      process.exit(1);
    }
    
    console.log(`🚀 Running ${category.toUpperCase()} tests...\n`);
    
    try {
      const specs = TestSpecificationHelper.filterSpecifications(
        HIVEMIND_TEST_SPECIFICATIONS,
        { categories: [TestCategory[categoryEnum]] }
      );
      
      if (specs.length === 0) {
        console.log(`No tests found for category: ${category}`);
        process.exit(0);
      }
      
      const runner = createHiveMindTestRunner({
        specifications: specs,
        timeout: parseInt(options.timeout),
        verbose: options.verbose
      });
      
      const startTime = Date.now();
      const { summary } = await runner.runTestSuite();
      const duration = Date.now() - startTime;
      
      console.log(`\n📊 ${category.toUpperCase()} Test Results:`);
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
      console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`Duration: ${duration}ms`);
      
      process.exit(summary.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(`❌ ${category} tests failed:`, error);
      process.exit(1);
    }
  });

// Priority-specific test commands
program
  .command('priority <priority>')
  .description('Run tests for a specific priority level')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '60000')
  .action(async (priority, options) => {
    const priorityEnum = priority.toUpperCase() as keyof typeof TestPriority;
    
    if (!TestPriority[priorityEnum]) {
      console.error(`❌ Unknown priority: ${priority}`);
      console.log('Available priorities:', Object.values(TestPriority).join(', '));
      process.exit(1);
    }
    
    console.log(`🚀 Running ${priority.toUpperCase()} priority tests...\n`);
    
    try {
      const specs = TestSpecificationHelper.getByPriority(
        HIVEMIND_TEST_SPECIFICATIONS,
        TestPriority[priorityEnum]
      );
      
      if (specs.length === 0) {
        console.log(`No tests found for priority: ${priority}`);
        process.exit(0);
      }
      
      const runner = createHiveMindTestRunner({
        specifications: specs,
        timeout: parseInt(options.timeout),
        verbose: options.verbose
      });
      
      const startTime = Date.now();
      const { summary } = await runner.runTestSuite();
      const duration = Date.now() - startTime;
      
      console.log(`\n📊 ${priority.toUpperCase()} Priority Test Results:`);
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
      console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`Duration: ${duration}ms`);
      
      process.exit(summary.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(`❌ ${priority} priority tests failed:`, error);
      process.exit(1);
    }
  });

// Tag-based test commands
program
  .command('tags <tags...>')
  .description('Run tests with specific tags')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '60000')
  .action(async (tags, options) => {
    console.log(`🚀 Running tests with tags: ${tags.join(', ')}...\n`);
    
    try {
      const specs = TestSpecificationHelper.filterSpecifications(
        HIVEMIND_TEST_SPECIFICATIONS,
        { tags }
      );
      
      if (specs.length === 0) {
        console.log(`No tests found with tags: ${tags.join(', ')}`);
        process.exit(0);
      }
      
      const runner = createHiveMindTestRunner({
        specifications: specs,
        timeout: parseInt(options.timeout),
        verbose: options.verbose
      });
      
      const startTime = Date.now();
      const { summary } = await runner.runTestSuite();
      const duration = Date.now() - startTime;
      
      console.log(`\n📊 Tagged Test Results (${tags.join(', ')}):`);
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
      console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`Duration: ${duration}ms`);
      
      process.exit(summary.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(`❌ Tagged tests failed:`, error);
      process.exit(1);
    }
  });

// Individual test command
program
  .command('test <testId>')
  .description('Run a specific test by ID')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Set test timeout in milliseconds', '30000')
  .action(async (testId, options) => {
    console.log(`🚀 Running test: ${testId}...\n`);
    
    try {
      const spec = HIVEMIND_TEST_SPECIFICATIONS.find(s => s.id === testId);
      
      if (!spec) {
        console.error(`❌ Test not found: ${testId}`);
        console.log('Available tests:');
        HIVEMIND_TEST_SPECIFICATIONS.forEach(s => {
          console.log(`  - ${s.id}: ${s.name}`);
        });
        process.exit(1);
      }
      
      const runner = createHiveMindTestRunner({
        specifications: [spec],
        timeout: parseInt(options.timeout),
        verbose: options.verbose
      });
      
      const startTime = Date.now();
      const result = await runner.runTest(testId);
      const duration = Date.now() - startTime;
      
      console.log(`\n📊 Test Result: ${testId}`);
      console.log(`Status: ${result.status} ${result.status === 'passed' ? '✅' : '❌'}`);
      console.log(`Duration: ${result.duration}ms`);
      
      if (options.verbose) {
        console.log(`\n📋 Assertions (${result.assertionResults?.length || 0}):`);
        result.assertionResults?.forEach(assertion => {
          console.log(`  ${assertion.passed ? '✅' : '❌'} ${assertion.assertionId}: ${assertion.message}`);
        });
        
        console.log('\n📈 Metrics:');
        Object.entries(result.metrics || {}).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
      
      if (result.error) {
        console.log(`\n❌ Error: ${result.error.message}`);
        if (options.verbose && result.error.stack) {
          console.log(result.error.stack);
        }
      }
      
      process.exit(result.status === 'passed' ? 0 : 1);
      
    } catch (error) {
      console.error(`❌ Test execution failed:`, error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List all available tests')
  .option('-c, --category <category>', 'Filter by category')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--detailed', 'Show detailed information')
  .action((options) => {
    let specs = HIVEMIND_TEST_SPECIFICATIONS;
    
    // Apply filters
    if (options.category) {
      const categoryEnum = options.category.toUpperCase() as keyof typeof TestCategory;
      if (TestCategory[categoryEnum]) {
        specs = specs.filter(s => s.category === TestCategory[categoryEnum]);
      }
    }
    
    if (options.priority) {
      const priorityEnum = options.priority.toUpperCase() as keyof typeof TestPriority;
      if (TestPriority[priorityEnum]) {
        specs = specs.filter(s => s.priority === TestPriority[priorityEnum]);
      }
    }
    
    if (options.tag) {
      specs = specs.filter(s => s.tags.includes(options.tag));
    }
    
    console.log(`📋 Available Tests (${specs.length}):\n`);
    
    if (options.detailed) {
      specs.forEach(spec => {
        console.log(`🧪 ${spec.id}`);
        console.log(`   Name: ${spec.name}`);
        console.log(`   Category: ${spec.category}`);
        console.log(`   Priority: ${spec.priority}`);
        console.log(`   Tags: ${spec.tags.join(', ')}`);
        console.log(`   Assertions: ${spec.assertions.length}`);
        console.log(`   Description: ${spec.description}`);
        console.log('');
      });
    } else {
      specs.forEach(spec => {
        console.log(`  ${spec.id} - ${spec.name} [${spec.category}/${spec.priority}]`);
      });
    }
    
    console.log(`\nTotal: ${specs.length} tests`);
  });

// Plan command
program
  .command('plan')
  .description('Generate and display test execution plan')
  .option('--include-categories <categories...>', 'Include specific categories')
  .option('--exclude-categories <categories...>', 'Exclude specific categories')
  .option('--min-priority <priority>', 'Minimum priority level')
  .action((options) => {
    console.log('📋 Generating Test Execution Plan...\n');
    
    let specs = HIVEMIND_TEST_SPECIFICATIONS;
    
    // Apply filters
    if (options.includeCategories) {
      const categories = options.includeCategories.map((c: string) => 
        TestCategory[c.toUpperCase() as keyof typeof TestCategory]
      ).filter(Boolean);
      specs = TestSpecificationHelper.filterSpecifications(specs, { categories });
    }
    
    if (options.excludeCategories) {
      const excludeCategories = options.excludeCategories.map((c: string) => 
        TestCategory[c.toUpperCase() as keyof typeof TestCategory]
      ).filter(Boolean);
      specs = specs.filter(s => !excludeCategories.includes(s.category as any));
    }
    
    if (options.minPriority) {
      const priorities = [TestPriority.CRITICAL, TestPriority.HIGH, TestPriority.MEDIUM, TestPriority.LOW];
      const minIndex = priorities.indexOf(options.minPriority.toUpperCase() as TestPriority);
      if (minIndex >= 0) {
        const allowedPriorities = priorities.slice(0, minIndex + 1);
        specs = specs.filter(s => allowedPriorities.includes(s.priority as TestPriority));
      }
    }
    
    const plan = TestSpecificationHelper.generateExecutionPlan(specs);
    
    console.log(`📊 Execution Plan Summary:`);
    console.log(`Total Phases: ${plan.phases.length}`);
    console.log(`Total Tests: ${specs.length}`);
    console.log(`Estimated Time: ${Math.round(plan.totalEstimatedTime / 1000)}s`);
    console.log('');
    
    plan.phases.forEach((phase, index) => {
      if (phase.specifications.length > 0) {
        console.log(`${index + 1}. ${phase.name}`);
        console.log(`   Tests: ${phase.specifications.length}`);
        console.log(`   Estimated Time: ${Math.round(phase.estimatedTime / 1000)}s`);
        console.log(`   Test IDs: ${phase.specifications.map(s => s.id).join(', ')}`);
        console.log('');
      }
    });
  });

// Validate command
program
  .command('validate')
  .description('Validate test specifications')
  .option('--fix', 'Attempt to fix validation issues')
  .action((options) => {
    console.log('🔍 Validating Test Specifications...\n');
    
    let validSpecs = 0;
    let invalidSpecs = 0;
    const issues: string[] = [];
    
    HIVEMIND_TEST_SPECIFICATIONS.forEach(spec => {
      const validation = TestSpecificationHelper.validateSpecification(spec);
      
      if (validation.valid) {
        validSpecs++;
      } else {
        invalidSpecs++;
        issues.push(`❌ ${spec.id}: ${validation.errors.join(', ')}`);
      }
    });
    
    console.log(`📊 Validation Results:`);
    console.log(`Valid Specifications: ${validSpecs} ✅`);
    console.log(`Invalid Specifications: ${invalidSpecs} ${invalidSpecs > 0 ? '❌' : '✅'}`);
    console.log(`Total Specifications: ${HIVEMIND_TEST_SPECIFICATIONS.length}`);
    
    if (issues.length > 0) {
      console.log('\n🔍 Issues Found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    if (invalidSpecs === 0) {
      console.log('\n🎉 All test specifications are valid!');
    }
    
    process.exit(invalidSpecs > 0 ? 1 : 0);
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}