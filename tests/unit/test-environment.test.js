/**
 * Basic test environment validation
 */

describe('Test Environment', () => {
  test('should have working Jest environment', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have proper Node.js version', () => {
    const version = process.version;
    expect(version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  test('should have test environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.CLAUDE_FLOW_ENV).toBe('test');
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  test('should handle module imports', async () => {
    const path = await import('path');
    expect(typeof path.join).toBe('function');
  });
});