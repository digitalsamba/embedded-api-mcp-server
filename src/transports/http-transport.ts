/**
 * Digital Samba MCP Server - HTTP Transport
 * 
 * This module provides the HTTP transport implementation for the Digital Samba MCP Server.
 * It's designed for web applications, API integrations, and scenarios where full server
 * features like webhooks, metrics, and health checks are needed.
 * 
 * @module http-transport
 * @author Digital Samba Team
 * @version 1.0.0
 */

import { createServer, startServer, ServerOptions } from '../index.js';
import logger from '../logger.js';

/**
 * Configuration options specific to HTTP transport
 */
export interface HttpTransportOptions extends Partial<ServerOptions> {
  /** Port to run the HTTP server on */
  port?: number;
  /** Enable all advanced features by default for HTTP mode */
  enableAdvancedFeatures?: boolean;
}

/**
 * Default configuration for HTTP transport
 * 
 * HTTP mode enables all advanced features since it's designed for
 * production web environments where these features are valuable.
 */
const DEFAULT_HTTP_OPTIONS: Partial<ServerOptions> = {
  enableSilentMode: false,
  enableConnectionManagement: true,    // Enable for production stability
  enableTokenManagement: true,         // Enable for token refresh
  enableResourceOptimization: true,    // Enable for performance
  enableCircuitBreaker: true,          // Enable for resilience
  enableGracefulDegradation: true,     // Enable for fault tolerance
  enableMetrics: true,                 // Enable for monitoring
  enableCache: true,                   // Enable for performance
  cacheTtl: 300000,                    // 5 minutes
  enableRateLimiting: true,            // Enable for protection
  rateLimitRequestsPerMinute: 60,      // Reasonable default
  logLevel: 'info',
  port: 4521
};

/**
 * Run the Digital Samba MCP Server with HTTP transport
 * 
 * This function sets up the server optimized for HTTP communication,
 * with full features enabled for production web environments.
 * 
 * @param options - Configuration options for the HTTP transport
 * @returns Promise that resolves to the HTTP server instance
 */
export async function runHttpServer(options: HttpTransportOptions = {}): Promise<any> {
  const {
    enableAdvancedFeatures = true,
    ...serverOptions
  } = options;

  logger.info('Starting Digital Samba MCP Server (HTTP mode)', {
    port: options.port || DEFAULT_HTTP_OPTIONS.port,
    enableAdvancedFeatures
  });

  // Merge HTTP-specific options with provided options
  const mergedOptions: Partial<ServerOptions> = enableAdvancedFeatures 
    ? { ...DEFAULT_HTTP_OPTIONS, ...serverOptions }
    : { ...serverOptions };

  // Use the main startServer function which handles HTTP transport
  const httpServer = startServer(mergedOptions);
  
  logger.info('HTTP server started successfully');
  return httpServer;
}

/**
 * Create HTTP server configuration without starting it
 * 
 * This is useful for testing or when you need to customize the server
 * setup before starting it.
 * 
 * @param options - Configuration options for the HTTP transport
 * @returns Server configuration object
 */
export function createHttpServerConfig(options: HttpTransportOptions = {}): any {
  const {
    enableAdvancedFeatures = true,
    ...serverOptions
  } = options;

  // Merge HTTP-specific options with provided options
  const mergedOptions: Partial<ServerOptions> = enableAdvancedFeatures 
    ? { ...DEFAULT_HTTP_OPTIONS, ...serverOptions }
    : { ...serverOptions };

  return createServer(mergedOptions);
}

/**
 * Validate HTTP transport configuration
 */
export function validateHttpConfig(options: HttpTransportOptions): void {
  if (options.port && (options.port < 1 || options.port > 65535)) {
    throw new Error('Port must be between 1 and 65535');
  }
  
  if (options.rateLimitRequestsPerMinute && options.rateLimitRequestsPerMinute < 1) {
    throw new Error('Rate limit must be at least 1 request per minute');
  }
  
  logger.debug('HTTP transport configuration validated');
}