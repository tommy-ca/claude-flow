"use strict";
/**
 * Utility for proper error handling in TypeScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorStack = exports.getErrorMessage = exports.isError = exports.AppError = void 0;
exports.handleError = handleError;
const type_guards_js_1 = require("./type-guards.js");
class AppError extends Error {
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
// Re-export from type-guards for backward compatibility
exports.isError = type_guards_js_1.isError;
exports.getErrorMessage = type_guards_js_1.getErrorMessage;
exports.getErrorStack = type_guards_js_1.getErrorStack;
function handleError(error, context) {
    const message = (0, exports.getErrorMessage)(error);
    const stack = (0, exports.getErrorStack)(error);
    console.error(`Error${context ? ` in ${context}` : ''}: ${message}`);
    if (stack && process.env.NODE_ENV === 'development') {
        console.error('Stack trace:', stack);
    }
    process.exit(1);
}
//# sourceMappingURL=error-handler.js.map