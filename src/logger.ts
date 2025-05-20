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

import winston from 'winston';

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
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

/**
 * The configured logger instance for use throughout the application
 * 
 * @example
 * import logger from './logger.js';
 * 
 * // Log at different levels
 * logger.debug('Detailed debugging information');
 * logger.info('General operational information');
 * logger.warn('Warning conditions');
 * logger.error('Error conditions', { error: err });
 */
export default logger;