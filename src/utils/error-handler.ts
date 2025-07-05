/**
 * Utility for proper error handling in TypeScript
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

export function handleError(error: unknown, context?: string): never {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);
  
  console.error(`Error${context ? ` in ${context}` : ''}: ${message}`);
  if (stack && process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', stack);
  }
  
  process.exit(1);
}