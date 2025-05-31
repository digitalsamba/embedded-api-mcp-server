/**
 * Digital Samba MCP Server - Session Functionality (Modular)
 * 
 * This module implements tools for managing Digital Samba room sessions.
 * It provides capabilities for session management, data deletion, and session operations
 * through the MCP interface, exposing the Digital Samba session API to MCP clients.
 * 
 * This is a consolidated entry point that imports from the new modular structure:
 * - Tools: src/tools/session-management/
 * 
 * @module sessions
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules - modular structure
import { registerSessionTools, executeSessionTool } from './tools/session-management/index.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';

/**
 * Set up session tools for the MCP server
 * 
 * This function registers all session-related tools with the MCP server.
 * It delegates to the modular tools setup function.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register session functionality with the MCP server
 * setupSessionTools(mcpServer, 'https://api.digitalsamba.com/api/v1');
 */
export function setupSessionTools(server: McpServer, apiUrl: string): void {
  logger.info('Setting up session functionality with modular structure');
  
  // Get the session tools from the modular structure
  const sessionTools = registerSessionTools();
  
  // Register each tool with the server
  sessionTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
        // Create API client for the tool execution
        const apiClient = new DigitalSambaApiClient(undefined, apiUrl);
        
        // Execute the tool using the modular function
        return executeSessionTool(tool.name, params, apiClient, request);
      }
    );
  });
  
  logger.info('Session functionality set up successfully');
}