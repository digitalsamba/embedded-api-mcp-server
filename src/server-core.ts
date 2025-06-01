/**
 * Digital Samba MCP Server - Shared Core
 * 
 * This module contains the shared server logic that is used by both HTTP and STDIO transports.
 * It provides a unified interface for creating the MCP server with consistent functionality
 * across different transport modes.
 * 
 * @module server-core
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { setupRecordingFunctionality } from './recordings.js';
import { setupWebhookTools } from './webhooks.js';
import WebhookService from './webhooks.js';
import { MemoryCache } from './cache.js';
import logger from './logger.js';
import { ServerOptions } from './index.js';

/**
 * Configuration for creating the shared server core
 */
export interface ServerCoreConfig {
  /** API key for Digital Samba API (required for STDIO mode) */
  apiKey?: string;
  /** Base URL for Digital Samba API */
  apiUrl?: string;
  /** Cache instance to use */
  _cache?: MemoryCache;
  /** Whether to enable webhook functionality */
  enableWebhooks?: boolean;
  /** Webhook secret for verification */
  webhookSecret?: string;
  /** Webhook endpoint path */
  webhookEndpoint?: string;
  /** Server options from the main configuration */
  serverOptions?: Partial<ServerOptions>;
}

/**
 * Create a shared MCP server core with consistent functionality
 * 
 * This function creates the base MCP server and sets up all the core functionality
 * that should be available regardless of transport type (HTTP or STDIO).
 * 
 * @param config - Configuration for the server core
 * @returns The configured MCP server instance
 */
export function createServerCore(config: ServerCoreConfig): McpServer {
  const {
    apiKey,
    apiUrl = 'https://api.digitalsamba.com/api/v1',
    _cache,
    enableWebhooks = false,
    webhookSecret,
    webhookEndpoint = '/webhooks/digitalsamba',
    serverOptions = {}
  } = config;

  logger.info('Creating server core', {
    apiUrl,
    hasApiKey: !!apiKey,
    hasCache: !!_cache,
    enableWebhooks
  });

  // Create the MCP server
  const server = new McpServer({
    name: 'Digital Samba MCP Server',
    version: '1.0.0',
  });

  // Set up core functionality that applies to all transport types
  setupCoreResources(server, apiKey, apiUrl, _cache);
  setupCoreTools(server, apiKey, apiUrl, _cache);
  
  // Set up recording functionality (v1.0 scope - no live recording controls)
  setupRecordingFunctionality(server, apiUrl);

  // Set up webhooks if enabled (mainly for HTTP transport)
  if (enableWebhooks) {
    const webhookService = new WebhookService(server, {
      secret: webhookSecret,
      endpoint: webhookEndpoint
    });
    
    setupWebhookTools(server, webhookService, apiUrl);
  }

  logger.info('Server core created successfully');
  return server;
}

/**
 * Set up core resources that are available in both HTTP and STDIO modes
 */
function setupCoreResources(
  _server: McpServer, 
  apiKey: string | undefined, 
  _apiUrl: string, 
  cache?: MemoryCache
): void {
  // Import the resource setup from the main index file
  // This ensures we use the exact same resource definitions
  
  // For now, we'll import these from the main index.ts
  // In a future refactor, we could extract these to separate modules
  logger.debug('Core resources will be set up by transport-specific implementations');
  
  // Note: The actual resource setup is currently handled by the main index.ts
  // to avoid circular dependencies. In the future, we could extract resources
  // to separate modules (e.g., src/resources/) for better organization.
}

/**
 * Set up core tools that are available in both HTTP and STDIO modes  
 */
function setupCoreTools(
  server: McpServer,
  apiKey: string | undefined,
  apiUrl: string,
  cache?: MemoryCache
): void {
  // Import the tool setup from the main index file
  // This ensures we use the exact same tool definitions
  
  logger.debug('Core tools will be set up by transport-specific implementations');
  
  // Note: The actual tool setup is currently handled by the main index.ts
  // to avoid circular dependencies. In the future, we could extract tools
  // to separate modules (e.g., src/tools/) for better organization.
}

/**
 * Utility function to merge server options with defaults
 */
export function mergeServerOptions(
  provided: Partial<ServerOptions>,
  defaults: Partial<ServerOptions>
): Partial<ServerOptions> {
  return {
    ...defaults,
    ...provided
  };
}

/**
 * Utility function to validate required configuration for different modes
 */
export function validateServerConfig(config: ServerCoreConfig, mode: 'http' | 'stdio'): void {
  if (mode === 'stdio' && !config.apiKey) {
    throw new Error('API key is required for STDIO mode');
  }
  
  if (!config.apiUrl) {
    throw new Error('API URL is required');
  }
  
  logger.debug('Server configuration validated', { mode });
}