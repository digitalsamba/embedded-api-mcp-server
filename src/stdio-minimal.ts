#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Redirect console to stderr
console.log = (...args: any[]) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.error = (...args: any[]) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);

export async function runMinimalStdioServer(): Promise<void> {
  console.error('[INFO] Starting minimal stdio server...');
  
  // Create a minimal MCP server
  const server = new McpServer({
    name: "Digital Samba MCP Server",
    version: "1.0.0"
  });

  // Add a simple tool to verify it's working
  server.tool(
    'test-connection',
    {},
    async () => {
      return {
        content: [{
          type: 'text',
          text: 'Digital Samba MCP Server is connected and working!'
        }]
      };
    }
  );

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect immediately without any delays
  await server.connect(transport);
  console.error('[INFO] Server connected successfully');
}

// Run immediately
if (import.meta.url === `file://${process.argv[1]}`) {
  runMinimalStdioServer().catch(error => {
    console.error('[ERROR] Failed to start:', error);
    process.exit(1);
  });
}