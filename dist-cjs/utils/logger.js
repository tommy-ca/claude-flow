"use strict";
/**
 * Logger utility for claude-flow
 * Provides structured logging for the resource management system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.logger = exports.LOG_LEVELS = void 0;
exports.LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};
class Logger {
    constructor(level = 'INFO', prefix = 'claude-flow') {
        this.currentLevel = exports.LOG_LEVELS[level];
        this.prefix = prefix;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : '';
        return `[${timestamp}] [${level}] [${this.prefix}] ${message}${formattedArgs}`;
    }
    debug(message, ...args) {
        if (this.currentLevel <= exports.LOG_LEVELS.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.currentLevel <= exports.LOG_LEVELS.INFO) {
            console.info(this.formatMessage('INFO', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.currentLevel <= exports.LOG_LEVELS.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }
    error(message, ...args) {
        if (this.currentLevel <= exports.LOG_LEVELS.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }
    setLevel(level) {
        this.currentLevel = exports.LOG_LEVELS[level];
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
}
exports.Logger = Logger;
// Create default logger instance
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map