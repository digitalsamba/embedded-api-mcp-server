#!/usr/bin/env node

/**
 * Test server script with rate limiting and caching enabled
 */

import { startServer } from '../dist/src/index.js';

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Error: API key not provided. Please run with: node test-server.js YOUR_API_KEY');
  process.exit(1);
}

// Set environment variables
process.env.DIGITAL_SAMBA_API_KEY = apiKey;
process.env.ENABLE_RATE_LIMITING = 'true';
process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '5';  // Set a low limit for testing
process.env.ENABLE_CACHE = 'true';
process.env.CACHE_TTL = '60000';  // 1 minute

// Start the server with rate limiting and caching enabled
console.log('Starting MCP server with rate limiting and caching enabled...');
console.log(`Rate limit: ${process.env.RATE_LIMIT_REQUESTS_PER_MINUTE} requests per minute`);
console.log(`Cache TTL: ${process.env.CACHE_TTL}ms`);

const server = startServer({
  port: 3000,
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 5,
  enableCache: true,
  cacheTtl: parseInt(process.env.CACHE_TTL) || 60000
});

console.log('MCP server running on http://localhost:3000/mcp');
console.log('Press Ctrl+C to stop the server.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
