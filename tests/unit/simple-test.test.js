/**
 * Simple test to verify Jest configuration works
 */

describe('Simple Test Suite', () => {
  test('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle promises', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should handle async functions', async () => {
    const asyncFunction = async () => {
      return 'async result';
    };
    
    const result = await asyncFunction();
    expect(result).toBe('async result');
  });

  test('should handle object operations', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });

  test('should handle array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});

describe('Environment Tests', () => {
  test('should have test environment set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.CLAUDE_FLOW_ENV).toBe('test');
  });
});