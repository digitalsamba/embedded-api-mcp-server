// Simplified MCP Server Test
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { randomUUID } from 'crypto';

console.log("Starting simplified MCP server test...");

try {
  // Create a simple Express app
  const app = express();
  app.use(express.json());
  
  console.log("Express app created");
  
  // Create an MCP server
  const server = new McpServer({
    name: "Simple Test Server",
    version: "1.0.0"
  });
  
  console.log("MCP server instance created");
  
  // Add a simple tool
  server.tool(
    "echo",
    { message: { type: "string" } },
    async ({ message }) => ({
      content: [{ type: "text", text: `Echo: ${message}` }]
    })
  );
  
  console.log("Added echo tool to server");
  
  // Map to store transports by session ID
  const transports = {};
  
  // Handle POST requests
  app.post('/mcp', async (req, res) => {
    console.log("Received POST request to /mcp");
    
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'];
      let transport;
      
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        console.log(`Using existing transport for session: ${sessionId}`);
        transport = transports[sessionId];
      } else {
        // New transport
        console.log("Creating new transport");
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.log(`Session initialized: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });
        
        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            console.log(`Closing session: ${transport.sessionId}`);
            delete transports[transport.sessionId];
          }
        };
        
        // Connect to the MCP server
        console.log("Connecting transport to server");
        await server.connect(transport);
        console.log("Transport connected successfully");
      }
      
      // Handle the request
      console.log("Handling request");
      await transport.handleRequest(req, res, req.body);
      console.log("Request handled successfully");
    } catch (error) {
      console.error("Error handling request:", error);
      
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error',
          },
          id: null,
        });
      }
    }
  });
  
  // Simple GET endpoint for testing
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  const server_instance = app.listen(PORT, () => {
    console.log(`Simplified MCP server running on port ${PORT}`);
  });
  
  console.log("Server started successfully");
} catch (error) {
  console.error("Error during server initialization:", error);
}
