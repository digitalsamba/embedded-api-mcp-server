/**
 * Logger configuration for Digital Samba MCP Server
 * 
 * This module configures a Winston logger with console and file transports.
 * It provides structured logging with timestamps and supports different log levels
 * that can be configured through the LOG_LEVEL environment variable.
 *
 * @module logger
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js built-in modules
import os from 'os';
import { randomUUID } from 'crypto';

// External dependencies
import winston from 'winston';
const { format, createLogger, transports } = winston;

/**
 * Enhanced metadata structure for logging
 */
export interface LoggingMetadata {
  // System information
  instanceId?: string;
  hostname?: string;
  nodeVersion?: string;
  pid?: number;
  
  // Request context
  requestId?: string;
  sessionId?: string;
  apiKey?: string;
  
  // Operation metadata
  operation?: string;
  component?: string;
  duration?: number;
  statusCode?: number;
  
  // Custom metadata
  [key: string]: any;
}

// Generate an instance ID at startup for correlating logs from the same process
const instanceId = randomUUID();

/**
 * Format function to add standard metadata to all log entries
 */
const addStandardMetadata = format((info) => {
  // Add standard metadata to every log
  return {
    ...info,
    instanceId,
    hostname: os.hostname(),
    nodeVersion: process.version,
    pid: process.pid,
    timestamp: info.timestamp || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

/**
 * Request context storage for correlating logs within a request lifecycle
 */
export class LogContext {
  private static requestContext = new Map<string, LoggingMetadata>();
  
  /**
   * Initialize a new request context with a unique ID
   * @param sessionId Optional session ID
   * @returns Request ID for the new context
   */
  static initRequest(sessionId?: string): string {
    const requestId = randomUUID();
    this.requestContext.set(requestId, {
      requestId,
      sessionId,
      startTime: Date.now()
    });
    return requestId;
  }
  
  /**
   * Get the metadata for a request context
   * @param requestId Request ID
   * @returns Metadata object or empty object if not found
   */
  static getContext(requestId: string): LoggingMetadata {
    return this.requestContext.get(requestId) || {};
  }
  
  /**
   * Update the metadata for a request context
   * @param requestId Request ID
   * @param metadata Metadata to merge with existing context
   */
  static updateContext(requestId: string, metadata: LoggingMetadata): void {
    const existing = this.requestContext.get(requestId) || {};
    this.requestContext.set(requestId, {
      ...existing,
      ...metadata
    });
  }
  
  /**
   * Remove a request context when the request is complete
   * @param requestId Request ID
   */
  static endRequest(requestId: string): void {
    this.requestContext.delete(requestId);
  }
  
  /**
   * Create a logger that includes the request context in every log entry
   * @param requestId Request ID
   * @returns Logger with request context
   */
  static getContextLogger(requestId: string) {
    return {
      debug: (message: string, metadata?: LoggingMetadata) => {
        logger.debug(message, { ...this.getContext(requestId), ...metadata });
      },
      info: (message: string, metadata?: LoggingMetadata) => {
        logger.info(message, { ...this.getContext(requestId), ...metadata });
      },
      warn: (message: string, metadata?: LoggingMetadata) => {
        logger.warn(message, { ...this.getContext(requestId), ...metadata });
      },
      error: (message: string, metadata?: LoggingMetadata) => {
        logger.error(message, { ...this.getContext(requestId), ...metadata });
      }
    };
  }
  
  /**
   * Create a child logger for a specific component
   * @param component Component name
   * @returns Logger with component in metadata
   */
  static getComponentLogger(component: string) {
    return {
      debug: (message: string, metadata?: LoggingMetadata) => {
        logger.debug(message, { component, ...metadata });
      },
      info: (message: string, metadata?: LoggingMetadata) => {
        logger.info(message, { component, ...metadata });
      },
      warn: (message: string, metadata?: LoggingMetadata) => {
        logger.warn(message, { component, ...metadata });
      },
      error: (message: string, metadata?: LoggingMetadata) => {
        logger.error(message, { component, ...metadata });
      }
    };
  }
}

/**
 * Format function to handle Error objects in metadata
 * Extracts relevant properties from Error objects for better serialization
 */
const handleErrorObjects = format((info) => {
  // Handle any Error objects in the metadata
  const processedInfo = { ...info };
  
  Object.keys(processedInfo).forEach(key => {
    if (processedInfo[key] instanceof Error) {
      const error = processedInfo[key];
      processedInfo[key] = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Extract any custom properties from the error
        ...(Object.getOwnPropertyNames(error)
          .filter(prop => !['message', 'stack', 'name'].includes(prop))
          .reduce((obj, prop) => {
            obj[prop] = (error as any)[prop];
            return obj;
          }, {} as Record<string, any>))
      };
    }
  });
  
  return processedInfo;
});

/**
 * Format for console output - more human-readable
 */
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(({ level, message, timestamp, ...metadata }) => {
    // Extract important metadata for console display
    const { requestId, component, operation, duration, statusCode } = metadata;
    
    // Format important metadata into a concise string
    let metadataStr = '';
    if (requestId) metadataStr += `requestId=${requestId} `;
    if (component) metadataStr += `component=${component} `;
    if (operation) metadataStr += `operation=${operation} `;
    if (duration) metadataStr += `duration=${duration}ms `;
    if (statusCode) metadataStr += `status=${statusCode} `;
    
    return `${timestamp} ${level}: ${message} ${metadataStr}`;
  })
);

/**
 * Configure and create the Winston logger instance
 * 
 * The logger uses the following configuration:
 * - Log level: Configured via LOG_LEVEL environment variable (defaults to 'info')
 * - Format: JSON with timestamps for file output, colorized simple format for console
 * - Transports:
 *   - Console: All levels, with colorization
 *   - Error File: Only error level messages in 'error.log'
 *   - Combined File: All levels in 'combined.log'
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    addStandardMetadata(),
    handleErrorObjects(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: consoleFormat
    }),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ],
  exitOnError: false // Don't crash on logger error
});

/**
 * Helper function to create a scoped logger with standard metadata
 * @param component Component name for categorizing logs
 * @returns A logger instance with component metadata
 */
export function createComponentLogger(component: string) {
  return LogContext.getComponentLogger(component);
}

/**
 * Helper function to log performance metrics
 * @param operation Operation name
 * @param startTime Start time in milliseconds
 * @param metadata Additional metadata
 */
export function logPerformance(operation: string, startTime: number, metadata: LoggingMetadata = {}) {
  const duration = Date.now() - startTime;
  logger.debug(`Performance: ${operation}`, {
    operation,
    duration,
    ...metadata
  });
}

/**
 * The configured logger instance for use throughout the application
 * 
 * @example
 * import logger from './logger.js';
 * 
 * // Basic logging
 * logger.debug('Detailed debugging information');
 * logger.info('General operational information');
 * logger.warn('Warning conditions');
 * logger.error('Error conditions', { error: err });
 * 
 * // Structured logging with metadata
 * logger.info('User logged in', { userId: 123, role: 'admin' });
 * 
 * // Component-specific logging
 * import { createComponentLogger } from './logger.js';
 * const dbLogger = createComponentLogger('database');
 * dbLogger.info('Connected to database', { database: 'users' });
 * 
 * // Request-scoped logging
 * import { LogContext } from './logger.js';
 * const requestId = LogContext.initRequest(sessionId);
 * const reqLogger = LogContext.getContextLogger(requestId);
 * reqLogger.info('Processing request', { endpoint: '/api/users' });
 * // Later when done
 * LogContext.endRequest(requestId);
 * 
 * // Performance logging
 * import { logPerformance } from './logger.js';
 * const startTime = Date.now();
 * // ... do operation ...
 * logPerformance('fetch-users', startTime, { count: 10 });
 */
export default logger;