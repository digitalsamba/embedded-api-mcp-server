/**
 * Digital Samba MCP Server - STDIO Transport
 * 
 * This module provides the STDIO transport implementation for the Digital Samba MCP Server.
 * It's specifically designed for Claude Desktop integration and other applications that
 * communicate via standard input/output using the JSON-RPC protocol.
 * 
 * @module stdio-transport
 * @author Digital Samba Team
 * @version 1.0.0
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, ServerOptions } from '../index.js';
import logger from '../logger.js';

/**
 * Configuration options specific to STDIO transport
 */
export interface StdioTransportOptions {
  /** API key for Digital Samba API (required for STDIO mode) */
  apiKey: string;
  /** Base URL for Digital Samba API */
  apiUrl?: string;
  /** Additional server options */
  serverOptions?: Partial<ServerOptions>;
}

/**
 * Default configuration for STDIO transport
 * 
 * STDIO mode prioritizes fast startup and minimal overhead, so we disable
 * advanced features that are more suited for long-running HTTP servers.
 */
const DEFAULT_STDIO_OPTIONS: Partial<ServerOptions> = {
  enableSilentMode: true,
  enableConnectionManagement: false,  // Disable for faster startup
  enableTokenManagement: false,       // Disable for faster startup  
  enableResourceOptimization: false,  // Disable for faster startup
  enableCircuitBreaker: false,        // HTTP-focused feature
  enableGracefulDegradation: false,   // HTTP-focused feature
  enableMetrics: false,               // HTTP-focused feature
  enableCache: true,                  // Keep for performance
  cacheTtl: 300000,                   // 5 minutes
  logLevel: 'info'
};

/**
 * Run the Digital Samba MCP Server with STDIO transport
 * 
 * This function sets up the server optimized for STDIO communication,
 * typically used by Claude Desktop and other MCP clients.
 * 
 * @param options - Configuration options for the STDIO transport
 * @returns Promise that resolves when the server is connected
 */
export async function runStdioServer(options: StdioTransportOptions): Promise<void> {
  const {
    apiKey,
    apiUrl = 'https://api.digitalsamba.com/api/v1',
    serverOptions = {}
  } = options;

  // Redirect console output to stderr to avoid interfering with JSON-RPC
  setupConsoleRedirection();

  logger.info('Starting Digital Samba MCP Server (STDIO mode)', {
    apiUrl,
    hasApiKey: !!apiKey
  });

  // Merge STDIO-specific options with provided options
  const mergedOptions: Partial<ServerOptions> = {
    ...DEFAULT_STDIO_OPTIONS,
    ...serverOptions,
    apiKey,
    apiUrl
  };

  // Create server using the main createServer function
  const serverConfig = createServer(mergedOptions);
  const { server } = serverConfig;

  // Create STDIO transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  try {
    await server.connect(transport);
    logger.info('MCP server connected successfully via STDIO transport');
  } catch (error) {
    logger.error('Failed to connect STDIO transport', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Set up console redirection for STDIO mode
 * 
 * In STDIO mode, stdout is used for JSON-RPC communication, so all
 * console output must be redirected to stderr to avoid protocol conflicts.
 */
function setupConsoleRedirection(): void {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    debug: console.debug
  };

  // Redirect all console output to stderr with prefixes
  console.log = (...args: any[]) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
  console.info = (...args: any[]) => process.stderr.write(`[INFO] ${args.join(' ')}\n`);
  console.warn = (...args: any[]) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
  console.debug = (...args: any[]) => process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);
  
  // Keep console.error as it already goes to stderr
  // console.error is not modified
}

/**
 * Validate STDIO transport configuration
 */
export function validateStdioConfig(options: StdioTransportOptions): void {
  if (!options.apiKey) {
    throw new Error('API key is required for STDIO transport');
  }
  
  if (!options.apiUrl) {
    throw new Error('API URL is required for STDIO transport');
  }
  
  logger.debug('STDIO transport configuration validated');
}