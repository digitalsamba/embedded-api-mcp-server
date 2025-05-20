/**
 * Digital Samba MCP Server - Breakout Rooms Functionality
 * 
 * This module implements resources and tools for managing breakout rooms.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { getApiKeyFromRequest } from './auth.js';

/**
 * Set up breakout rooms resources and tools for the MCP server
 */
export function setupBreakoutRoomsFunctionality(server: McpServer, apiUrl: string) {
  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------

  // Resource for listing breakout rooms in a parent room
  server.resource(
    'breakout-rooms',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/breakout-rooms', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Listing breakout rooms for parent room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get breakout rooms from the Digital Samba API
        const response = await client.listBreakoutRooms(roomId as string);
        const breakoutRooms = response.data || [];
        
        logger.debug(`Found ${breakoutRooms.length} breakout rooms for parent room ${roomId}`);
        
        // Format as resource content
        const contents = breakoutRooms.map(room => ({
          uri: `digitalsamba://rooms/${roomId}/breakout-rooms/${room.id}`,
          text: JSON.stringify(room, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching breakout rooms', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Resource for getting a specific breakout room
  server.resource(
    'breakout-room',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/breakout-rooms/{breakoutRoomId}', { list: undefined }),
    async (uri, params, request) => {
      const { roomId, breakoutRoomId } = params;
      
      if (!roomId || !breakoutRoomId) {
        throw new Error('Room ID and Breakout Room ID are required.');
      }
      
      logger.info('Getting breakout room details', { roomId, breakoutRoomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get breakout room details
        const breakoutRoom = await client.getBreakoutRoom(roomId as string, breakoutRoomId as string);
        
        // Format as resource content
        const content = {
          uri: uri.href,
          text: JSON.stringify(breakoutRoom, null, 2),
        };
        
        return { contents: [content] };
      } catch (error) {
        logger.error('Error fetching breakout room details', { 
          roomId, 
          breakoutRoomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Resource for listing participants in a breakout room
  server.resource(
    'breakout-room-participants',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/breakout-rooms/{breakoutRoomId}/participants', { list: undefined }),
    async (uri, params, request) => {
      const { roomId, breakoutRoomId } = params;
      
      if (!roomId || !breakoutRoomId) {
        throw new Error('Room ID and Breakout Room ID are required.');
      }
      
      logger.info('Listing participants in breakout room', { roomId, breakoutRoomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get participants in the breakout room
        const response = await client.listBreakoutRoomParticipants(roomId as string, breakoutRoomId as string);
        const participants = response.data || [];
        
        logger.debug(`Found ${participants.length} participants in breakout room ${breakoutRoomId}`);
        
        // Format as resource content
        const contents = participants.map(participant => ({
          uri: `digitalsamba://rooms/${roomId}/breakout-rooms/${breakoutRoomId}/participants/${participant.id}`,
          text: JSON.stringify(participant, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching breakout room participants', { 
          roomId, 
          breakoutRoomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // -------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------

  // Tool for creating breakout rooms
  server.tool(
    'create-breakout-rooms',
    {
      roomId: z.string(),
      numRooms: z.number().min(1).max(50),
      namePrefix: z.string().optional().default('Breakout Room'),
      assignParticipants: z.boolean().optional().default(true),
      distributionMethod: z.enum(['random', 'manual']).optional().default('random'),
    },
    async (params, request) => {
      const { roomId, numRooms, namePrefix, assignParticipants, distributionMethod } = params;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Creating breakout rooms', { 
        roomId, 
        numRooms, 
        namePrefix, 
        assignParticipants, 
        distributionMethod 
      });
      
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
        // Create breakout rooms
        const response = await client.createBreakoutRooms(roomId, {
          count: numRooms,
          name_prefix: namePrefix,
          auto_assign: assignParticipants,
          distribution_method: distributionMethod,
        });
        
        const createdRooms = response.data || [];
        
        if (createdRooms.length === 0) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Breakout rooms were created, but no information was returned.' 
            }],
          };
        }
        
        logger.info(`${createdRooms.length} breakout rooms created successfully`, { roomId });
        
        // Format the response
        let responseText = `Successfully created ${createdRooms.length} breakout rooms:\n\n`;
        
        responseText += createdRooms.map((room, index) => {
          return `${index + 1}. ${room.name} (ID: ${room.id})`;
        }).join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error creating breakout rooms', { 
          roomId,
          numRooms,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error creating breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting a breakout room
  server.tool(
    'delete-breakout-room',
    {
      roomId: z.string(),
      breakoutRoomId: z.string(),
    },
    async (params, request) => {
      const { roomId, breakoutRoomId } = params;
      
      if (!roomId || !breakoutRoomId) {
        return {
          content: [{ type: 'text', text: 'Room ID and Breakout Room ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Deleting breakout room', { roomId, breakoutRoomId });
      
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
        // Delete the breakout room
        await client.deleteBreakoutRoom(roomId, breakoutRoomId);
        
        logger.info('Breakout room deleted successfully', { roomId, breakoutRoomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Breakout room ${breakoutRoomId} has been deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting breakout room', { 
          roomId,
          breakoutRoomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting breakout room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting all breakout rooms
  server.tool(
    'delete-all-breakout-rooms',
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
      
      logger.info('Deleting all breakout rooms', { roomId });
      
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
        // Delete all breakout rooms
        await client.deleteAllBreakoutRooms(roomId);
        
        logger.info('All breakout rooms deleted successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `All breakout rooms for room ${roomId} have been deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting all breakout rooms', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting all breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for assigning participants to breakout rooms
  server.tool(
    'assign-participants-to-breakout-rooms',
    {
      roomId: z.string(),
      assignments: z.array(z.object({
        participantId: z.string(),
        breakoutRoomId: z.string(),
      })),
    },
    async (params, request) => {
      const { roomId, assignments } = params;
      
      if (!roomId || !assignments || assignments.length === 0) {
        return {
          content: [{ type: 'text', text: 'Room ID and participant assignments are required.' }],
          isError: true,
        };
      }
      
      logger.info('Assigning participants to breakout rooms', { 
        roomId, 
        assignmentCount: assignments.length 
      });
      
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
        // Format the assignments as required by the API
        const apiAssignments = assignments.map(assignment => ({
          participant_id: assignment.participantId,
          breakout_id: assignment.breakoutRoomId,
        }));
        
        // Assign participants to breakout rooms
        await client.assignParticipantsToBreakoutRooms(roomId, apiAssignments);
        
        logger.info('Participants assigned to breakout rooms successfully', { 
          roomId, 
          assignmentCount: assignments.length 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully assigned ${assignments.length} participants to breakout rooms.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error assigning participants to breakout rooms', { 
          roomId,
          assignmentCount: assignments.length,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error assigning participants to breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for reassigning a participant to a different breakout room
  server.tool(
    'reassign-participant',
    {
      roomId: z.string(),
      participantId: z.string(),
      breakoutRoomId: z.string(),
    },
    async (params, request) => {
      const { roomId, participantId, breakoutRoomId } = params;
      
      if (!roomId || !participantId || !breakoutRoomId) {
        return {
          content: [{ type: 'text', text: 'Room ID, Participant ID, and Breakout Room ID are required.' }],
          isError: true,
        };
      }
      
      logger.info('Reassigning participant to breakout room', { 
        roomId, 
        participantId, 
        breakoutRoomId 
      });
      
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
        // Assign the participant to the new breakout room
        await client.assignParticipantsToBreakoutRooms(roomId, [
          {
            participant_id: participantId,
            breakout_id: breakoutRoomId,
          }
        ]);
        
        logger.info('Participant reassigned to breakout room successfully', { 
          roomId, 
          participantId, 
          breakoutRoomId 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been reassigned to breakout room ${breakoutRoomId} successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error reassigning participant to breakout room', { 
          roomId,
          participantId,
          breakoutRoomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error reassigning participant to breakout room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for returning a participant to the main room
  server.tool(
    'return-participant-to-main-room',
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
      
      logger.info('Returning participant to main room', { roomId, participantId });
      
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
        // Return the participant to the main room by setting breakout_id to null
        await client.assignParticipantsToBreakoutRooms(roomId, [
          {
            participant_id: participantId,
            breakout_id: null,
          }
        ]);
        
        logger.info('Participant returned to main room successfully', { roomId, participantId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Participant ${participantId} has been returned to the main room successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error returning participant to main room', { 
          roomId,
          participantId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error returning participant to main room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for returning all participants to the main room
  server.tool(
    'return-all-participants-to-main-room',
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
      
      logger.info('Returning all participants to main room', { roomId });
      
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
        // Return all participants to the main room
        await client.returnAllParticipantsToMainRoom(roomId);
        
        logger.info('All participants returned to main room successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `All participants have been returned to the main room successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error returning all participants to main room', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error returning all participants to main room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for sending a broadcast message to all breakout rooms
  server.tool(
    'broadcast-to-breakout-rooms',
    {
      roomId: z.string(),
      message: z.string(),
    },
    async (params, request) => {
      const { roomId, message } = params;
      
      if (!roomId || !message) {
        return {
          content: [{ type: 'text', text: 'Room ID and message are required.' }],
          isError: true,
        };
      }
      
      logger.info('Broadcasting message to breakout rooms', { roomId, message });
      
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
        // Send broadcast message to all breakout rooms
        await client.broadcastToBreakoutRooms(roomId, { message });
        
        logger.info('Message broadcast to breakout rooms successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Message has been broadcast to all breakout rooms successfully: "${message}"`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error broadcasting message to breakout rooms', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error broadcasting message to breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for opening breakout rooms (starting the breakout sessions)
  server.tool(
    'open-breakout-rooms',
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
      
      logger.info('Opening breakout rooms', { roomId });
      
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
        // Open the breakout rooms
        await client.openBreakoutRooms(roomId);
        
        logger.info('Breakout rooms opened successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Breakout rooms for room ${roomId} have been opened successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error opening breakout rooms', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error opening breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for closing breakout rooms
  server.tool(
    'close-breakout-rooms',
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
      
      logger.info('Closing breakout rooms', { roomId });
      
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
        // Close the breakout rooms
        await client.closeBreakoutRooms(roomId);
        
        logger.info('Breakout rooms closed successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Breakout rooms for room ${roomId} have been closed successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error closing breakout rooms', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error closing breakout rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Breakout rooms functionality set up successfully');
}
