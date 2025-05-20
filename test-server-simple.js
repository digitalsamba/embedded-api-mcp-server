// Simple test server for rate limiting and caching
import { startServer } from './dist/src/index.js';

// Start the server with rate limiting and caching enabled
const server = startServer({
  port: 3333,
  publicUrl: 'http://localhost:3333',
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 5, // Set a low limit for testing
  enableCache: true,
  cacheTtl: 60000 // 1 minute
});

console.log('MCP server running on http://localhost:3333/mcp');
console.log('Press Ctrl+C to stop the server.');
