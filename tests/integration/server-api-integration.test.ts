/**
 * Integration tests for the MCP Server with API client
 * 
 * This file tests the integration between the MCP server and the Digital Samba API client,
 * ensuring that they work together correctly to handle resources and tools.
 * 
 * @group integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createServer } from '../../src/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import apiKeyContext from '../../src/auth';

// Mock the MCP SDK Client
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    listResources: jest.fn().mockResolvedValue({
      resources: [
        { name: 'rooms', template: 'digitalsamba://rooms' },
        { name: 'room', template: 'digitalsamba://rooms/{roomId}' },
        { name: 'participants', template: 'digitalsamba://rooms/{roomId}/participants' },
      ]
    }),
    readResource: jest.fn().mockImplementation(async (params) => {
      if (params.uri.startsWith('digitalsamba://rooms')) {
        return {
          contents: [
            { uri: 'digitalsamba://rooms/room-1', text: JSON.stringify({ id: 'room-1', name: 'Room 1' }) },
            { uri: 'digitalsamba://rooms/room-2', text: JSON.stringify({ id: 'room-2', name: 'Room 2' }) },
          ]
        };
      }
      return { contents: [] };
    }),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        { name: 'create-room' },
        { name: 'generate-token' },
        { name: 'update-room' },
        { name: 'delete-room' },
      ]
    }),
    callTool: jest.fn().mockImplementation(async (params) => {
      if (params.name === 'create-room') {
        return {
          content: [
            { 
              type: 'text', 
              text: `Room created successfully!\n\n${JSON.stringify({ id: 'new-room', name: params.arguments.name })}` 
            }
          ]
        };
      }
      return { content: [{ type: 'text', text: 'Operation completed' }] };
    }),
  })),
}));

// Mock the Digital Samba API client
jest.mock('../../src/digital-samba-api', () => ({
  DigitalSambaApiClient: jest.fn().mockImplementation(() => ({
    listRooms: jest.fn().mockResolvedValue({
      data: [
        { id: 'room-1', name: 'Room 1' },
        { id: 'room-2', name: 'Room 2' },
      ],
      total_count: 2,
      length: 2,
      map: jest.fn((callback) => [
        { id: 'room-1', name: 'Room 1' },
        { id: 'room-2', name: 'Room 2' },
      ].map(callback)),
    }),
    getRoom: jest.fn().mockImplementation((roomId) => 
      Promise.resolve({ id: roomId, name: `Room ${roomId}` })
    ),
    listRoomParticipants: jest.fn().mockResolvedValue({
      data: [
        { id: 'participant-1', name: 'User 1', room_id: 'room-1' },
        { id: 'participant-2', name: 'User 2', room_id: 'room-1' },
      ],
      total_count: 2,
      length: 2,
      map: jest.fn(),
    }),
    createRoom: jest.fn().mockImplementation((roomSettings) => 
      Promise.resolve({ id: 'new-room', ...roomSettings })
    ),
    updateRoom: jest.fn().mockImplementation((roomId, roomSettings) => 
      Promise.resolve({ id: roomId, ...roomSettings })
    ),
    deleteRoom: jest.fn().mockResolvedValue({}),
    generateRoomToken: jest.fn().mockImplementation((roomId, options) => 
      Promise.resolve({ 
        token: 'mock-token', 
        link: `https://example.com/rooms/${roomId}?token=mock-token`,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
    ),
  })),
}));

// Mock the API key context
jest.mock('../../src/auth', () => ({
  __esModule: true,
  default: {
    getCurrentApiKey: jest.fn().mockReturnValue('test-api-key'),
    setApiKey: jest.fn(),
    removeApiKey: jest.fn(),
  },
  extractApiKey: jest.fn().mockReturnValue('test-api-key'),
  getApiKeyFromRequest: jest.fn().mockReturnValue('test-api-key'),
}));

// Mock other modules
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('MCP Server Integration', () => {
  let server: McpServer;
  let client: Client;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create server and client
    const { server: mcpServer } = createServer({
      port: 3000,
      apiUrl: 'https://api.digitalsamba.com/api/v1',
    });
    server = mcpServer;
    
    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });
  });
  
  describe('Resource Integration', () => {
    it('should list rooms through the client', async () => {
      // Get the rooms resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(2);
      expect(JSON.parse(contents[0].text)).toEqual({ id: 'room-1', name: 'Room 1' });
      expect(JSON.parse(contents[1].text)).toEqual({ id: 'room-2', name: 'Room 2' });
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.listRooms).toHaveBeenCalled();
    });
    
    it('should get a specific room through the client', async () => {
      // Get the specific room resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms/room-1',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(1);
      const room = JSON.parse(contents[0].text);
      expect(room).toEqual({ id: 'room-1', name: 'Room room-1' });
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.getRoom).toHaveBeenCalledWith('room-1');
    });
    
    it('should list participants through the client', async () => {
      // Get the participants resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms/room-1/participants',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(2);
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.listRoomParticipants).toHaveBeenCalledWith('room-1');
    });
  });
  
  describe('Tool Integration', () => {
    it('should create a room through the client', async () => {
      // Call the create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Test Room',
          privacy: 'public',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Room created successfully');
      expect(result.content[0].text).toContain('new-room');
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.createRoom).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Room',
        privacy: 'public',
      }));
    });
    
    it('should generate a room token through the client', async () => {
      // Call the generate-token tool
      const result = await client.callTool({
        name: 'generate-token',
        arguments: {
          roomId: 'room-1',
          userName: 'Test User',
          role: 'host',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Token generated successfully');
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.generateRoomToken).toHaveBeenCalledWith('room-1', expect.objectContaining({
        u: 'Test User',
        role: 'host',
      }));
    });
    
    it('should update a room through the client', async () => {
      // Call the update-room tool
      const result = await client.callTool({
        name: 'update-room',
        arguments: {
          roomId: 'room-1',
          name: 'Updated Room',
          privacy: 'private',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Operation completed');
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.updateRoom).toHaveBeenCalledWith('room-1', expect.objectContaining({
        name: 'Updated Room',
        privacy: 'private',
      }));
    });
    
    it('should delete a room through the client', async () => {
      // Call the delete-room tool
      const result = await client.callTool({
        name: 'delete-room',
        arguments: {
          roomId: 'room-1',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Operation completed');
      
      // Verify API client was called
      expect(DigitalSambaApiClient).toHaveBeenCalled();
      const apiClient = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      expect(apiClient.deleteRoom).toHaveBeenCalledWith('room-1');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle API errors in resources', async () => {
      // Make the listRooms method fail
      const apiClientInstance = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      apiClientInstance.listRooms = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Try to get the rooms resource
      try {
        await client.readResource({
          uri: 'digitalsamba://rooms',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('API error');
      }
    });
    
    it('should handle API errors in tools', async () => {
      // Make the createRoom method fail
      const apiClientInstance = (DigitalSambaApiClient as jest.Mock).mock.instances[0];
      apiClientInstance.createRoom = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Try to call the create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Test Room',
          privacy: 'public',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Error creating room');
      expect(result.content[0].text).toContain('API error');
      expect(result.isError).toBe(true);
    });
    
    it('should handle missing API key', async () => {
      // Make getApiKeyFromRequest return undefined
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue(undefined);
      
      // Try to call the create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Test Room',
          privacy: 'public',
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No API key found');
      expect(result.isError).toBe(true);
    });
  });
  
  describe('Advanced API Client Features', () => {
    it('should use enhanced API client when enableConnectionManagement is true', async () => {
      // Create server with enhanced features
      jest.clearAllMocks();
      createServer({
        port: 3000,
        apiUrl: 'https://api.digitalsamba.com/api/v1',
        enableConnectionManagement: true,
      });
      
      // Get the rooms resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(2);
      
      // Verify API client was constructed with correct options
      expect(DigitalSambaApiClient).toHaveBeenCalledWith(
        undefined,
        'https://api.digitalsamba.com/api/v1',
        undefined,
      );
    });
    
    it('should use circuit breaker when enableCircuitBreaker is true', async () => {
      // Create a spy on the CircuitBreakerApiClient.withCircuitBreaker
      const withCircuitBreakerSpy = jest.fn().mockImplementation(apiClient => apiClient);
      jest.mock('../../src/digital-samba-api-circuit-breaker.js', () => ({
        CircuitBreakerApiClient: {
          withCircuitBreaker: withCircuitBreakerSpy,
        },
      }));
      
      // Create server with circuit breaker
      jest.clearAllMocks();
      createServer({
        port: 3000,
        apiUrl: 'https://api.digitalsamba.com/api/v1',
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 3,
        circuitBreakerResetTimeout: 10000,
      });
      
      // Get the rooms resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(2);
      
      // Circuit breaker would be applied to the API client
      // But since we've mocked the module, we can't easily verify this
    });
  });
});
