#!/usr/bin/env node

// Direct stdio server that properly handles API keys
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStdioServer } from '../dist/src/create-stdio-server.js';

// Redirect console to stderr
console.log = (...args) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);

async function run() {
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  if (!apiKey) {
    console.error('No API key provided. Set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }
  
  console.error('[INFO] Starting Digital Samba MCP Server (direct stdio)...');
  console.error('[DEBUG] API key:', apiKey.substring(0, 10) + '...');
  
  const apiUrl = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
  
  // Create server with API key
  const server = createStdioServer(apiKey, apiUrl);
  
  // Create transport
  const transport = new StdioServerTransport();
  
  // Connect
  try {
    await server.connect(transport);
    console.error('[INFO] Server connected successfully');
  } catch (error) {
    console.error('[ERROR] Failed to connect:', error);
    process.exit(1);
  }
}

run().catch(error => {
  console.error('[FATAL] Server failed:', error);
  process.exit(1);
});