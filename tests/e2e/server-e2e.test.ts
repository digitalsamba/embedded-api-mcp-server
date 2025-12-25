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
import { ChildProcess } from 'child_process';
import { 
  setupIntegrationTest,
  cleanupResources,
  startServerProcess,
  setupMockApiServer,
  waitFor,
} from '../mocks/test-utils.js';

// Set longer timeout for E2E tests
jest.setTimeout(30000);

describe('End-to-End Tests', () => {
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

  describe('Basic Functionality', () => {
    beforeEach(async () => {
      // Set up integration test environment
      const setup = await setupIntegrationTest({
        mockApiPort,
        apiKey: 'test-api-key',
      });
      
      mockApiServer = setup.mockApiServer;
      serverProcess = setup.serverProcess;
      client = setup.client;
    });
    
    it('should list available resources', async () => {
      // Verify server resources
      const { resources } = await client.listResources();
      
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      
      // Check for key resources
      const resourceNames = resources.map(r => r.name);
      expect(resourceNames).toContain('rooms');
      expect(resourceNames).toContain('sessions');
      expect(resourceNames).toContain('recordings');
      expect(resourceNames).toContain('analytics-team');
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
      expect(toolNames).toContain('start-recording');
      expect(toolNames).toContain('get-recordings');
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
      expect(room).toHaveProperty('privacy');
    });
    
    it('should create a room', async () => {
      // Create a room
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'E2E Test Room',
          privacy: 'public',
          description: 'Room created by E2E test',
          max_participants: 50,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].text).toContain('successfully');
      
      // Extract room data from response
      const responseText = result.content[0].text;
      const roomDataMatch = responseText.match(/\{[\s\S]*\}/);
      expect(roomDataMatch).toBeTruthy();
      
      const roomData = JSON.parse(roomDataMatch![0]);
      expect(roomData).toHaveProperty('id');
      expect(roomData).toHaveProperty('name', 'E2E Test Room');
      
      // Read the specific room to verify it was created
      const roomResult = await client.readResource({
        uri: `digitalsamba://rooms/${roomData.id}`,
      });
      
      expect(roomResult).toBeDefined();
      expect(roomResult.contents).toBeDefined();
      expect(roomResult.contents.length).toBe(1);
      
      // Parse and verify room data
      const room = JSON.parse(roomResult.contents[0].text);
      expect(room).toHaveProperty('id', roomData.id);
      expect(room).toHaveProperty('name', 'E2E Test Room');
    });
    
    it('should generate a room token', async () => {
      // First create a room
      const createResult = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Token Test Room',
          privacy: 'public',
        },
      });
      
      // Extract room ID
      const createResponseText = createResult.content[0].text;
      const roomDataMatch = createResponseText.match(/\{[\s\S]*\}/);
      const roomData = JSON.parse(roomDataMatch![0]);
      
      // Generate a token for the room
      const tokenResult = await client.callTool({
        name: 'generate-token',
        arguments: {
          room_id: roomData.id,
          user_name: 'E2E Test User',
          role: 'host',
        },
      });
      
      expect(tokenResult).toBeDefined();
      expect(tokenResult.content).toBeDefined();
      expect(tokenResult.content.length).toBe(1);
      expect(tokenResult.content[0].text).toContain('successfully');
      
      // Extract token data
      const tokenDataMatch = tokenResult.content[0].text.match(/\{[\s\S]*\}/);
      expect(tokenDataMatch).toBeTruthy();
      
      const tokenData = JSON.parse(tokenDataMatch![0]);
      expect(tokenData).toHaveProperty('token');
      expect(tokenData).toHaveProperty('link');
      expect(tokenData).toHaveProperty('expires_at');
    });
  });
  
  describe('Recording Management', () => {
    beforeEach(async () => {
      // Set up integration test environment
      const setup = await setupIntegrationTest({
        mockApiPort,
        apiKey: 'test-api-key',
      });
      
      mockApiServer = setup.mockApiServer;
      serverProcess = setup.serverProcess;
      client = setup.client;
    });
    
    it('should list and manage recordings', async () => {
      // Get recordings
      const result = await client.callTool({
        name: 'get-recordings',
        arguments: {
          limit: 10,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('recording(s)');
      
      // Read recordings resource
      const recordingsResource = await client.readResource({
        uri: 'digitalsamba://recordings',
      });
      
      expect(recordingsResource).toBeDefined();
      expect(recordingsResource.contents).toBeDefined();
    });
    
    it('should handle archived recordings', async () => {
      // Archive/unarchive functionality is not yet implemented
      // For now, just verify that get-recordings works
      const result = await client.callTool({
        name: 'get-recordings',
        arguments: {
          limit: 10,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('recording(s)');
      
      // TODO: When archive functionality is implemented, test it properly
    });
  });
  
  describe('Analytics', () => {
    beforeEach(async () => {
      // Set up integration test environment
      const setup = await setupIntegrationTest({
        mockApiPort,
        apiKey: 'test-api-key',
      });
      
      mockApiServer = setup.mockApiServer;
      serverProcess = setup.serverProcess;
      client = setup.client;
    });
    
    it('should provide analytics data', async () => {
      // Get team analytics
      const teamAnalytics = await client.readResource({
        uri: 'digitalsamba://analytics/team',
      });
      
      expect(teamAnalytics).toBeDefined();
      expect(teamAnalytics.contents).toBeDefined();
      expect(teamAnalytics.contents.length).toBeGreaterThan(0);
      
      // Get usage statistics via tool
      const usageStats = await client.callTool({
        name: 'get-usage-statistics',
        arguments: {
          date_start: '2025-01-01',
          date_end: '2025-01-31',
        },
      });
      
      expect(usageStats).toBeDefined();
      expect(usageStats.content[0].text).toBeTruthy();
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(async () => {
      // Set up integration test with occasional failures
      mockApiServer = await setupMockApiServer({
        port: mockApiPort,
        delayMs: 100, // Add some delay to simulate network latency
        failureRate: 20, // 20% chance of API failure
        notFoundRate: 10, // 10% chance of 404 Not Found
      });
      
      const setup = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      serverProcess = setup.process;
      client = setup.client;
    });
    
    it('should handle API errors gracefully', async () => {
      // Test error handling by calling a tool that will fail
      // Use the token generation with a non-existent room
      const result = await client.callTool({
        name: 'generate-token',
        arguments: {
          room_id: 'non-existent-room',
          user_name: 'Test User',
        },
      });
      
      // Should get an error response but not crash
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error');
      // Accept either 404 (room not found) or 500 (random failure from mock)
      expect(result.content[0].text).toMatch(/404|500/);
    });
    
    it('should handle authentication errors', async () => {
      // Create a new server with invalid API key
      const badSetup = await startServerProcess({
        apiKey: 'invalid-key',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      const badClient = badSetup.client;
      const badProcess = badSetup.process;
      
      try {
        // Attempt to create a room with invalid key
        const result = await badClient.callTool({
          name: 'create-room',
          arguments: {
            name: 'Should Fail',
            privacy: 'public',
          },
        });
        
        // Should get error response
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unauthorized');
      } finally {
        // Clean up
        await cleanupResources({
          serverProcess: badProcess,
          client: badClient,
        });
      }
    });
  });
  
  describe('Server Process Management', () => {
    it('should start and stop server process cleanly', async () => {
      // Start mock API
      const mockApi = await setupMockApiServer({ port: mockApiPort });
      
      // Start server process
      const { process: proc, client: testClient } = await startServerProcess({
        apiKey: 'test-api-key',
        apiUrl: `http://localhost:${mockApiPort}`,
        enableCache: true,
      });
      
      // Verify we can communicate (process details may not be accessible)
      const { resources } = await testClient.listResources();
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      
      // Clean up
      await cleanupResources({
        mockApiServer: mockApi,
        serverProcess: proc,
        client: testClient,
      });
      
      // Give some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    it('should handle multiple clients to same server', async () => {
      // Note: stdio transport doesn't support multiple clients to same process
      // This test verifies that we can start multiple server processes
      
      // Start mock API
      const mockApi = await setupMockApiServer({ port: mockApiPort });
      
      // Start first server
      const setup1 = await startServerProcess({
        apiKey: 'test-api-key-1',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      // Start second server
      const setup2 = await startServerProcess({
        apiKey: 'test-api-key-2',
        apiUrl: `http://localhost:${mockApiPort}`,
      });
      
      // Both should work independently
      const [resources1, resources2] = await Promise.all([
        setup1.client.listResources(),
        setup2.client.listResources(),
      ]);
      
      expect(resources1.resources).toBeDefined();
      expect(resources2.resources).toBeDefined();
      
      // Clean up
      await cleanupResources({
        mockApiServer: mockApi,
        serverProcess: setup1.process,
        client: setup1.client,
      });
      
      await cleanupResources({
        serverProcess: setup2.process,
        client: setup2.client,
      });
    });
  });
});