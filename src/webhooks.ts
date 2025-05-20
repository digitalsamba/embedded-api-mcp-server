/**
 * Webhook handler for Digital Samba MCP Server
 * 
 * This module implements webhook handling for the Digital Samba API,
 * allowing the MCP server to receive real-time events from Digital Samba
 * and propagate them to connected MCP clients.
 */
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'crypto';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import apiKeyContext, { getApiKeyFromRequest } from './auth.js';

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
 */
export class WebhookService {
  private server: McpServer;
  private config: WebhookConfig;
  private eventHandlers: Map<WebhookEventType, WebhookEventHandler[]> = new Map();
  
  /**
   * Create a new webhook service
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
   */
  public registerWebhookEndpoint(app: express.Application): void {
    logger.info(`Registering webhook endpoint at ${this.config.endpoint}`);
    
    app.post(this.config.endpoint, this.handleWebhookRequest.bind(this));
  }
  
  /**
   * Handle incoming webhook requests
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
          logger.warn('Missing webhook signature');
          res.status(401).json({ error: 'Missing webhook signature' });
          return;
        }
        
        if (!this.verifySignature(req, signature)) {
          logger.warn('Invalid webhook signature');
          res.status(401).json({ error: 'Invalid webhook signature' });
          return;
        }
      }
      
      // Parse webhook payload
      const payload = req.body as WebhookPayload;
      if (!payload || !payload.event) {
        logger.warn('Invalid webhook payload', { payload });
        res.status(400).json({ error: 'Invalid webhook payload' });
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
      
      // Respond with error
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
  
  /**
   * Verify the webhook signature
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
      return false;
    }
  }
  
  /**
   * Process a webhook event
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
   */
  public on(event: WebhookEventType, handler: WebhookEventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    
    logger.debug(`Registered handler for event: ${event}`);
  }
  
  /**
   * Notify MCP clients about a webhook event
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
          logger.warn('Unable to send notification: notification method not found');
        }
      } catch (notifyError) {
        logger.error('Error during notification send', {
          error: notifyError instanceof Error ? notifyError.message : String(notifyError)
        });
      }
      
      logger.debug('Notification process completed');
    } catch (error) {
      logger.error('Error in notifyMcpClients', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Create a notification object based on the event type
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
   */
  public async registerWebhook(
    apiKey: string, 
    apiBaseUrl: string,
    webhookUrl: string,
    eventTypes: WebhookEventType[] = Object.values(WebhookEventType) as WebhookEventType[]
  ): Promise<void> {
    try {
      logger.info('Registering webhook with Digital Samba API', {
        webhookUrl,
        eventCount: eventTypes.length
      });
      
      // Create API client with the provided key
      const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
      
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
      logger.error('Error registering webhook', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Delete a webhook with Digital Samba API
   */
  public async deleteWebhook(
    apiKey: string,
    apiBaseUrl: string,
    webhookUrl: string
  ): Promise<void> {
    try {
      logger.info('Deleting webhook from Digital Samba API', { webhookUrl });
      
      // Create API client with the provided key
      const client = new DigitalSambaApiClient(apiKey, apiBaseUrl);
      
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
      // Get API key from the context
      const apiKey = getApiKeyFromRequest(request);
      const { webhookUrl, events } = params;
      
      if (!apiKey) {
        return {
          content: [{ type: 'text', text: 'API key is required for webhook registration.' }],
          isError: true,
        };
      }
      
      if (!webhookUrl) {
        return {
          content: [{ type: 'text', text: 'Webhook URL is required.' }],
          isError: true,
        };
      }
      
      try {
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
        
        return {
          content: [{
            type: 'text',
            text: `Error registering webhook: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
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
      // Get API key from the context
      const apiKey = getApiKeyFromRequest(request);
      const { webhookUrl } = params;
      
      if (!apiKey) {
        return {
          content: [{ type: 'text', text: 'API key is required for webhook deletion.' }],
          isError: true,
        };
      }
      
      if (!webhookUrl) {
        return {
          content: [{ type: 'text', text: 'Webhook URL is required.' }],
          isError: true,
        };
      }
      
      try {
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
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting webhook: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // Tool for listing webhooks
  server.tool(
    'list-webhooks',
    {},
    async (params, request) => {
      // Get API key from the context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ type: 'text', text: 'API key is required for listing webhooks.' }],
          isError: true,
        };
      }
      
      try {
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
        
        return {
          content: [{
            type: 'text',
            text: `Error listing webhooks: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // Tool for listing available webhook event types
  server.tool(
    'list-webhook-events',
    {},
    async (params, request) => {
      // Get API key from the context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ type: 'text', text: 'API key is required for listing webhook events.' }],
          isError: true,
        };
      }
      
      try {
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
        
        return {
          content: [{
            type: 'text',
            text: `Error listing webhook events: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}

export default WebhookService;