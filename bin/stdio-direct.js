#!/usr/bin/env node

// Direct stdio server that properly handles API keys
import { runFullStdioServer } from '../dist/src/stdio-full-server.js';

// Redirect console to stderr to avoid interfering with JSON-RPC
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
  
  // Use the consolidated stdio server implementation
  await runFullStdioServer();
}

run().catch(error => {
  console.error('[FATAL] Server failed:', error);
  process.exit(1);
});