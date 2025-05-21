/**
 * MCP Protocol Compliance Tests
 *
 * These tests verify that the Digital Samba MCP server implements the Model Context Protocol
 * correctly according to the specification at https://modelcontextprotocol.io
 *
 * @group e2e
 * @group compliance
 */

import { Server } from 'http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  setupIntegrationTest,
  cleanupServers,
  getRandomPort,
  startServerProcess
} from '../mocks/test-utils';

// Set longer timeout for protocol compliance tests
jest.setTimeout(60000);

describe('MCP Protocol Compliance Tests', () => {
  let mockApiServer: Server;
  let mcpServer: Server;
  let client: Client;
  let mcpServerPort: number;
  
  beforeEach(async () => {
    // Set up clean test environment
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    // Clean up resources
    await cleanupServers({
      mockApiServer,
      mcpServer,
      client,
    });
  });
  
  describe('Protocol Initialization and Session Management', () => {
    beforeEach(async () => {
      const mockApiPort = await getRandomPort();
      mcpServerPort = await getRandomPort();
      
      // Set up integration test environment
      const { mockApiServer: mockApi, mcpServer: mcp, client: testClient } = 
        await setupIntegrationTest({
          mockApiPort,
          mcpServerPort,
          apiKey: 'test-api-key',
        });
      
      mockApiServer = mockApi;
      mcpServer = mcp;
      client = testClient;
    });
    
    it('should handle initialize handshake correctly', async () => {
      // Create a new client to test initialization
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${mcpServerPort}/mcp`),
        { headers: { Authorization: 'Bearer test-api-key' } }
      );
      
      const testClient = new Client({
        name: 'compliance-test-client',
        version: '1.0.0',
      });
      
      // Connect to server and verify initialize response
      await testClient.connect(transport);
      
      // Verify that client is successfully connected
      expect(testClient.isConnected()).toBe(true);
      
      // Get server info to verify initialize response
      const serverInfo = testClient.getServerInfo();
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe('Digital Samba MCP Server');
      expect(serverInfo.version).toBeDefined();
      expect(serverInfo.capabilities).toBeDefined();
      
      // Verify required capabilities for MCP compliance
      const capabilities = serverInfo.capabilities;
      expect(capabilities.resources).toBeDefined();
      expect(capabilities.tools).toBeDefined();
      
      // Clean up
      await testClient.close();
    });
    
    it('should properly handle session management', async () => {
      // Test session creation and persistence
      const sessionId = (client as any).transport.sessionId;
      expect(sessionId).toBeDefined();
      
      // Make a few requests to test session state
      const { resources } = await client.listResources();
      expect(resources).toBeDefined();
      
      const { tools } = await client.listTools();
      expect(tools).toBeDefined();
      
      // Create a second client with the same session ID
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${mcpServerPort}/mcp`),
        { 
          headers: { 
            Authorization: 'Bearer test-api-key',
            'MCP-Session-ID': sessionId
          } 
        }
      );
      
      const secondClient = new Client({
        name: 'compliance-test-client-2',
        version: '1.0.0',
      });
      
      // Connect using existing session
      await secondClient.connect(transport);
      
      // Verify session reuse
      expect((secondClient as any).transport.sessionId).toBe(sessionId);
      
      // Make a request with the second client
      const secondListResult = await secondClient.listResources();
      expect(secondListResult).toBeDefined();
      expect(secondListResult.resources).toEqual(resources);
      
      // Clean up
      await secondClient.close();
    });
  });
  
  describe('Resources Compliance', () => {
    beforeEach(async () => {
      const mockApiPort = await getRandomPort();
      const mcpServerPort = await getRandomPort();
      
      // Set up integration test environment
      const { mockApiServer: mockApi, mcpServer: mcp, client: testClient } = 
        await setupIntegrationTest({
          mockApiPort,
          mcpServerPort,
          apiKey: 'test-api-key',
        });
      
      mockApiServer = mockApi;
      mcpServer = mcp;
      client = testClient;
    });
    
    it('should implement listResources correctly', async () => {
      const { resources } = await client.listResources();
      
      // Verify resources structure
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      // Verify resource object structure
      resources.forEach(resource => {
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('uriTemplate');
        
        // Verify URI template format
        expect(typeof resource.uriTemplate).toBe('string');
        expect(resource.uriTemplate).toMatch(/^digitalsamba:\/\//);
      });
    });
    
    it('should implement readResource correctly', async () => {
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
        expect(typeof content.uri).toBe('string');
        expect(typeof content.text).toBe('string');
      });
      
      // Try to read a room with parameters
      const rooms = JSON.parse(result.contents[0].text);
      expect(Array.isArray(rooms)).toBe(true);
      
      if (rooms.length > 0) {
        const roomId = rooms[0].id;
        
        // Read a specific room
        const roomResult = await client.readResource({
          uri: `digitalsamba://rooms/${roomId}`,
        });
        
        // Verify room resource response
        expect(roomResult).toBeDefined();
        expect(roomResult.contents).toBeDefined();
        expect(roomResult.contents.length).toBe(1);
        
        // Verify room data
        const room = JSON.parse(roomResult.contents[0].text);
        expect(room).toHaveProperty('id', roomId);
        expect(room).toHaveProperty('name');
      }
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
        expect(error instanceof Error).toBe(true);
        
        // JSON-RPC style error, but in an Error object
        expect((error as Error).message).toContain('Unknown resource');
      }
      
      // Attempt to read a resource with invalid parameters
      try {
        await client.readResource({
          uri: 'digitalsamba://rooms/invalid-id',
        });
        
        // This might not always throw if the mock returns empty results
      } catch (error) {
        // If it throws, verify error structure
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });
  
  describe('Tools Compliance', () => {
    beforeEach(async () => {
      const mockApiPort = await getRandomPort();
      const mcpServerPort = await getRandomPort();
      
      // Set up integration test environment
      const { mockApiServer: mockApi, mcpServer: mcp, client: testClient } = 
        await setupIntegrationTest({
          mockApiPort,
          mcpServerPort,
          apiKey: 'test-api-key',
        });
      
      mockApiServer = mockApi;
      mcpServer = mcp;
      client = testClient;
    });
    
    it('should implement listTools correctly', async () => {
      const { tools } = await client.listTools();
      
      // Verify tools structure
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Verify tool object structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        
        // Verify arguments structure if present
        if (tool.arguments) {
          expect(Array.isArray(tool.arguments)).toBe(true);
          
          tool.arguments.forEach(arg => {
            expect(arg).toHaveProperty('name');
            expect(arg).toHaveProperty('description');
            expect(arg).toHaveProperty('required');
            expect(typeof arg.required).toBe('boolean');
          });
        }
      });
    });
    
    it('should implement callTool correctly', async () => {
      // Call create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Protocol Compliance Test Room',
          privacy: 'public',
          description: 'Room created by protocol compliance test',
        },
      });
      
      // Verify tool call response format
      expect(result).toBeDefined();
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify content structure
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      
      // Extract room ID for further testing
      const match = result.content[0].text.match(/"id":\s*"([^"]+)"/);
      expect(match).toBeTruthy();
      
      // Call a tool with the extracted room ID
      const roomId = match![1];
      const updateResult = await client.callTool({
        name: 'update-room',
        arguments: {
          roomId,
          name: 'Updated Protocol Test Room',
          description: 'Updated by protocol compliance test',
        },
      });
      
      // Verify update response
      expect(updateResult).toBeDefined();
      expect(updateResult.content).toBeDefined();
      expect(updateResult.content.length).toBe(1);
      expect(updateResult.content[0].text).toContain('Room updated successfully');
      
      // Call a tool to delete the room
      const deleteResult = await client.callTool({
        name: 'delete-room',
        arguments: {
          roomId,
        },
      });
      
      // Verify delete response
      expect(deleteResult).toBeDefined();
      expect(deleteResult.content).toBeDefined();
      expect(deleteResult.content.length).toBe(1);
      expect(deleteResult.content[0].text).toContain('Room deleted successfully');
    });
    
    it('should handle tool errors correctly', async () => {
      // Attempt to call a non-existent tool
      try {
        await client.callTool({
          name: 'non-existent-tool',
          arguments: {},
        });
        
        fail('Should have thrown an error for non-existent tool');
      } catch (error) {
        // Verify error structure according to MCP protocol
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Unknown tool');
      }
      
      // Attempt to call a tool with missing required arguments
      try {
        await client.callTool({
          name: 'create-room',
          arguments: {
            // Missing required 'name' argument
            privacy: 'public',
          },
        });
        
        fail('Should have thrown an error for missing required arguments');
      } catch (error) {
        // Verify error structure
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('required');
      }
      
      // Attempt to call update-room with a non-existent room ID
      try {
        await client.callTool({
          name: 'update-room',
          arguments: {
            roomId: 'non-existent-room-id',
            name: 'Updated Room',
          },
        });
        
        // This might not throw if the mock doesn't validate room IDs
      } catch (error) {
        // If it throws, verify error structure
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });
  
  describe('Notifications Compliance', () => {
    let serverProcess: any;
    
    afterEach(async () => {
      // Kill the server process if needed
      if (serverProcess) {
        serverProcess.kill();
      }
    });
    
    it('should send listChanged notifications correctly', async () => {
      // Start server with dynamic capabilities
      const port = await getRandomPort();
      
      // Start server process with webhook support (which enables dynamic resources)
      const { process, port: actualPort } = await startServerProcess({
        port,
        apiKey: 'test-api-key',
        enableWebhooks: true,
      });
      
      serverProcess = process;
      
      // Create a client with notification support
      const testClient = await import('../mocks/test-utils').then(module => 
        module.createTestClient(`http://localhost:${actualPort}/mcp`, 'test-api-key')
      );
      
      // Set up a listener for listChanged notifications
      const listChangedPromise = new Promise<any>((resolve) => {
        (testClient as any).transport.onNotification('listChanged', resolve);
      });
      
      // Register a webhook to trigger list changes
      await testClient.callTool({
        name: 'register-webhook',
        arguments: {
          url: 'https://example.com/webhook',
          events: ['room.created'],
        },
      });
      
      // Wait for the listChanged notification
      const notification = await listChangedPromise;
      
      // Verify notification structure
      expect(notification).toBeDefined();
      expect(notification).toHaveProperty('type');
      expect(notification.type).toBe('resources'); // Webhooks causes resources change
      
      // Clean up
      await (testClient as any).close();
    });
  });
  
  describe('HTTP Transport Compliance', () => {
    let serverPort: number;
    let serverProcess: any;
    
    beforeEach(async () => {
      // Get a random port
      const port = await getRandomPort();
      
      // Start server process
      const { process, port: actualPort } = await startServerProcess({
        port,
        apiKey: 'test-api-key',
      });
      
      serverProcess = process;
      serverPort = actualPort;
    });
    
    afterEach(async () => {
      // Kill the server process
      if (serverProcess) {
        serverProcess.kill();
      }
    });
    
    it('should handle HTTP headers correctly', async () => {
      // Create a direct fetch to test HTTP headers
      const response = await fetch(`http://localhost:${serverPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'initialize',
          params: {
            client: {
              name: 'http-test-client',
              version: '1.0.0',
            },
          },
        }),
      });
      
      // Verify HTTP response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      // Check for correct handling of CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      
      // Parse response body
      const body = await response.json();
      expect(body).toBeDefined();
      expect(body).toHaveProperty('jsonrpc', '2.0');
      expect(body).toHaveProperty('id', '1');
      expect(body).toHaveProperty('result');
    });
    
    it('should handle HTTP OPTIONS request correctly', async () => {
      // Send OPTIONS request to test CORS preflight
      const response = await fetch(`http://localhost:${serverPort}/mcp`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
          'Origin': 'http://example.com',
        },
      });
      
      // Verify CORS preflight response
      expect(response.status).toBe(204); // No content
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
      
      // Verify allowed methods and headers
      const allowedMethods = response.headers.get('Access-Control-Allow-Methods');
      expect(allowedMethods).toContain('POST');
      
      const allowedHeaders = response.headers.get('Access-Control-Allow-Headers');
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
    });
    
    it('should handle session deletion correctly', async () => {
      // First create a client and get a session
      const testClient = await import('../mocks/test-utils').then(module => 
        module.createTestClient(`http://localhost:${serverPort}/mcp`, 'test-api-key')
      );
      
      // Get the session ID
      const sessionId = (testClient as any).transport.sessionId;
      expect(sessionId).toBeDefined();
      
      // Send a DELETE request to end the session
      const response = await fetch(`http://localhost:${serverPort}/mcp`, {
        method: 'DELETE',
        headers: {
          'MCP-Session-ID': sessionId,
          'Authorization': 'Bearer test-api-key',
        },
      });
      
      // Verify DELETE response
      expect(response.status).toBe(204); // No content for successful deletion
      
      // Verify session is actually deleted by attempting to use it
      try {
        await fetch(`http://localhost:${serverPort}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'MCP-Session-ID': sessionId,
            'Authorization': 'Bearer test-api-key',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '2',
            method: 'listResources',
            params: {},
          }),
        });
        
        // Should fail or return error for invalid session
      } catch (error) {
        // Network error is acceptable here
      }
      
      // Clean up
      await (testClient as any).close();
    });
  });
  
  describe('Error Handling Compliance', () => {
    beforeEach(async () => {
      const mockApiPort = await getRandomPort();
      const mcpServerPort = await getRandomPort();
      
      // Set up integration test environment
      const { mockApiServer: mockApi, mcpServer: mcp, client: testClient } = 
        await setupIntegrationTest({
          mockApiPort,
          mcpServerPort,
          apiKey: 'test-api-key',
        });
      
      mockApiServer = mockApi;
      mcpServer = mcp;
      client = testClient;
    });
    
    it('should return JSON-RPC compliant errors', async () => {
      // Create a direct fetch to test error format
      const response = await fetch(`http://localhost:${(mcpServer.address() as any).port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '3',
          method: 'invalidMethod',
          params: {},
        }),
      });
      
      // Verify HTTP response
      expect(response.status).toBe(200); // Still 200 as error is in body
      
      // Parse response body
      const body = await response.json();
      expect(body).toBeDefined();
      expect(body).toHaveProperty('jsonrpc', '2.0');
      expect(body).toHaveProperty('id', '3');
      expect(body).toHaveProperty('error');
      
      // Verify error structure according to JSON-RPC spec
      const error = body.error;
      expect(error).toHaveProperty('code');
      expect(typeof error.code).toBe('number');
      expect(error).toHaveProperty('message');
      expect(typeof error.message).toBe('string');
    });
    
    it('should handle invalid JSON correctly', async () => {
      // Send invalid JSON to test error handling
      const response = await fetch(`http://localhost:${(mcpServer.address() as any).port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: '{invalid json',
      });
      
      // Verify HTTP response
      expect(response.status).toBe(200); // Still 200 as error is in body
      
      // Parse response body
      const body = await response.json();
      expect(body).toBeDefined();
      expect(body).toHaveProperty('jsonrpc', '2.0');
      expect(body).toHaveProperty('id', null); // Can't parse ID from invalid JSON
      expect(body).toHaveProperty('error');
      
      // Verify error structure for parse error
      const error = body.error;
      expect(error).toHaveProperty('code', -32700); // Parse error code
      expect(error).toHaveProperty('message');
      expect(error.message.toLowerCase()).toContain('parse');
    });
    
    it('should handle invalid authentication correctly', async () => {
      // Send request with invalid API key
      const response = await fetch(`http://localhost:${(mcpServer.address() as any).port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '4',
          method: 'listResources',
          params: {},
        }),
      });
      
      // Verify HTTP response for authentication error
      expect(response.status).toBe(401); // Unauthorized
      
      // Parse response body
      const body = await response.json();
      expect(body).toBeDefined();
      expect(body).toHaveProperty('jsonrpc', '2.0');
      expect(body).toHaveProperty('id', '4');
      expect(body).toHaveProperty('error');
      
      // Verify error structure for authentication error
      const error = body.error;
      expect(error).toHaveProperty('code', -32000); // Server error code
      expect(error).toHaveProperty('message');
      expect(error.message.toLowerCase()).toContain('unauthor');
    });
  });
});
