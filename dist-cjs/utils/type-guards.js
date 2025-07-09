"use strict";
/**
 * Type guard utility functions for safe type checking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = isObject;
exports.isError = isError;
exports.hasMessage = hasMessage;
exports.hasStack = hasStack;
exports.isErrorLike = isErrorLike;
exports.hasCode = hasCode;
exports.hasAgentId = hasAgentId;
exports.hasPid = hasPid;
exports.getErrorMessage = getErrorMessage;
exports.getErrorStack = getErrorStack;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isBoolean = isBoolean;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isNullOrUndefined = isNullOrUndefined;
exports.isDefined = isDefined;
exports.hasAgentLoad = hasAgentLoad;
exports.hasAgentTask = hasAgentTask;
exports.hasWorkStealingData = hasWorkStealingData;
/**
 * Check if a value is an object (non-null and typeof object)
 */
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
/**
 * Check if a value is an Error instance or has error-like properties
 */
function isError(value) {
    return value instanceof Error;
}
/**
 * Check if a value has a message property (error-like)
 */
function hasMessage(value) {
    return isObject(value) && 'message' in value && typeof value.message === 'string';
}
/**
 * Check if a value has a stack property (error-like)
 */
function hasStack(value) {
    return isObject(value) && 'stack' in value && typeof value.stack === 'string';
}
/**
 * Check if a value is an error-like object
 */
function isErrorLike(value) {
    return hasMessage(value);
}
/**
 * Check if a value has a code property
 */
function hasCode(value) {
    return isObject(value) && 'code' in value &&
        (typeof value.code === 'string' || typeof value.code === 'number');
}
/**
 * Check if a value has an agentId property
 */
function hasAgentId(value) {
    return isObject(value) &&
        'agentId' in value &&
        isObject(value.agentId) &&
        'id' in value.agentId &&
        typeof value.agentId.id === 'string';
}
/**
 * Check if a value has a pid property (process-like)
 */
function hasPid(value) {
    return isObject(value) && 'pid' in value && typeof value.pid === 'number';
}
/**
 * Safely get error message from unknown value
 */
function getErrorMessage(error) {
    if (typeof error === 'string') {
        return error;
    }
    if (isError(error)) {
        return error.message;
    }
    if (hasMessage(error)) {
        return error.message;
    }
    return String(error);
}
/**
 * Safely get error stack from unknown value
 */
function getErrorStack(error) {
    if (isError(error)) {
        return error.stack;
    }
    if (hasStack(error)) {
        return error.stack;
    }
    return undefined;
}
/**
 * Type guard for checking if value is a string
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 * Type guard for checking if value is a number
 */
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
/**
 * Type guard for checking if value is a boolean
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 * Type guard for checking if value is an array
 */
function isArray(value) {
    return Array.isArray(value);
}
/**
 * Type guard for checking if value is a function
 */
function isFunction(value) {
    return typeof value === 'function';
}
/**
 * Type guard for checking if value is null or undefined
 */
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
/**
 * Type guard for checking if value is defined (not null or undefined)
 */
function isDefined(value) {
    return value !== null && value !== undefined;
}
/**
 * Type guard for agent load update event data
 */
function hasAgentLoad(value) {
    return isObject(value) &&
        'agentId' in value &&
        isObject(value.agentId) &&
        'id' in value.agentId &&
        typeof value.agentId.id === 'string' &&
        'load' in value &&
        typeof value.load === 'number';
}
/**
 * Type guard for task event data
 */
function hasAgentTask(value) {
    return isObject(value) &&
        'agentId' in value &&
        isObject(value.agentId) &&
        'id' in value.agentId &&
        typeof value.agentId.id === 'string' &&
        'task' in value;
}
/**
 * Type guard for work stealing event data
 */
function hasWorkStealingData(value) {
    return isObject(value) &&
        'sourceAgent' in value &&
        isObject(value.sourceAgent) &&
        'id' in value.sourceAgent &&
        typeof value.sourceAgent.id === 'string' &&
        'targetAgent' in value &&
        isObject(value.targetAgent) &&
        'id' in value.targetAgent &&
        typeof value.targetAgent.id === 'string' &&
        'taskCount' in value &&
        typeof value.taskCount === 'number';
}
//# sourceMappingURL=type-guards.js.map