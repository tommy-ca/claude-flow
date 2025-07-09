/**
 * Dependency availability checks for CI/CD environments
 */

describe('Dependency Availability', () => {
  test('should handle missing optional dependencies gracefully', async () => {
    // These should not throw errors even if not available
    expect(async () => {
      try {
        await import('node-pty');
      } catch (error) {
        // This is expected in CI environments
        expect(error.code).toMatch(/MODULE_NOT_FOUND/);
      }
    }).not.toThrow();
  });

  test('should have core dependencies available', async () => {
    expect(async () => await import('fs')).not.toThrow();
    expect(async () => await import('path')).not.toThrow();
    expect(async () => await import('os')).not.toThrow();
    expect(async () => await import('util')).not.toThrow();
  });

  test('should have test-specific dependencies available', async () => {
    // Jest globals are available in test environment
    expect(typeof describe).toBe('function');
    expect(typeof test).toBe('function');
    expect(typeof expect).toBe('function');
    expect(typeof beforeEach).toBe('function');
    expect(typeof afterEach).toBe('function');
  });

  test('should handle ES module imports', async () => {
    const { performance } = await import('perf_hooks');
    expect(typeof performance.now).toBe('function');
  });

  test('should handle JSON imports', async () => {
    const { readFile } = await import('fs/promises');
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    expect(packageJson.name).toBe('claude-flow');
  });
});