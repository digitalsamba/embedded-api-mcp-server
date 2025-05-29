#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './index.js';

// Redirect console to stderr
console.log = (...args: any[]) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.error = (...args: any[]) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);

export async function runFullStdioServer(): Promise<void> {
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  if (!apiKey) {
    console.error('No API key provided. Please set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }

  console.error('[INFO] Starting Digital Samba MCP Server (full stdio mode)...');
  console.error('[DEBUG] API Key found:', apiKey.substring(0, 5) + '...');

  // Create server with full configuration
  const serverConfig = createServer({
    apiKey, // Pass API key directly to server
    apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1',
    enableCache: process.env.ENABLE_CACHE !== 'false',
    cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300000,
    enableConnectionManagement: false, // Disable for faster startup
    enableTokenManagement: false,
    enableResourceOptimization: false,
    enableCircuitBreaker: false,
    enableGracefulDegradation: false,
    enableSilentMode: true,
    logLevel: process.env.LOG_LEVEL as any || 'info'
  });

  const { server } = serverConfig;

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  try {
    await server.connect(transport);
    console.error('[INFO] MCP server connected successfully with full features');
  } catch (error) {
    console.error('[ERROR] Failed to connect:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullStdioServer().catch(error => {
    console.error('[FATAL] Server failed:', error);
    process.exit(1);
  });
}