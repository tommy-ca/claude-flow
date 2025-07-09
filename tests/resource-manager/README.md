# Resource Manager Test Suite

This comprehensive test suite covers the Intelligent Resource Management and Agent Deployment System (Issue #178).

## Test Structure

### Unit Tests (`unit/`)
- **resource-detector.test.ts** - Tests for CPU, memory, disk, and network resource detection
- **agent-factory.test.ts** - Tests for agent creation based on resource availability
- **resource-allocator.test.ts** - Tests for resource allocation strategies
- **pressure-detector.test.ts** - Tests for resource pressure detection and prevention
- **platform-compatibility.test.ts** - Tests for cross-platform support

### Integration Tests (`integration/`)
- **deployment-flow.test.ts** - Tests for complete agent deployment workflows
- **resource-monitoring.test.ts** - Tests for real-time resource monitoring
- **agent-scaling.test.ts** - Tests for dynamic agent scaling
- **recovery-scenarios.test.ts** - Tests for resource recovery and failover

### Performance Tests (`performance/`)
- **resource-detection-benchmark.test.ts** - Benchmarks for resource detection speed
- **agent-deployment-benchmark.test.ts** - Benchmarks for agent deployment times
- **monitoring-overhead.test.ts** - Tests for monitoring system overhead
- **scalability.test.ts** - Tests for system scalability limits

### End-to-End Tests (`e2e/`)
- **full-system.test.ts** - Complete system workflow tests
- **stress-scenarios.test.ts** - Stress testing under high load
- **real-world-scenarios.test.ts** - Real-world usage pattern tests

## Test Coverage Goals

- **Unit Test Coverage**: 95%+
- **Integration Test Coverage**: 85%+
- **Performance Benchmarks**: All critical paths
- **Platform Coverage**: Linux, macOS, Windows

## TDD Approach

All tests are written before implementation following Test-Driven Development:
1. Write failing tests that define expected behavior
2. Implement minimal code to make tests pass
3. Refactor while keeping tests green
4. Repeat for each feature

## Running Tests

```bash
# Run all resource manager tests
npm test tests/resource-manager

# Run specific test suites
npm test tests/resource-manager/unit
npm test tests/resource-manager/integration
npm test tests/resource-manager/performance

# Run with coverage
npm test -- --coverage tests/resource-manager

# Run specific test file
npm test tests/resource-manager/unit/resource-detector.test.ts
```