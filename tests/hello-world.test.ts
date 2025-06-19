import { describe, test, expect, vi } from 'vitest';
import { GreetingService } from '../src/hello-world/greeting-service';

describe('GreetingService', () => {
  describe('getMessage', () => {
    test('should return "Hello, World!"', () => {
      const service = new GreetingService();
      expect(service.getMessage()).toBe('Hello, World!');
    });

    test('should return consistent message', () => {
      const service = new GreetingService();
      const message1 = service.getMessage();
      const message2 = service.getMessage();
      expect(message1).toBe(message2);
    });
  });

  describe('displayGreeting', () => {
    test('should output greeting to console', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new GreetingService();
      
      service.displayGreeting();
      
      expect(consoleSpy).toHaveBeenCalledWith('Hello, World!');
      consoleSpy.mockRestore();
    });

    test('should handle output errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Output failed');
      });
      const errorSpy = vi.spyOn(console, 'error');
      
      const service = new GreetingService();
      expect(() => service.displayGreeting()).not.toThrow();
      
      expect(errorSpy).toHaveBeenCalledWith('Failed to display greeting:', expect.any(Error));
      
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});