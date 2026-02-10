/**
 * Centralized Logging Utility
 * 
 * Provides type-safe logging that can be disabled in production
 * while maintaining all debugging functionality in development.
 * 
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('Debug message', { data });
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  context?: string;
}

class Logger {
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: unknown, context?: string): void {
    if (this.isDevelopment) {
      const entry: LogEntry = {
        level: 'debug',
        message,
        data,
        timestamp: Date.now(),
        context,
      };
      this.logBuffer.push(entry);
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }
      console.log(`[DEBUG]${context ? ` [${context}]` : ''}`, message, data || '');
    }
  }

  /**
   * Log info messages
   */
  info(message: string, data?: unknown, context?: string): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: Date.now(),
      context,
    };
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
    if (this.isDevelopment) {
      console.info(`[INFO]${context ? ` [${context}]` : ''}`, message, data || '');
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: unknown, context?: string): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: Date.now(),
      context,
    };
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
    console.warn(`[WARN]${context ? ` [${context}]` : ''}`, message, data || '');
  }

  /**
   * Log error messages
   */
  error(message: string, error?: unknown, context?: string): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      timestamp: Date.now(),
      context,
    };
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
    console.error(`[ERROR]${context ? ` [${context}]` : ''}`, message, error || '');
  }

  /**
   * Get recent log entries (for debugging)
   */
  getRecentLogs(level?: LogLevel, limit: number = 50): LogEntry[] {
    let logs = this.logBuffer;
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    return logs.slice(-limit);
  }

  /**
   * Clear log buffer
   */
  clear(): void {
    this.logBuffer = [];
  }

  /**
   * Export logs as JSON (for error reporting)
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogEntry };

