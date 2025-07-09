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

export const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private currentLevel: number;
  private prefix: string;

  constructor(level: keyof LogLevel = 'INFO', prefix: string = 'claude-flow') {
    this.currentLevel = LOG_LEVELS[level];
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs =
      args.length > 0
        ? ' ' +
          args
            .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ')
        : '';

    return `[${timestamp}] [${level}] [${this.prefix}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  setLevel(level: keyof LogLevel): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

// Create default logger instance
export const logger = new Logger();

// Export Logger class for custom instances
export { Logger };
