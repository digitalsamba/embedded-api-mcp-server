/**
 * Advanced Configuration for Digital Samba MCP Server
 * 
 * This example demonstrates advanced configuration options for
 * the Digital Samba MCP server.
 */

// Import required modules
import { createMcpServer } from 'digital-samba-mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create custom logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'digital-samba-mcp' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...rest }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;
        })
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Express app setup
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Advanced MCP server configuration
const advancedConfig = {
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,      // Number of failures before opening circuit
    resetTimeout: 30000,      // Time in ms to wait before trying half-open state
    maxRetries: 3,            // Max number of retries for failed requests
    timeout: 5000             // Request timeout in ms
  },
  
  // Rate limiting configuration
  rateLimiting: {
    enabled: true,
    maxRequests: 100,         // Maximum requests per minute
    tokensPerInterval: 100,   // Tokens added per interval
    interval: 60000,          // Interval in ms (60 seconds)
    burstLimit: 10            // Maximum burst allowed
  },
  
  // Caching configuration
  cache: {
    enabled: true,
    ttl: 300000,              // Time to live in ms (5 minutes)
    maxSize: 100,             // Maximum number of items in cache
    checkPeriod: 60000        // Check for expired items every minute
  },
  
  // Token refresh configuration
  tokenRefresh: {
    enabled: true,
    refreshBeforeExpiry: 300, // Refresh token 5 minutes before expiry
    maxRetries: 3,            // Max retries for token refresh
    retryDelay: 5000          // Delay between retries in ms
  },
  
  // Graceful degradation configuration
  gracefulDegradation: {
    enabled: true,
    fallbackCacheTtl: 600000, // Fallback cache TTL in ms (10 minutes)
    healthCheckInterval: 60000 // Health check interval in ms (1 minute)
  },
  
  // Connection manager configuration
  connection: {
    poolSize: 5,              // Number of connections in pool
    keepAliveInterval: 30000, // Keepalive interval in ms
    reconnectDelay: 5000      // Reconnection delay in ms
  },
  
  // Resource optimizer configuration
  resourceOptimizer: {
    enabled: true,
    batchSize: 10,            // Maximum batch size for requests
    compressionLevel: 6,      // Compression level (0-9)
    memoryLimit: 100,         // Memory limit in MB
    incrementalLoadingEnabled: true
  },
  
  // Custom logger
  logger
};

// Create the MCP server with advanced configuration
const mcpServer = createMcpServer(advancedConfig);

// Session management with custom transport
const transports = {};

// Handle all MCP route requests (POST, GET, DELETE)
app.all('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (req.method === 'POST' && req.body?.method === 'initialize') {
    // Create new transport for initialization
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
        
        // Log session creation
        logger.info(`New MCP session created: ${newSessionId}`);
        
        // Clean up transport when session ends
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.info(`MCP session closed: ${transport.sessionId}`);
          }
        };
      }
    });
    
    // Connect transport to server
    await mcpServer.connect(transport);
  } else {
    // Invalid session or request
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Invalid session or request'
      },
      id: null
    });
  }

  // Handle the request
  await transport.handleRequest(req, res, req.method === 'POST' ? req.body : undefined);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    connections: Object.keys(transports).length
  });
});

// Metrics endpoint (if Prometheus is enabled)
if (process.env.ENABLE_METRICS === 'true') {
  const { register } = require('prom-client');
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics', { error });
      res.status(500).end();
    }
  });
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Digital Samba MCP Server started on port ${PORT}`);
  logger.info(`MCP endpoint available at http://localhost:${PORT}/mcp`);
  logger.info(`Health check endpoint available at http://localhost:${PORT}/health`);
});
