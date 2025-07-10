# Claude Flow E2E Testing Suite

This directory contains comprehensive End-to-End (E2E) tests for claude-flow, ensuring all features work transparently and correctly when deployed via NPX.

## 🎯 Test Coverage

### 1. **Feature Discovery Tests** (`features/discovery/`)
- Tests ability to discover and list available features
- Validates feature metadata and descriptions
- Ensures NPX deployment shows all features correctly
- Tests search and filtering capabilities

### 2. **Configuration Persistence Tests** (`features/configuration/`)
- Validates configuration storage and retrieval
- Tests persistence across sessions
- Verifies import/export functionality
- Ensures environment variable overrides work

### 3. **Transparency Verification Tests** (`features/transparency/`)
- Confirms no hidden behavior or telemetry
- Validates all file operations are visible
- Ensures no unexpected network calls
- Tests command output clarity

### 4. **Performance Benchmarks** (`features/performance/`)
- Measures startup time (cold vs warm)
- Benchmarks core command performance
- Tests concurrent operation handling
- Monitors memory usage

### 5. **User Workflow Tests** (`features/workflows/`)
- New user onboarding flow
- Developer project setup
- CI/CD integration scenarios
- Team collaboration workflows
- Migration from older versions
- Troubleshooting scenarios

### 6. **Integration Tests** (`features/integration/`)
- Runs all test suites together
- Generates comprehensive reports
- Validates cross-feature interactions

## 🚀 Running Tests

### Quick Smoke Test
```bash
./docker-test/run-e2e-tests.sh quick
```

### Full Test Suite
```bash
./docker-test/run-e2e-tests.sh
```

### Performance Benchmarks Only
```bash
./docker-test/run-e2e-tests.sh performance
```

### Integration Tests Only
```bash
./docker-test/run-e2e-tests.sh integration
```

### With Docker Compose Directly
```bash
# Run all tests
docker-compose -f docker-test/docker-compose.test.yml up

# Run specific test
docker-compose -f docker-test/docker-compose.test.yml run feature-discovery

# Run with custom environment
docker-compose -f docker-test/docker-compose.test.yml run -e TEST_MODE=debug integration-runner
```

## 🏗️ Test Architecture

### Multi-Stage Dockerfile
The `Dockerfile.test` uses multiple stages for different test scenarios:

1. **test-base**: Base environment with all dependencies
2. **feature-test**: Full feature testing environment
3. **npx-test**: Simulates NPX deployment
4. **integration-test**: Runs integration test suite
5. **benchmark**: Performance testing environment
6. **multiplatform-test**: Cross-platform validation

### Docker Compose Services
- **test-orchestrator**: Main test coordinator
- **npx-test**: NPX deployment simulation
- **feature-discovery**: Feature discovery tests
- **config-test**: Configuration persistence tests
- **transparency-test**: Transparency verification
- **benchmark**: Performance benchmarks
- **platform-amd64/arm64**: Platform-specific tests
- **workflow-test**: User workflow scenarios
- **integration-runner**: Full integration suite
- **redis/postgres**: Test dependencies
- **report-generator**: Test report generation

## 📊 Test Reports

Reports are generated in multiple formats:

### JSON Report
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": {
    "node": "v20.10.0",
    "platform": "linux",
    "arch": "x64"
  },
  "results": {
    "total": 45,
    "passed": 43,
    "failed": 1,
    "skipped": 1
  }
}
```

### HTML Report
Interactive HTML report with:
- Test summary and statistics
- Detailed results for each test
- Environment information
- Visual status indicators

### JUnit XML
Compatible with CI systems:
```xml
<testsuites name="Claude Flow Integration Tests">
  <testsuite name="Feature Discovery">
    <testcase name="Feature List" time="0.234"/>
  </testsuite>
</testsuites>
```

## 🔧 Writing New Tests

### Test Structure
```javascript
class MyFeatureTest {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runCommand(command) {
    // Execute command and return results
  }

  async testSpecificFeature() {
    // Test implementation
    assert(condition, 'Error message');
    this.results.push({ test: 'name', status: 'PASS' });
  }

  async runAllTests() {
    // Run all test methods
    // Handle errors
    // Print summary
  }
}
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test artifacts
3. **Assertions**: Use clear, descriptive assertions
4. **Reporting**: Generate detailed reports
5. **Performance**: Track execution time

## 🐛 Debugging Tests

### Enable Debug Mode
```bash
export CLAUDE_FLOW_DEBUG=1
export CLAUDE_FLOW_VERBOSE=1
./docker-test/run-e2e-tests.sh
```

### Run Single Test
```bash
docker-compose -f docker-test/docker-compose.test.yml run --rm feature-discovery
```

### Interactive Debugging
```bash
docker-compose -f docker-test/docker-compose.test.yml run --rm --entrypoint /bin/bash integration-test
```

### View Logs
```bash
docker-compose -f docker-test/docker-compose.test.yml logs -f
```

## 🚦 CI/CD Integration

### GitHub Actions
The `.github/workflows/e2e-tests.yml` workflow:
- Runs on push, PR, and schedule
- Tests multiple platforms
- Generates and publishes reports
- Uploads results to GitHub Pages

### Running Locally
```bash
# Simulate CI environment
CI=true ./docker-test/run-e2e-tests.sh
```

## 📈 Performance Targets

| Operation | Target | Critical |
|-----------|--------|----------|
| Version Check | 50ms | 100ms |
| Feature List | 100ms | 200ms |
| Config Get | 75ms | 150ms |
| Feature Enable | 150ms | 300ms |
| NPX Startup | 500ms | 1000ms |

## 🤝 Contributing

1. Add tests for new features in appropriate category
2. Ensure tests pass locally before submitting PR
3. Include performance benchmarks for new operations
4. Update this README with new test documentation

## 📄 License

Same as claude-flow main project.