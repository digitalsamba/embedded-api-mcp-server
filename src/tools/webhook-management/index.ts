/**
 * Digital Samba MCP Server - Webhook Management Tools
 * 
 * This module implements MCP tools for managing Digital Samba webhooks.
 * It provides tools for webhook registration, deletion, listing, and event discovery.
 * 
 * @module tools/webhook-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { getApiKeyFromRequest } from '../../auth.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import {
  AuthenticationError,
  ApiResponseError,
  ResourceNotFoundError,
  ValidationError
} from '../../errors.js';
import logger from '../../logger.js';

// Import webhook types and service
import { WebhookEventType } from '../../webhooks/webhook-types.js';
import { WebhookService } from '../../webhooks/webhook-service.js';

/**
 * Set up webhook management tools for the MCP server
 * 
 * This function registers all webhook-related tools with the MCP server.
 * It provides tools for webhook registration, deletion, listing, and event discovery.
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
  // Tool for registering a webhook
  server.tool(
    'register-webhook',
    {
      webhookUrl: {
        type: 'string',
        description: 'The URL where Digital Samba will send webhook events'
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: Object.values(WebhookEventType)
        },
        description: 'Event types to subscribe to',
        optional: true
      }
    },
    async (params, request) => {
      try {
        // Verify request is defined and properly initialized
        if (!request) {
          throw new Error('Request object is undefined');
        }
        
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        const { webhookUrl, events } = params;
        
        if (!apiKey) {
          throw new AuthenticationError('API key is required for webhook registration. Please provide a Bearer token in the Authorization header or set DIGITAL_SAMBA_API_KEY environment variable.');
        }
        
        if (!webhookUrl) {
          throw new ValidationError('Webhook URL is required', {
            validationErrors: { webhookUrl: 'Webhook URL cannot be empty' }
          });
        }
        
        // Register the webhook
        await webhookService.registerWebhook(
          apiKey,
          apiBaseUrl,
          webhookUrl,
          events as WebhookEventType[]
        );
        
        return {
          content: [{
            type: 'text',
            text: `Webhook registered successfully at ${webhookUrl}`,
          }],
        };
      } catch (error) {
        logger.error('Error in register-webhook tool', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        const errorResponse: { text: string, isError: boolean } = {
          text: `Error registering webhook: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        };
        
        // Customize error response based on error type
        if (error instanceof AuthenticationError) {
          errorResponse.text = error.message;
        } else if (error instanceof ValidationError) {
          errorResponse.text = error.message;
          
          // If we have validation errors, add them to the message
          if (Object.keys(error.validationErrors).length > 0) {
            errorResponse.text += '\n\nValidation errors:';
            for (const [field, message] of Object.entries(error.validationErrors)) {
              errorResponse.text += `\n- ${field}: ${message}`;
            }
          }
        } else if (error instanceof ResourceNotFoundError) {
          errorResponse.text = `Resource not found: ${error.resourceType} with ID ${error.resourceId} does not exist`;
        } else if (error instanceof ApiResponseError) {
          // Handle specific status codes with user-friendly messages
          if (error.statusCode === 404) {
            errorResponse.text = `Resource not found: ${error.apiErrorMessage}`;
          } else if (error.statusCode === 403) {
            errorResponse.text = `Authentication error: Insufficient permissions to register webhook`;
          } else if (error.statusCode === 400) {
            errorResponse.text = `Validation error: ${error.apiErrorMessage}`;
          } else {
            errorResponse.text = `API error (${error.statusCode}): ${error.apiErrorMessage}`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorResponse.text,
            },
          ],
          isError: errorResponse.isError,
        };
      }
    }
  );
  
  // Tool for deleting a webhook
  server.tool(
    'delete-webhook',
    {
      webhookUrl: {
        type: 'string',
        description: 'The URL of the webhook to delete'
      }
    },
    async (params, request) => {
      try {
        // Verify request is defined and properly initialized
        if (!request) {
          throw new Error('Request object is undefined');
        }
        
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        const { webhookUrl } = params;
        
        if (!apiKey) {
          throw new AuthenticationError('API key is required for webhook deletion. Please provide a Bearer token in the Authorization header or set DIGITAL_SAMBA_API_KEY environment variable.');
        }
        
        if (!webhookUrl) {
          throw new ValidationError('Webhook URL is required', {
            validationErrors: { webhookUrl: 'Webhook URL cannot be empty' }
          });
        }
        
        // Delete the webhook
        await webhookService.deleteWebhook(
          apiKey,
          apiBaseUrl,
          webhookUrl
        );
        
        return {
          content: [{
            type: 'text',
            text: `Webhook at ${webhookUrl} deleted successfully.`,
          }],
        };
      } catch (error) {
        logger.error('Error in delete-webhook tool', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        const errorResponse: { text: string, isError: boolean } = {
          text: `Error deleting webhook: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        };
        
        // Customize error response based on error type
        if (error instanceof AuthenticationError) {
          errorResponse.text = error.message;
        } else if (error instanceof ValidationError) {
          errorResponse.text = error.message;
          
          // If we have validation errors, add them to the message
          if (Object.keys(error.validationErrors).length > 0) {
            errorResponse.text += '\n\nValidation errors:';
            for (const [field, message] of Object.entries(error.validationErrors)) {
              errorResponse.text += `\n- ${field}: ${message}`;
            }
          }
        } else if (error instanceof ResourceNotFoundError) {
          errorResponse.text = `Webhook not found: No webhook exists at ${params.webhookUrl}`;
        } else if (error instanceof ApiResponseError) {
          // Handle specific status codes with user-friendly messages
          if (error.statusCode === 404) {
            errorResponse.text = `Webhook not found: ${error.apiErrorMessage}`;
          } else if (error.statusCode === 403) {
            errorResponse.text = `Authentication error: Insufficient permissions to delete webhook`;
          } else {
            errorResponse.text = `API error (${error.statusCode}): ${error.apiErrorMessage}`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorResponse.text,
            },
          ],
          isError: errorResponse.isError,
        };
      }
    }
  );
  
  // Tool for listing webhooks
  server.tool(
    'list-webhooks',
    {},
    async (params, request) => {
      try {
        // Verify request is defined and properly initialized
        if (!request) {
          throw new Error('Request object is undefined');
        }
        
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required for listing webhooks. Please provide a Bearer token in the Authorization header or set DIGITAL_SAMBA_API_KEY environment variable.');
        }
        
        // Create API client with the provided key
        const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
        
        // Get webhooks
        const webhooks = await client.listWebhooks();
        
        if (webhooks.data.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No webhooks found.',
            }],
          };
        }
        
        const webhookList = webhooks.data.map(webhook => {
          return `ID: ${webhook.id}\nURL: ${webhook.endpoint}\nName: ${webhook.name || 'N/A'}\nEvents: ${webhook.events?.join(', ') || 'All'}\nCreated: ${webhook.created_at}\n`;
        }).join('\n---\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Found ${webhooks.data.length} webhooks:\n\n${webhookList}`,
          }],
        };
      } catch (error) {
        logger.error('Error in list-webhooks tool', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        const errorResponse: { text: string, isError: boolean } = {
          text: `Error listing webhooks: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        };
        
        // Customize error response based on error type
        if (error instanceof AuthenticationError) {
          errorResponse.text = error.message;
        } else if (error instanceof ApiResponseError) {
          if (error.statusCode === 403) {
            errorResponse.text = `Authentication error: Insufficient permissions to list webhooks`;
          } else {
            errorResponse.text = `API error (${error.statusCode}): ${error.apiErrorMessage}`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorResponse.text,
            },
          ],
          isError: errorResponse.isError,
        };
      }
    }
  );
  
  // Tool for listing available webhook event types
  server.tool(
    'list-webhook-events',
    {},
    async (params, request) => {
      try {
        // Verify request is defined and properly initialized
        if (!request) {
          throw new Error('Request object is undefined');
        }
        
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required for listing webhook events. Please provide a Bearer token in the Authorization header or set DIGITAL_SAMBA_API_KEY environment variable.');
        }
        
        // Create API client with the provided key
        const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
        
        // Get available event types
        const events = await client.listWebhookEvents();
        
        // Group events by category
        const categories: Record<string, string[]> = {};
        
        events.forEach(event => {
          const category = event.split('.')[0];
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push(event);
        });
        
        // Format the output
        let output = 'Available webhook event types:\n\n';
        
        Object.entries(categories).forEach(([category, eventList]) => {
          output += `${category.toUpperCase()} EVENTS:\n`;
          eventList.forEach(event => {
            output += `- ${event}\n`;
          });
          output += '\n';
        });
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      } catch (error) {
        logger.error('Error in list-webhook-events tool', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        const errorResponse: { text: string, isError: boolean } = {
          text: `Error listing webhook events: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        };
        
        // Customize error response based on error type
        if (error instanceof AuthenticationError) {
          errorResponse.text = error.message;
        } else if (error instanceof ApiResponseError) {
          if (error.statusCode === 403) {
            errorResponse.text = `Authentication error: Insufficient permissions to list webhook events`;
          } else {
            errorResponse.text = `API error (${error.statusCode}): ${error.apiErrorMessage}`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorResponse.text,
            },
          ],
          isError: errorResponse.isError,
        };
      }
    }
  );
}