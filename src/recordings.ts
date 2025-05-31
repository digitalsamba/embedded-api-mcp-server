/**
 * Digital Samba MCP Server - Recording Functionality (Modular)
 * 
 * This module implements resources and tools for managing Digital Samba room recordings.
 * It provides capabilities for listing, retrieving, and managing recordings
 * through the MCP interface, exposing the Digital Samba recording API to MCP clients.
 * 
 * This is a consolidated entry point that imports from the new modular structure:
 * - Resources: src/resources/recordings/
 * - Tools: src/tools/recording-management/
 * 
 * @module recordings
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules - modular structure
import { setupRecordingResources } from './resources/recordings/index.js';
import { setupRecordingTools } from './tools/recording-management/index.js';
import logger from './logger.js';

/**
 * Set up recording resources and tools for the MCP server
 * 
 * This function registers all recording-related resources and tools with the MCP server.
 * It delegates to the modular resources and tools setup functions.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register recording functionality with the MCP server
 * setupRecordingFunctionality(mcpServer, 'https://api.digitalsamba.com/api/v1');
 */
export function setupRecordingFunctionality(server: McpServer, apiUrl: string): void {
  logger.info('Setting up recording functionality with modular structure');
  
  // Set up recording resources (read-only endpoints)
  setupRecordingResources(server, apiUrl);
  
  // Set up recording tools (action endpoints)  
  setupRecordingTools(server, apiUrl);
  
  logger.info('Recording functionality set up successfully');
}