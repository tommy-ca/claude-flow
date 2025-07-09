/**
 * Type guard utility functions for safe type checking
 */
/**
 * Check if a value is an object (non-null and typeof object)
 */
export declare function isObject(value: unknown): value is Record<string, unknown>;
/**
 * Check if a value is an Error instance or has error-like properties
 */
export declare function isError(value: unknown): value is Error;
/**
 * Check if a value has a message property (error-like)
 */
export declare function hasMessage(value: unknown): value is {
    message: string;
};
/**
 * Check if a value has a stack property (error-like)
 */
export declare function hasStack(value: unknown): value is {
    stack: string;
};
/**
 * Check if a value is an error-like object
 */
export declare function isErrorLike(value: unknown): value is {
    message: string;
    stack?: string;
};
/**
 * Check if a value has a code property
 */
export declare function hasCode(value: unknown): value is {
    code: string | number;
};
/**
 * Check if a value has an agentId property
 */
export declare function hasAgentId(value: unknown): value is {
    agentId: {
        id: string;
    };
};
/**
 * Check if a value has a pid property (process-like)
 */
export declare function hasPid(value: unknown): value is {
    pid: number;
};
/**
 * Safely get error message from unknown value
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Safely get error stack from unknown value
 */
export declare function getErrorStack(error: unknown): string | undefined;
/**
 * Type guard for checking if value is a string
 */
export declare function isString(value: unknown): value is string;
/**
 * Type guard for checking if value is a number
 */
export declare function isNumber(value: unknown): value is number;
/**
 * Type guard for checking if value is a boolean
 */
export declare function isBoolean(value: unknown): value is boolean;
/**
 * Type guard for checking if value is an array
 */
export declare function isArray<T = unknown>(value: unknown): value is T[];
/**
 * Type guard for checking if value is a function
 */
export declare function isFunction(value: unknown): value is Function;
/**
 * Type guard for checking if value is null or undefined
 */
export declare function isNullOrUndefined(value: unknown): value is null | undefined;
/**
 * Type guard for checking if value is defined (not null or undefined)
 */
export declare function isDefined<T>(value: T | null | undefined): value is T;
/**
 * Type guard for agent load update event data
 */
export declare function hasAgentLoad(value: unknown): value is {
    agentId: {
        id: string;
    };
    load: number;
};
/**
 * Type guard for task event data
 */
export declare function hasAgentTask(value: unknown): value is {
    agentId: {
        id: string;
    };
    task: unknown;
};
/**
 * Type guard for work stealing event data
 */
export declare function hasWorkStealingData(value: unknown): value is {
    sourceAgent: {
        id: string;
    };
    targetAgent: {
        id: string;
    };
    taskCount: number;
};
//# sourceMappingURL=type-guards.d.ts.map