/**
 * Circular Buffer Tests
 */

import { CircularBufferImpl, createCircularBuffer } from '../utils/circular-buffer';

describe('CircularBuffer', () => {
  let buffer: CircularBufferImpl<number>;

  beforeEach(() => {
    buffer = new CircularBufferImpl<number>(5);
  });

  describe('constructor', () => {
    it('should create buffer with correct capacity', () => {
      expect(buffer.capacity).toBe(5);
      expect(buffer.size).toBe(0);
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new CircularBufferImpl<number>(0)).toThrow();
      expect(() => new CircularBufferImpl<number>(-1)).toThrow();
    });
  });

  describe('push and get', () => {
    it('should push and get items', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.size).toBe(3);
      expect(buffer.get(0)).toBe(1);
      expect(buffer.get(1)).toBe(2);
      expect(buffer.get(2)).toBe(3);
    });

    it('should handle buffer overflow', () => {
      // Fill buffer to capacity
      for (let i = 1; i <= 5; i++) {
        buffer.push(i);
      }

      expect(buffer.size).toBe(5);
      expect(buffer.isFull()).toBe(true);

      // Add more items (should overwrite oldest)
      buffer.push(6);
      buffer.push(7);

      expect(buffer.size).toBe(5);
      expect(buffer.get(0)).toBe(3); // 1 and 2 were overwritten
      expect(buffer.get(4)).toBe(7); // Latest item
    });

    it('should return undefined for invalid indices', () => {
      buffer.push(1);
      
      expect(buffer.get(-1)).toBeUndefined();
      expect(buffer.get(1)).toBeUndefined();
      expect(buffer.get(100)).toBeUndefined();
    });
  });

  describe('toArray', () => {
    it('should convert to array', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      const array = buffer.toArray();
      expect(array).toEqual([1, 2, 3]);
    });

    it('should handle full buffer', () => {
      for (let i = 1; i <= 7; i++) {
        buffer.push(i);
      }

      const array = buffer.toArray();
      expect(array).toEqual([3, 4, 5, 6, 7]);
    });
  });

  describe('clear', () => {
    it('should clear buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();

      expect(buffer.size).toBe(0);
      expect(buffer.toArray()).toEqual([]);
      expect(buffer.get(0)).toBeUndefined();
    });
  });

  describe('latest and oldest', () => {
    it('should get latest and oldest items', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.latest()).toBe(3);
      expect(buffer.oldest()).toBe(1);
    });

    it('should handle empty buffer', () => {
      expect(buffer.latest()).toBeUndefined();
      expect(buffer.oldest()).toBeUndefined();
    });
  });

  describe('iteration', () => {
    it('should be iterable', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      const items = [];
      for (const item of buffer) {
        items.push(item);
      }

      expect(items).toEqual([1, 2, 3]);
    });
  });

  describe('functional methods', () => {
    beforeEach(() => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
    });

    it('should filter items', () => {
      const filtered = buffer.filter(x => x > 2);
      expect(filtered).toEqual([3, 4]);
    });

    it('should map items', () => {
      const mapped = buffer.map(x => x * 2);
      expect(mapped).toEqual([2, 4, 6, 8]);
    });

    it('should reduce items', () => {
      const sum = buffer.reduce((acc, x) => acc + x, 0);
      expect(sum).toBe(10);
    });

    it('should find items', () => {
      const found = buffer.find(x => x === 3);
      expect(found).toBe(3);

      const notFound = buffer.find(x => x === 10);
      expect(notFound).toBeUndefined();
    });

    it('should check some condition', () => {
      expect(buffer.some(x => x > 3)).toBe(true);
      expect(buffer.some(x => x > 10)).toBe(false);
    });

    it('should check every condition', () => {
      expect(buffer.every(x => x > 0)).toBe(true);
      expect(buffer.every(x => x > 2)).toBe(false);
    });
  });

  describe('factory function', () => {
    it('should create buffer using factory', () => {
      const buffer = createCircularBuffer<string>(3);
      
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual(['a', 'b', 'c']);
    });
  });
});