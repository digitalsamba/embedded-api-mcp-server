// Node.js built-in modules
import { randomUUID } from 'crypto';
import { createServer as createHttpServer } from 'http';
import { config as loadEnv } from 'dotenv';

// Check if we're in MCP JSON-RPC mode (used by Claude Desktop)
const isMcpJsonRpcMode = process.env.MCP_JSON_RPC_MODE === 'true';

// If in MCP mode, we need to be very careful about console output
// as it would interfere with the JSON-RPC protocol
if (isMcpJsonRpcMode) {
  // In MCP mode, redirect all stdout console outputs to stderr
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn
  };
  
  // Only output errors and warnings to stderr, suppress other logs
  console.log = () => {};
  console.info = () => {};
  // Keep console.error and console.warn as they go to stderr
}

// If NO_CONSOLE_OUTPUT is set, completely suppress console output
if (process.env.NO_CONSOLE_OUTPUT === 'true') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Load environment variables from .env file
loadEnv();

// External dependencies
import express from 'express';
import { z } from 'zod';

// MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Local modules
import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';
import { createConnectionManager } from './connection-manager.js';
import { createTokenManager } from './token-manager.js';
import { createResourceOptimizer } from './resource-optimizer.js';
import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';
import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';
import ResilientApiClient from './digital-samba-api-resilient.js';
import { MemoryCache } from './cache.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import metricsRegistry, { initializeMetrics } from './metrics.js';
import { createApiKeyRateLimiter } from './rate-limiter.js';
import { setupRecordingFunctionality } from './recordings.js';
import WebhookService, { setupWebhookTools } from './webhooks.js';
import gracefulDegradation, { ServiceHealthStatus } from './graceful-degradation.js';
import AnalyticsResource from './analytics.js';
import { setupSessionTools } from './sessions.js';

// Import modular resources and tools
import { registerAnalyticsResources, handleAnalyticsResource } from './resources/analytics/index.js';
import { registerAnalyticsTools, executeAnalyticsTool } from './tools/analytics-tools/index.js';
import { registerSessionTools, executeSessionTool } from './tools/session-management/index.js';
import { registerRoomResources, handleRoomResource } from './resources/rooms/index.js';
import { registerRoomTools, executeRoomTool } from './tools/room-management/index.js';
import { registerSessionResources, handleSessionResource } from './resources/sessions/index.js';
import { registerExportResources, ExportResources } from './resources/exports/index.js';
import { registerLiveSessionTools, executeLiveSessionTool } from './tools/live-session-controls/index.js';
import { registerCommunicationTools, executeCommunicationTool } from './tools/communication-management/index.js';
import { registerPollTools, executePollTool } from './tools/poll-management/index.js';

// Type definitions for server options
export interface ServerOptions {
  port?: number;
  apiUrl?: string;
  webhookSecret?: string;
  webhookEndpoint?: string;
  publicUrl?: string;
  enableRateLimiting?: boolean;
  rateLimitRequestsPerMinute?: number;
  enableCache?: boolean;
  cacheTtl?: number;
  enableConnectionManagement?: boolean;
  enableTokenManagement?: boolean;
  enableResourceOptimization?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreakerFailureThreshold?: number;
  circuitBreakerResetTimeout?: number;
  enableGracefulDegradation?: boolean;
  gracefulDegradationMaxRetries?: number;
  gracefulDegradationInitialDelay?: number;
  connectionPoolSize?: number;
  enableMetrics?: boolean;
  metricsEndpoint?: string;
  metricsPrefix?: string;
  collectDefaultMetrics?: boolean;
  enableSilentMode?: boolean; // Option for MCP mode
  debugTimeouts?: boolean; // Enable timeout debugging
  debugInitialization?: boolean; // Enable initialization debugging
  initialRequestTimeout?: number; // Override initial request timeout
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'silly'; // Control log level
  // Direct options for testing/debugging
  apiKey?: string; // Direct API key for testing
}

// Create and configure the MCP server
export function createServer(options?: ServerOptions) {
  // Configure environment
  let PORT = 4521; // Uncommon port to avoid conflicts
  if (options?.port !== undefined) {
    PORT = options.port;
  } else if (process.env.PORT) {
    PORT = parseInt(process.env.PORT as string);
  }
  const API_URL = options?.apiUrl || process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
  const WEBHOOK_SECRET = options?.webhookSecret || process.env.WEBHOOK_SECRET;
  const WEBHOOK_ENDPOINT = options?.webhookEndpoint || process.env.WEBHOOK_ENDPOINT || '/webhooks/digitalsamba';
  const PUBLIC_URL = options?.publicUrl || process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  const ENABLE_RATE_LIMITING = options?.enableRateLimiting !== undefined ? options.enableRateLimiting : process.env.ENABLE_RATE_LIMITING === 'true';
  const RATE_LIMIT_REQUESTS_PER_MINUTE = options?.rateLimitRequestsPerMinute || (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60);
  const ENABLE_CACHE = options?.enableCache !== undefined ? options.enableCache : process.env.ENABLE_CACHE === 'true';
  const CACHE_TTL = options?.cacheTtl || (process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 5 * 60 * 1000); // 5 minutes default
  const ENABLE_CONNECTION_MANAGEMENT = options?.enableConnectionManagement !== undefined ? options.enableConnectionManagement : process.env.ENABLE_CONNECTION_MANAGEMENT === 'true';
  const ENABLE_TOKEN_MANAGEMENT = options?.enableTokenManagement !== undefined ? options.enableTokenManagement : process.env.ENABLE_TOKEN_MANAGEMENT === 'true';
  const ENABLE_RESOURCE_OPTIMIZATION = options?.enableResourceOptimization !== undefined ? options.enableResourceOptimization : process.env.ENABLE_RESOURCE_OPTIMIZATION === 'true';
  const ENABLE_CIRCUIT_BREAKER = options?.enableCircuitBreaker !== undefined ? options.enableCircuitBreaker : process.env.ENABLE_CIRCUIT_BREAKER === 'true';
  const CIRCUIT_BREAKER_FAILURE_THRESHOLD = options?.circuitBreakerFailureThreshold || (process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD ? parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) : 5);
  const CIRCUIT_BREAKER_RESET_TIMEOUT = options?.circuitBreakerResetTimeout || (process.env.CIRCUIT_BREAKER_RESET_TIMEOUT ? parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) : 30000);
  const ENABLE_GRACEFUL_DEGRADATION = options?.enableGracefulDegradation !== undefined ? options.enableGracefulDegradation : process.env.ENABLE_GRACEFUL_DEGRADATION === 'true';
  const GRACEFUL_DEGRADATION_MAX_RETRIES = options?.gracefulDegradationMaxRetries || (process.env.GRACEFUL_DEGRADATION_MAX_RETRIES ? parseInt(process.env.GRACEFUL_DEGRADATION_MAX_RETRIES) : 3);
  const GRACEFUL_DEGRADATION_INITIAL_DELAY = options?.gracefulDegradationInitialDelay || (process.env.GRACEFUL_DEGRADATION_INITIAL_DELAY ? parseInt(process.env.GRACEFUL_DEGRADATION_INITIAL_DELAY) : 1000);
  const CONNECTION_POOL_SIZE = options?.connectionPoolSize || (process.env.CONNECTION_POOL_SIZE ? parseInt(process.env.CONNECTION_POOL_SIZE) : 5);
  const ENABLE_METRICS = options?.enableMetrics !== undefined ? options.enableMetrics : process.env.ENABLE_METRICS === 'true';
  const METRICS_ENDPOINT = options?.metricsEndpoint || process.env.METRICS_ENDPOINT || '/metrics';
  const METRICS_PREFIX = options?.metricsPrefix || process.env.METRICS_PREFIX || 'digital_samba_mcp_';
  const COLLECT_DEFAULT_METRICS = options?.collectDefaultMetrics !== undefined ? options.collectDefaultMetrics : process.env.COLLECT_DEFAULT_METRICS === 'true';

  // Create the MCP server
  const server = new McpServer({
    name: 'Digital Samba MCP Server',
    version: '0.1.0',
  });
  
  // Initialize cache if enabled
  let apiCache: MemoryCache | undefined;
  if (ENABLE_CACHE) {
    logger.info('Initializing API response cache', { cacheTtl: CACHE_TTL });
    apiCache = new MemoryCache({
      ttl: CACHE_TTL,
      maxItems: 1000,
      useEtag: true
    });
  }

  // Create webhook service
  const webhookService = new WebhookService(server, {
    secret: WEBHOOK_SECRET,
    endpoint: WEBHOOK_ENDPOINT
  });

  // Set up webhook tools
  setupWebhookTools(server, webhookService, API_URL);
  
  // Set up recording functionality
  setupRecordingFunctionality(server, API_URL);
  
  // Note: Session tools are now registered through the modular system below
  // setupSessionTools(server, API_URL) - removed to avoid duplicate registration

  // -------------------------------------------------------------------
  // Analytics Resources (Modular)
  // -------------------------------------------------------------------

  // Register analytics resources using the modular approach
  const analyticsResources = registerAnalyticsResources(new DigitalSambaApiClient(undefined, API_URL, apiCache));
  
  // Register each analytics resource with the server
  analyticsResources.forEach(resource => {
    server.resource(
      resource.name,
      new ResourceTemplate(resource.uri, { list: undefined }),
      async (uri, params, request) => {
        logger.info(`Handling analytics resource: ${resource.name}`);
        
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
        }
        
        const client = new DigitalSambaApiClient(undefined, API_URL, apiCache);
        
        try {
          // Use the modular handler
          const data = await handleAnalyticsResource(uri.href, client);
          
          // Format the response based on the resource type
          if (resource.name === 'analytics-participants') {
            const contents = data.map(participant => ({
              uri: `digitalsamba://analytics/participants/${participant.participant_id}`,
              text: JSON.stringify(participant, null, 2),
            }));
            return { contents };
          } else if (resource.name === 'analytics-rooms') {
            const contents = data.map(room => ({
              uri: `digitalsamba://analytics/rooms/${room.room_id}`,
              text: JSON.stringify(room, null, 2),
            }));
            return { contents };
          } else {
            // For single resources like usage and team
            return {
              contents: [{
                uri: uri.href,
                text: JSON.stringify(data, null, 2),
              }]
            };
          }
        } catch (error) {
          logger.error(`Error in analytics resource ${resource.name}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          throw error;
        }
      }
    );
  });

  // -------------------------------------------------------------------
  // Room Resources (Modular)
  // -------------------------------------------------------------------

  // Register room resources using the modular approach
  const roomResources = registerRoomResources();
  
  // Register each room resource with the server
  roomResources.forEach(resource => {
    server.resource(
      resource.name,
      new ResourceTemplate(resource.uri, { list: undefined }),
      async (uri, params, request) => {
        logger.info(`Handling room resource: ${resource.name}`);
        
        try {
          // Use the modular handler with all the configuration options
          const result = await handleRoomResource(
            uri.href,
            params,
            request,
            {
              apiUrl: API_URL,
              apiKey: options?.apiKey,
              apiCache,
              enableConnectionManagement: ENABLE_CONNECTION_MANAGEMENT,
              enableTokenManagement: ENABLE_TOKEN_MANAGEMENT,
              enableResourceOptimization: ENABLE_RESOURCE_OPTIMIZATION,
              connectionPoolSize: CONNECTION_POOL_SIZE
            }
          );
          
          return result;
        } catch (error) {
          logger.error(`Error in room resource ${resource.name}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          throw error;
        }
      }
    );
  });

  // -------------------------------------------------------------------
  // Session Resources (Modular)
  // -------------------------------------------------------------------

  // Register session resources using the modular approach
  const sessionResources = registerSessionResources();
  
  // Register each session resource with the server
  sessionResources.forEach(resource => {
    server.resource(
      resource.name,
      new ResourceTemplate(resource.uri, { list: undefined }),
      async (uri, params, request) => {
        logger.info(`Handling session resource: ${resource.name}`);
        
        try {
          // Use the modular handler
          const result = await handleSessionResource(
            uri.href,
            params,
            request,
            {
              apiUrl: API_URL,
              apiCache
            }
          );
          
          return result;
        } catch (error) {
          logger.error(`Error in session resource ${resource.name}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          throw error;
        }
      }
    );
  });

  // -------------------------------------------------------------------
  // Export Resources (Modular)
  // -------------------------------------------------------------------

  // Register export resources using the modular approach
  const exportResources = registerExportResources();
  const exportResourceHandler = new ExportResources(new DigitalSambaApiClient(undefined, API_URL, apiCache));
  
  // Register each export resource with the server
  exportResources.forEach(resource => {
    server.resource(
      resource.name,
      new ResourceTemplate(resource.uri, { list: undefined }),
      async (uri, params, request) => {
        logger.info(`Handling export resource: ${resource.name}`);
        
        try {
          // Use the export resource handler
          const result = await exportResourceHandler.handleResourceRequest(uri.href);
          
          return result;
        } catch (error) {
          logger.error(`Error in export resource ${resource.name}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          throw error;
        }
      }
    );
  });


  // -------------------------------------------------------------------
  // Room Management Tools (Modular)
  // -------------------------------------------------------------------

  // Register room management tools using the modular approach
  const roomTools = registerRoomTools();
  
  // Register each room tool with the server
  roomTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing room tool: ${tool.name}`);
        
        // Create API client with appropriate configuration
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        let apiClient;
        if (ENABLE_CONNECTION_MANAGEMENT || ENABLE_TOKEN_MANAGEMENT || ENABLE_RESOURCE_OPTIMIZATION) {
          apiClient = new EnhancedDigitalSambaApiClient(
            apiKey,
            API_URL,
            apiCache,
            {
              enableConnectionManagement: ENABLE_CONNECTION_MANAGEMENT,
              enableTokenManagement: ENABLE_TOKEN_MANAGEMENT,
              enableResourceOptimization: ENABLE_RESOURCE_OPTIMIZATION,
              connectionPoolSize: CONNECTION_POOL_SIZE
            }
          );
        } else {
          apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        }
        
        // Execute the tool using the modular function
        return executeRoomTool(tool.name, params, request, {
          apiUrl: API_URL,
          apiCache,
          enableConnectionManagement: ENABLE_CONNECTION_MANAGEMENT,
          enableTokenManagement: ENABLE_TOKEN_MANAGEMENT,
          enableResourceOptimization: ENABLE_RESOURCE_OPTIMIZATION,
          connectionPoolSize: CONNECTION_POOL_SIZE
        });
      }
    );
  });

  // -------------------------------------------------------------------
  // Analytics Tools (Modular)
  // -------------------------------------------------------------------

  // Register analytics tools using the modular approach
  const analyticsTools = registerAnalyticsTools();
  
  // Register each analytics tool with the server
  analyticsTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing analytics tool: ${tool.name}`);
        
        // Create API client
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        const apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        
        // Execute the tool using the modular function
        return executeAnalyticsTool(tool.name, params, apiClient);
      }
    );
  });

  // -------------------------------------------------------------------
  // Session Management Tools (Modular)
  // -------------------------------------------------------------------

  // Register session management tools using the modular approach
  const sessionTools = registerSessionTools();

  // Register each session tool with the server
  sessionTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing session tool: ${tool.name}`);
        
        // Create API client
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        const apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        
        // Execute the tool using the modular function
        return executeSessionTool(tool.name, params, apiClient, request);
      }
    );
  });

  // -------------------------------------------------------------------
  // Live Session Control Tools (Modular)
  // -------------------------------------------------------------------

  // Register live session control tools using the modular approach
  const liveSessionTools = registerLiveSessionTools();

  // Register each live session tool with the server
  liveSessionTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing live session tool: ${tool.name}`);
        
        // Create API client
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        const apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        
        // Execute the tool using the modular function
        return executeLiveSessionTool(tool.name, params, apiClient);
      }
    );
  });

  // -------------------------------------------------------------------
  // Communication Management Tools (Modular)
  // -------------------------------------------------------------------

  // Register communication management tools using the modular approach
  const communicationTools = registerCommunicationTools();

  // Register each communication tool with the server
  communicationTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing communication tool: ${tool.name}`);
        
        // Create API client
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        const apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        
        // Execute the tool using the modular function
        return executeCommunicationTool(tool.name, params, apiClient);
      }
    );
  });

  // -------------------------------------------------------------------
  // Poll Management Tools (Modular)
  // -------------------------------------------------------------------

  // Register poll management tools using the modular approach
  const pollTools = registerPollTools();

  // Register each poll tool with the server
  pollTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        logger.info(`Executing poll tool: ${tool.name}`);
        
        // Create API client
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          return {
            content: [{ 
              type: 'text', 
              text: 'No API key found. Please include an Authorization header with a Bearer token.'
            }],
            isError: true,
          };
        }
        
        const apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
        
        // Execute the tool using the modular function
        return executePollTool(tool.name, params, apiClient);
      }
    );
  });

  // [INLINE TOOLS REMOVED - Now using modular approach]
  // All tools are registered through their respective modules above

  return { 
    server, 
    port: PORT, 
    apiUrl: API_URL, 
    webhookEndpoint: WEBHOOK_ENDPOINT, 
    publicUrl: PUBLIC_URL,
    cache: apiCache,
    enableConnectionManagement: ENABLE_CONNECTION_MANAGEMENT,
    enableTokenManagement: ENABLE_TOKEN_MANAGEMENT,
    enableResourceOptimization: ENABLE_RESOURCE_OPTIMIZATION,
    enableCircuitBreaker: ENABLE_CIRCUIT_BREAKER,
    circuitBreakerFailureThreshold: CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    circuitBreakerResetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
    enableGracefulDegradation: ENABLE_GRACEFUL_DEGRADATION,
    gracefulDegradationMaxRetries: GRACEFUL_DEGRADATION_MAX_RETRIES,
    gracefulDegradationInitialDelay: GRACEFUL_DEGRADATION_INITIAL_DELAY,
    enableMetrics: ENABLE_METRICS,
    metricsEndpoint: METRICS_ENDPOINT,
    metricsPrefix: METRICS_PREFIX,
    collectDefaultMetrics: COLLECT_DEFAULT_METRICS
  };
}

// Start a server with the provided options
export function startServer(options?: ServerOptions) {
  // Check if we should run in silent mode
  const enableSilentMode = options?.enableSilentMode || process.env.MCP_JSON_RPC_MODE === 'true';
  
  // Only log if not in silent mode
  const shouldLog = !enableSilentMode && process.env.NO_CONSOLE_OUTPUT !== 'true';
  
  if (shouldLog) logger.debug("startServer function called with options:", options);
  
  try {
    // Detect debug options
    const debugTimeouts = options?.debugTimeouts || process.env.DEBUG_TIMEOUTS === 'true';
    const debugInitialization = options?.debugInitialization || process.env.DEBUG_INITIALIZATION === 'true';
    const initialRequestTimeout = options?.initialRequestTimeout || 
                              process.env.INITIAL_REQUEST_TIMEOUT ? 
                              parseInt(process.env.INITIAL_REQUEST_TIMEOUT) : 60000;
    
    if (debugTimeouts) {
      logger.info("Timeout debugging enabled");
      console.log("Timeout debugging enabled");
      console.log("Initial request timeout:", initialRequestTimeout);
      
      // Set the environment variable for child processes
      process.env.DEBUG_TIMEOUTS = 'true';
      process.env.INITIAL_REQUEST_TIMEOUT = initialRequestTimeout.toString();
    }
    
    if (debugInitialization) {
      logger.info("Initialization debugging enabled");
      console.log("Initialization debugging enabled");
      
      // Set the environment variable for child processes
      process.env.DEBUG_INITIALIZATION = 'true';
    }
    
    // Create Express app
    if (shouldLog) logger.debug("Creating Express app...");
    const app = express();
    app.use(express.json());
    if (shouldLog) logger.debug("Express app created and JSON middleware added");

    // Create the MCP server
    if (shouldLog) logger.debug("Creating MCP server...");
    const serverConfig = createServer({
      ...options,
      initialRequestTimeout,
      debugTimeouts,
      debugInitialization
    });
    
    // Add metrics middleware if enabled
    if (serverConfig.enableMetrics) {
      if (shouldLog) logger.debug("Adding metrics middleware...");
      app.use(metricsRegistry.createHttpMetricsMiddleware());
      metricsRegistry.registerMetricsEndpoint(app, serverConfig.metricsEndpoint);
      if (shouldLog) logger.debug(`Metrics endpoint registered at ${serverConfig.metricsEndpoint}`);
    }
    const { 
      server, 
      port, 
      apiUrl, 
      webhookEndpoint, 
      publicUrl, 
      cache, 
      enableConnectionManagement, 
      enableTokenManagement, 
      enableResourceOptimization,
      enableMetrics,
      metricsEndpoint,
      metricsPrefix,
      collectDefaultMetrics
    } = serverConfig;
    if (shouldLog) logger.debug("MCP server created with configuration:", { 
      port, 
      apiUrl, 
      webhookEndpoint, 
      publicUrl, 
      hasCache: !!cache,
      enableConnectionManagement,
      enableTokenManagement,
      enableResourceOptimization,
      enableMetrics,
      metricsEndpoint
    });
    
    // Initialize metrics if enabled
    if (enableMetrics) {
      console.log("Initializing metrics collection...");
      const metrics = initializeMetrics({
        prefix: metricsPrefix,
        defaultMetrics: collectDefaultMetrics,
        enableHttpMetrics: true,
        enableApiMetrics: true,
        enableCacheMetrics: cache !== undefined,
        enableRateLimitMetrics: options?.enableRateLimiting || process.env.ENABLE_RATE_LIMITING === 'true'
      });
      
      // Track active sessions
      metrics.activeSessions.set(0);
      console.log("Metrics collection initialized");
    }

    // Map to store transports by session ID
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
    console.log("Transport map initialized");
    
    // Add rate limiting middleware if enabled
    if (options?.enableRateLimiting || process.env.ENABLE_RATE_LIMITING === 'true') {
      const requestsPerMinute = options?.rateLimitRequestsPerMinute || 
        (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60);
      
      console.log("Enabling rate limiting:", { requestsPerMinute });
      logger.info('Enabling rate limiting', { requestsPerMinute });
      app.use('/mcp', createApiKeyRateLimiter({
        maxRequests: requestsPerMinute,
        windowMs: 60 * 1000, // 1 minute
        message: 'Too many requests from this API key, please try again later.'
      }));
      console.log("Rate limiting middleware added");
    }

    // Handle POST requests for client-to-server communication
    console.log("Setting up POST handler for /mcp...");
    app.post('/mcp', async (req, res) => {
      try {
        console.log("Received POST request to /mcp");
        logger.info('Received POST MCP request', { 
          contentLength: req.headers['content-length'],
          sessionId: req.headers['mcp-session-id'] || 'new-session'
        });
        
        // Extract API key from Authorization header
        const apiKey = extractApiKey(req);
        if (apiKey) {
          console.log("Found API key in Authorization header");
          logger.debug('Found API key in Authorization header');
        }
        
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;
        
        if (sessionId && transports[sessionId]) {
          // Reuse existing transport
          transport = transports[sessionId];
          console.log(`Using existing transport for session: ${sessionId}`);
          logger.debug(`Using existing transport for session: ${sessionId}`);
          
          // Update API key if provided
          if (apiKey) {
            apiKeyContext.setApiKey(sessionId, apiKey);
          }
        } else {
          // Create new transport
          console.log("Creating new transport");
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId: string) => {
              // Store the transport by session ID
              transports[sessionId] = transport;
              console.log(`Initialized new session: ${sessionId}`);
              logger.info(`Initialized new session: ${sessionId}`);
              
              // Store API key in the context if provided
              if (apiKey) {
                apiKeyContext.setApiKey(sessionId, apiKey);
              }
              
              // Update session metrics if enabled
              if (enableMetrics) {
                metricsRegistry.activeSessions.inc();
              }
            },
            // No timeout option is available for StreamableHTTPServerTransport
            // We'll rely on circuit breaker timeouts instead
          });
          
          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              console.log(`Closing session: ${transport.sessionId}`);
              logger.info(`Closing session: ${transport.sessionId}`);
              apiKeyContext.removeApiKey(transport.sessionId);
              delete transports[transport.sessionId];
              
              // Update session metrics if enabled
              if (enableMetrics) {
                metricsRegistry.activeSessions.dec();
              }
            }
          };
          
          // Connect to the MCP server
          console.log("Connecting transport to MCP server...");
          await server.connect(transport);
          console.log("Transport connected to MCP server");
          logger.info('Connected transport to MCP server');
        }
        
        // Handle the request
        console.log("Handling MCP request...");
        await transport.handleRequest(req, res, req.body);
        console.log("MCP request handled successfully");
      } catch (error) {
        console.error("Error handling MCP request:", error);
        logger.error('Error handling MCP request:', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal server error',
            },
            id: null,
          });
        }
      }
    });
    console.log("POST handler for /mcp set up successfully");

    // Reusable handler for GET and DELETE requests
    console.log("Setting up session request handler...");
    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          console.warn(`Invalid or missing session ID: ${sessionId}`);
          logger.warn(`Invalid or missing session ID: ${sessionId}`);
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        // Extract API key from Authorization header
        const apiKey = extractApiKey(req);
        if (apiKey) {
          console.log("Found API key in Authorization header");
          logger.debug('Found API key in Authorization header');
          apiKeyContext.setApiKey(sessionId, apiKey);
        }
        
        console.log(`Processing ${req.method} request for session: ${sessionId}`);
        logger.info(`Processing ${req.method} request for session: ${sessionId}`);
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling session request:", error);
        logger.error('Error handling session request:', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        if (!res.headersSent) {
          res.status(500).send('Internal server error');
        }
      }
    };
    console.log("Session request handler created");

    // Handle GET requests for server-to-client notifications via SSE
    console.log("Setting up GET handler for /mcp...");
    app.get('/mcp', handleSessionRequest);
    console.log("GET handler for /mcp set up successfully");

    // Handle DELETE requests for session termination
    console.log("Setting up DELETE handler for /mcp...");
    app.delete('/mcp', handleSessionRequest);
    console.log("DELETE handler for /mcp set up successfully");

    // Health check endpoint
    console.log("Setting up health check endpoint...");
    app.get('/health', (req, res) => {
      console.log("Received request to /health");
      
      // Always respond with 200 OK for health checks
      // This is critical for the proxy to work correctly
      try {
        res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '0.1.0',
          name: 'Digital Samba MCP Server',
          port: port,
          apiUrl: apiUrl,
          environment: process.env.NODE_ENV || 'development'
        });
        console.log("Health check responded successfully");
      } catch (error) {
        console.error("Error in health check response:", error);
        // Even if there's an error, still try to send a 200 response
        if (!res.headersSent) {
          res.status(200).send('Health check OK');
        }
      }
    });
    console.log("Health check endpoint set up successfully");
    
    // Secondary health check endpoint on root path
    // This provides a fallback if '/health' is not accessible
    app.get('/', (req, res) => {
      console.log("Received request to root path");
      res.status(200).send('Digital Samba MCP Server is running');
    });

    // System health status endpoint
    console.log("Setting up system health endpoint...");
    app.get('/health/system', (req, res) => {
      console.log("Received request to /health/system");
      
      // Get graceful degradation health status
      const overallHealth = gracefulDegradation.getOverallHealth();
      const componentHealth = gracefulDegradation.getComponentHealth();
      
      // Format component health for response
      const formattedComponents = componentHealth.map(component => ({
        name: component.name,
        status: component.status,
        lastCheck: component.lastCheck,
        errorCount: component.errorCount,
        message: component.message
      }));
      
      res.status(200).json({
        status: overallHealth === ServiceHealthStatus.HEALTHY ? 'ok' : 
                overallHealth === ServiceHealthStatus.PARTIALLY_DEGRADED ? 'degraded' : 
                overallHealth === ServiceHealthStatus.SEVERELY_DEGRADED ? 'critical' : 'unavailable',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        name: 'Digital Samba MCP Server',
        degradation: {
          overall: overallHealth,
          components: formattedComponents
        },
        features: {
          cache: options?.enableCache ?? (process.env.ENABLE_CACHE === 'true'),
          circuitBreaker: options?.enableCircuitBreaker ?? (process.env.ENABLE_CIRCUIT_BREAKER === 'true'),
          gracefulDegradation: options?.enableGracefulDegradation ?? (process.env.ENABLE_GRACEFUL_DEGRADATION === 'true'),
          connectionManagement: options?.enableConnectionManagement ?? (process.env.ENABLE_CONNECTION_MANAGEMENT === 'true'),
          tokenManagement: options?.enableTokenManagement ?? (process.env.ENABLE_TOKEN_MANAGEMENT === 'true'),
          resourceOptimization: options?.enableResourceOptimization ?? (process.env.ENABLE_RESOURCE_OPTIMIZATION === 'true'),
          metrics: options?.enableMetrics ?? (process.env.ENABLE_METRICS === 'true')
        }
      });
    });
    console.log("System health endpoint set up successfully");

    // Get the webhook service instance
    console.log("Setting up webhook service...");
    const webhookService = new WebhookService(server, {
      secret: process.env.WEBHOOK_SECRET,
      endpoint: webhookEndpoint
    });

    // Register webhook endpoint
    console.log("Registering webhook endpoint...");
    webhookService.registerWebhookEndpoint(app);
    console.log("Webhook endpoint registered successfully");

    // Start the server
    console.log("Creating HTTP server...");
    const httpServer = createHttpServer(app);
    console.log("HTTP server created");

    console.log(`Starting server on port ${port}...`);
    httpServer.listen(port, () => {
      console.log(`Digital Samba MCP Server running on port ${port}`);
      logger.info(`Digital Samba MCP Server running on port ${port}`);
      logger.info(`Digital Samba API URL: ${apiUrl}`);
      logger.info(`Webhook endpoint: ${publicUrl}${webhookEndpoint}`);
      
      if (enableMetrics) {
        logger.info(`Metrics endpoint: ${publicUrl}${metricsEndpoint}`);
      }
    });
    console.log("Server listen call completed");

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      logger.info('SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Close all transport connections
      Object.keys(transports).forEach(sessionId => {
        logger.info(`Closing transport for session: ${sessionId}`);
        transports[sessionId].close();
      });
      
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      logger.info('SIGINT received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Close all transport connections
      Object.keys(transports).forEach(sessionId => {
        logger.info(`Closing transport for session: ${sessionId}`);
        transports[sessionId].close();
      });
      
      process.exit(0);
    });
    
    console.log("Server startup completed successfully");
    return httpServer;
  } catch (error) {
    console.error("Error in startServer function:", error);
    logger.error("Failed to start server:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Export transport functions for unified API
export { runStdioServer, validateStdioConfig } from './transports/stdio-transport.js';
export { runHttpServer, createHttpServerConfig, validateHttpConfig } from './transports/http-transport.js';

// If this file is executed directly or via npm run dev, start the server
// Only start if the file is executed directly, not when imported
// The module initialization check had to be rewritten to work with tsx
const isMainModule = () => {
  // In a more straightforward environment, we would check:
  // import.meta.url === `file://${process.argv[1]}`
  // But with tsx and different environments, we need to be more flexible
  
  // Allow explicit opt-out via environment variable
  if (process.env.MCP_DISABLE_AUTO_START === 'true') {
    console.log("Auto-start disabled by MCP_DISABLE_AUTO_START environment variable");
    return false;
  }
  
  // Check if this is a test environment
  if (process.env.NODE_ENV === 'test') {
    console.log("Not starting server in test environment");
    return false;
  }
  
  // Allow explicit opt-in via environment variable
  if (process.env.MCP_FORCE_START === 'true') {
    console.log("Auto-start forced by MCP_FORCE_START environment variable");
    return true;
  }
  
  return true; // Default to starting the server
};

if (isMainModule()) {
  console.log("Starting server initialization...");
  
  try {
    console.log("Creating server instance...");
    const serverConfig = createServer();
    console.log("Server created:", serverConfig);
    
    console.log("Starting server with config:", {
      port: serverConfig.port,
      apiUrl: serverConfig.apiUrl,
      webhookEndpoint: serverConfig.webhookEndpoint,
      publicUrl: serverConfig.publicUrl,
      cacheEnabled: !!serverConfig.cache
    });
    
    const server = startServer();
    console.log(`Server started successfully`);
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}
