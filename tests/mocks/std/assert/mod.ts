// Mock Deno std/assert module for Jest
export function assertEquals(actual: any, expected: any, message?: string) {
  expect(actual).toEqual(expected);
}

export function assertExists(value: any, message?: string) {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
}

export function assertStringIncludes(actual: string, expected: string, message?: string) {
  expect(actual).toContain(expected);
}

export function assertThrows(fn: () => void, expectedError?: any, message?: string) {
  expect(fn).toThrow(expectedError);
}

export function assertRejects(fn: () => Promise<any>, expectedError?: any, message?: string) {
  return expect(fn()).rejects.toThrow(expectedError);
}

export function assert(condition: boolean, message?: string) {
  expect(condition).toBe(true);
}