/**
 * Unit tests for the MCP Server implementation
 * 
 * This file tests the core MCP server functionality, including server creation,
 * resource handling, tool execution, and server configuration.
 * 
 * @group unit
 * @group server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from '../../src/index';
import { MemoryCache } from '../../src/cache';
import apiKeyContext from '../../src/auth';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    resource: jest.fn(),
    tool: jest.fn(),
    close: jest.fn(),
  })),
  ResourceTemplate: jest.fn(),
}));

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

// Mock WebhookService
jest.mock('../../src/webhooks', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    registerWebhookEndpoint: jest.fn(),
    on: jest.fn(),
  })),
  setupWebhookTools: jest.fn(),
}));

// Mock other modules
jest.mock('../../src/recordings', () => ({
  setupRecordingFunctionality: jest.fn(),
}));

jest.mock('../../src/moderation', () => ({
  setupModerationFunctionality: jest.fn(),
}));

jest.mock('../../src/breakout-rooms', () => ({
  setupBreakoutRoomsFunctionality: jest.fn(),
}));

jest.mock('../../src/meetings', () => ({
  setupMeetingSchedulingFunctionality: jest.fn(),
}));

jest.mock('../../src/metrics', () => ({
  __esModule: true,
  default: {
    createHttpMetricsMiddleware: jest.fn().mockReturnValue(jest.fn()),
    registerMetricsEndpoint: jest.fn(),
    activeSessions: {
      inc: jest.fn(),
      dec: jest.fn(),
      set: jest.fn(),
    },
  },
  initializeMetrics: jest.fn().mockReturnValue({
    activeSessions: {
      inc: jest.fn(),
      dec: jest.fn(),
      set: jest.fn(),
    },
  }),
}));

// Original environment variables
const originalEnv = process.env;

describe('MCP Server', () => {
  // Set up spies
  let resourceSpy: jest.SpyInstance;
  let toolSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Set up spies for McpServer instance methods
    const mcpServer = new McpServer({
      name: 'test',
      version: '1.0.0',
    });
    resourceSpy = jest.spyOn(mcpServer, 'resource');
    toolSpy = jest.spyOn(mcpServer, 'tool');
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  describe('createServer', () => {
    it('should create a server with default options', () => {
      const { server, port, apiUrl } = createServer();
      
      expect(server).toBeDefined();
      expect(port).toBe(3000);
      expect(apiUrl).toBe('https://api.digitalsamba.com/api/v1');
      expect(McpServer).toHaveBeenCalledWith({
        name: 'Digital Samba MCP Server',
        version: '0.1.0',
      });
    });
    
    it('should use options from parameters', () => {
      const { server, port, apiUrl } = createServer({
        port: 4000,
        apiUrl: 'https://custom-api.example.com/v1',
      });
      
      expect(server).toBeDefined();
      expect(port).toBe(4000);
      expect(apiUrl).toBe('https://custom-api.example.com/v1');
    });
    
    it('should use options from environment variables', () => {
      process.env.PORT = '5000';
      process.env.DIGITAL_SAMBA_API_URL = 'https://env-api.example.com/v1';
      
      const { server, port, apiUrl } = createServer();
      
      expect(server).toBeDefined();
      expect(port).toBe(5000);
      expect(apiUrl).toBe('https://env-api.example.com/v1');
    });
    
    it('should initialize cache when enabled', () => {
      const { cache } = createServer({
        enableCache: true,
        cacheTtl: 60000,
      });
      
      expect(cache).toBeInstanceOf(MemoryCache);
    });
    
    it('should not initialize cache when disabled', () => {
      const { cache } = createServer({
        enableCache: false,
      });
      
      expect(cache).toBeUndefined();
    });
    
    it('should set up all required resources', () => {
      createServer();
      
      // Check that resources are registered
      expect(resourceSpy).toHaveBeenCalledWith(
        'rooms',
        expect.any(Object),
        expect.any(Function)
      );
      expect(resourceSpy).toHaveBeenCalledWith(
        'room',
        expect.any(Object),
        expect.any(Function)
      );
      expect(resourceSpy).toHaveBeenCalledWith(
        'participants',
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    it('should set up all required tools', () => {
      createServer();
      
      // Check that tools are registered
      expect(toolSpy).toHaveBeenCalledWith(
        'create-room',
        expect.any(Object),
        expect.any(Function)
      );
      expect(toolSpy).toHaveBeenCalledWith(
        'generate-token',
        expect.any(Object),
        expect.any(Function)
      );
      expect(toolSpy).toHaveBeenCalledWith(
        'update-room',
        expect.any(Object),
        expect.any(Function)
      );
      expect(toolSpy).toHaveBeenCalledWith(
        'delete-room',
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    it('should set up feature modules', () => {
      const setupWebhookTools = require('../../src/webhooks').setupWebhookTools;
      const setupRecordingFunctionality = require('../../src/recordings').setupRecordingFunctionality;
      const setupModerationFunctionality = require('../../src/moderation').setupModerationFunctionality;
      const setupBreakoutRoomsFunctionality = require('../../src/breakout-rooms').setupBreakoutRoomsFunctionality;
      const setupMeetingSchedulingFunctionality = require('../../src/meetings').setupMeetingSchedulingFunctionality;
      
      createServer();
      
      expect(setupWebhookTools).toHaveBeenCalled();
      expect(setupRecordingFunctionality).toHaveBeenCalled();
      expect(setupModerationFunctionality).toHaveBeenCalled();
      expect(setupBreakoutRoomsFunctionality).toHaveBeenCalled();
      expect(setupMeetingSchedulingFunctionality).toHaveBeenCalled();
    });
  });
  
  describe('Server resources', () => {
    it('should handle room listing resource', async () => {
      // Create server
      createServer();
      
      // Get the room listing resource handler (second argument to resourceSpy.mock.calls[0])
      const resourceHandler = resourceSpy.mock.calls[0][2];
      
      // Mock request object
      const mockRequest = {
        sessionId: 'test-session',
        transport: {
          sessionId: 'test-session',
        },
      };
      
      // Set up API key in context
      jest.spyOn(apiKeyContext, 'getCurrentApiKey').mockReturnValue('test-api-key');
      
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          data: [
            { id: 'room-1', name: 'Room 1' },
            { id: 'room-2', name: 'Room 2' },
          ],
          total_count: 2,
        }),
      });
      
      // Call the resource handler
      const result = await resourceHandler(
        new URL('digitalsamba://rooms'),
        {},
        mockRequest
      );
      
      // Check the result
      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(2);
      expect(result.contents[0]).toHaveProperty('uri', 'digitalsamba://rooms/room-1');
      expect(result.contents[1]).toHaveProperty('uri', 'digitalsamba://rooms/room-2');
    });
    
    it('should handle errors in room listing resource', async () => {
      // Create server
      createServer();
      
      // Get the room listing resource handler (second argument to resourceSpy.mock.calls[0])
      const resourceHandler = resourceSpy.mock.calls[0][2];
      
      // Mock request object
      const mockRequest = {
        sessionId: 'test-session',
        transport: {
          sessionId: 'test-session',
        },
      };
      
      // Set up API key in context
      jest.spyOn(apiKeyContext, 'getCurrentApiKey').mockReturnValue('test-api-key');
      
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Call the resource handler
      await expect(resourceHandler(
        new URL('digitalsamba://rooms'),
        {},
        mockRequest
      )).rejects.toThrow('Network error');
    });
  });
  
  describe('Server tools', () => {
    it('should handle create room tool', async () => {
      // Create server
      createServer();
      
      // Get the create room tool handler (third argument to toolSpy.mock.calls for 'create-room')
      const createRoomHandler = toolSpy.mock.calls.find(call => call[0] === 'create-room')[2];
      
      // Mock request object
      const mockRequest = {
        sessionId: 'test-session',
        transport: {
          sessionId: 'test-session',
        },
      };
      
      // Set up API key in context
      jest.spyOn(apiKeyContext, 'getCurrentApiKey').mockReturnValue('test-api-key');
      
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          id: 'new-room',
          name: 'Test Room',
          privacy: 'public',
        }),
      });
      
      // Call the tool handler
      const result = await createRoomHandler(
        {
          name: 'Test Room',
          privacy: 'public',
        },
        mockRequest
      );
      
      // Check the result
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Room created successfully');
      expect(result.content[0].text).toContain('new-room');
      expect(result.content[0].text).toContain('Test Room');
    });
    
    it('should handle errors in create room tool', async () => {
      // Create server
      createServer();
      
      // Get the create room tool handler
      const createRoomHandler = toolSpy.mock.calls.find(call => call[0] === 'create-room')[2];
      
      // Mock request object
      const mockRequest = {
        sessionId: 'test-session',
        transport: {
          sessionId: 'test-session',
        },
      };
      
      // Set up API key in context
      jest.spyOn(apiKeyContext, 'getCurrentApiKey').mockReturnValue('test-api-key');
      
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Call the tool handler
      const result = await createRoomHandler(
        {
          name: 'Test Room',
          privacy: 'public',
        },
        mockRequest
      );
      
      // Check the result
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Error creating room');
    });
  });
});
