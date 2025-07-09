/**
 * Circular Buffer Implementation
 * Efficient fixed-size buffer for resource history tracking
 */

import { CircularBuffer } from '../types';

export class CircularBufferImpl<T> implements CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  public readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Circular buffer capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  get size(): number {
    return this.count;
  }

  push(item: T): void {
    this.buffer[this.tail] = item;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer is full, move head forward
      this.head = (this.head + 1) % this.capacity;
    }

    this.tail = (this.tail + 1) % this.capacity;
  }

  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }

    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  toArray(): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  // Additional utility methods

  /**
   * Get the most recent item
   */
  latest(): T | undefined {
    if (this.count === 0) return undefined;
    return this.get(this.count - 1);
  }

  /**
   * Get the oldest item
   */
  oldest(): T | undefined {
    if (this.count === 0) return undefined;
    return this.get(0);
  }

  /**
   * Iterate over items from oldest to newest
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        yield item;
      }
    }
  }

  /**
   * Filter items in the buffer
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.toArray().filter(predicate);
  }

  /**
   * Map items in the buffer
   */
  map<U>(mapper: (item: T) => U): U[] {
    return this.toArray().map(mapper);
  }

  /**
   * Reduce items in the buffer
   */
  reduce<U>(reducer: (acc: U, item: T) => U, initial: U): U {
    return this.toArray().reduce(reducer, initial);
  }

  /**
   * Find an item in the buffer
   */
  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Check if any item matches the predicate
   */
  some(predicate: (item: T) => boolean): boolean {
    for (const item of this) {
      if (predicate(item)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if all items match the predicate
   */
  every(predicate: (item: T) => boolean): boolean {
    if (this.count === 0) return true;

    for (const item of this) {
      if (!predicate(item)) {
        return false;
      }
    }
    return true;
  }
}

// Factory function
export function createCircularBuffer<T>(capacity: number): CircularBuffer<T> {
  return new CircularBufferImpl<T>(capacity);
}
