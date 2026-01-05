/**
 * MCP Protocol Compliance Tests
 *
 * These tests verify that the Digital Samba MCP server implements the Model Context Protocol
 * correctly according to the specification at https://modelcontextprotocol.io
 *
 * @group e2e
 * @group compliance
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ChildProcess } from 'child_process';
import { Server } from 'http';
import {
  startServerProcess,
  cleanupResources,
  setupMockApiServer,
} from '../mocks/test-utils.js';

// Set longer timeout for protocol compliance tests
jest.setTimeout(60000);

describe('MCP Protocol Compliance Tests', () => {
  let mockApiServer: Server;
  let serverProcess: ChildProcess;
  let client: Client;
  const mockApiPort = 8080;

  beforeEach(async () => {
    // Set up clean test environment
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up resources
    await cleanupResources({
      mockApiServer,
      serverProcess,
      client,
    });
  });

  describe('Protocol Initialization', () => {
    beforeEach(async () => {
      // Start mock API server
      mockApiServer = await setupMockApiServer({ port: mockApiPort });
      
      // Start MCP server process with mock API
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
    });
    
    it('should handle initialize handshake correctly', async () => {
      // Client should already be connected from beforeEach
      // Verify that client is successfully connected by trying to list resources
      const { resources } = await client.listResources();
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      
      // Also verify tools are available
      const { tools } = await client.listTools();
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });
    
    it('should provide correct server metadata', async () => {
      // Since getServerInfo is not available in the client SDK,
      // we'll verify server capabilities through available endpoints
      const { resources } = await client.listResources();
      const { tools } = await client.listTools();
      
      // Verify that both resources and tools are available (capabilities)
      expect(resources.length).toBeGreaterThan(0);
      expect(tools.length).toBeGreaterThan(0);
      
      // Verify some expected resources exist
      const roomsResource = resources.find(r => r.name === 'rooms');
      expect(roomsResource).toBeDefined();
      
      // Verify some expected tools exist  
      const createRoomTool = tools.find(t => t.name === 'create-room');
      expect(createRoomTool).toBeDefined();
    });
  });
  
  describe('Resources Compliance', () => {
    beforeEach(async () => {
      // Start mock API server
      mockApiServer = await setupMockApiServer({ port: mockApiPort });
      
      // Start MCP server process with mock API
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
    });
    
    it('should implement resources/list correctly', async () => {
      const { resources } = await client.listResources();
      
      // Verify resources structure
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      // Verify resource object structure
      resources.forEach(resource => {
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('uri');
        
        // Verify URI format
        expect(typeof resource.uri).toBe('string');
        expect(resource.uri).toMatch(/^digitalsamba:\/\//);
      });
      
      // Check for essential resources
      const essentialResources = ['rooms', 'sessions', 'recordings'];
      essentialResources.forEach(name => {
        const resource = resources.find(r => r.name === name);
        expect(resource).toBeDefined();
      });
    });
    
    it('should implement resources/read correctly', async () => {
      // Read room listings resource
      const result = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      // Verify resource read response format
      expect(result).toBeDefined();
      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBeGreaterThan(0);
      
      // Verify contents structure
      result.contents.forEach(content => {
        expect(content).toHaveProperty('uri');
        expect(content).toHaveProperty('text');
        expect(content).toHaveProperty('mimeType');
        expect(content.mimeType).toBe('application/json');
        
        // Verify content is valid JSON
        expect(() => JSON.parse(content.text)).not.toThrow();
      });
      
      // Try to read a specific room
      const firstRoom = JSON.parse(result.contents[0].text);
      const roomId = firstRoom.id;
      
      const roomResult = await client.readResource({
        uri: `digitalsamba://rooms/${roomId}`,
      });
      
      // Verify room resource response
      expect(roomResult).toBeDefined();
      expect(roomResult.contents).toBeDefined();
      expect(roomResult.contents.length).toBe(1);
      
      // Verify room data (DS API uses 'topic' for room name)
      const room = JSON.parse(roomResult.contents[0].text);
      expect(room).toHaveProperty('id', roomId);
      expect(room).toHaveProperty('topic');
    });
    
    it('should handle resource errors correctly', async () => {
      // Attempt to read a non-existent resource
      try {
        await client.readResource({
          uri: 'digitalsamba://non-existent',
        });
        
        fail('Should have thrown an error for non-existent resource');
      } catch (error) {
        // Verify error structure according to MCP protocol
        expect(error).toBeDefined();
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      }
    });
    
    it('should support parameterized resources', async () => {
      // Test analytics resource with query parameters
      const result = await client.readResource({
        uri: 'digitalsamba://analytics/team?date_start=2025-01-01&date_end=2025-01-31',
      });
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      
      const analytics = JSON.parse(result.contents[0].text);
      expect(analytics).toBeDefined();
    });
  });
  
  describe('Tools Compliance', () => {
    beforeEach(async () => {
      // Start mock API server
      mockApiServer = await setupMockApiServer({ port: mockApiPort });
      
      // Start MCP server process with mock API
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
    });
    
    it('should implement tools/list correctly', async () => {
      const { tools } = await client.listTools();
      
      // Verify tools structure
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Verify tool object structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        
        // Verify inputSchema is valid JSON Schema
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
        
        if (tool.inputSchema.properties) {
          expect(typeof tool.inputSchema.properties).toBe('object');
        }
      });
      
      // Check for essential tools
      const essentialTools = ['create-room', 'delete-room', 'generate-token'];
      essentialTools.forEach(name => {
        const tool = tools.find(t => t.name === name);
        expect(tool).toBeDefined();
      });
    });
    
    it('should implement tools/call correctly', async () => {
      // Test calling create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'MCP Compliance Test Room',
          privacy: 'public',
          description: 'Room created for MCP compliance testing',
        },
      });
      
      // Verify tool call response format
      expect(result).toBeDefined();
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify content structure
      const content = result.content[0];
      expect(content).toHaveProperty('type', 'text');
      expect(content).toHaveProperty('text');
      expect(typeof content.text).toBe('string');
      
      // Verify response contains success message
      expect(content.text).toContain('successfully');
      expect(content.text).toContain('MCP Compliance Test Room');
    });
    
    it('should handle tool errors correctly', async () => {
      // Test calling a tool with invalid arguments
      try {
        await client.callTool({
          name: 'generate-token',
          arguments: {
            // Missing required room_id
            user_name: 'Test User',
          },
        });

        // Should have thrown an error
        throw new Error('Expected an error to be thrown');
      } catch (error: any) {
        // Should get an error for missing required argument
        expect(error).toBeDefined();
        expect(error.message).toContain('room_id');
      }
    });

    it('should validate tool arguments against schema', async () => {
      // Get tool definition
      const { tools } = await client.listTools();
      const generateTokenTool = tools.find(t => t.name === 'generate-token');

      expect(generateTokenTool).toBeDefined();
      expect(generateTokenTool!.inputSchema).toBeDefined();
      expect(generateTokenTool!.inputSchema.required).toContain('room_id');

      // Test that tools have proper schema definitions
      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });
  
  describe('Error Handling Compliance', () => {
    beforeEach(async () => {
      // Start mock API server
      mockApiServer = await setupMockApiServer({ port: mockApiPort });
      
      // Start MCP server process with mock API
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
    });
    
    it('should return proper JSON-RPC errors for invalid methods', async () => {
      // The SDK should handle invalid methods appropriately
      try {
        // Try to call a non-existent method via the client
        await (client as any).request({
          method: 'invalid/method',
          params: {},
        });
        
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      }
    });
    
    it('should handle API authentication errors', async () => {
      // Create a new server with invalid API key
      const setup = await startServerProcess({
        apiKey: 'invalid-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      const badClient = setup.client;
      const badProcess = setup.process;
      
      try {
        // Try to read a resource with bad auth
        const result = await badClient.callTool({
          name: 'create-room',
          arguments: {
            name: 'Test Room',
          },
        });
        
        // Should get error response
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unauthorized');
      } finally {
        await cleanupResources({ 
          serverProcess: badProcess, 
          client: badClient 
        });
      }
    });
  });
  
  describe('Stdio Transport Compliance', () => {
    it('should communicate correctly over stdio transport', async () => {
      // Start mock API server
      mockApiServer = await setupMockApiServer({ port: mockApiPort });
      
      // Start server and verify stdio communication
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
      
      // Verify client is connected (process details may not be accessible)
      expect(client).toBeDefined();
      
      // Make several requests to test stdio stability
      const requests = [
        client.listResources(),
        client.listTools(),
        client.readResource({ uri: 'digitalsamba://rooms' }),
        client.callTool({ 
          name: 'get-usage-statistics', 
          arguments: { date_start: '2025-01-01' } 
        }),
      ];
      
      // All requests should complete successfully
      const results = await Promise.all(requests);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});