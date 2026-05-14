/**
 * Structured logging utility
 * 
 * Provides consistent logging interface with different levels.
 * In production, logs are structured JSON for easy parsing.
 * In development, logs are human-readable.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    if (this.isDevelopment) {
      return meta 
        ? `[${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`
        : `[${level.toUpperCase()}] ${message}`;
    }

    return JSON.stringify({
      level,
      message,
      meta,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  }

  /**
   * Debug logs - only in development
   */
  debug(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  /**
   * Info logs - general information
   */
  info(message: string, meta?: LogMeta): void {
    console.log(this.formatMessage('info', message, meta));
  }

  /**
   * Warning logs - potential issues
   */
  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  /**
   * Error logs - errors and exceptions
   */
  error(message: string, error?: Error | unknown, meta?: LogMeta): void {
    const errorMeta = {
      ...meta,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    };

    console.error(this.formatMessage('error', message, errorMeta));
  }
}

export const logger = new Logger();
