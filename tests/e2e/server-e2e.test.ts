/**
 * End-to-End Tests for the Digital Samba MCP Server
 * 
 * This file contains tests that run the server with a mock API
 * and verify its functionality end-to-end.
 * 
 * @group e2e
 */

import { Server } from 'http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  setupIntegrationTest,
  cleanupServers,
  getRandomPort,
  startServerProcess
} from '../mocks/test-utils';

// Set longer timeout for E2E tests
jest.setTimeout(30000);

describe('End-to-End Tests', () => {
  let mockApiServer: Server;
  let mcpServer: Server;
  let client: Client;
  
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
  
  describe('Basic Functionality', () => {
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
    
    it('should list available resources', async () => {
      // Verify server resources
      const { resources } = await client.listResources();
      
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      
      // Check for key resources
      const resourceNames = resources.map(r => r.name);
      expect(resourceNames).toContain('rooms');
      expect(resourceNames).toContain('room');
      expect(resourceNames).toContain('participants');
    });
    
    it('should list available tools', async () => {
      // Verify server tools
      const { tools } = await client.listTools();
      
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for key tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create-room');
      expect(toolNames).toContain('generate-token');
      expect(toolNames).toContain('update-room');
      expect(toolNames).toContain('delete-room');
    });
    
    it('should read room listings', async () => {
      // Read room listings
      const result = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      
      // Parse and verify room data
      const room = JSON.parse(result.contents[0].text);
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
    });
    
    it('should create a room', async () => {
      // Create a room
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Test Room',
          privacy: 'public',
          description: 'Room created by E2E test',
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].text).toContain('Room created successfully');
      
      // Extract room ID from response
      const match = result.content[0].text.match(/"id":\s*"([^"]+)"/);
      expect(match).toBeTruthy();
      
      // Read the specific room
      const roomId = match![1];
      const roomResult = await client.readResource({
        uri: `digitalsamba://rooms/${roomId}`,
      });
      
      expect(roomResult).toBeDefined();
      expect(roomResult.contents).toBeDefined();
      expect(roomResult.contents.length).toBe(1);
      
      // Parse and verify room data
      const room = JSON.parse(roomResult.contents[0].text);
      expect(room).toHaveProperty('id', roomId);
      expect(room).toHaveProperty('name', 'Test Room');
    });
    
    it('should generate a room token', async () => {
      // Generate a token for a room
      const result = await client.callTool({
        name: 'generate-token',
        arguments: {
          roomId: 'room-1',
          userName: 'Test User',
          role: 'host',
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].text).toContain('Token generated successfully');
      expect(result.content[0].text).toContain('token');
      expect(result.content[0].text).toContain('link');
      expect(result.content[0].text).toContain('expires_at');
    });
  });
  
  describe('Server Process', () => {
    let serverProcess: any;
    let serverPort: number;
    
    afterEach(async () => {
      // Kill the server process
      if (serverProcess) {
        serverProcess.kill();
      }
    });
    
    it('should start server process with command-line arguments', async () => {
      // Get a random port
      const port = await getRandomPort();
      
      // Start server process
      const { process, port: actualPort } = await startServerProcess({
        port,
        apiKey: 'test-api-key',
        enableCache: true,
        enableRateLimiting: true,
      });
      
      serverProcess = process;
      serverPort = actualPort;
      
      // Verify server is running by connecting a client
      const testClient = await import('../mocks/test-utils').then(module => 
        module.createTestClient(`http://localhost:${serverPort}/mcp`, 'test-api-key')
      );
      
      // List resources to verify server is working
      const { resources } = await testClient.listResources();
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      
      // Clean up client
      await (testClient as any).close();
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(async () => {
      const mockApiPort = await getRandomPort();
      const mcpServerPort = await getRandomPort();
      
      // Set up integration test with occasional failures
      const { mockApiServer: mockApi, mcpServer: mcp, client: testClient } = 
        await setupIntegrationTest({
          mockApiPort,
          mcpServerPort,
          apiKey: 'test-api-key',
          mockApiOptions: {
            delayMs: 100, // Add some delay to simulate network latency
            failureRate: 20, // 20% chance of API failure
            notFoundRate: 10, // 10% chance of 404 Not Found
          },
        });
      
      mockApiServer = mockApi;
      mcpServer = mcp;
      client = testClient;
    });
    
    it('should handle API errors gracefully', async () => {
      // Due to the mock API's failureRate setting, some requests might fail
      // Make several requests to have a chance of encountering failures
      for (let i = 0; i < 10; i++) {
        try {
          // Try to read rooms
          await client.readResource({
            uri: 'digitalsamba://rooms',
          });
          
          // If successful, just continue
        } catch (error) {
          // If error, verify it's formatted properly
          expect(error).toBeDefined();
          expect(error instanceof Error).toBe(true);
          
          // The error should be from the API, not a protocol error
          expect((error as Error).message).toContain('Error');
        }
      }
    });
    
    it('should handle authentication errors', async () => {
      // Create a client with invalid API key
      const testClient = await import('../mocks/test-utils').then(module => 
        module.createTestClient(`http://localhost:${(mcpServer.address() as any).port}/mcp`, 'invalid-key')
      );
      
      // Attempt to read rooms with invalid key
      try {
        await testClient.readResource({
          uri: 'digitalsamba://rooms',
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Verify error message
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Unauthorized');
      }
      
      // Clean up client
      await (testClient as any).close();
    });
  });
});
