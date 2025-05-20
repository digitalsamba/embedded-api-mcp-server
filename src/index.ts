import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';
import WebhookService, { setupWebhookTools } from './webhooks.js';
import { setupRecordingFunctionality } from './recordings.js';
import { setupModerationFunctionality } from './moderation.js';
import { setupBreakoutRoomsFunctionality } from './breakout-rooms.js';
import { setupMeetingSchedulingFunctionality } from './meetings.js';

// Type definitions for server options
export interface ServerOptions {
  port?: number;
  apiUrl?: string;
  webhookSecret?: string;
  webhookEndpoint?: string;
  publicUrl?: string;
}

// Create and configure the MCP server
export function createServer(options?: ServerOptions) {
  // Configure environment
  const PORT = options?.port || process.env.PORT ? parseInt(process.env.PORT as string) : 3000;
  const API_URL = options?.apiUrl || process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
  const WEBHOOK_SECRET = options?.webhookSecret || process.env.WEBHOOK_SECRET;
  const WEBHOOK_ENDPOINT = options?.webhookEndpoint || process.env.WEBHOOK_ENDPOINT || '/webhooks/digitalsamba';
  const PUBLIC_URL = options?.publicUrl || process.env.PUBLIC_URL || `http://localhost:${PORT}`;

  // Create the MCP server
  const server = new McpServer({
    name: 'Digital Samba MCP Server',
    version: '0.1.0',
  });

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
      
      const client = new DigitalSambaApiClient(undefined, API_URL);
      
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
      
      const client = new DigitalSambaApiClient(apiKey, API_URL);
      
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
      
      const client = new DigitalSambaApiClient(apiKey, API_URL);
      
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
      
      const client = new DigitalSambaApiClient(apiKey, API_URL);
      
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
      
      const client = new DigitalSambaApiClient(apiKey, API_URL);
      
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
      
      const client = new DigitalSambaApiClient(apiKey, API_URL);
      
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

  return { server, port: PORT, apiUrl: API_URL, webhookEndpoint: WEBHOOK_ENDPOINT, publicUrl: PUBLIC_URL };
}

// Start a server with the provided options
export function startServer(options?: ServerOptions) {
  // Create Express app
  const app = express();
  app.use(express.json());

  // Create the MCP server
  const { server, port, apiUrl, webhookEndpoint, publicUrl } = createServer(options);

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (req, res) => {
    try {
      logger.info('Received POST MCP request', { 
        contentLength: req.headers['content-length'],
        sessionId: req.headers['mcp-session-id'] || 'new-session'
      });
      
      // Extract API key from Authorization header
      const apiKey = extractApiKey(req);
      if (apiKey) {
        logger.debug('Found API key in Authorization header');
      }
      
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;
      
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        logger.debug(`Using existing transport for session: ${sessionId}`);
        
        // Update API key if provided
        if (apiKey) {
          apiKeyContext.setApiKey(sessionId, apiKey);
        }
      } else {
        // Create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
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
            logger.info(`Closing session: ${transport.sessionId}`);
            apiKeyContext.removeApiKey(transport.sessionId);
            delete transports[transport.sessionId];
          }
        };
        
        // Connect to the MCP server
        await server.connect(transport);
        logger.info('Connected transport to MCP server');
      }
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
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

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        logger.warn(`Invalid or missing session ID: ${sessionId}`);
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      // Extract API key from Authorization header
      const apiKey = extractApiKey(req);
      if (apiKey) {
        logger.debug('Found API key in Authorization header');
        apiKeyContext.setApiKey(sessionId, apiKey);
      }
      
      logger.info(`Processing ${req.method} request for session: ${sessionId}`);
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error('Error handling session request:', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  };

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete('/mcp', handleSessionRequest);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      name: 'Digital Samba MCP Server'
    });
  });

  // Get the webhook service instance
  const webhookService = new WebhookService(server, {
    secret: process.env.WEBHOOK_SECRET,
    endpoint: webhookEndpoint
  });

  // Register webhook endpoint
  webhookService.registerWebhookEndpoint(app);

  // Start the server
  const httpServer = createHttpServer(app);

  httpServer.listen(port, () => {
    logger.info(`Digital Samba MCP Server running on port ${port}`);
    logger.info(`Digital Samba API URL: ${apiUrl}`);
    logger.info(`Webhook endpoint: ${publicUrl}${webhookEndpoint}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
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

  return httpServer;
}

// If this file is executed directly or via npm run dev, start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
