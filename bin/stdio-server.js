#!/usr/bin/env node

// This is a standalone stdio server that properly handles API keys
// It's used when running in stdio mode (for Claude Desktop)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Import the main server components
import('../dist/src/index.js').then(async (mainModule) => {
  // Get API key from environment
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  if (!apiKey) {
    console.error('[ERROR] No API key provided. Set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }
  
  console.error('[INFO] Starting Digital Samba MCP Server in stdio mode...');
  console.error('[DEBUG] API key found:', apiKey.substring(0, 10) + '...');
  
  // Create server with API key
  const serverConfig = mainModule.createServer({
    apiKey: apiKey,
    apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1',
    enableCache: true,
    enableSilentMode: true,
    logLevel: process.env.LOG_LEVEL || 'info'
  });
  
  const { server } = serverConfig;
  console.error('[INFO] Server created with', 
    server._resources?.size || 0, 'resources and',
    server._tools?.size || 0, 'tools'
  );
  
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server
  try {
    await server.connect(transport);
    console.error('[INFO] Server connected successfully via stdio');
  } catch (error) {
    console.error('[ERROR] Failed to connect:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('[ERROR] Failed to load server module:', error);
  process.exit(1);
});