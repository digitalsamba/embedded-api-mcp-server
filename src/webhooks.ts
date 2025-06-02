/**
 * Digital Samba MCP Server - Webhook Functionality (Modular)
 * 
 * This module implements webhook functionality for the Digital Samba MCP Server.
 * It provides capabilities for webhook registration, management, and event handling
 * through the MCP interface, exposing the Digital Samba webhook API to MCP clients.
 * 
 * This is a consolidated entry point that imports from the new modular structure:
 * - Core Service: src/webhooks/webhook-service.ts
 * - Types: src/webhooks/webhook-types.ts
 * - Tools: src/tools/webhook-management/
 * 
 * @module webhooks
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules - modular structure
// import {
//   WebhookEventType, // TODO: Future webhook event handling
//   WebhookPayload, // TODO: Future webhook payload processing
//   WebhookConfig, // TODO: Future webhook configuration
//   WebhookEventHandler // TODO: Future webhook event handlers
// } from './webhooks/webhook-types.js';

import { WebhookService } from './webhooks/webhook-service.js';
import { setupWebhookManagementTools } from './tools/webhook-management/index.js';
import logger from './logger.js';

// Re-export types and service for backward compatibility
// export { WebhookEventType } from './webhooks/webhook-types.js'; // TODO: Export when webhook events are implemented
// export type { WebhookPayload, WebhookConfig, WebhookEventHandler } from './webhooks/webhook-types.js'; // TODO: Export when webhook types are implemented
export { WebhookService } from './webhooks/webhook-service.js';

/**
 * Set up webhook tools for the MCP server
 * 
 * This function registers all webhook-related tools with the MCP server.
 * It delegates to the modular webhook management tools setup function.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {WebhookService} webhookService - The webhook service instance
 * @param {string} apiBaseUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register webhook tools with the MCP server
 * const webhookService = new WebhookService(mcpServer, { endpoint: '/webhooks' });
 * setupWebhookTools(mcpServer, webhookService, 'https://api.digitalsamba.com/api/v1');
 */
export function setupWebhookTools(
  server: McpServer, 
  webhookService: WebhookService,
  apiBaseUrl: string
): void {
  logger.info('Setting up webhook tools with modular structure');
  
  // Delegate to the modular webhook management tools
  setupWebhookManagementTools(server, webhookService, apiBaseUrl);
  
  logger.info('Webhook tools set up successfully');
}

// Export default for backward compatibility
export default WebhookService;