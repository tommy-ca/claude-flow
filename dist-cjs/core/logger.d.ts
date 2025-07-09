import type { LoggingConfig } from '../utils/types.js';
export interface ILogger {
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, error?: unknown): void;
    configure(config: LoggingConfig): Promise<void>;
}
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
/**
 * Logger implementation with context support
 */
export declare class Logger implements ILogger {
    private static instance;
    private config;
    private context;
    private fileHandle?;
    private currentFileSize;
    private currentFileIndex;
    private isClosing;
    constructor(config?: LoggingConfig, context?: Record<string, unknown>);
    /**
     * Gets the singleton instance of the logger
     */
    static getInstance(config?: LoggingConfig): Logger;
    /**
     * Updates logger configuration
     */
    configure(config: LoggingConfig): Promise<void>;
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, error?: unknown): void;
    /**
     * Creates a child logger with additional context
     */
    child(context: Record<string, unknown>): Logger;
    /**
     * Properly close the logger and release resources
     */
    close(): Promise<void>;
    private log;
    private shouldLog;
    private format;
    private writeToConsole;
    private writeToFile;
    private shouldRotate;
    private rotate;
    private cleanupOldFiles;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map