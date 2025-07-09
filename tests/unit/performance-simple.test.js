/**
 * Simplified Performance tests for Claude-Flow
 * Compatible with CI/CD environments
 */

describe('Performance Tests', () => {
  describe('Basic Performance', () => {
    test('should handle JSON operations efficiently', async () => {
      const startTime = Date.now();
      
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      
      const jsonString = JSON.stringify(largeObject);
      const parsed = JSON.parse(jsonString);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
      expect(parsed).toEqual(largeObject);
    });

    test('should handle array operations efficiently', async () => {
      const startTime = Date.now();
      
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const filtered = largeArray.filter(x => x % 2 === 0);
      const mapped = filtered.map(x => x * 2);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete in less than 200ms
      expect(mapped.length).toBe(5000);
    });

    test('should handle async operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(i));
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
      expect(results.length).toBe(100);
    });

    test('should not leak memory during operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        const tempArray = Array.from({ length: 1000 }, (_, j) => j);
        const tempObject = { data: tempArray };
        JSON.stringify(tempObject);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('String Operations', () => {
    test('should handle string concatenation efficiently', () => {
      const startTime = Date.now();
      
      let result = '';
      for (let i = 0; i < 1000; i++) {
        result += `string${i}`;
      }
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).toContain('string0');
      expect(result).toContain('string999');
    });

    test('should handle regex operations efficiently', () => {
      const startTime = Date.now();
      
      const testString = 'test123test456test789test000';
      const regex = /test\d+/g;
      const matches = testString.match(regex);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(matches.length).toBe(4);
    });
  });

  describe('File System Simulation', () => {
    test('should handle simulated file operations efficiently', async () => {
      const startTime = Date.now();
      
      // Simulate file operations
      const files = [];
      for (let i = 0; i < 100; i++) {
        files.push({
          name: `file${i}.txt`,
          content: `content${i}`,
          size: Math.random() * 1000
        });
      }
      
      const filtered = files.filter(f => f.size > 500);
      const sorted = filtered.sort((a, b) => b.size - a.size);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50);
      expect(sorted.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Performance', () => {
    test('should handle environment variable operations efficiently', () => {
      const startTime = Date.now();
      
      // Test environment variable operations
      const envVars = Object.keys(process.env);
      const filtered = envVars.filter(key => key.startsWith('NODE'));
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(Array.isArray(filtered)).toBe(true);
    });

    test('should handle process information efficiently', () => {
      const startTime = Date.now();
      
      const memInfo = process.memoryUsage();
      const platform = process.platform;
      const version = process.version;
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5);
      expect(memInfo).toHaveProperty('heapUsed');
      expect(typeof platform).toBe('string');
      expect(typeof version).toBe('string');
    });
  });
});