/**
 * Logger utility for claude-flow
 * Provides structured logging for the resource management system
 */
export interface LogLevel {
    DEBUG: 0;
    INFO: 1;
    WARN: 2;
    ERROR: 3;
}
export declare const LOG_LEVELS: LogLevel;
declare class Logger {
    private currentLevel;
    private prefix;
    constructor(level?: keyof LogLevel, prefix?: string);
    private formatMessage;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLevel(level: keyof LogLevel): void;
    setPrefix(prefix: string): void;
}
export declare const logger: Logger;
export { Logger };
//# sourceMappingURL=logger.d.ts.map