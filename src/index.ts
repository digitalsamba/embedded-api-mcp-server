// Node.js built-in modules
import { randomUUID } from 'crypto';
import { createServer as createHttpServer } from 'http';
import { config as loadEnv } from 'dotenv';

// Load environment variables from .env file
console.log("Loading environment variables from .env file...");
const result = loadEnv();
console.log(result.parsed ? "Environment loaded successfully" : "No .env file found or error loading it");

// External dependencies
import express from 'express';
import { z } from 'zod';

// MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Local modules
import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';
import { setupBreakoutRoomsFunctionality } from './breakout-rooms.js';
import { MemoryCache } from './cache.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { setupMeetingSchedulingFunctionality } from './meetings.js';
import { setupModerationFunctionality } from './moderation.js';
import { createApiKeyRateLimiter } from './rate-limiter.js';
import { setupRecordingFunctionality } from './recordings.js';
import WebhookService, { setupWebhookTools } from './webhooks.js';

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
}

// Create and configure the MCP server
export function createServer(options?: ServerOptions) {
  // Configure environment
  let PORT = 3000;
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
  
  // Set up moderation functionality
  setupModerationFunctionality(server, API_URL);
  
  // Set up breakout rooms functionality
  setupBreakoutRoomsFunctionality(server, API_URL);
  
  // Set up meeting scheduling functionality
  setupMeetingSchedulingFunctionality(server, API_URL);

  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------

  // Resource for listing rooms
  server.resource(
    'rooms',
    new ResourceTemplate('digitalsamba://rooms', { list: undefined }),
    async (uri, _params, request) => {
      logger.info('Listing rooms');
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, API_URL, apiCache);
      
      try {
        // Get rooms from API
        const response = await client.listRooms();
        const rooms = response.data || [];
        logger.debug(`Found ${rooms.length} rooms`);
        
        // Format rooms as resource contents
        const contents = rooms.map(room => ({
          uri: `digitalsamba://rooms/${room.id}`,
          text: JSON.stringify(room, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching rooms', { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    }
  );

  // Resource for getting a specific room
  server.resource(
    'room',
    new ResourceTemplate('digitalsamba://rooms/{roomId}', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Getting room details', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, API_URL);
      
      try {
        // Get room from API
        const room = await client.getRoom(roomId as string);
        
        // Format room as resource content
        const content = {
          uri: uri.href,
          text: JSON.stringify(room, null, 2),
        };
        
        return { contents: [content] };
      } catch (error) {
        logger.error('Error fetching room', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Resource for listing participants in a room
  server.resource(
    'participants',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/participants', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Listing participants', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client with the provided key
      logger.debug('Creating API client with key', { 
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiUrl: API_URL
      });
      
      const client = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
      
      try {
        // Get participants from API
        const response = await client.listRoomParticipants(roomId as string);
        const participants = response.data || [];
        logger.debug(`Found ${participants.length} participants in room ${roomId}`);
        
        // Format participants as resource contents
        const contents = participants.map(participant => ({
          uri: `digitalsamba://rooms/${roomId}/participants/${participant.id}`,
          text: JSON.stringify(participant, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching participants', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // -------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------

  // Tool for creating a room
  server.tool(
    'create-room',
    {
      name: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      friendly_url: z.string().min(3).max(32).optional(),
      privacy: z.enum(['public', 'private']).default('public'),
      max_participants: z.number().min(2).max(2000).optional(),
    },
    async (params, request) => {
      const { name, description, friendly_url, privacy, max_participants } = params;
      
      logger.info('Creating room', { 
        roomName: name, 
        privacy
      });
      
      // Get API key from session context
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
      
      // Create API client with the provided key
      logger.debug('Creating API client with key', { 
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiUrl: API_URL
      });
      
      const client = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
      
      try {
        // Create room settings object
        const roomSettings = {
          name: name || 'Test Room',  // Ensure we have a name
          description,
          friendly_url,
          privacy,
          max_participants,
        };
        
        // Create room
        const room = await client.createRoom(roomSettings);
        logger.info('Room created successfully', { roomId: room.id });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error creating room', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error creating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for generating a room token
  server.tool(
    'generate-token',
    {
      roomId: z.string(),
      userName: z.string().min(1).max(100).optional(),
      role: z.string().optional(),
      externalId: z.string().optional(),
    },
    async (params, request) => {
      const { roomId, userName, role, externalId } = params;
      
      logger.info('Generating room token', { 
        roomId, 
        userName, 
        role
      });
      
      // Get API key from session context
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
      
      // Create API client with the provided key
      logger.debug('Creating API client with key', { 
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiUrl: API_URL
      });
      
      const client = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
      
      try {
        // Generate token options
        const tokenOptions = {
          u: userName || undefined,
          role: role || undefined,
          ud: externalId || undefined,
        };
        
        // Generate token
        const token = await client.generateRoomToken(roomId, tokenOptions);
        logger.info('Token generated successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating token', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error generating token: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update room tool
  server.tool(
    'update-room',
    {
      roomId: z.string(),
      name: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      friendly_url: z.string().min(3).max(32).optional(),
      privacy: z.enum(['public', 'private']).optional(),
      max_participants: z.number().min(2).max(2000).optional(),
    },
    async (params, request) => {
      const { roomId, name, description, friendly_url, privacy, max_participants } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Updating room', { 
        roomId, 
        name, 
        privacy
      });
      
      // Get API key from session context
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
      
      // Create API client with the provided key
      logger.debug('Creating API client with key', { 
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiUrl: API_URL
      });
      
      const client = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
      
      try {
        // Create room settings object
        const roomSettings = {
          name,
          description,
          friendly_url,
          privacy,
          max_participants,
        };
        
        // Update room
        const room = await client.updateRoom(roomId, roomSettings);
        logger.info('Room updated successfully', { roomId: room.id });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room updated successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error updating room', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error updating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete room tool
  server.tool(
    'delete-room',
    {
      roomId: z.string(),
    },
    async (params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Deleting room', { roomId });
      
      // Get API key from session context
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
      
      // Create API client with the provided key
      logger.debug('Creating API client with key', { 
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiUrl: API_URL
      });
      
      const client = new DigitalSambaApiClient(apiKey, API_URL, apiCache);
      
      try {
        // Delete room
        await client.deleteRoom(roomId);
        logger.info('Room deleted successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room ${roomId} deleted successfully!`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting room', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return { 
    server, 
    port: PORT, 
    apiUrl: API_URL, 
    webhookEndpoint: WEBHOOK_ENDPOINT, 
    publicUrl: PUBLIC_URL,
    cache: apiCache
  };
}

// Start a server with the provided options
export function startServer(options?: ServerOptions) {
  console.log("startServer function called with options:", options);
  
  try {
    // Create Express app
    console.log("Creating Express app...");
    const app = express();
    app.use(express.json());
    console.log("Express app created and JSON middleware added");

    // Create the MCP server
    console.log("Creating MCP server...");
    const { server, port, apiUrl, webhookEndpoint, publicUrl, cache } = createServer(options);
    console.log("MCP server created with configuration:", { port, apiUrl, webhookEndpoint, publicUrl, hasCache: !!cache });

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
            },
          });
          
          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              console.log(`Closing session: ${transport.sessionId}`);
              logger.info(`Closing session: ${transport.sessionId}`);
              apiKeyContext.removeApiKey(transport.sessionId);
              delete transports[transport.sessionId];
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
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        name: 'Digital Samba MCP Server'
      });
    });
    console.log("Health check endpoint set up successfully");

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
