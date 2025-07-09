/**
 * Example test suite for JavaScript
 * Demonstrates basic Jest testing without TypeScript or Deno imports
 */

// Import jest from globals for mocking
const { jest } = globalThis;

// Example calculator class to test
class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error("Division by zero");
    }
    return a / b;
  }

  async asyncOperation(value) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return value * 2;
  }
}

describe("Calculator", () => {
  let calculator;

  beforeEach(() => {
    // Setup before each test
    calculator = new Calculator();
  });

  afterEach(() => {
    // Cleanup after each test
    calculator = null;
  });

  describe("add", () => {
    test("should add two positive numbers", () => {
      const result = calculator.add(2, 3);
      expect(result).toBe(5);
    });

    test("should handle negative numbers", () => {
      const result = calculator.add(-5, 3);
      expect(result).toBe(-2);
    });

    test("should handle zero", () => {
      const result = calculator.add(0, 0);
      expect(result).toBe(0);
    });
  });

  describe("subtract", () => {
    test("should subtract two numbers", () => {
      const result = calculator.subtract(10, 4);
      expect(result).toBe(6);
    });

    test("should handle negative results", () => {
      const result = calculator.subtract(3, 5);
      expect(result).toBe(-2);
    });
  });

  describe("multiply", () => {
    test("should multiply two numbers", () => {
      const result = calculator.multiply(4, 5);
      expect(result).toBe(20);
    });

    test("should handle multiplication by zero", () => {
      const result = calculator.multiply(10, 0);
      expect(result).toBe(0);
    });
  });

  describe("divide", () => {
    test("should divide two numbers", () => {
      const result = calculator.divide(10, 2);
      expect(result).toBe(5);
    });

    test("should handle decimal results", () => {
      const result = calculator.divide(7, 2);
      expect(result).toBe(3.5);
    });

    test("should throw error when dividing by zero", () => {
      expect(() => calculator.divide(10, 0)).toThrow("Division by zero");
    });
  });

  describe("asyncOperation", () => {
    test("should double the value asynchronously", async () => {
      const result = await calculator.asyncOperation(5);
      expect(result).toBe(10);
    });

    test("should handle zero", async () => {
      const result = await calculator.asyncOperation(0);
      expect(result).toBe(0);
    });
  });

  describe("instance", () => {
    test("should create a calculator instance", () => {
      expect(calculator).toBeDefined();
      expect(typeof calculator.add).toBe("function");
      expect(typeof calculator.subtract).toBe("function");
      expect(typeof calculator.multiply).toBe("function");
      expect(typeof calculator.divide).toBe("function");
    });
  });
});

// Example of using Jest mocks
describe("Calculator with mocks", () => {
  test("should spy on method calls", () => {
    const calculator = new Calculator();
    const addSpy = jest.spyOn(calculator, "add");

    calculator.add(2, 3);
    calculator.add(4, 5);

    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(addSpy).toHaveBeenCalledWith(2, 3);
    expect(addSpy).toHaveBeenCalledWith(4, 5);

    addSpy.mockRestore();
  });

  test("should mock a method", () => {
    const calculator = new Calculator();
    const multiplyMock = jest.spyOn(calculator, "multiply").mockReturnValue(100);

    const result = calculator.multiply(2, 3);
    expect(result).toBe(100); // Mocked value

    multiplyMock.mockRestore();
    const realResult = calculator.multiply(2, 3);
    expect(realResult).toBe(6); // Real value after restore
  });
});