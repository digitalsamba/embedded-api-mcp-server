import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import { MemoryCache } from './cache.js';
import logger from './logger.js';

// Import all setup functions but we'll implement our own versions that properly handle API keys
import type { Room, Recording, Participant, ScheduledMeeting } from './digital-samba-api.js';

export function createStdioServer(apiKey: string, apiUrl: string = 'https://api.digitalsamba.com/api/v1'): McpServer {
  const server = new McpServer({
    name: "Digital Samba MCP Server",
    version: "1.0.0"
  });

  // Create cache
  const cache = new MemoryCache<any>({ ttl: 300000 });

  // Setup all resources with API key
  setupResources(server, apiKey, apiUrl, cache);
  
  // Setup all tools with API key
  setupTools(server, apiKey, apiUrl, cache);

  return server;
}

function setupResources(server: McpServer, apiKey: string, apiUrl: string, cache: MemoryCache<any>): void {
  // Rooms resource
  server.resource(
    'rooms',
    'digitalsamba://rooms',
    async () => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      const response = await client.listRooms();
      return {
        contents: [{
          uri: 'digitalsamba://rooms',
          text: JSON.stringify(response.data || [], null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // Room details resource
  server.resource(
    'room',
    'digitalsamba://rooms/{roomId}',
    async (uri) => {
      const roomId = uri.pathname.split('/').pop();
      if (!roomId) throw new Error('Room ID is required');
      
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      const room = await client.getRoom(roomId);
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(room, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // Participants resource
  server.resource(
    'participants',
    'digitalsamba://rooms/{roomId}/participants',
    async (uri) => {
      const pathParts = uri.pathname.split('/');
      const roomId = pathParts[pathParts.length - 2];
      if (!roomId) throw new Error('Room ID is required');
      
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
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
    }
  );

  // Recordings resource
  server.resource(
    'recordings',
    'digitalsamba://recordings',
    async () => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      const response = await client.listRecordings({});
      return {
        contents: [{
          uri: 'digitalsamba://recordings',
          text: JSON.stringify(response.data || [], null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );

  // Meetings resource
  server.resource(
    'meetings',
    'digitalsamba://meetings',
    async () => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      const response = await client.listScheduledMeetings({});
      return {
        contents: [{
          uri: 'digitalsamba://meetings',
          text: JSON.stringify(response.data || [], null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );
}

function setupTools(server: McpServer, apiKey: string, apiUrl: string, cache: MemoryCache<any>): void {
  // Create room
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
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      try {
        const room = await client.createRoom({
          name: params.name || `Room ${Date.now()}`,
          description: params.description,
          friendly_url: params.friendly_url,
          privacy: params.privacy,
          max_participants: params.max_participants
        });
        
        return {
          content: [{
            type: 'text',
            text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`
          }]
        };
      } catch (error) {
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

  // Generate token
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
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const token = await client.generateRoomToken(roomId, tokenOptions);
        return {
          content: [{
            type: 'text',
            text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`
          }]
        };
      } catch (error) {
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

  // Update room
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
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const room = await client.updateRoom(roomId, roomSettings);
        return {
          content: [{
            type: 'text',
            text: `Room updated successfully!\n\n${JSON.stringify(room, null, 2)}`
          }]
        };
      } catch (error) {
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

  // Delete room
  server.tool(
    'delete-room',
    {
      roomId: z.string()
    },
    async (params) => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        await client.deleteRoom(params.roomId);
        return {
          content: [{
            type: 'text',
            text: `Room deleted successfully!`
          }]
        };
      } catch (error) {
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

  // Get recordings
  server.tool(
    'get-recordings',
    {
      limit: z.number().optional(),
      page: z.number().optional(),
      room_id: z.string().optional()
    },
    async (params) => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const response = await client.listRecordings(params || {});
        const recordings = response.data || [];
        
        return {
          content: [{
            type: 'text',
            text: `Found ${recordings.length} recordings:\n\n${JSON.stringify(recordings, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving recordings: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Start recording
  server.tool(
    'start-recording',
    {
      roomId: z.string()
    },
    async (params) => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const result = await client.startRecording(params.roomId);
        return {
          content: [{
            type: 'text',
            text: `Recording started successfully!\n\n${JSON.stringify(result, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error starting recording: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Stop recording
  server.tool(
    'stop-recording',
    {
      roomId: z.string()
    },
    async (params) => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const result = await client.stopRecording(params.roomId);
        return {
          content: [{
            type: 'text',
            text: `Recording stopped successfully!\n\n${JSON.stringify(result, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error stopping recording: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Create meeting
  server.tool(
    'create-meeting',
    {
      title: z.string().min(3).max(200),
      description: z.string().max(1000).optional(),
      start_time: z.string(),
      end_time: z.string().optional(),
      timezone: z.string().optional(),
      host_name: z.string().optional(),
      host_email: z.string().email().optional(),
      participants: z.array(z.object({
        name: z.string(),
        email: z.string().email()
      })).optional(),
      recurring: z.boolean().optional(),
      recurrence_pattern: z.string().optional()
    },
    async (params) => {
      const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
      
      try {
        const meeting = await client.createScheduledMeeting(params as any);
        return {
          content: [{
            type: 'text',
            text: `Meeting scheduled successfully!\n\n${JSON.stringify(meeting, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating meeting: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}