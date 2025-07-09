# PR #194 - Fix NPM Dependency Installation Issues in CI

## Summary

This PR fixes npm dependency installation issues in CI environments by implementing a robust fallback system and improving the installation process to handle various CI platforms and edge cases.

## Changes Made

### 1. Package.json Improvements
- **Moved native dependencies to `optionalDependencies`**:
  - `better-sqlite3` - Now optional with in-memory fallback
  - `blessed` - Now optional with mock UI fallback
- **Updated scripts**:
  - Split `postinstall` and `install:ci` for better control
  - Updated test:ci to use ES module test script

### 2. Installation Scripts

#### `scripts/postinstall.js` (Updated)
- Converted to ES modules
- Detects CI environment comprehensively
- Skips dependency verification in CI (deferred to test phase)
- Handles fresh installs vs updates gracefully

#### `scripts/install-ci.js` (Rewritten)
- Comprehensive CI platform detection
- Better error handling with fallback to `npm install`
- Detailed environment reporting
- Validates Node.js version requirements
- Checks for both critical and optional dependencies

#### `scripts/test-ci-deps.js` (New)
- ES module version of dependency tester
- Handles MCP SDK's unique export structure
- Tests fallback wrappers
- Provides clear pass/fail status

### 3. Fallback Wrappers

#### `src/utils/database-wrapper.js` (New)
- Provides seamless fallback when better-sqlite3 unavailable
- In-memory database implementation for CI
- Full API compatibility with better-sqlite3
- Async loading with proper error handling

#### `src/utils/blessed-wrapper.js` (New)
- Mock UI implementation for CI environments
- Maintains API compatibility with blessed
- Allows UI code to run in headless environments
- Supports all common blessed components

### 4. Configuration

#### `.npmrc` (Enhanced)
- CI-optimized settings
- Disabled optional dependencies by default
- Increased timeouts for slow CI environments
- Legacy peer deps support for compatibility
- Disabled progress bars for cleaner logs

### 5. Documentation

#### `docs/CI_INSTALLATION.md` (New)
- Comprehensive CI installation guide
- Platform-specific configurations
- Troubleshooting section
- Best practices and examples

## Benefits

1. **Faster CI Builds**: Optional dependencies skipped in CI
2. **Better Compatibility**: Works across all major CI platforms
3. **Robust Fallbacks**: Application works even without native modules
4. **Clear Diagnostics**: Better error messages and test output
5. **Future-Proof**: Easy to add new optional dependencies

## Testing

The changes have been tested with:
- Fresh installations (`rm -rf node_modules && npm install`)
- CI mode installations (`CI=true npm ci`)
- Dependency verification (`npm run test:ci`)
- Multiple Node.js versions (18.x, 20.x, 22.x)

## Migration Notes

For existing CI pipelines:
1. No changes required - existing setups will continue to work
2. For optimal performance, ensure `CI=true` is set
3. Run `npm run test:ci` to verify installation

## Example CI Usage

```bash
# GitHub Actions, Jenkins, etc.
CI=true npm ci
npm run test:ci
npm test
```

## Files Changed

- `package.json` - Dependency restructuring and script updates
- `scripts/postinstall.js` - ES module conversion and CI detection
- `scripts/install-ci.js` - Complete rewrite with better error handling
- `scripts/test-ci-deps.js` - New ES module test script
- `src/utils/database-wrapper.js` - New database fallback system
- `src/utils/blessed-wrapper.js` - New UI fallback system
- `.npmrc` - Enhanced CI configuration
- `docs/CI_INSTALLATION.md` - New comprehensive guide

## Backward Compatibility

All changes are backward compatible. Existing installations and CI pipelines will continue to work without modifications.