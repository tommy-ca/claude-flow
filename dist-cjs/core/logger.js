"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
/**
 * Logging infrastructure for Claude-Flow
 */
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const node_buffer_1 = require("node:buffer");
const node_process_1 = __importDefault(require("node:process"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger implementation with context support
 */
class Logger {
    constructor(config = {
        level: 'info',
        format: 'json',
        destination: 'console',
    }, context = {}) {
        this.currentFileSize = 0;
        this.currentFileIndex = 0;
        this.isClosing = false;
        // Validate file path if file destination
        if ((config.destination === 'file' || config.destination === 'both') && !config.filePath) {
            throw new Error('File path required for file logging');
        }
        this.config = config;
        this.context = context;
    }
    /**
     * Gets the singleton instance of the logger
     */
    static getInstance(config) {
        if (!Logger.instance) {
            if (!config) {
                // Use default config if none provided and not in test environment
                const isTestEnv = node_process_1.default.env.CLAUDE_FLOW_ENV === 'test';
                if (isTestEnv) {
                    throw new Error('Logger configuration required for initialization');
                }
                config = {
                    level: 'info',
                    format: 'json',
                    destination: 'console',
                };
            }
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }
    /**
     * Updates logger configuration
     */
    async configure(config) {
        this.config = config;
        // Reset file handle if destination changed
        if (this.fileHandle && config.destination !== 'file' && config.destination !== 'both') {
            await this.fileHandle.close();
            delete this.fileHandle;
        }
    }
    debug(message, meta) {
        this.log(LogLevel.DEBUG, message, meta);
    }
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    error(message, error) {
        this.log(LogLevel.ERROR, message, undefined, error);
    }
    /**
     * Creates a child logger with additional context
     */
    child(context) {
        return new Logger(this.config, { ...this.context, ...context });
    }
    /**
     * Properly close the logger and release resources
     */
    async close() {
        this.isClosing = true;
        if (this.fileHandle) {
            try {
                await this.fileHandle.close();
            }
            catch (error) {
                console.error('Error closing log file handle:', error);
            }
            finally {
                delete this.fileHandle;
            }
        }
    }
    log(level, message, data, error) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel[level],
            message,
            context: this.context,
            data,
            error,
        };
        const formatted = this.format(entry);
        if (this.config.destination === 'console' || this.config.destination === 'both') {
            this.writeToConsole(level, formatted);
        }
        if (this.config.destination === 'file' || this.config.destination === 'both') {
            this.writeToFile(formatted);
        }
    }
    shouldLog(level) {
        const configLevel = LogLevel[this.config.level.toUpperCase()];
        return level >= configLevel;
    }
    format(entry) {
        if (this.config.format === 'json') {
            // Handle error serialization for JSON format
            const jsonEntry = { ...entry };
            if (jsonEntry.error instanceof Error) {
                jsonEntry.error = {
                    name: jsonEntry.error.name,
                    message: jsonEntry.error.message,
                    stack: jsonEntry.error.stack,
                };
            }
            return JSON.stringify(jsonEntry);
        }
        // Text format
        const contextStr = Object.keys(entry.context).length > 0
            ? ` ${JSON.stringify(entry.context)}`
            : '';
        const dataStr = entry.data !== undefined
            ? ` ${JSON.stringify(entry.data)}`
            : '';
        const errorStr = entry.error !== undefined
            ? entry.error instanceof Error
                ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}`
                : ` Error: ${JSON.stringify(entry.error)}`
            : '';
        return `[${entry.timestamp}] ${entry.level} ${entry.message}${contextStr}${dataStr}${errorStr}`;
    }
    writeToConsole(level, message) {
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(message);
                break;
            case LogLevel.INFO:
                console.info(message);
                break;
            case LogLevel.WARN:
                console.warn(message);
                break;
            case LogLevel.ERROR:
                console.error(message);
                break;
        }
    }
    async writeToFile(message) {
        if (!this.config.filePath || this.isClosing) {
            return;
        }
        try {
            // Check if we need to rotate the log file
            if (await this.shouldRotate()) {
                await this.rotate();
            }
            // Open file handle if not already open
            if (!this.fileHandle) {
                this.fileHandle = await node_fs_1.promises.open(this.config.filePath, 'a');
            }
            // Write the message
            const data = node_buffer_1.Buffer.from(message + '\n', 'utf8');
            await this.fileHandle.write(data);
            this.currentFileSize += data.length;
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async shouldRotate() {
        if (!this.config.maxFileSize || !this.config.filePath) {
            return false;
        }
        try {
            const stat = await node_fs_1.promises.stat(this.config.filePath);
            return stat.size >= this.config.maxFileSize;
        }
        catch {
            return false;
        }
    }
    async rotate() {
        if (!this.config.filePath || !this.config.maxFiles) {
            return;
        }
        // Close current file
        if (this.fileHandle) {
            await this.fileHandle.close();
            delete this.fileHandle;
        }
        // Rename current file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.config.filePath}.${timestamp}`;
        await node_fs_1.promises.rename(this.config.filePath, rotatedPath);
        // Clean up old files
        await this.cleanupOldFiles();
        // Reset file size
        this.currentFileSize = 0;
    }
    async cleanupOldFiles() {
        if (!this.config.filePath || !this.config.maxFiles) {
            return;
        }
        const dir = path.dirname(this.config.filePath);
        const baseFileName = path.basename(this.config.filePath);
        try {
            const entries = await node_fs_1.promises.readdir(dir, { withFileTypes: true });
            const files = [];
            for (const entry of entries) {
                if (entry.isFile() && entry.name.startsWith(baseFileName + '.')) {
                    files.push(entry.name);
                }
            }
            // Sort files by timestamp (newest first)
            files.sort().reverse();
            // Remove old files
            const filesToRemove = files.slice(this.config.maxFiles - 1);
            for (const file of filesToRemove) {
                await node_fs_1.promises.unlink(path.join(dir, file));
            }
        }
        catch (error) {
            console.error('Failed to cleanup old log files:', error);
        }
    }
}
exports.Logger = Logger;
// Export singleton instance with lazy initialization
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map