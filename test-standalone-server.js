// Set environment to test mode to prevent auto-starting
process.env.NODE_ENV = 'test';

// Simple test server for rate limiting and caching
import { createServer } from './dist/src/index.js';
import express from 'express';
import { randomUUID } from 'crypto';
import { createServer as createHttpServer } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import apiKeyContext, { extractApiKey } from './dist/src/auth.js';
import { createApiKeyRateLimiter } from './dist/src/rate-limiter.js';
import logger from './dist/src/logger.js';

const PORT = 3333;
const ENABLE_RATE_LIMITING = true;
const RATE_LIMIT_REQUESTS_PER_MINUTE = 5;
const ENABLE_CACHE = true;
const CACHE_TTL = 60000; // 1 minute

// Create the MCP server
const { server, apiUrl, webhookEndpoint, publicUrl, cache } = createServer({
  port: PORT,
  publicUrl: `http://localhost:${PORT}`,
  enableRateLimiting: ENABLE_RATE_LIMITING,
  rateLimitRequestsPerMinute: RATE_LIMIT_REQUESTS_PER_MINUTE,
  enableCache: ENABLE_CACHE,
  cacheTtl: CACHE_TTL
});

// Create Express app
const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports = {};

// Add rate limiting middleware if enabled
if (ENABLE_RATE_LIMITING) {
  logger.info('Enabling rate limiting', { requestsPerMinute: RATE_LIMIT_REQUESTS_PER_MINUTE });
  app.use('/mcp', createApiKeyRateLimiter({
    maxRequests: RATE_LIMIT_REQUESTS_PER_MINUTE,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests from this API key, please try again later.'
  }));
}

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
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    
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
        onsessioninitialized: (sessionId) => {
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
const handleSessionRequest = async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
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

// Start the server
const httpServer = createHttpServer(app);

httpServer.listen(PORT, () => {
  logger.info(`Digital Samba MCP Server running on port ${PORT}`);
  logger.info(`Digital Samba API URL: ${apiUrl}`);
  logger.info(`Webhook endpoint: ${publicUrl}${webhookEndpoint}`);
});

console.log(`MCP server running with rate limiting (${RATE_LIMIT_REQUESTS_PER_MINUTE} requests/minute) and caching (TTL: ${CACHE_TTL}ms)`);
console.log(`Server URL: http://localhost:${PORT}/mcp`);
console.log('Press Ctrl+C to stop the server.');

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
