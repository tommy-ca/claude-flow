# HiveMind Maestro Testing Framework Guide

**Version**: 2.0.0  
**Author**: Claude Flow TestingEnforcer Agent  
**Last Updated**: 2025-08-03

## Overview

The HiveMind Maestro Testing Framework provides comprehensive testing capabilities for the Claude Flow system, including unit tests, integration tests, performance benchmarks, and mock fallback scenarios.

## Table of Contents

1. [Framework Architecture](#framework-architecture)
2. [Test Categories](#test-categories)
3. [Getting Started](#getting-started)
4. [Writing Tests](#writing-tests)
5. [Mock Testing](#mock-testing)
6. [Performance Testing](#performance-testing)
7. [Coverage Analysis](#coverage-analysis)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Framework Architecture

### Core Components

```
src/maestro-hive/
├── test-framework.ts          # Main test runner and orchestration
├── test-specifications.ts     # Test definitions and specifications
├── test-utilities.ts          # Shared utilities and helpers
└── interfaces.ts             # Type definitions

tests/maestro-hive/
├── comprehensive-test-suite.test.ts    # Main test suite
├── performance-benchmarks.test.ts     # Performance tests
├── mock-fallback-tests.test.ts        # Mock and fallback tests
├── error-recovery-tests.test.ts       # Error handling tests
└── test-coverage-report.ts            # Coverage analysis
```

### Key Classes

- **`HiveMindTestRunner`**: Main test execution engine
- **`TestSpecificationHelper`**: Test specification utilities
- **`TestCoverageAnalyzer`**: Coverage analysis and reporting
- **`PerformanceMonitor`**: Performance tracking
- **`MockServiceManager`**: Mock service management

## Test Categories

### 1. Unit Tests (`TestCategory.UNIT`)
- Test individual components in isolation
- Fast execution (< 5 seconds)
- No external dependencies
- High coverage of edge cases

### 2. Integration Tests (`TestCategory.INTEGRATION`)
- Test component interactions
- Moderate execution time (< 30 seconds)
- May use controlled dependencies
- Focus on data flow and interfaces

### 3. End-to-End Tests (`TestCategory.END_TO_END`)
- Test complete workflows
- Longer execution time (< 2 minutes)
- Use real or near-real dependencies
- Validate user scenarios

### 4. Performance Tests (`TestCategory.PERFORMANCE`)
- Benchmark system performance
- Resource usage monitoring
- Scalability validation
- Regression detection

### 5. Recovery Tests (`TestCategory.RECOVERY`)
- Error handling validation
- Failure recovery scenarios
- System resilience testing
- Graceful degradation

### 6. Mock Fallback Tests (`TestCategory.MOCK_FALLBACK`)
- Offline operation testing
- Service unavailability scenarios
- Fallback mechanism validation
- Circuit breaker testing

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test category
npm test -- --grep "UNIT"
```

### Basic Usage

```typescript
import { createHiveMindTestRunner, HIVEMIND_TEST_SPECIFICATIONS } from './test-framework.js';

// Create test runner
const testRunner = createHiveMindTestRunner({
  specifications: HIVEMIND_TEST_SPECIFICATIONS,
  parallel: true,
  maxConcurrency: 4,
  timeout: 30000
});

// Run test suite
const { results, summary, performance } = await testRunner.runTestSuite();

console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
console.log(`Total Duration: ${summary.totalDuration}ms`);
```

## Writing Tests

### Test Specification Format

```typescript
const testSpec: TestSpecification = {
  id: 'unique-test-id',
  name: 'Descriptive Test Name',
  description: 'Detailed description of what this test validates',
  category: TestCategory.UNIT,
  priority: TestPriority.HIGH,
  timeout: 10000,
  assertions: [
    {
      id: 'assertion-1',
      description: 'What this assertion validates',
      type: 'equals',
      expected: expectedValue
    }
  ],
  successCriteria: {
    requiredTasks: 1,
    minQualityScore: 0.8
  },
  tags: ['component', 'feature']
};
```

### Assertion Types

- **`equals`**: Exact value comparison
- **`contains`**: String/array containment
- **`greaterThan`**: Numeric greater than
- **`lessThan`**: Numeric less than
- **`exists`**: Value existence check
- **`custom`**: Custom validation function

### Success Criteria

- **`requiredTasks`**: Minimum tasks that must be created
- **`requiredWorkflows`**: Minimum workflows that must complete
- **`minQualityScore`**: Minimum quality threshold
- **`maxExecutionTime`**: Maximum allowed execution time
- **`maxMemoryUsage`**: Maximum memory usage limit

## Mock Testing

### Mock Configuration

```typescript
const mockConfig: MockConfiguration = {
  enableMocks: true,
  mockServices: ['claude-api', 'swarm-coordinator'],
  mockResponses: {
    'claude-api': { content: 'Mocked response', quality: 0.9 },
    'swarm-coordinator': { status: 'healthy', agents: 3 }
  },
  fallbackBehavior: 'continue',
  simulateLatency: 100,
  simulateErrors: true,
  errorRate: 0.1
};
```

### Offline Testing

```typescript
// Test offline functionality
const offlineTest = {
  mockConfig: {
    enableMocks: true,
    mockServices: ['*'], // Mock all services
    mockResponses: {},
    fallbackBehavior: 'continue'
  }
};
```

## Performance Testing

### Performance Baselines

```typescript
const performanceBaseline: PerformanceBaseline = {
  maxExecutionTime: 30000,    // 30 seconds
  minThroughput: 1,           // 1 test per second
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  maxCpuUsage: 80,            // 80% CPU
  maxAgentSpawnTime: 5000,    // 5 seconds
  minCoordinationEfficiency: 0.8 // 80% efficiency
};
```

### Benchmark Tests

```typescript
// Run performance benchmark
const benchmarkRunner = createHiveMindTestRunner({
  specifications: performanceSpecs,
  trackPerformance: true,
  performanceThresholds: performanceBaseline
});

const { performance } = await benchmarkRunner.runTestSuite();
console.log(`Throughput: ${performance.throughput} tests/sec`);
```

## Coverage Analysis

### Generate Coverage Report

```typescript
import { TestCoverageAnalyzer } from './test-coverage-report.js';

const analyzer = new TestCoverageAnalyzer(results, specifications);
const report = analyzer.generateReport();

// Export reports
analyzer.exportToFile('./coverage.json', 'json');
analyzer.exportToFile('./coverage.html', 'html');
analyzer.exportToFile('./coverage.md', 'markdown');
```

### Coverage Metrics

- **Success Rate**: Percentage of passing tests
- **Code Coverage**: Estimated code path coverage
- **Category Coverage**: Coverage by test category
- **Priority Coverage**: Coverage by test priority
- **Uncovered Areas**: Identified gaps in testing

## Best Practices

### Test Design

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Focus on single behavior
3. **Descriptive Names**: Clear test and assertion descriptions
4. **Independent Tests**: No dependencies between tests
5. **Fast Execution**: Optimize for quick feedback

### Test Organization

1. **Logical Grouping**: Group related tests together
2. **Clear Hierarchy**: Use describe blocks effectively
3. **Consistent Naming**: Follow naming conventions
4. **Proper Cleanup**: Always clean up resources
5. **Mock Appropriately**: Use mocks for external dependencies

### Performance Considerations

1. **Parallel Execution**: Enable parallelism for speed
2. **Resource Management**: Monitor memory usage
3. **Timeout Management**: Set appropriate timeouts
4. **Batch Operations**: Group similar operations
5. **Progress Tracking**: Monitor test progress

### Error Handling

1. **Graceful Failures**: Handle test failures gracefully
2. **Detailed Logging**: Provide comprehensive error information
3. **Recovery Testing**: Test error recovery scenarios
4. **Timeout Handling**: Handle test timeouts properly
5. **Resource Cleanup**: Clean up even on failure

## Troubleshooting

### Common Issues

#### Test Timeouts
```typescript
// Solution: Increase timeout or optimize test
const config = {
  timeout: 60000, // Increase timeout
  parallel: false // Disable parallel execution
};
```

#### Memory Issues
```typescript
// Solution: Monitor and limit memory usage
const monitor = new MemoryTracker();
monitor.setBaseline();
// ... run tests ...
const delta = monitor.getMemoryDelta();
if (delta.heapUsed > threshold) {
  console.warn('Memory usage exceeded threshold');
}
```

#### Mock Configuration
```typescript
// Solution: Validate mock responses
const mockResponse = mockManager.getMockResponse('service');
if (!mockResponse) {
  throw new Error('Mock response not configured');
}
```

### Debugging Tips

1. **Enable Verbose Logging**: Set `verbose: true` in config
2. **Run Single Tests**: Isolate problematic tests
3. **Check Dependencies**: Verify all dependencies are available
4. **Monitor Resources**: Track memory and CPU usage
5. **Validate Mocks**: Ensure mock configurations are correct

### Performance Debugging

1. **Profile Test Execution**: Use performance monitoring
2. **Identify Bottlenecks**: Find slow-running tests
3. **Optimize Queries**: Reduce database/API calls
4. **Parallel Execution**: Enable parallel test execution
5. **Resource Cleanup**: Ensure proper cleanup

## API Reference

### HiveMindTestRunner

```typescript
class HiveMindTestRunner {
  constructor(config?: Partial<TestSuiteConfig>);
  
  async runTestSuite(): Promise<{
    results: TestResult[];
    summary: TestSummary;
    performance: PerformanceReport;
  }>;
  
  async runTest(testId: string): Promise<TestResult>;
  async runTestsByCategory(category: TestCategory): Promise<TestResult[]>;
  async runTestsByTags(tags: string[]): Promise<TestResult[]>;
}
```

### TestSpecificationHelper

```typescript
class TestSpecificationHelper {
  static filterSpecifications(specs: TestSpecification[], criteria: FilterCriteria): TestSpecification[];
  static getByPriority(specs: TestSpecification[], priority: TestPriority): TestSpecification[];
  static getCriticalPath(specs: TestSpecification[]): TestSpecification[];
  static validateSpecification(spec: TestSpecification): ValidationResult;
  static generateExecutionPlan(specs: TestSpecification[]): ExecutionPlan;
}
```

### TestCoverageAnalyzer

```typescript
class TestCoverageAnalyzer {
  constructor(results: TestResult[], specifications: TestSpecification[]);
  
  generateReport(): CoverageReport;
  exportToFile(filePath: string, format: 'json' | 'html' | 'markdown'): void;
}
```

## Configuration Options

### TestSuiteConfig

```typescript
interface TestSuiteConfig {
  name: string;
  description: string;
  specifications: TestSpecification[];
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  reportFormat: 'json' | 'html' | 'junit' | 'console';
  outputDir: string;
  verbose: boolean;
  trackPerformance: boolean;
  performanceThresholds: PerformanceBaseline;
}
```

## Integration Examples

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run HiveMind Tests
  run: |
    npm test
    npm run test:performance
    npm run test:coverage
    
- name: Upload Coverage Report
  uses: actions/upload-artifact@v2
  with:
    name: coverage-report
    path: ./test-coverage.*
```

### Docker Testing

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test
```

## Support and Contributing

For issues, questions, or contributions related to the testing framework:

1. Check existing documentation and examples
2. Review test specifications and utilities
3. Run diagnostic commands for troubleshooting
4. Follow testing best practices and conventions
5. Coordinate with other cleanup agents for dependencies

---

*This guide is part of the HiveMind Maestro comprehensive cleanup and testing framework enhancement initiative.*