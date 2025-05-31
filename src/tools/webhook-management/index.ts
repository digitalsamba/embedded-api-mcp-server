/**
 * Digital Samba MCP Server - Webhook Management Tools
 * 
 * This module implements tools for managing Digital Samba webhooks.
 * It provides MCP tools for webhook operations like registration and deletion.
 * 
 * This is a wrapper that delegates to the main webhook tools implementation
 * to maintain backward compatibility during the modular migration.
 * 
 * @module tools/webhook-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { setupWebhookTools as setupWebhookToolsImpl } from '../../webhooks.js';
import { WebhookService } from '../../webhooks.js';

/**
 * Set up webhook management tools for the MCP server
 * 
 * This function registers all webhook-related tools with the MCP server.
 * It delegates to the main webhook tools implementation.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {WebhookService} webhookService - The webhook service instance
 * @param {string} apiBaseUrl - Base URL for the Digital Samba API
 * @returns {void}
 */
export function setupWebhookManagementTools(
  server: McpServer, 
  webhookService: WebhookService,
  apiBaseUrl: string
): void {
  // Delegate to the main webhook tools implementation
  setupWebhookToolsImpl(server, webhookService, apiBaseUrl);
}