#!/usr/bin/env node

/**
 * Direct MCP Server Launcher
 * 
 * This script runs the Digital Samba MCP server directly. 
 * Useful for testing and debugging.
 */

import { createServer as createHttpServer } from 'http';
import { startServer } from './dist/src/index.js';
import fs from 'fs';

// Get API key from command line arguments or environment
const apiKey = process.argv[2] || process.env.DIGITAL_SAMBA_API_KEY;
if (!apiKey) {
  console.error('Error: API key is required');
  console.error('Usage: node direct-mcp-server.js YOUR_API_KEY [PORT]');
  console.error('Or set DIGITAL_SAMBA_API_KEY environment variable');
  process.exit(1);
}

// Get port from command line arguments or default to 3000
const port = parseInt(process.argv[3] || process.env.PORT || '3000', 10);

// Setup logging
const LOG_FILE = './direct-mcp.log';
fs.writeFileSync(LOG_FILE, `${new Date().toISOString()} - Starting Direct MCP Server\n`);
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${message}`);
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${message}\n`);
};

// Start the server
log(`Starting Digital Samba MCP server on port ${port}`);
log(`API Key: ${apiKey.substring(0, 5)}...`);

try {
  // Set environment variables
  process.env.DIGITAL_SAMBA_API_KEY = apiKey;
  process.env.PORT = port.toString();
  
  // Start the server
  const server = startServer();
  
  log('Server started successfully');
  log(`Server is running at http://localhost:${port}/mcp`);
  
  // Handle graceful shutdown
  const shutdown = () => {
    log('Shutting down server...');
    
    if (server && typeof server.close === 'function') {
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    } else {
      log('No server instance to close');
      process.exit(1);
    }
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  log(`Error starting server: ${error.message}`);
  log(error.stack);
  process.exit(1);
}
