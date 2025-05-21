/**
 * Minimal MCP Server for Testing
 * 
 * This is a stripped-down version of the Digital Samba MCP Server
 * designed to test basic functionality and diagnose timeout issues.
 */

// Node.js built-in modules
import { randomUUID } from 'crypto';
import { createServer as createHttpServer } from 'http';
import { config as loadEnv } from 'dotenv';

// If in MCP mode, redirect all console output to stderr
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Configure console to use stderr for everything
console.log = (...args) => originalConsole.error('[LOG]', ...args);
console.info = (...args) => originalConsole.error('[INFO]', ...args);
console.warn = (...args) => originalConsole.error('[WARN]', ...args);
console.error = (...args) => originalConsole.error('[ERROR]', ...args);

// Load environment variables
loadEnv();

// External dependencies
import express from 'express';
import { z } from 'zod';

// MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Main Configuration
const PORT = process.env.PORT || 4521;
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;

if (!API_KEY) {
  console.error('No API key provided. Please set DIGITAL_SAMBA_API_KEY environment variable');
  process.exit(1);
}

console.log(`Starting minimal MCP server on port ${PORT}`);
console.log(`API URL: ${API_URL}`);
console.log(`Using API Key: ${API_KEY.substring(0, 4)}...`);

// Create express app
const app = express();
app.use(express.json());

// Create the MCP server
const server = new McpServer({
  name: 'Digital Samba MCP Server (Minimal)',
  version: '0.1.0',
});

// Add a simple info resource
server.resource(
  'info',
  'digitalsamba://info',
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'Digital Samba MCP Server',
        version: '0.1.0',
        apiUrl: API_URL,
        timestamp: new Date().toISOString()
      }, null, 2),
    }]
  })
);

// Add a simple test tool
server.tool(
  'ping',
  {},
  async () => ({
    content: [
      {
        type: 'text',
        text: `Pong! Server is running. Current time: ${new Date().toISOString()}`,
      },
    ],
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    name: 'Digital Samba MCP Server (Minimal)'
  });
});

// Map to store transports by session ID
const transports = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  try {
    console.log('Received POST request to /mcp');
    
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
      console.log(`Using existing transport for session: ${sessionId}`);
    } else {
      // Create new transport
      console.log('Creating new transport');
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          transports[sessionId] = transport;
          console.log(`Initialized new session: ${sessionId}`);
        },
      });
      
      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`Closing session: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        }
      };
      
      // Connect to the MCP server
      console.log('Connecting transport to MCP server...');
      await server.connect(transport);
      console.log('Transport connected to MCP server');
    }
    
    // Handle the request
    console.log('Handling MCP request...');
    await transport.handleRequest(req, res, req.body);
    console.log('MCP request handled successfully');
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
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
      console.warn(`Invalid or missing session ID: ${sessionId}`);
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    
    console.log(`Processing ${req.method} request for session: ${sessionId}`);
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session request:', error);
    
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
};

// Handle GET requests for server-to-client notifications
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Start the server
const httpServer = createHttpServer(app);
httpServer.listen(PORT, () => {
  console.log(`Minimal Digital Samba MCP Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close all transport connections
  Object.keys(transports).forEach(sessionId => {
    console.log(`Closing transport for session: ${sessionId}`);
    transports[sessionId].close();
  });
  
  process.exit(0);
});
