/**
 * Express Integration with Digital Samba MCP Server
 * 
 * This example demonstrates how to integrate the Digital Samba MCP server
 * with an Express application.
 */

// Import required modules
import express from 'express';
import { createMcpServer, configureMcpMiddleware } from 'digital-samba-mcp-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create the MCP server
const mcpServer = createMcpServer({
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  enableCache: process.env.ENABLE_CACHE === 'true',
  cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10)
});

// Configure the MCP middleware with session management
const mcpMiddleware = configureMcpMiddleware(mcpServer, {
  basePath: '/mcp',
  sessionManagement: true
});

// Add MCP routes to Express
app.use(mcpMiddleware);

// Add your own routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Digital Samba MCP Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .endpoint { background: #f4f4f4; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
          code { font-family: monospace; background: #eee; padding: 2px 4px; }
        </style>
      </head>
      <body>
        <h1>Digital Samba MCP Server</h1>
        <p>The server is running successfully. MCP endpoints are available at <code>/mcp</code>.</p>
        
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
          <strong>POST /mcp</strong>: Handle client-to-server MCP requests
        </div>
        <div class="endpoint">
          <strong>GET /mcp</strong>: Server-to-client notifications (SSE)
        </div>
        <div class="endpoint">
          <strong>DELETE /mcp</strong>: Session termination
        </div>
        
        <h2>Server Health:</h2>
        <div class="endpoint">
          <strong>GET /health</strong>: Server health check
        </div>
        <div class="endpoint">
          <strong>GET /metrics</strong>: Prometheus metrics (if enabled)
        </div>
      </body>
    </html>
  `);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`MCP endpoints available at http://localhost:${PORT}/mcp`);
});
