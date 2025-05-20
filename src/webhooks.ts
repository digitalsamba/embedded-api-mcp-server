/**
 * Webhook handler for Digital Samba MCP Server
 * 
 * This module implements a comprehensive webhook system for the Digital Samba API,
 * allowing the MCP server to receive real-time events from Digital Samba
 * and propagate them to connected MCP clients. It provides:
 * 
 * - Webhook endpoint registration and management
 * - Webhook event processing and validation
 * - Event signature verification for security
 * - Client notification for real-time updates
 * - Tools for managing webhooks through the MCP interface
 * 
 * @module webhooks
 * @author Digital Samba Team
 * @version 0.1.0
 */
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'crypto';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { getApiKeyFromRequest } from './auth.js';
import {
  AuthenticationError,
  ApiRequestError,
  ApiResponseError,
  ResourceNotFoundError,
  ValidationError,
  ConfigurationError
} from './errors.js';

// Define webhook event types
export enum WebhookEventType {
  // Room events
  ROOM_CREATED = 'room.created',
  ROOM_UPDATED = 'room.updated',
  ROOM_DELETED = 'room.deleted',
  
  // Session events
  SESSION_STARTED = 'session.started',
  SESSION_ENDED = 'session.ended',
  
  // Participant events
  PARTICIPANT_JOINED = 'participant.joined',
  PARTICIPANT_LEFT = 'participant.left',
  
  // Recording events
  RECORDING_STARTED = 'recording.started',
  RECORDING_STOPPED = 'recording.stopped',
  RECORDING_READY = 'recording.ready',
  
  // Chat events
  CHAT_MESSAGE = 'chat.message',
  
  // Poll events
  POLL_CREATED = 'poll.created',
  POLL_UPDATED = 'poll.updated',
  POLL_DELETED = 'poll.deleted',
  
  // Q&A events
  QUESTION_ASKED = 'qa.question',
  QUESTION_ANSWERED = 'qa.answer',
}

// Define webhook payload interface
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

// Webhook configuration
interface WebhookConfig {
  secret?: string;  // For verifying webhook signatures
  endpoint: string; // Endpoint path for receiving webhooks
}

// Webhook event handler type
type WebhookEventHandler = (payload: WebhookPayload) => Promise<void>;

/**
 * Webhook service for handling Digital Samba events
 * 
 * This class provides the core functionality for receiving, processing, and
 * propagating webhook events from the Digital Samba API. It manages event
 * handlers, signature verification, and client notifications.
 * 
 * @class
 * @example
 * const webhookService = new WebhookService(mcpServer, {
 *   secret: process.env.WEBHOOK_SECRET,
 *   endpoint: '/webhooks/digitalsamba'
 * });
 * 
 * // Register an event handler
 * webhookService.on(WebhookEventType.RECORDING_READY, async (payload) => {
*   logger.info('Recording is ready:', payload.data.id);
* });
 * 
 * // Register the webhook endpoint with Express
 * webhookService.registerWebhookEndpoint(app);
 */
export class WebhookService {
  private server: McpServer;
  private config: WebhookConfig;
  private eventHandlers: Map<WebhookEventType, WebhookEventHandler[]> = new Map();
  
  /**
   * Create a new webhook service
   * 
   * @constructor
   * @param {McpServer} server - The MCP server instance for notifications
   * @param {WebhookConfig} config - Configuration for the webhook service
   * @param {string} [config.secret] - Secret for verifying webhook signatures
   * @param {string} config.endpoint - HTTP endpoint path for receiving webhooks
   */
  constructor(server: McpServer, config: WebhookConfig) {
    this.server = server;
    this.config = config;
    
    // Initialize event handlers map with empty arrays for each event type
    Object.values(WebhookEventType).forEach(eventType => {
      this.eventHandlers.set(eventType as WebhookEventType, []);
    });
  }
  
  /**
   * Register the webhook endpoint with the Express app
   * 
   * This method sets up the HTTP route that will receive webhook events from
   * the Digital Samba API and process them through the webhook service.
   * 
   * @param {express.Application} app - Express application instance
   * @returns {void}
   */
  public registerWebhookEndpoint(app: express.Application): void {
    logger.info(`Registering webhook endpoint at ${this.config.endpoint}`);
    
    app.post(this.config.endpoint, this.handleWebhookRequest.bind(this));
  }
  
  /**
   * Handle incoming webhook requests
   * 
   * This method processes HTTP requests to the webhook endpoint. It verifies
   * signatures if a secret is configured, validates the payload, and triggers
   * event processing.
   * 
   * @private
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>}
   */
  private async handleWebhookRequest(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Received webhook request', {
        contentLength: req.headers['content-length'],
        contentType: req.headers['content-type']
      });
      
      // Verify webhook signature if secret is configured
      if (this.config.secret) {
        const signature = req.headers['x-digitalsamba-signature'] as string;
        if (!signature) {
          const error = new AuthenticationError('Missing webhook signature');
          logger.warn(error.message);
          res.status(401).json({ error: error.message });
          return;
        }
        
        if (!this.verifySignature(req, signature)) {
          const error = new AuthenticationError('Invalid webhook signature');
          logger.warn(error.message);
          res.status(401).json({ error: error.message });
          return;
        }
      }
      
      // Parse webhook payload
      const payload = req.body as WebhookPayload;
      if (!payload || !payload.event) {
        const error = new ValidationError('Invalid webhook payload', {
          validationErrors: {
            'payload': 'Webhook payload must contain an event property'
          }
        });
        logger.warn(error.message, { payload });
        res.status(400).json({ 
          error: error.message,
          details: error.validationErrors
        });
        return;
      }
      
      logger.info(`Processing webhook event: ${payload.event}`, {
        event: payload.event,
        timestamp: payload.timestamp
      });
      
      // Process the webhook event
      await this.processWebhookEvent(payload);
      
      // Respond with success
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('Error processing webhook', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Respond with appropriate status code based on error type
      if (!res.headersSent) {
        if (error instanceof AuthenticationError) {
          res.status(401).json({ error: error.message });
        }
        else if (error instanceof ValidationError) {
          res.status(400).json({ 
            error: error.message,
            details: error.validationErrors
          });
        }
        else if (error instanceof ApiResponseError) {
          res.status(error.statusCode).json({
            error: error.message,
            apiError: error.apiErrorMessage,
            details: error.apiErrorData
          });
        }
        else if (error instanceof ResourceNotFoundError) {
          res.status(404).json({
            error: error.message,
            resourceType: error.resourceType,
            resourceId: error.resourceId
          });
        }
        else {
          // Default server error
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  }
  
  /**
   * Verify the webhook signature
   * 
   * Uses HMAC-SHA256 to verify that the webhook was sent by Digital Samba
   * and that the payload hasn't been tampered with.
   * 
   * @private
   * @param {Request} req - Express request object
   * @param {string} signature - Signature from the X-DigitalSamba-Signature header
   * @returns {boolean} True if signature is valid, false otherwise
   */
  private verifySignature(req: Request, signature: string): boolean {
    if (!this.config.secret) {
      return true; // No verification if no secret configured
    }
    
    try {
      // Create HMAC using the secret
      const hmac = crypto.createHmac('sha256', this.config.secret);
      
      // Update with request body (as string)
      const body = typeof req.body === 'string' 
        ? req.body 
        : JSON.stringify(req.body);
      
      hmac.update(body);
      
      // Get the digest
      const calculatedSignature = hmac.digest('hex');
      
      // Compare with the provided signature
      return crypto.timingSafeEqual(
        Buffer.from(calculatedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new AuthenticationError(`Error verifying webhook signature: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error instanceof Error ? error : undefined
      });
    }
  }
  
  /**
   * Process a webhook event
   * 
   * Executes all registered handlers for the event type and notifies MCP clients.
   * 
   * @private
   * @param {WebhookPayload} payload - The webhook event payload
   * @returns {Promise<void>}
   */
  private async processWebhookEvent(payload: WebhookPayload): Promise<void> {
    const { event } = payload;
    const handlers = this.eventHandlers.get(event as WebhookEventType);
    
    if (!handlers || handlers.length === 0) {
      logger.debug(`No handlers registered for event: ${event}`);
      return;
    }
    
    logger.debug(`Executing ${handlers.length} handlers for event: ${event}`);
    
    // Execute all registered handlers
    const promises = handlers.map(handler => handler(payload));
    await Promise.all(promises);
    
    // Notify MCP clients about the event
    await this.notifyMcpClients(payload);
  }
  
  /**
   * Register a handler for a specific event type
   * 
   * Allows custom logic to be executed when specific webhook events are received.
   * 
   * @public
   * @param {WebhookEventType} event - The event type to listen for
   * @param {WebhookEventHandler} handler - Function to execute when event occurs
   * @returns {void}
   * @example
   * webhookService.on(WebhookEventType.RECORDING_READY, async (payload) => {
*   logger.info(`Recording ${payload.data.id} is ready for viewing`);
*   // Custom logic for when a recording is ready
* });
   */
  public on(event: WebhookEventType, handler: WebhookEventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    
    logger.debug(`Registered handler for event: ${event}`);
  }
  
  /**
   * Notify MCP clients about a webhook event
   * 
   * Sends a notification to all connected MCP clients about the webhook event.
   * This allows clients to receive real-time updates about Digital Samba events.
   * 
   * @private
   * @param {WebhookPayload} payload - The webhook event payload
   * @returns {Promise<void>}
   */
  private async notifyMcpClients(payload: WebhookPayload): Promise<void> {
    try {
      logger.debug(`Notifying MCP clients about event: ${payload.event}`);
      
      // Create notification message based on event type
      const notification = this.createNotificationForEvent(payload);
      
      // Send notification to all connected clients
      // Note: Different versions of MCP SDK might have different notification methods
      try {
        // Use a type assertion to access potentially private properties
        const mcpServer = this.server as any;
        
        // Try different methods for sending notifications based on SDK version
        if (typeof mcpServer.notification === 'function') {
          // Newer SDK version
          await mcpServer.notification({
            method: 'digitalsambaEvent',
            params: notification
          });
          logger.debug('Sent notification using server.notification');
        } 
        else if (mcpServer.server && typeof mcpServer.server.notification === 'function') {
          // Older SDK version
          await mcpServer.server.notification({
            method: 'digitalsambaEvent',
            params: notification
          });
          logger.debug('Sent notification using server.server.notification');
        }
        else {
          // No notification method found
          const error = new ConfigurationError('Unable to send notification: notification method not found');
          logger.warn(error.message);
          throw error;
        }
      } catch (notifyError) {
        logger.error('Error during notification send', {
          error: notifyError instanceof Error ? notifyError.message : String(notifyError)
        });
        
        throw new ApiRequestError(`Failed to send notification: ${notifyError instanceof Error ? notifyError.message : String(notifyError)}`, {
          cause: notifyError instanceof Error ? notifyError : undefined
        });
      }
      
      logger.debug('Notification process completed');
    } catch (error) {
      logger.error('Error in notifyMcpClients', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }
  
  /**
   * Create a notification object based on the event type
   * 
   * Formats the webhook payload into a structured notification object
   * based on the event type, extracting relevant fields for each event category.
   * 
   * @private
   * @param {WebhookPayload} payload - The webhook event payload
   * @returns {Object} Formatted notification object
   */
  private createNotificationForEvent(payload: WebhookPayload): any {
    const { event, data } = payload;
    
    // Create a base notification with common fields
    const notification = {
      event,
      timestamp: payload.timestamp,
      data: {}
    };
    
    // Add specific fields based on event type
    switch (event) {
      case WebhookEventType.ROOM_CREATED:
      case WebhookEventType.ROOM_UPDATED:
      case WebhookEventType.ROOM_DELETED:
        notification.data = {
          roomId: data.id,
          room: data
        };
        break;
        
      case WebhookEventType.SESSION_STARTED:
      case WebhookEventType.SESSION_ENDED:
        notification.data = {
          sessionId: data.id,
          roomId: data.room_id,
          session: data
        };
        break;
        
      case WebhookEventType.PARTICIPANT_JOINED:
      case WebhookEventType.PARTICIPANT_LEFT:
        notification.data = {
          participantId: data.id,
          roomId: data.room_id,
          sessionId: data.session_id,
          participant: data
        };
        break;
        
      case WebhookEventType.RECORDING_STARTED:
      case WebhookEventType.RECORDING_STOPPED:
      case WebhookEventType.RECORDING_READY:
        notification.data = {
          recordingId: data.id,
          roomId: data.room_id,
          sessionId: data.session_id,
          recording: data
        };
        break;
        
      case WebhookEventType.CHAT_MESSAGE:
        notification.data = {
          messageId: data.id,
          roomId: data.room_id,
          participantId: data.participant_id,
          message: data
        };
        break;
        
      case WebhookEventType.POLL_CREATED:
      case WebhookEventType.POLL_UPDATED:
      case WebhookEventType.POLL_DELETED:
        notification.data = {
          pollId: data.id,
          roomId: data.room_id,
          poll: data
        };
        break;
        
      case WebhookEventType.QUESTION_ASKED:
      case WebhookEventType.QUESTION_ANSWERED:
        notification.data = {
          questionId: data.id,
          roomId: data.room_id,
          participantId: data.participant_id,
          question: data
        };
        break;
        
      default:
        // For unknown events, include the entire data payload
        notification.data = data;
    }
    
    return notification;
  }
  
  /**
   * Register or update a webhook with Digital Samba API
   * 
   * Creates a new webhook registration or updates an existing one with
   * the Digital Samba API, specifying which events to subscribe to.
   * 
   * @public
   * @param {string} apiKey - Digital Samba API key
   * @param {string} apiBaseUrl - Base URL for the Digital Samba API
   * @param {string} webhookUrl - URL where webhook events should be sent
   * @param {WebhookEventType[]} [eventTypes] - Event types to subscribe to (defaults to all)
   * @returns {Promise<void>}
   * @throws Will throw an error if the API request fails
   */
  public async registerWebhook(
    apiKey: string, 
    apiBaseUrl: string,
    webhookUrl: string,
    eventTypes: WebhookEventType[] = Object.values(WebhookEventType) as WebhookEventType[]
  ): Promise<void> {
    try {
      // Validate input parameters
      if (!apiKey) {
        throw new AuthenticationError('API key is required for webhook registration');
      }
      
      if (!webhookUrl) {
        throw new ValidationError('Webhook URL is required', {
          validationErrors: { webhookUrl: 'Webhook URL cannot be empty' }
        });
      }
      
      if (!apiBaseUrl) {
        throw new ValidationError('API base URL is required', {
          validationErrors: { apiBaseUrl: 'API base URL cannot be empty' }
        });
      }
      
      logger.info('Registering webhook with Digital Samba API', {
        webhookUrl,
        eventCount: eventTypes.length
      });
      
      // Create API client with the provided key
      const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
      
      try {
        // Get existing webhooks
        const webhooks = await client.listWebhooks();
        
        // Check if a webhook already exists for this URL
        const existingWebhook = webhooks.data.find(webhook => webhook.endpoint === webhookUrl);
        
        if (existingWebhook) {
          // Update existing webhook
          logger.info('Updating existing webhook', { webhookId: existingWebhook.id });
          
          await client.updateWebhook(existingWebhook.id, {
            endpoint: webhookUrl,
            events: eventTypes as unknown as string[],
            name: 'MCP Server Webhook'
          });
        } else {
          // Create new webhook
          logger.info('Creating new webhook');
          
          await client.createWebhook({
            endpoint: webhookUrl,
            events: eventTypes as unknown as string[],
            name: 'MCP Server Webhook'
          });
        }
        
        logger.info('Webhook registration successful');
      } catch (error) {
        // Handle API-specific errors
        if (error instanceof Error) {
          if ('statusCode' in error) {
            const statusCode = (error as any).statusCode;
            const errorMessage = error.message;
            
            if (statusCode === 401 || statusCode === 403) {
              throw new AuthenticationError(`Authentication failed during webhook registration: ${errorMessage}`, {
                cause: error
              });
            }
            
            if (statusCode === 404) {
              throw new ResourceNotFoundError('Resource not found during webhook registration', {
                resourceId: 'webhook',
                resourceType: 'webhook',
                cause: error
              });
            }
            
            throw new ApiResponseError(`API error during webhook registration`, {
              statusCode,
              apiErrorMessage: errorMessage,
              cause: error
            });
          }
        }
        
        // Default error handling
        throw new ApiRequestError(`Error registering webhook: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    } catch (error) {
      logger.error('Error registering webhook', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Delete a webhook with Digital Samba API
   * 
   * Deletes a webhook registration with the Digital Samba API based on the URL.
   * 
   * @public
   * @param {string} apiKey - Digital Samba API key
   * @param {string} apiBaseUrl - Base URL for the Digital Samba API
   * @param {string} webhookUrl - URL of the webhook to delete
   * @returns {Promise<void>}
   * @throws Will throw an error if the API request fails
   */
  public async deleteWebhook(
    apiKey: string,
    apiBaseUrl: string,
    webhookUrl: string
  ): Promise<void> {
    try {
      // Validate input parameters
      if (!apiKey) {
        throw new AuthenticationError('API key is required for webhook deletion');
      }
      
      if (!webhookUrl) {
        throw new ValidationError('Webhook URL is required', {
          validationErrors: { webhookUrl: 'Webhook URL cannot be empty' }
        });
      }
      
      if (!apiBaseUrl) {
        throw new ValidationError('API base URL is required', {
          validationErrors: { apiBaseUrl: 'API base URL cannot be empty' }
        });
      }
      
      logger.info('Deleting webhook from Digital Samba API', { webhookUrl });
      
      // Create API client with the provided key
      const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
      
      try {
        // Get existing webhooks
        const webhooks = await client.listWebhooks();
        
        // Find webhook for this URL
        const existingWebhook = webhooks.data.find(webhook => webhook.endpoint === webhookUrl);
        
        if (existingWebhook) {
          // Delete the webhook
          logger.info('Deleting webhook', { webhookId: existingWebhook.id });
          await client.deleteWebhook(existingWebhook.id);
          logger.info('Webhook deletion successful');
        } else {
          logger.info('No webhook found for the specified URL');
          throw new ResourceNotFoundError('No webhook found for the specified URL', {
            resourceId: webhookUrl,
            resourceType: 'webhook'
          });
        }
      } catch (error) {
        // Handle API-specific errors
        if (error instanceof ResourceNotFoundError) {
          // Re-throw ResourceNotFoundError
          throw error;
        }
        
        if (error instanceof Error) {
          if ('statusCode' in error) {
            const statusCode = (error as any).statusCode;
            const errorMessage = error.message;
            
            if (statusCode === 401 || statusCode === 403) {
              throw new AuthenticationError(`Authentication failed during webhook deletion: ${errorMessage}`, {
                cause: error
              });
            }
            
            if (statusCode === 404) {
              throw new ResourceNotFoundError('Webhook not found', {
                resourceId: webhookUrl,
                resourceType: 'webhook',
                cause: error
              });
            }
            
            throw new ApiResponseError(`API error during webhook deletion`, {
              statusCode,
              apiErrorMessage: errorMessage,
              cause: error
            });
          }
        }
        
        // Default error handling
        throw new ApiRequestError(`Error deleting webhook: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    } catch (error) {
      logger.error('Error deleting webhook', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

/**
 * Create webhook handling tools for MCP server
 * 
 * Sets up MCP tools for managing webhooks, including registration, deletion,
 * and listing of webhooks and available event types. These tools allow clients
 * to interact with the webhook system through the MCP interface.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {WebhookService} webhookService - The webhook service instance
 * @param {string} apiBaseUrl - Base URL for the Digital Samba API
 * @returns {void}
 */
export function setupWebhookTools(
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
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        const { webhookUrl, events } = params;
        
        if (!apiKey) {
          throw new AuthenticationError('API key is required for webhook registration');
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
        
        let errorResponse: { text: string, isError: boolean } = {
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
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        const { webhookUrl } = params;
        
        if (!apiKey) {
          throw new AuthenticationError('API key is required for webhook deletion');
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
        
        let errorResponse: { text: string, isError: boolean } = {
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
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required for listing webhooks');
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
        
        let errorResponse: { text: string, isError: boolean } = {
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
        // Get API key from the context
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required for listing webhook events');
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
        
        let errorResponse: { text: string, isError: boolean } = {
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

export default WebhookService;