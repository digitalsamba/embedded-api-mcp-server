/**
 * Digital Samba MCP Server - Webhooks Module
 * 
 * This module provides webhook functionality for the Digital Samba MCP Server.
 * It exports the webhook service, types, and utilities needed for webhook
 * integration with the Digital Samba API.
 * 
 * @module webhooks
 * @author Digital Samba Team
 * @version 1.0.0
 */

// Export webhook types
export { WebhookEventType } from './webhook-types.js';
export type { WebhookPayload, WebhookConfig, WebhookEventHandler } from './webhook-types.js';

// Export webhook service
export { WebhookService } from './webhook-service.js';