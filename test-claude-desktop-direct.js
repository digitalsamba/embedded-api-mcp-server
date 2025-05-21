#!/usr/bin/env node

/**
 * This script tests the Claude Desktop integration by creating a Claude Desktop-specific
 * handler for the MCP server without starting an HTTP server.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the necessary modules
async function runTest() {
  try {
    // Clear log file
    const logFile = resolve(__dirname, 'claude-desktop-test-direct.log');
    fs.writeFileSync(logFile, '');

    // Log function
    const log = (message) => {
      console.log(message);
      fs.appendFileSync(logFile, message + '\n');
    };

    log('Starting Direct Claude Desktop Test...');
    
    // Import the MCP server directly
    log('Importing MCP server module...');
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    
    log('Creating MCP server...');
    const server = new McpServer({
      name: 'Digital Samba MCP Server (Claude Desktop Test)',
      version: '0.1.0'
    });
    
    // Add a simple tool for testing
    log('Adding test tool...');
    server.tool(
      'test-tool',
      { message: 'string' },
      async ({ message }) => ({
        content: [{ type: 'text', text: `Echo: ${message}` }]
      })
    );
    
    // Set up stdio transport for direct communication
    log('Setting up stdio transport...');
    const transport = new StdioServerTransport();
    
    // Connect the transport to the server
    log('Connecting transport to server...');
    await server.connect(transport);
    
    log('MCP Server ready for Claude Desktop communication!');
    log('You can now test communication by sending JSON-RPC messages to stdin.');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle process termination
    process.on('SIGINT', () => {
      log('Received SIGINT signal, shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log('Received SIGTERM signal, shutting down...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error in Claude Desktop test:', error);
    fs.appendFileSync(
      resolve(__dirname, 'claude-desktop-test-direct.log'),
      `ERROR: ${error.message}\n${error.stack}\n`
    );
    process.exit(1);
  }
}

runTest();
