/**
 * Unit tests for Webhooks module
 * 
 * This file contains tests for the WebhookService class and the setupWebhookTools function,
 * ensuring that webhook handling, event processing, and error handling work as expected.
 * 
 * @group unit
 * @group webhooks
 */

import { WebhookService, WebhookEventType, setupWebhookTools } from '../../src/webhooks';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  AuthenticationError,
  ApiRequestError,
  ApiResponseError,
  ResourceNotFoundError,
  ValidationError,
  ConfigurationError
} from '../../src/errors';

// Mock the DigitalSambaApiClient
jest.mock('../../src/digital-samba-api', () => {
  return {
    DigitalSambaApiClient: jest.fn().mockImplementation(() => {
      return {
        listWebhooks: jest.fn().mockResolvedValue({ data: [] }),
        createWebhook: jest.fn().mockResolvedValue({ id: 'new-webhook-id' }),
        updateWebhook: jest.fn().mockResolvedValue({ id: 'updated-webhook-id' }),
        deleteWebhook: jest.fn().mockResolvedValue({}),
        listWebhookEvents: jest.fn().mockResolvedValue([
          'room.created',
          'participant.joined',
          'recording.started'
        ])
      };
    })
  };
});

// Mock the logger
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the getApiKeyFromRequest function
jest.mock('../../src/auth', () => ({
  getApiKeyFromRequest: jest.fn().mockReturnValue('test-api-key')
}));

// Mock Express Request and Response
const mockRequest = () => {
  const req = {} as Request;
  req.body = {};
  req.headers = {};
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  res.headersSent = false;
  return res;
};

// Mock crypto.createHmac
jest.mock('crypto', () => {
  const originalModule = jest.requireActual('crypto');
  
  return {
    ...originalModule,
    createHmac: jest.fn().mockImplementation(() => {
      return {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('valid-signature', 'hex'))
      };
    }),
    timingSafeEqual: jest.fn().mockReturnValue(true)
  };
});

describe('WebhookService', () => {
  let server: McpServer;
  let webhookService: WebhookService;
  const apiBaseUrl = 'https://api.example.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock McpServer
    server = {
      notification: jest.fn().mockResolvedValue(true)
    } as unknown as McpServer;
    
    // Create a WebhookService with the mock server
    webhookService = new WebhookService(server, {
      endpoint: '/webhooks/test',
      secret: 'test-secret'
    });
  });
  
  describe('Constructor', () => {
    it('should create an instance with valid config', () => {
      const service = new WebhookService(server, {
        endpoint: '/webhooks/test',
        secret: 'test-secret'
      });
      
      expect(service).toBeInstanceOf(WebhookService);
    });
    
    it('should initialize event handlers for all event types', () => {
      // Access the private eventHandlers property using type assertion
      const eventHandlers = (webhookService as any).eventHandlers;
      
      // Check that it has entries for all event types
      Object.values(WebhookEventType).forEach(eventType => {
        expect(eventHandlers.has(eventType)).toBe(true);
        expect(eventHandlers.get(eventType)).toEqual([]);
      });
    });
  });
  
  describe('registerWebhookEndpoint', () => {
    it('should register the webhook endpoint with Express', () => {
      const app = {
        post: jest.fn()
      } as any;
      
      webhookService.registerWebhookEndpoint(app);
      
      expect(app.post).toHaveBeenCalled();
      const [path, handler] = app.post.mock.calls[0];
      expect(path).toBe('/webhooks/test');
      expect(typeof handler).toBe('function');
    });
  });
  
  describe('handleWebhookRequest', () => {
    it('should process valid webhook requests successfully', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a valid webhook request
      req.headers['x-digitalsamba-signature'] = 'valid-signature';
      req.body = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the processWebhookEvent method
      const processWebhookEventSpy = jest.spyOn(webhookService as any, 'processWebhookEvent')
        .mockResolvedValue(undefined);
      
      // Call the method directly using type assertion to access private method
      await (webhookService as any).handleWebhookRequest(req, res);
      
      // Verify that the response was correct
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
      
      // Verify that processWebhookEvent was called
      expect(processWebhookEventSpy).toHaveBeenCalledWith(req.body);
    });
    
    it('should handle missing signature when secret is configured', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a request with missing signature
      req.body = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Call the method directly
      await (webhookService as any).handleWebhookRequest(req, res);
      
      // Verify that the response was an error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Missing webhook signature') })
      );
    });
    
    it('should handle invalid signature when secret is configured', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a request with invalid signature
      req.headers['x-digitalsamba-signature'] = 'invalid-signature';
      req.body = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock crypto.timingSafeEqual to fail the verification
      (crypto.timingSafeEqual as jest.Mock).mockReturnValueOnce(false);
      
      // Call the method directly
      await (webhookService as any).handleWebhookRequest(req, res);
      
      // Verify that the response was an error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid webhook signature') })
      );
    });
    
    it('should handle invalid payload (missing event)', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a request with valid signature but invalid payload
      req.headers['x-digitalsamba-signature'] = 'valid-signature';
      req.body = {
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
        // missing event property
      };
      
      // Call the method directly
      await (webhookService as any).handleWebhookRequest(req, res);
      
      // Verify that the response was an error
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid webhook payload'),
          details: expect.objectContaining({
            payload: expect.stringContaining('event property')
          })
        })
      );
    });
    
    it('should handle errors during webhook processing', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a valid webhook request
      req.headers['x-digitalsamba-signature'] = 'valid-signature';
      req.body = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the processWebhookEvent method to throw an error
      jest.spyOn(webhookService as any, 'processWebhookEvent')
        .mockRejectedValue(new Error('Processing error'));
      
      // Call the method directly
      await (webhookService as any).handleWebhookRequest(req, res);
      
      // Verify that the response was an error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Internal server error' })
      );
    });
    
    it('should return appropriate status codes for different error types', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set up a valid webhook request
      req.headers['x-digitalsamba-signature'] = 'valid-signature';
      req.body = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Test different error types
      const errorTypes = [
        { error: new AuthenticationError('Auth error'), expectedStatus: 401 },
        { error: new ValidationError('Validation error', { validationErrors: { field: 'error' } }), expectedStatus: 400 },
        { error: new ApiResponseError('API error', { statusCode: 403, apiErrorMessage: 'Forbidden' }), expectedStatus: 403 },
        { error: new ResourceNotFoundError('Not found', { resourceId: 'test', resourceType: 'test' }), expectedStatus: 404 },
      ];
      
      for (const { error, expectedStatus } of errorTypes) {
        jest.clearAllMocks();
        res.headersSent = false;
        
        // Mock the processWebhookEvent method to throw the specific error
        jest.spyOn(webhookService as any, 'processWebhookEvent')
          .mockRejectedValue(error);
        
        // Call the method directly
        await (webhookService as any).handleWebhookRequest(req, res);
        
        // Verify that the response had the expected status code
        expect(res.status).toHaveBeenCalledWith(expectedStatus);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.stringContaining(error.message) })
        );
      }
    });
  });
  
  describe('verifySignature', () => {
    it('should return true when signature is valid', () => {
      const req = mockRequest();
      req.body = { test: 'data' };
      
      const result = (webhookService as any).verifySignature(req, 'valid-signature');
      
      expect(result).toBe(true);
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-secret');
    });
    
    it('should throw AuthenticationError when signature verification fails', () => {
      const req = mockRequest();
      req.body = { test: 'data' };
      
      // Mock crypto.timingSafeEqual to fail
      (crypto.timingSafeEqual as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Crypto error');
      });
      
      expect(() => (webhookService as any).verifySignature(req, 'invalid-signature'))
        .toThrow(AuthenticationError);
    });
    
    it('should return true when no secret is configured', () => {
      // Create a webhook service without a secret
      const noSecretService = new WebhookService(server, {
        endpoint: '/webhooks/test'
      });
      
      const req = mockRequest();
      req.body = { test: 'data' };
      
      const result = (noSecretService as any).verifySignature(req, 'any-signature');
      
      expect(result).toBe(true);
      // Crypto functions should not be called
      expect(crypto.createHmac).not.toHaveBeenCalled();
    });
  });
  
  describe('processWebhookEvent', () => {
    it('should skip processing if no handlers are registered', async () => {
      const payload = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the notifyMcpClients method
      const notifyMcpClientsSpy = jest.spyOn(webhookService as any, 'notifyMcpClients')
        .mockResolvedValue(undefined);
      
      await (webhookService as any).processWebhookEvent(payload);
      
      // Should still call notifyMcpClients even if no handlers
      expect(notifyMcpClientsSpy).toHaveBeenCalledWith(payload);
    });
    
    it('should execute all registered handlers for an event', async () => {
      const payload = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Register two handlers for the event
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      
      (webhookService as any).eventHandlers.set(WebhookEventType.ROOM_CREATED, [handler1, handler2]);
      
      // Mock the notifyMcpClients method
      const notifyMcpClientsSpy = jest.spyOn(webhookService as any, 'notifyMcpClients')
        .mockResolvedValue(undefined);
      
      await (webhookService as any).processWebhookEvent(payload);
      
      // Both handlers should be called
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
      expect(notifyMcpClientsSpy).toHaveBeenCalledWith(payload);
    });
  });
  
  describe('on (event handler registration)', () => {
    it('should register a handler for an event', () => {
      const handler = jest.fn();
      
      webhookService.on(WebhookEventType.ROOM_CREATED, handler);
      
      // Check that the handler was added to the event handlers map
      const handlers = (webhookService as any).eventHandlers.get(WebhookEventType.ROOM_CREATED);
      expect(handlers).toContain(handler);
    });
    
    it('should register multiple handlers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      webhookService.on(WebhookEventType.ROOM_CREATED, handler1);
      webhookService.on(WebhookEventType.ROOM_CREATED, handler2);
      
      // Check that both handlers were added
      const handlers = (webhookService as any).eventHandlers.get(WebhookEventType.ROOM_CREATED);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
      expect(handlers.length).toBe(2);
    });
  });
  
  describe('notifyMcpClients', () => {
    it('should use server.notification method when available', async () => {
      const payload = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the createNotificationForEvent method
      const mockNotification = { event: payload.event, data: payload.data };
      jest.spyOn(webhookService as any, 'createNotificationForEvent')
        .mockReturnValue(mockNotification);
      
      await (webhookService as any).notifyMcpClients(payload);
      
      // Should call server.notification with the right parameters
      expect(server.notification).toHaveBeenCalledWith({
        method: 'digitalsambaEvent',
        params: mockNotification
      });
    });
    
    it('should throw ConfigurationError when no notification method is available', async () => {
      // Create a server without a notification method
      const serverWithoutNotification = {} as unknown as McpServer;
      const service = new WebhookService(serverWithoutNotification, {
        endpoint: '/webhooks/test'
      });
      
      const payload = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the createNotificationForEvent method
      jest.spyOn(service as any, 'createNotificationForEvent')
        .mockReturnValue({ event: payload.event, data: payload.data });
      
      await expect((service as any).notifyMcpClients(payload))
        .rejects.toThrow(ConfigurationError);
    });
    
    it('should throw ApiRequestError when notification fails', async () => {
      const payload = {
        event: WebhookEventType.ROOM_CREATED,
        timestamp: new Date().toISOString(),
        data: { id: 'room-1', name: 'New Room' }
      };
      
      // Mock the createNotificationForEvent method
      jest.spyOn(webhookService as any, 'createNotificationForEvent')
        .mockReturnValue({ event: payload.event, data: payload.data });
      
      // Mock server.notification to throw an error
      (server.notification as jest.Mock).mockRejectedValue(new Error('Notification error'));
      
      await expect((webhookService as any).notifyMcpClients(payload))
        .rejects.toThrow(ApiRequestError);
    });
  });
  
  describe('createNotificationForEvent', () => {
    it('should format different event types correctly', () => {
      // Test various event types
      const eventTypes = [
        {
          event: WebhookEventType.ROOM_CREATED,
          data: { id: 'room-1', name: 'Test Room' },
          expectedData: { roomId: 'room-1', room: { id: 'room-1', name: 'Test Room' } }
        },
        {
          event: WebhookEventType.SESSION_STARTED,
          data: { id: 'session-1', room_id: 'room-1' },
          expectedData: { sessionId: 'session-1', roomId: 'room-1', session: { id: 'session-1', room_id: 'room-1' } }
        },
        {
          event: WebhookEventType.PARTICIPANT_JOINED,
          data: { id: 'participant-1', room_id: 'room-1', session_id: 'session-1' },
          expectedData: {
            participantId: 'participant-1',
            roomId: 'room-1',
            sessionId: 'session-1',
            participant: { id: 'participant-1', room_id: 'room-1', session_id: 'session-1' }
          }
        }
      ];
      
      for (const { event, data, expectedData } of eventTypes) {
        const payload = { event, timestamp: new Date().toISOString(), data };
        const notification = (webhookService as any).createNotificationForEvent(payload);
        
        expect(notification.event).toBe(event);
        expect(notification.timestamp).toBe(payload.timestamp);
        expect(notification.data).toEqual(expectedData);
      }
    });
    
    it('should handle unknown event types by including all data', () => {
      const payload = {
        event: 'unknown.event' as WebhookEventType,
        timestamp: new Date().toISOString(),
        data: { id: 'unknown-1', custom: 'value' }
      };
      
      const notification = (webhookService as any).createNotificationForEvent(payload);
      
      expect(notification.event).toBe(payload.event);
      expect(notification.timestamp).toBe(payload.timestamp);
      expect(notification.data).toEqual(payload.data);
    });
  });
  
  describe('registerWebhook', () => {
    it('should validate input parameters', async () => {
      // Test missing API key
      await expect(webhookService.registerWebhook('', apiBaseUrl, 'https://example.com/webhook'))
        .rejects.toThrow(AuthenticationError);
      
      // Test missing webhook URL
      await expect(webhookService.registerWebhook('api-key', apiBaseUrl, ''))
        .rejects.toThrow(ValidationError);
      
      // Test missing API base URL
      await expect(webhookService.registerWebhook('api-key', '', 'https://example.com/webhook'))
        .rejects.toThrow(ValidationError);
    });
    
    it('should create a new webhook if none exists', async () => {
      // Mock the DigitalSambaApiClient
      const mockApi = {
        listWebhooks: jest.fn().mockResolvedValue({ data: [] }),
        createWebhook: jest.fn().mockResolvedValue({ id: 'new-webhook-id' })
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await webhookService.registerWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      );
      
      expect(mockApi.listWebhooks).toHaveBeenCalled();
      expect(mockApi.createWebhook).toHaveBeenCalledWith({
        endpoint: 'https://example.com/webhook',
        events: expect.any(Array),
        name: 'MCP Server Webhook'
      });
    });
    
    it('should update an existing webhook if it exists', async () => {
      // Mock the DigitalSambaApiClient
      const mockApi = {
        listWebhooks: jest.fn().mockResolvedValue({
          data: [{
            id: 'existing-webhook-id',
            endpoint: 'https://example.com/webhook',
            events: ['room.created']
          }]
        }),
        updateWebhook: jest.fn().mockResolvedValue({ id: 'existing-webhook-id' })
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await webhookService.registerWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      );
      
      expect(mockApi.listWebhooks).toHaveBeenCalled();
      expect(mockApi.updateWebhook).toHaveBeenCalledWith(
        'existing-webhook-id',
        {
          endpoint: 'https://example.com/webhook',
          events: expect.any(Array),
          name: 'MCP Server Webhook'
        }
      );
    });
    
    it('should handle API errors correctly', async () => {
      // Mock the DigitalSambaApiClient
      const apiError = new Error('API error');
      (apiError as any).statusCode = 403;
      
      const mockApi = {
        listWebhooks: jest.fn().mockRejectedValue(apiError)
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await expect(webhookService.registerWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      )).rejects.toThrow(AuthenticationError);
    });
  });
  
  describe('deleteWebhook', () => {
    it('should validate input parameters', async () => {
      // Test missing API key
      await expect(webhookService.deleteWebhook('', apiBaseUrl, 'https://example.com/webhook'))
        .rejects.toThrow(AuthenticationError);
      
      // Test missing webhook URL
      await expect(webhookService.deleteWebhook('api-key', apiBaseUrl, ''))
        .rejects.toThrow(ValidationError);
      
      // Test missing API base URL
      await expect(webhookService.deleteWebhook('api-key', '', 'https://example.com/webhook'))
        .rejects.toThrow(ValidationError);
    });
    
    it('should delete an existing webhook', async () => {
      // Mock the DigitalSambaApiClient
      const mockApi = {
        listWebhooks: jest.fn().mockResolvedValue({
          data: [{
            id: 'existing-webhook-id',
            endpoint: 'https://example.com/webhook',
            events: ['room.created']
          }]
        }),
        deleteWebhook: jest.fn().mockResolvedValue({})
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await webhookService.deleteWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      );
      
      expect(mockApi.listWebhooks).toHaveBeenCalled();
      expect(mockApi.deleteWebhook).toHaveBeenCalledWith('existing-webhook-id');
    });
    
    it('should throw ResourceNotFoundError when webhook does not exist', async () => {
      // Mock the DigitalSambaApiClient
      const mockApi = {
        listWebhooks: jest.fn().mockResolvedValue({ data: [] })
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await expect(webhookService.deleteWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      )).rejects.toThrow(ResourceNotFoundError);
    });
    
    it('should handle API errors correctly', async () => {
      // Mock the DigitalSambaApiClient
      const apiError = new Error('API error');
      (apiError as any).statusCode = 404;
      
      const mockApi = {
        listWebhooks: jest.fn().mockRejectedValue(apiError)
      };
      (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApi);
      
      await expect(webhookService.deleteWebhook(
        'api-key',
        apiBaseUrl,
        'https://example.com/webhook'
      )).rejects.toThrow(ResourceNotFoundError);
    });
  });
});

describe('setupWebhookTools', () => {
  let server: McpServer;
  let webhookService: WebhookService;
  const apiBaseUrl = 'https://api.example.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock McpServer
    server = {
      tool: jest.fn().mockReturnValue({ /* mock tool */ }),
      notification: jest.fn().mockResolvedValue(true)
    } as unknown as McpServer;
    
    // Create a mock WebhookService
    webhookService = {
      registerWebhook: jest.fn().mockResolvedValue(undefined),
      deleteWebhook: jest.fn().mockResolvedValue(undefined)
    } as unknown as WebhookService;
    
    // Set up the mock DigitalSambaApiClient
    (DigitalSambaApiClient as jest.Mock).mockClear();
  });
  
  it('should register all webhook tools with the server', () => {
    setupWebhookTools(server, webhookService, apiBaseUrl);
    
    // Check that server.tool was called for each tool
    expect(server.tool).toHaveBeenCalledTimes(4);
    
    // Check for specific tool names
    const toolCalls = (server.tool as jest.Mock).mock.calls;
    const toolNames = toolCalls.map(call => call[0]);
    
    expect(toolNames).toContain('register-webhook');
    expect(toolNames).toContain('delete-webhook');
    expect(toolNames).toContain('list-webhooks');
    expect(toolNames).toContain('list-webhook-events');
  });
  
  describe('register-webhook tool', () => {
    it('should handle successful webhook registration', async () => {
      // Set up the tool handler
      setupWebhookTools(server, webhookService, apiBaseUrl);
      const toolCalls = (server.tool as jest.Mock).mock.calls;
      const registerWebhookTool = toolCalls.find(call => call[0] === 'register-webhook');
      const handler = registerWebhookTool[2];
      
      // Set up parameters and request
      const params = { webhookUrl: 'https://example.com/webhook' };
      const request = { context: { apiKey: 'test-api-key' } };
      
      // Call the handler
      const result = await handler(params, request);
      
      // Check that webhookService.registerWebhook was called correctly
      expect(webhookService.registerWebhook).toHaveBeenCalledWith(
        'test-api-key',
        apiBaseUrl,
        'https://example.com/webhook',
        undefined
      );
      
      // Check that the response is correct
      expect(result.content[0].text).toContain('registered successfully');
      expect(result.isError).toBeFalsy();
    });
    
    it('should handle missing API key', async () => {
      // Set up the tool handler
      setupWebhookTools(server, webhookService, apiBaseUrl);
      const toolCalls = (server.tool as jest.Mock).mock.calls;
      const registerWebhookTool = toolCalls.find(call => call[0] === 'register-webhook');
      const handler = registerWebhookTool[2];
      
      // Mock getApiKeyFromRequest to return undefined
      const getApiKeyFromRequest = require('../../src/auth').getApiKeyFromRequest;
      getApiKeyFromRequest.mockReturnValueOnce(undefined);
      
      // Set up parameters and request
      const params = { webhookUrl: 'https://example.com/webhook' };
      const request = {};
      
      // Call the handler
      const result = await handler(params, request);
      
      // Check that the response indicates an error
      expect(result.content[0].text).toContain('API key is required');
      expect(result.isError).toBe(true);
    });
    
    it('should handle missing webhook URL', async () => {
      // Set up the tool handler
      setupWebhookTools(server, webhookService, apiBaseUrl);
      const toolCalls = (server.tool as jest.Mock).mock.calls;
      const registerWebhookTool = toolCalls.find(call => call[0] === 'register-webhook');
      const handler = registerWebhookTool[2];
      
      // Set up parameters and request
      const params = { webhookUrl: '' };
      const request = {};
      
      // Call the handler
      const result = await handler(params, request);
      
      // Check that the response indicates an error
      expect(result.content[0].text).toContain('Webhook URL is required');
      expect(result.isError).toBe(true);
    });
    
    it('should handle API errors during registration', async () => {
      // Set up the tool handler
      setupWebhookTools(server, webhookService, apiBaseUrl);
      const toolCalls = (server.tool as jest.Mock).mock.calls;
      const registerWebhookTool = toolCalls.find(call => call[0] === 'register-webhook');
      const handler = registerWebhookTool[2];
      
      // Mock webhookService.registerWebhook to throw an error
      (webhookService.registerWebhook as jest.Mock).mockRejectedValueOnce(
        new ApiResponseError('API error', { statusCode: 403, apiErrorMessage: 'Forbidden' })
      );
      
      // Set up parameters and request
      const params = { webhookUrl: 'https://example.com/webhook' };
      const request = {};
      
      // Call the handler
      const result = await handler(params, request);
      
      // Check that the response indicates the correct error
      expect(result.content[0].text).toContain('API error');
      expect(result.isError).toBe(true);
    });
  });
  
  // Tests for other tools would follow a similar pattern
});
