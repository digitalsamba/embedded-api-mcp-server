/**
 * Digital Samba MCP Server - Moderation Functionality
 * 
 * This module implements resources and tools for room moderation.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { getApiKeyFromRequest } from './auth.js';

/**
 * Set up moderation resources and tools for the MCP server
 */
export function setupModerationFunctionality(server: McpServer, apiUrl: string) {
  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------

  // Resource for getting room moderation settings
  server.resource(
    'room-moderation-settings',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/moderation', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Getting moderation settings for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get room details to retrieve moderation settings
        const room = await client.getRoom(roomId as string);
        
        // Extract moderation-related settings
        const moderationSettings = {
          is_locked: room.is_locked || false,
          chat_enabled: room.chat_enabled || true,
          private_chat_enabled: room.private_chat_enabled || true,
          recordings_enabled: room.recordings_enabled || true,
          screenshare_enabled: room.screenshare_enabled || true,
          audio_on_join_enabled: room.audio_on_join_enabled || true,
          video_on_join_enabled: room.video_on_join_enabled || true,
          participants_list_enabled: room.participants_list_enabled || true,
        };
        
        // Format as resource content
        const content = {
          uri: uri.href,
          text: JSON.stringify(moderationSettings, null, 2),
        };
        
        return { contents: [content] };
      } catch (error) {
        logger.error('Error fetching room moderation settings', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // -------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------

  // Tool for locking/unlocking a room
  server.tool(
    'set-room-lock',
    {
      roomId: z.string(),
      lock: z.boolean(),
    },
    async (params, request) => {
      const { roomId, lock } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Setting room lock status', { roomId, lock });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Update the room to set is_locked status
        await client.updateRoom(roomId, { is_locked: lock });
        
        const action = lock ? 'locked' : 'unlocked';
        logger.info(`Room ${action} successfully`, { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room ${roomId} has been ${action} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error setting room lock status', { 
          roomId,
          lock, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error setting room lock status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for removing a participant from a room
  server.tool(
    'remove-participant',
    {
      roomId: z.string(),
      participantId: z.string(),
    },
    async (params, request) => {
      const { roomId, participantId } = params;
      
      if (!roomId || !participantId) {
        return {
          content: [{ type: 'text', text: 'Room ID and Participant ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Removing participant from room', { roomId, participantId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Remove the participant from the room
        await client.removeParticipant(roomId, participantId)
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been removed from room ${roomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error removing participant', { 
          roomId,
          participantId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error removing participant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for muting/unmuting a participant
  server.tool(
    'set-participant-mute',
    {
      roomId: z.string(),
      participantId: z.string(),
      mute: z.boolean(),
      type: z.enum(['audio', 'video', 'all']).default('all'),
    },
    async (params, request) => {
      const { roomId, participantId, mute, type } = params;
      
      if (!roomId || !participantId) {
        return {
          content: [{ type: 'text', text: 'Room ID and Participant ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Setting participant mute status', { roomId, participantId, mute, type });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Set the mute status for the participant
        await client.setParticipantMute(roomId, participantId, { mute, type })
        
        const action = mute ? 'muted' : 'unmuted';
        const typeText = type === 'all' ? 'audio and video' : type;
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been ${action} (${typeText}) in room ${roomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error setting participant mute status', { 
          roomId,
          participantId,
          mute,
          type,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error setting participant mute status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for updating room media settings (chat, screenshare, etc.)
  server.tool(
    'update-room-media-settings',
    {
      roomId: z.string(),
      chat_enabled: z.boolean().optional(),
      private_chat_enabled: z.boolean().optional(),
      screenshare_enabled: z.boolean().optional(),
      recordings_enabled: z.boolean().optional(),
      audio_on_join_enabled: z.boolean().optional(),
      video_on_join_enabled: z.boolean().optional(),
      participants_list_enabled: z.boolean().optional(),
    },
    async (params, request) => {
      const { roomId, ...settings } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      if (Object.keys(settings).length === 0) {
        return {
          content: [{ type: 'text', text: 'At least one setting must be provided.' }],
          isError: true,
        };
      }
      
      logger.info('Updating room media settings', { roomId, settings });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Update the room with the new settings
        await client.updateRoom(roomId, settings);
        
        // Format a response showing which settings were updated
        const updatedSettings = Object.entries(settings)
          .map(([key, value]) => `- ${key.replace('_', ' ')}: ${value ? 'Enabled' : 'Disabled'}`)
          .join('\n');
        
        logger.info('Room media settings updated successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room ${roomId} settings updated successfully:\n\n${updatedSettings}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error updating room media settings', { 
          roomId,
          settings,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error updating room media settings: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for setting a participant's role
  server.tool(
    'set-participant-role',
    {
      roomId: z.string(),
      participantId: z.string(),
      role: z.string(),
    },
    async (params, request) => {
      const { roomId, participantId, role } = params;
      
      if (!roomId || !participantId || !role) {
        return {
          content: [{ type: 'text', text: 'Room ID, Participant ID, and Role are required.' }],
          isError: true,
        };
      }
      
      logger.info('Setting participant role', { roomId, participantId, role });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Set the role for the participant
        await client.setParticipantRole(roomId, participantId, role)
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} role has been set to ${role} in room ${roomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error setting participant role', { 
          roomId,
          participantId,
          role,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error setting participant role: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Resource for listing banned participants
  server.resource(
    'banned-participants',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/banned-participants', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Listing banned participants for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get banned participants from API
        const response = await client.getBannedParticipants(roomId as string);
        const bannedParticipants = response.data || [];
        logger.debug(`Found ${bannedParticipants.length} banned participants for room ${roomId}`);
        
        // Format banned participants as resource contents
        const contents = bannedParticipants.map(participant => ({
          uri: `digitalsamba://rooms/${roomId}/banned-participants/${participant.id}`,
          text: JSON.stringify(participant, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching banned participants', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Tool for banning a participant
  server.tool(
    'ban-participant',
    {
      roomId: z.string(),
      participantId: z.string(),
    },
    async (params, request) => {
      const { roomId, participantId } = params;
      
      if (!roomId || !participantId) {
        return {
          content: [{ type: 'text', text: 'Room ID and Participant ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Banning participant from room', { roomId, participantId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Ban the participant
        await client.banParticipant(roomId, participantId);
        
        logger.info('Participant banned successfully', { roomId, participantId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been banned from room ${roomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error banning participant', { 
          roomId,
          participantId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error banning participant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for unbanning a participant
  server.tool(
    'unban-participant',
    {
      roomId: z.string(),
      participantId: z.string(),
    },
    async (params, request) => {
      const { roomId, participantId } = params;
      
      if (!roomId || !participantId) {
        return {
          content: [{ type: 'text', text: 'Room ID and Participant ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Unbanning participant from room', { roomId, participantId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Unban the participant
        await client.unbanParticipant(roomId, participantId);
        
        logger.info('Participant unbanned successfully', { roomId, participantId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been unbanned from room ${roomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error unbanning participant', { 
          roomId,
          participantId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error unbanning participant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for listing banned participants
  server.tool(
    'list-banned-participants',
    {
      roomId: z.string(),
    },
    async (params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Listing banned participants for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get banned participants
        const response = await client.getBannedParticipants(roomId);
        const bannedParticipants = response.data || [];
        logger.debug(`Found ${bannedParticipants.length} banned participants for room ${roomId}`);
        
        // Format response
        if (bannedParticipants.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No banned participants found for room ${roomId}.`,
              },
            ],
          };
        }
        
        let responseText = `Found ${bannedParticipants.length} banned participants for room ${roomId}:\n\n`;
        responseText += bannedParticipants.map((participant, index) => {
          return `${index + 1}. ID: ${participant.id}\n   Name: ${participant.name}\n   Banned at: ${new Date(participant.ban_time).toLocaleString()}`;
        }).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error listing banned participants', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error listing banned participants: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Moderation functionality set up successfully');
}
