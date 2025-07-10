# Feature System Test Suite

This directory contains the comprehensive test suite for the claude-flow transparent feature system, following Test-Driven Development (TDD) principles.

## Test Structure

```
__tests__/features/
├── core/                    # Core component tests
│   ├── FeatureManager.test.ts      # Feature registration and lifecycle
│   ├── FeatureAdapter.test.ts      # Feature adaptation and context injection
│   ├── TransparencyLayer.test.ts   # Monitoring and debugging capabilities
│   └── Configuration.test.ts       # Configuration management and validation
├── integration/             # Integration tests
│   └── FeatureSystem.integration.test.ts  # Full system integration tests
├── utils/                   # Test utilities
│   └── test-helpers.ts      # Common test utilities and fixtures
├── mocks/                   # Mock implementations
│   └── MockFeatureManager.ts # Mock feature manager for isolated testing
├── jest.config.js           # Jest configuration for feature tests
├── setup.ts                 # Test environment setup
└── README.md               # This file
```

## Running Tests

### Run all feature system tests:
```bash
npm test src/__tests__/features
```

### Run specific test suites:
```bash
# Core component tests only
npm test src/__tests__/features/core

# Integration tests only
npm test src/__tests__/features/integration

# Specific test file
npm test src/__tests__/features/core/FeatureManager.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage src/__tests__/features
```

### Run in watch mode:
```bash
npm test -- --watch src/__tests__/features
```

## Test Categories

### 1. Core Component Tests

#### FeatureManager.test.ts
- Feature registration and validation
- Activation/deactivation lifecycle
- Dependency management
- Error handling and rollback
- Feature discovery and metadata

#### FeatureAdapter.test.ts
- Feature adaptation to application context
- Service injection
- Event communication
- Isolation and security
- Lifecycle management

#### TransparencyLayer.test.ts
- Event tracking and filtering
- Performance monitoring
- Debug information capture
- Real-time monitoring alerts
- Data export and reporting

#### Configuration.test.ts
- Configuration storage and retrieval
- Schema validation
- Default value application
- Configuration persistence
- Change watching

### 2. Integration Tests

#### FeatureSystem.integration.test.ts
- Complete feature lifecycle with all components
- Multi-feature orchestration with dependencies
- Dynamic configuration updates
- Error handling and recovery
- Performance monitoring and alerts

## Test Patterns

### 1. Mocking
```typescript
const mockFeature = createMockFeature({
  id: 'test-feature',
  name: 'Test Feature',
  activate: jest.fn().mockResolvedValue(undefined),
});
```

### 2. Async Testing
```typescript
it('should activate feature asynchronously', async () => {
  await featureManager.activate('test-feature');
  expect(featureManager.isActive('test-feature')).toBe(true);
});
```

### 3. Event Testing
```typescript
const eventPromise = waitForEvent(eventBus, 'feature:activated');
await featureManager.activate('test-feature');
const event = await eventPromise;
expect(event).toMatchObject({ featureId: 'test-feature' });
```

### 4. Performance Testing
```typescript
const result = await transparencyLayer.measurePerformance(
  'test-feature',
  'operation',
  async () => {
    // Perform operation
    return 'result';
  }
);
```

## Custom Matchers

The test suite includes custom Jest matchers for feature testing:

- `toBeActivated()` - Checks if a feature was activated
- `toBeDeactivated()` - Checks if a feature was deactivated
- `toHaveBeenCalledBefore(otherMock)` - Verifies call order
- `toHaveBeenCalledAfter(otherMock)` - Verifies call order

## Test Utilities

### createMockFeature()
Creates a mock feature with default implementations.

### createMockAdapterContext()
Creates a mock adapter context with event bus and logger.

### waitForEvent()
Waits for a specific event to be emitted with timeout.

### createTimingSpy()
Creates a spy that tracks method calls with timing information.

### PerformanceMeasurer
Utility class for measuring performance in tests.

### MemoryTracker
Utility class for tracking memory usage in tests.

## Coverage Requirements

The feature system tests aim for high coverage:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## TDD Workflow

1. **Write failing tests first** - All tests are written before implementation
2. **Run tests to confirm they fail** - Ensures tests are actually testing something
3. **Implement minimal code to pass** - Write just enough code to make tests pass
4. **Refactor** - Improve code while keeping tests green
5. **Repeat** - Continue cycle for new features

## Debugging Tests

### Enable verbose output:
```bash
npm test -- --verbose src/__tests__/features
```

### Run single test:
```bash
npm test -- --testNamePattern="should register a new feature"
```

### Debug in VS Code:
Add breakpoints and use the Jest debug configuration.

## Contributing

When adding new tests:
1. Follow the existing structure and patterns
2. Write descriptive test names that explain the expected behavior
3. Use the provided test utilities and helpers
4. Ensure tests are isolated and don't depend on external state
5. Clean up resources in afterEach/afterAll hooks