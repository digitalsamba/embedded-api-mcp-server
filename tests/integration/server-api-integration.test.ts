/**
 * Integration tests for the MCP Server with API client
 * 
 * This file tests the integration between the MCP server and the Digital Samba API client,
 * ensuring that they work together correctly to handle resources and tools.
 * 
 * @group integration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startServerProcess, cleanupResources, waitFor } from '../mocks/test-utils.js';
import { createMockApiServer } from '../mocks/mock-api-server.js';
import { Server } from 'http';
import { ChildProcess } from 'child_process';

describe('MCP Server Integration', () => {
  let mockApiServer: Server;
  let serverProcess: ChildProcess;
  let client: Client;
  const mockApiPort = 8080;

  beforeEach(async () => {
    // Start mock API server
    const mockServer = createMockApiServer({ port: mockApiPort });
    mockApiServer = mockServer.server;
    
    // Wait for mock server to be ready
    await waitFor(async () => {
      try {
        const response = await fetch(`http://localhost:${mockApiPort}/rooms`, {
          headers: { Authorization: 'Bearer test-api-key' }
        });
        return response.ok;
      } catch {
        return false;
      }
    });

    // Start MCP server process with mock API
    const setup = await startServerProcess({
      apiKey: 'test-api-key',
      apiUrl: `http://localhost:${mockApiPort}`,
    });
    
    serverProcess = setup.process;
    client = setup.client;
  });

  afterEach(async () => {
    await cleanupResources({ mockApiServer, serverProcess, client });
  });

  describe('Resource Integration', () => {
    it('should list rooms through the MCP protocol', async () => {
      // List available resources
      const { resources } = await client.listResources();
      
      // Find rooms resource
      const roomsResource = resources.find(r => r.name === 'rooms');
      expect(roomsResource).toBeDefined();
      expect(roomsResource?.uri).toBe('digitalsamba://rooms');
      
      // Read rooms resource
      const { contents } = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBeGreaterThan(0);
      
      // Parse first room (DS API uses 'topic' for room name)
      const firstRoom = JSON.parse(contents[0].text);
      expect(firstRoom).toHaveProperty('id');
      expect(firstRoom).toHaveProperty('topic');
    });
    
    it('should get a specific room through the MCP protocol', async () => {
      // First get room list to get a valid room ID
      const { contents: roomsList } = await client.readResource({
        uri: 'digitalsamba://rooms',
      });
      
      const firstRoom = JSON.parse(roomsList[0].text);
      const roomId = firstRoom.id;
      
      // Get specific room resource
      const { contents } = await client.readResource({
        uri: `digitalsamba://rooms/${roomId}`,
      });
      
      // Verify response
      expect(contents).toBeDefined();
      expect(contents.length).toBe(1);
      
      const room = JSON.parse(contents[0].text);
      expect(room.id).toBe(roomId);
      expect(room).toHaveProperty('topic');
    });

    it('should list analytics resources', async () => {
      // List available resources
      const { resources } = await client.listResources();
      
      // Find analytics resources
      const analyticsResources = resources.filter(r => r.uri?.includes('analytics'));
      expect(analyticsResources.length).toBeGreaterThan(0);
      
      // Check for team analytics
      const teamAnalytics = analyticsResources.find(r => r.name === 'analytics-team');
      expect(teamAnalytics).toBeDefined();
    });
  });
  
  describe('Tool Integration', () => {
    it('should list available tools', async () => {
      // List tools
      const { tools } = await client.listTools();
      
      // Verify we have tools
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for essential room tools
      const roomTools = ['create-room', 'update-room', 'delete-room', 'generate-token'];
      roomTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool?.description).toBeTruthy();
        expect(tool?.inputSchema).toBeDefined();
      });
    });
    
    it('should create a room through MCP tools', async () => {
      // Call create-room tool
      const result = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Test Integration Room',
          privacy: 'public',
          max_participants: 10,
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('successfully');
      expect(responseText).toContain('Test Integration Room');
      
      // Response should contain the created room data
      const roomDataMatch = responseText.match(/\{[\s\S]*\}/);
      expect(roomDataMatch).toBeTruthy();
      
      if (roomDataMatch) {
        const roomData = JSON.parse(roomDataMatch[0]);
        expect(roomData).toHaveProperty('id');
        expect(roomData.name).toBe('Test Integration Room');
        expect(roomData.privacy).toBe('public');
      }
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
      
      // Extract room ID from response
      const createResponseText = createResult.content[0].text;
      const roomDataMatch = createResponseText.match(/\{[\s\S]*\}/);
      const roomData = JSON.parse(roomDataMatch![0]);
      const createdRoomId = roomData.id;

      // Generate token for the room
      const tokenResult = await client.callTool({
        name: 'generate-token',
        arguments: {
          room_id: createdRoomId,
          user_name: 'Test User',
          role: 'moderator',
        },
      });

      // Verify token response
      expect(tokenResult).toBeDefined();
      expect(tokenResult.content[0].text).toContain('successfully');

      const tokenDataMatch = tokenResult.content[0].text.match(/\{[\s\S]*\}/);
      expect(tokenDataMatch).toBeTruthy();

      if (tokenDataMatch) {
        const tokenData = JSON.parse(tokenDataMatch[0]);
        expect(tokenData).toHaveProperty('token');
        expect(tokenData).toHaveProperty('link');
        expect(tokenData.link).toContain(createdRoomId);
      }
    });

    it('should handle errors gracefully', async () => {
      // Try to generate token for non-existent room
      const result = await client.callTool({
        name: 'generate-token',
        arguments: {
          room_id: 'non-existent-room',
          user_name: 'Test User',
          role: 'moderator',
        },
      });
      
      // The tool should return an error message, not throw
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error');
    });
  });
  
  describe('Recording Tools', () => {
    it('should list recording management tools', async () => {
      const { tools } = await client.listTools();
      
      // Check for recording tools
      const recordingTools = [
        'start-recording',
        'stop-recording',
        'get-recordings',
        'delete-recording',
        'archive-recording',
        'unarchive-recording',
      ];
      
      recordingTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });
    
    it('should retrieve recordings', async () => {
      // Get recordings
      const result = await client.callTool({
        name: 'get-recordings',
        arguments: {
          limit: 10,
        },
      });
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('recording(s)');
    });
  });
  
  describe('Session Management', () => {
    it('should list session resources', async () => {
      const { resources } = await client.listResources();
      
      // Find session resources
      const sessionResource = resources.find(r => r.name === 'sessions');
      expect(sessionResource).toBeDefined();
      
      // Read sessions - this now works with the sessions endpoint added to mock server
      const { contents } = await client.readResource({
        uri: 'digitalsamba://sessions',
      });
      
      expect(contents).toBeDefined();
      expect(Array.isArray(contents)).toBe(true);
      
      // Should have at least one session from mock data
      expect(contents.length).toBeGreaterThan(0);
      
      // Verify session data structure
      const firstSession = JSON.parse(contents[0].text);
      expect(firstSession).toHaveProperty('id');
      expect(firstSession).toHaveProperty('room_id');
    });
  });
  
  describe('Analytics Integration', () => {
    it('should provide team analytics through tools', async () => {
      const { tools } = await client.listTools();
      
      // Find analytics tool
      const participantStatsTool = tools.find(t => t.name === 'get-participant-statistics');
      expect(participantStatsTool).toBeDefined();
      
      // Call participant statistics tool
      const result = await client.callTool({
        name: 'get-participant-statistics',
        arguments: {
          date_start: '2025-01-01',
          date_end: '2025-01-31',
        },
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toBeTruthy();
    });
  });
});