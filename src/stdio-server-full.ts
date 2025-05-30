#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import { MemoryCache } from './cache.js';
import { setupRecordingFunctionality } from './recordings.js';
import { getApiKeyFromRequest } from './auth.js';
import logger from './logger.js';

// Redirect console to stderr
console.log = (...args: any[]) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.error = (...args: any[]) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);

export async function runFullStdioServer(): Promise<void> {
  // Get API key from environment variable (set by CLI)
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  if (!apiKey) {
    console.error('No API key provided. Please set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }

  console.error('[INFO] Starting Digital Samba MCP Server (full features) in stdio mode...');

  // Create MCP server
  const server = new McpServer({
    name: "Digital Samba MCP Server",
    version: "1.0.0"
  });

  // API configuration
  const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
  const ENABLE_CACHE = process.env.ENABLE_CACHE !== 'false';
  const CACHE_TTL = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300000;
  
  // Create cache if enabled
  const cache = ENABLE_CACHE ? new MemoryCache<any>({ ttl: CACHE_TTL }) : undefined;

  // Setup resources
  setupResources(server, apiKey, API_URL, cache);
  
  // Setup tools
  setupTools(server, apiKey, API_URL, cache);

  // Setup additional functionality
  setupRecordingFunctionality(server, API_URL);

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect immediately
  await server.connect(transport);
  console.error('[INFO] MCP server connected successfully with full features');
}

function setupResources(server: McpServer, apiKey: string, apiUrl: string, cache?: MemoryCache<any>): void {
  // List rooms resource
  server.resource(
    'rooms',
    'digitalsamba://rooms',
    async () => {
      console.error('[DEBUG] Fetching rooms list');
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const response = await client.listRooms();
        const rooms = response.data || [];
        
        return {
          contents: [{
            uri: 'digitalsamba://rooms',
            text: JSON.stringify(rooms, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to fetch rooms:', error);
        throw error;
      }
    }
  );

  // Individual room resource
  server.resource(
    'room',
    'digitalsamba://rooms/{roomId}',
    async (uri) => {
      const roomId = uri.pathname.split('/').pop();
      if (!roomId) {
        throw new Error('Room ID is required');
      }
      
      console.error(`[DEBUG] Fetching room: ${roomId}`);
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const room = await client.getRoom(roomId);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(room, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        console.error(`[ERROR] Failed to fetch room ${roomId}:`, error);
        throw error;
      }
    }
  );

  // Room participants resource
  server.resource(
    'participants',
    'digitalsamba://rooms/{roomId}/participants',
    async (uri) => {
      const pathParts = uri.pathname.split('/');
      const roomId = pathParts[pathParts.length - 2];
      
      if (!roomId) {
        throw new Error('Room ID is required');
      }
      
      console.error(`[DEBUG] Fetching participants for room: ${roomId}`);
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const response = await client.getLiveRoomsWithParticipants();
        const roomData = response.data?.find((r: any) => r.id === roomId);
        const participants = roomData?.live_participants || [];
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(participants, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        console.error(`[ERROR] Failed to fetch participants for room ${roomId}:`, error);
        throw error;
      }
    }
  );

  // Recordings resource
  server.resource(
    'recordings',
    'digitalsamba://recordings',
    async () => {
      console.error('[DEBUG] Fetching recordings list');
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const response = await client.listRecordings({});
        const recordings = response.data || [];
        
        return {
          contents: [{
            uri: 'digitalsamba://recordings',
            text: JSON.stringify(recordings, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to fetch recordings:', error);
        throw error;
      }
    }
  );

  // Meetings resource
  server.resource(
    'meetings',
    'digitalsamba://meetings',
    async () => {
      console.error('[DEBUG] Fetching meetings list');
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const response = await client.listScheduledMeetings({});
        const meetings = response.data || [];
        
        return {
          contents: [{
            uri: 'digitalsamba://meetings',
            text: JSON.stringify(meetings, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to fetch meetings:', error);
        throw error;
      }
    }
  );
}

function setupTools(server: McpServer, apiKey: string, apiUrl: string, cache?: MemoryCache<any>): void {
  // Create room tool
  server.tool(
    'create-room',
    {
      name: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      friendly_url: z.string().min(3).max(32).optional(),
      privacy: z.enum(['public', 'private']).default('public'),
      max_participants: z.number().min(2).max(2000).optional(),
    },
    async (params) => {
      const { name, description, friendly_url, privacy, max_participants } = params;
      
      console.error('[DEBUG] Creating room', { name, privacy });
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const room = await client.createRoom({
          name: name || `Room ${Date.now()}`,
          description,
          friendly_url,
          privacy,
          max_participants
        });
        
        console.error('[INFO] Room created successfully', { roomId: room.id });
        
        return {
          content: [{
            type: 'text',
            text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to create room:', error);
        
        return {
          content: [{
            type: 'text',
            text: `Error creating room: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Generate room token tool
  server.tool(
    'generate-token',
    {
      roomId: z.string(),
      role: z.enum(['moderator', 'speaker', 'attendee']).optional(),
      u: z.string().optional(),
      user_id: z.string().optional(),
      seconds_valid: z.number().optional(),
      expires_at: z.string().optional()
    },
    async (params) => {
      const { roomId, ...tokenOptions } = params;
      
      console.error('[DEBUG] Generating token for room', { roomId });
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const token = await client.generateRoomToken(roomId, tokenOptions);
        
        console.error('[INFO] Token generated successfully', { roomId });
        
        return {
          content: [{
            type: 'text',
            text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to generate token:', error);
        
        return {
          content: [{
            type: 'text',
            text: `Error generating token: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Update room tool
  server.tool(
    'update-room',
    {
      roomId: z.string(),
      name: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      friendly_url: z.string().min(3).max(32).optional(),
      privacy: z.enum(['public', 'private']).optional(),
      max_participants: z.number().min(2).max(2000).optional()
    },
    async (params) => {
      const { roomId, ...roomSettings } = params;
      
      console.error('[DEBUG] Updating room', { roomId });
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const room = await client.updateRoom(roomId, roomSettings);
        
        console.error('[INFO] Room updated successfully', { roomId: room.id });
        
        return {
          content: [{
            type: 'text',
            text: `Room updated successfully!\n\n${JSON.stringify(room, null, 2)}`
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to update room:', error);
        
        return {
          content: [{
            type: 'text',
            text: `Error updating room: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Delete room tool
  server.tool(
    'delete-room',
    {
      roomId: z.string()
    },
    async (params) => {
      const { roomId } = params;
      
      console.error('[DEBUG] Deleting room', { roomId });
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        await client.deleteRoom(roomId);
        
        console.error('[INFO] Room deleted successfully', { roomId });
        
        return {
          content: [{
            type: 'text',
            text: `Room deleted successfully!`
          }]
        };
      } catch (error) {
        console.error('[ERROR] Failed to delete room:', error);
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting room: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullStdioServer().catch(error => {
    console.error('[FATAL] Server failed to start:', error);
    process.exit(1);
  });
}