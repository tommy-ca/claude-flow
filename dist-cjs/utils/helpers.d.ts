import { exec } from 'child_process';
/**
 * Executes a command asynchronously and returns the result
 */
export declare const execAsync: typeof exec.__promisify__;
/**
 * Simple calculator function that adds two numbers
 */
export declare function add(a: number, b: number): number;
/**
 * Simple hello world function
 */
export declare function helloWorld(): string;
/**
 * Generates a unique identifier
 */
export declare function generateId(prefix?: string): string;
/**
 * Creates a timeout promise that rejects after the specified time
 */
export declare function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T>;
/**
 * Delays execution for specified milliseconds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Retries a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
}): Promise<T>;
/**
 * Debounces a function
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delayMs: number): (...args: Parameters<T>) => void;
/**
 * Throttles a function
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limitMs: number): (...args: Parameters<T>) => void;
/**
 * Deep clones an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Merges multiple objects deeply
 */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T;
/**
 * Creates a typed event emitter
 */
export declare class TypedEventEmitter<T extends Record<string, unknown>> {
    private listeners;
    on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
    off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
    emit<K extends keyof T>(event: K, data: T[K]): void;
    once<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
    removeAllListeners(event?: keyof T): void;
}
/**
 * Formats bytes to human-readable string
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Parses duration string to milliseconds
 */
export declare function parseDuration(duration: string): number;
/**
 * Ensures a value is an array
 */
export declare function ensureArray<T>(value: T | T[]): T[];
/**
 * Groups an array by a key function
 */
export declare function groupBy<T, K extends string | number | symbol>(items: T[], keyFn: (item: T) => K): Record<K, T[]>;
/**
 * Creates a promise that can be resolved/rejected externally
 */
export declare function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};
/**
 * Safely parses JSON with error handling
 */
export declare function safeParseJSON<T>(json: string, fallback?: T): T | undefined;
/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
    failureCount: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
}
/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
    threshold: number;
    timeout: number;
    resetTimeout: number;
}
/**
 * Circuit breaker interface
 */
export interface CircuitBreaker {
    execute<T>(fn: () => Promise<T>): Promise<T>;
    getState(): CircuitBreakerState;
    reset(): void;
}
/**
 * Simple calculator function with basic operations
 */
export declare function calculator(a: number, b: number, operation: '+' | '-' | '*' | '/' | '^' | '%'): number;
/**
 * Creates a circuit breaker
 */
export declare function circuitBreaker(name: string, options: CircuitBreakerOptions): CircuitBreaker;
/**
 * Greeting function that returns a personalized greeting
 */
export declare function greeting(name?: string, options?: {
    timeOfDay?: boolean;
    formal?: boolean;
    locale?: 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh';
}): string;
//# sourceMappingURL=helpers.d.ts.map