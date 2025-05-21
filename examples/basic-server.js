/**
 * Basic Digital Samba MCP Server Setup
 * 
 * This example demonstrates how to set up and run a Digital Samba MCP server
 * with minimal configuration.
 */

// Import the required modules
import { startMcpServer } from 'digital-samba-mcp-server';

// Set up server configuration
const config = {
  apiKey: 'YOUR_DIGITAL_SAMBA_API_KEY', // Replace with your actual API key
  port: 3000, // Default port is 3000
  logLevel: 'info' // Logging level (debug, info, warn, error)
};

// Start the MCP server
async function main() {
  try {
    console.log('Starting Digital Samba MCP Server...');
    
    // Start the server with the provided configuration
    const server = await startMcpServer(config);
    
    console.log(`Server is running at http://localhost:${config.port}/mcp`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await server.close();
      console.log('Server has been shut down');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
