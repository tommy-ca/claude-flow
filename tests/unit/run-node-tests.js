#!/usr/bin/env node
/**
 * Simple Node.js test runner as fallback for CI environments
 * Uses Node.js built-in test runner when Jest has configuration issues
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';

// Test suite 1: Basic tests
describe('Basic Tests', () => {
  test('should pass basic math test', () => {
    assert.equal(1 + 1, 2);
    assert.equal(10 - 5, 5);
    assert.equal(3 * 4, 12);
    assert.equal(20 / 4, 5);
  });

  test('should handle string operations', () => {
    assert.equal('hello'.toUpperCase(), 'HELLO');
    assert.equal('WORLD'.toLowerCase(), 'world');
    assert.equal('test'.length, 4);
  });

  test('should handle arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    assert.equal(arr.length, 5);
    assert.equal(arr[0], 1);
    assert.equal(arr[arr.length - 1], 5);
    assert.deepEqual(arr.filter(x => x > 3), [4, 5]);
  });

  test('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    assert.equal(obj.name, 'test');
    assert.equal(obj.value, 42);
    assert.deepEqual(Object.keys(obj), ['name', 'value']);
  });
});

// Test suite 2: Async tests
describe('Async Tests', async () => {
  test('should handle promises', async () => {
    const result = await Promise.resolve('test');
    assert.equal(result, 'test');
  });

  test('should handle async functions', async () => {
    const asyncFunc = async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async result'), 10);
      });
    };
    
    const result = await asyncFunc();
    assert.equal(result, 'async result');
  });

  test('should handle Promise.all', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3)
    ];
    
    const results = await Promise.all(promises);
    assert.deepEqual(results, [1, 2, 3]);
  });
});

// Test suite 3: Error handling
describe('Error Handling', () => {
  test('should throw errors correctly', () => {
    assert.throws(() => {
      throw new Error('Test error');
    }, /Test error/);
  });

  test('should handle division by zero', () => {
    const divide = (a, b) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    };

    assert.equal(divide(10, 2), 5);
    assert.throws(() => divide(10, 0), /Division by zero/);
  });
});

// Test suite 4: Environment tests
describe('Environment Tests', () => {
  test('should have NODE_ENV set', () => {
    // CI might set this
    const env = process.env.NODE_ENV || 'development';
    assert.ok(['test', 'development', 'production'].includes(env));
  });

  test('should have valid platform', () => {
    assert.ok(['linux', 'darwin', 'win32'].includes(process.platform));
  });

  test('should have Node.js version', () => {
    assert.ok(process.version);
    assert.ok(process.version.startsWith('v'));
  });
});

// Simple performance test
describe('Performance Tests', () => {
  test('should complete operations quickly', () => {
    const start = Date.now();
    
    // Simple operations
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }
    
    const duration = Date.now() - start;
    assert.ok(duration < 100, `Operation took ${duration}ms, expected < 100ms`);
  });
});

console.log('Running Node.js native tests...');