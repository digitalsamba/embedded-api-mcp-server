#!/usr/bin/env node

import { runStdioServer, validateStdioConfig } from './transports/stdio-transport.js';
import logger from './logger.js';

export async function runFullStdioServer(): Promise<void> {
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  if (!apiKey) {
    console.error('No API key provided. Please set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }

  console.error('[INFO] Starting Digital Samba MCP Server (full stdio mode)...');
  console.error('[DEBUG] API Key found:', apiKey.substring(0, 5) + '...');

  try {
    // Create configuration for STDIO transport
    const stdioConfig = {
      apiKey,
      apiUrl: process.env.DIGITAL_SAMBA_API_URL,
      serverOptions: {
        enableCache: process.env.ENABLE_CACHE !== 'false',
        cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300000,
        logLevel: (process.env.LOG_LEVEL as any) || 'info'
      }
    };

    // Validate configuration
    validateStdioConfig(stdioConfig);

    // Run the STDIO server using the transport wrapper
    await runStdioServer(stdioConfig);
    
    console.error('[INFO] MCP server connected successfully with full features');
  } catch (error) {
    logger.error('Failed to start STDIO server', { 
      error: error instanceof Error ? error.message : String(error) 
    });
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