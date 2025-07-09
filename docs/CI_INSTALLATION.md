# CI Installation Guide for claude-flow

This document describes how claude-flow handles dependencies in CI environments to ensure reliable and fast installations across different platforms.

## Overview

claude-flow uses a smart dependency system that:
- Separates critical dependencies from optional ones
- Provides fallbacks for native modules
- Optimizes installation for CI environments
- Supports all major CI platforms

## Dependency Categories

### Critical Dependencies
These are required for claude-flow to function:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `commander` - CLI framework
- `chalk` - Terminal styling
- `express` - Web server
- `ws` - WebSocket support
- `ora` - Spinner/progress indicators
- `inquirer` - Interactive prompts
- `fs-extra` - File system utilities
- `nanoid` - ID generation
- `p-queue` - Promise queue management

### Optional Dependencies
These enhance functionality but have fallbacks:
- `better-sqlite3` - Database support (falls back to in-memory)
- `blessed` - Terminal UI (falls back to mock UI)

## CI Detection

The installation scripts detect CI environments by checking for:
- `CI` environment variable
- `CONTINUOUS_INTEGRATION`
- Platform-specific variables (GitHub Actions, Jenkins, Travis, CircleCI, etc.)

## Installation Process

### 1. Package Installation

```bash
# CI environments should use:
CI=true npm ci

# Or with explicit options:
npm ci --no-optional --no-audit --no-fund
```

### 2. Post-Install Script

The `postinstall.js` script:
- Detects CI environment
- Skips optional component installation in CI
- Validates only after dependencies are installed

### 3. Dependency Verification

Run the CI test to verify installation:

```bash
npm run test:ci
```

This will:
- Check Node.js version compatibility
- Verify all critical dependencies
- Test fallback wrappers
- Validate npm ci compatibility

## Configuration

### .npmrc Settings

The `.npmrc` file includes CI-optimized settings:

```ini
# Skip optional dependencies by default
optional=false

# Longer timeouts for slow CI
fetch-retry-maxtimeout=120000
fetch-retries=5

# Disable progress bars
progress=false

# Legacy peer deps for compatibility
legacy-peer-deps=true
```

### Environment Variables

- `CI=true` - Enable CI mode
- `SKIP_NATIVE_MODULES=true` - Force use of fallbacks
- `DEBUG=true` - Enable verbose logging

## Fallback Systems

### Database Fallback

When `better-sqlite3` is unavailable:
```javascript
import { createDatabase, dbAvailable } from './src/utils/database-wrapper.js';

const db = createDatabase(':memory:');
console.log(`Using ${db.isInMemory ? 'in-memory' : 'SQLite'} database`);
```

### UI Fallback

When `blessed` is unavailable:
```javascript
import { createScreen, blessedAvailable } from './src/utils/blessed-wrapper.js';

const screen = createScreen({ title: 'App' });
console.log(`Using ${screen.isMock ? 'mock' : 'real'} UI`);
```

## Platform-Specific Notes

### GitHub Actions
```yaml
- name: Install dependencies
  run: npm ci
  env:
    CI: true
```

### Docker
```dockerfile
ENV CI=true
RUN npm ci --production
```

### Windows CI
- Native modules may require build tools
- Consider using `SKIP_NATIVE_MODULES=true`

## Troubleshooting

### Missing Dependencies
1. Check Node.js version (requires >=18.0.0, !=22.0.0)
2. Ensure package-lock.json exists
3. Run `npm install` if `npm ci` fails

### Native Module Errors
1. Set `SKIP_NATIVE_MODULES=true`
2. Fallbacks will activate automatically
3. No functionality is lost

### Slow Installation
1. Check network connectivity
2. Consider using a npm cache
3. Use `--prefer-offline` flag

## Testing

Run comprehensive CI tests:

```bash
# Basic CI test
npm run test:ci

# With debug output
DEBUG=true npm run test:ci

# Test specific components
node scripts/test-ci-install.js
```

## Best Practices

1. Always use `npm ci` in CI environments
2. Commit `package-lock.json` to repository
3. Set appropriate timeouts for slow environments
4. Use environment detection for automatic optimization
5. Test with fallbacks enabled to ensure compatibility

## Example CI Configurations

### GitHub Actions
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
```

### GitLab CI
```yaml
test:
  image: node:20
  script:
    - npm ci
    - npm run test:ci
  cache:
    paths:
      - node_modules/
```

### Jenkins
```groovy
pipeline {
  agent any
  environment {
    CI = 'true'
  }
  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Test') {
      steps {
        sh 'npm run test:ci'
      }
    }
  }
}
```

## Maintaining CI Compatibility

When adding new dependencies:
1. Evaluate if it's critical or optional
2. Add to appropriate section in package.json
3. Update fallback wrappers if needed
4. Test in CI environment
5. Document any special requirements

## Support

For CI-specific issues:
1. Check this guide first
2. Run diagnostic scripts
3. Enable debug logging
4. Report issues with full CI logs