/**
 * Digital Samba MCP Server - Webhook Management Tools
 * 
 * This module implements tools for managing webhooks in Digital Samba.
 * It provides MCP tools for creating, updating, deleting webhooks and managing webhook events.
 * 
 * Tools provided:
 * - list-webhook-events: List all available webhook events
 * - list-webhooks: List all configured webhooks
 * - create-webhook: Create a new webhook
 * - get-webhook: Get specific webhook details
 * - update-webhook: Update webhook configuration
 * - delete-webhook: Delete a webhook
 * 
 * @module tools/webhook-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { 
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import logger from '../../logger.js';

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Register webhook management tools
 * 
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerWebhookTools(): ToolDefinition[] {
  return [
    {
      name: 'list-webhook-events',
      description: '[Webhook Management] List all available webhook event types. Use when users say: "list webhook events", "show available events", "what events can I subscribe to", "webhook event types", "available webhooks". Returns complete catalog of subscribable events like room.created, session.ended, etc.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'list-webhooks',
      description: '[Webhook Management] List all configured webhooks in your account. Use when users say: "list webhooks", "show webhooks", "get all webhooks", "show webhook configurations", "active webhooks". Returns webhook endpoints, subscribed events, and status. Supports pagination.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of webhooks to return'
          },
          offset: {
            type: 'number',
            description: 'Number of webhooks to skip'
          }
        }
      }
    },
    {
      name: 'create-webhook',
      description: '[Webhook Management] Create a new webhook endpoint subscription. Use when users say: "create webhook", "add webhook", "subscribe to events", "set up webhook", "configure webhook notifications". Requires endpoint URL and events array. Optional auth header for security.',
      inputSchema: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'The URL endpoint to receive webhook events'
          },
          name: {
            type: 'string',
            description: 'Name for the webhook'
          },
          events: {
            type: 'array',
            description: 'Array of event types to subscribe to',
            items: {
              type: 'string'
            }
          },
          authorization_header: {
            type: 'string',
            description: 'Optional authorization header value for webhook requests'
          }
        },
        required: ['endpoint', 'events']
      }
    },
    {
      name: 'get-webhook',
      description: '[Webhook Management] Get detailed information about a specific webhook. Use when users say: "show webhook details", "get webhook info", "webhook configuration", "describe webhook", "webhook settings". Requires webhookId. Returns endpoint, events, and configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          webhookId: {
            type: 'string',
            description: 'The ID of the webhook'
          }
        },
        required: ['webhookId']
      }
    },
    {
      name: 'update-webhook',
      description: '[Webhook Management] Update webhook endpoint, events, or settings. Use when users say: "update webhook", "change webhook URL", "modify webhook events", "edit webhook", "change webhook configuration". Requires webhookId. Can update endpoint, name, events, or auth.',
      inputSchema: {
        type: 'object',
        properties: {
          webhookId: {
            type: 'string',
            description: 'The ID of the webhook to update'
          },
          endpoint: {
            type: 'string',
            description: 'New URL endpoint for the webhook'
          },
          name: {
            type: 'string',
            description: 'New name for the webhook'
          },
          events: {
            type: 'array',
            description: 'New array of event types to subscribe to',
            items: {
              type: 'string'
            }
          },
          authorization_header: {
            type: 'string',
            description: 'New authorization header value'
          }
        },
        required: ['webhookId']
      }
    },
    {
      name: 'delete-webhook',
      description: '[Webhook Management] Permanently delete a webhook subscription. Use when users say: "delete webhook", "remove webhook", "unsubscribe webhook", "cancel webhook", "disable webhook". Requires webhookId. Stops all future event deliveries to this endpoint.',
      inputSchema: {
        type: 'object',
        properties: {
          webhookId: {
            type: 'string',
            description: 'The ID of the webhook to delete'
          }
        },
        required: ['webhookId']
      }
    }
  ];
}

/**
 * Execute a webhook management tool
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeWebhookTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient
): Promise<any> {
  switch (toolName) {
    case 'list-webhook-events':
      return handleListWebhookEvents(apiClient);
    case 'list-webhooks':
      return handleListWebhooks(params, apiClient);
    case 'create-webhook':
      return handleCreateWebhook(params, apiClient);
    case 'get-webhook':
      return handleGetWebhook(params, apiClient);
    case 'update-webhook':
      return handleUpdateWebhook(params, apiClient);
    case 'delete-webhook':
      return handleDeleteWebhook(params, apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle list webhook events
 */
async function handleListWebhookEvents(
  apiClient: DigitalSambaApiClient
): Promise<any> {
  logger.info('Listing available webhook events');
  
  try {
    const events = await apiClient.listWebhookEvents();
    
    return {
      content: [{ 
        type: 'text', 
        text: `Available webhook events:\n\n${events.join('\n')}`
      }],
    };
  } catch (error) {
    logger.error('Error listing webhook events', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error listing webhook events: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle list webhooks
 */
async function handleListWebhooks(
  params: { limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  logger.info('Listing webhooks', params);
  
  try {
    const webhooks = await apiClient.listWebhooks(params);
    
    if (!webhooks.data || webhooks.data.length === 0) {
      return {
        content: [{ 
          type: 'text', 
          text: 'No webhooks configured.'
        }],
      };
    }
    
    const webhookList = webhooks.data.map(webhook => 
      `- ${webhook.name || 'Unnamed'} (${webhook.id})\n  Endpoint: ${webhook.endpoint}\n  Events: ${webhook.events?.join(', ') || 'None'}`
    ).join('\n\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Found ${webhooks.total_count} webhooks:\n\n${webhookList}`
      }],
    };
  } catch (error) {
    logger.error('Error listing webhooks', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error listing webhooks: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle create webhook
 */
async function handleCreateWebhook(
  params: {
    endpoint: string;
    name?: string;
    events: string[];
    authorization_header?: string;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { endpoint, name, events, authorization_header } = params;
  
  if (!endpoint || !events || events.length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Endpoint and at least one event are required to create a webhook.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating webhook', { endpoint, events: events.length });
  
  try {
    const webhook = await apiClient.createWebhook({
      endpoint,
      name,
      events,
      authorization_header
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created webhook "${webhook.name || 'Unnamed'}" with ID: ${webhook.id}\nEndpoint: ${webhook.endpoint}\nEvents: ${webhook.events?.join(', ')}`
      }],
    };
  } catch (error) {
    logger.error('Error creating webhook', { 
      endpoint,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating webhook: ${errorMessage}`;
    
    if (errorMessage.includes('already exists')) {
      displayMessage = `A webhook with endpoint "${endpoint}" already exists`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle get webhook
 */
async function handleGetWebhook(
  params: { webhookId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { webhookId } = params;
  
  if (!webhookId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Webhook ID is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Getting webhook details', { webhookId });
  
  try {
    const webhook = await apiClient.getWebhook(webhookId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Webhook Details:
ID: ${webhook.id}
Name: ${webhook.name || 'Unnamed'}
Endpoint: ${webhook.endpoint}
Events: ${webhook.events?.join(', ') || 'None'}
Authorization: ${webhook.authorization_header ? 'Configured' : 'Not configured'}
Created: ${webhook.created_at}
Updated: ${webhook.updated_at}`
      }],
    };
  } catch (error) {
    logger.error('Error getting webhook', { 
      webhookId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting webhook: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Webhook with ID "${webhookId}" not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle update webhook
 */
async function handleUpdateWebhook(
  params: {
    webhookId: string;
    endpoint?: string;
    name?: string;
    events?: string[];
    authorization_header?: string;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { webhookId, ...updates } = params;
  
  if (!webhookId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Webhook ID is required.'
      }],
      isError: true,
    };
  }
  
  if (Object.keys(updates).length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided. Specify endpoint, name, events, or authorization_header to update.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating webhook', { webhookId, updates: Object.keys(updates) });
  
  try {
    const webhook = await apiClient.updateWebhook(webhookId, updates);
    
    const updatedFields = Object.keys(updates).join(', ');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated webhook "${webhook.name || 'Unnamed'}". Updated fields: ${updatedFields}`
      }],
    };
  } catch (error) {
    logger.error('Error updating webhook', { 
      webhookId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating webhook: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Webhook with ID "${webhookId}" not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle delete webhook
 */
async function handleDeleteWebhook(
  params: { webhookId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { webhookId } = params;
  
  if (!webhookId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Webhook ID is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting webhook', { webhookId });
  
  try {
    await apiClient.deleteWebhook(webhookId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted webhook with ID: ${webhookId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting webhook', { 
      webhookId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting webhook: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Webhook with ID "${webhookId}" not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}