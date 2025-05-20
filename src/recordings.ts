/**
 * Digital Samba MCP Server - Recording Functionality
 * 
 * This module implements resources and tools for managing room recordings.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { getApiKeyFromRequest } from './auth.js';

/**
 * Set up recording resources and tools for the MCP server
 */
export function setupRecordingFunctionality(server: McpServer, apiUrl: string) {
  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------

  // Resource for listing all recordings
  server.resource(
    'recordings',
    new ResourceTemplate('digitalsamba://recordings', { list: undefined }),
    async (uri, _params, request) => {
      logger.info('Listing all recordings');
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get recordings from API
        const response = await client.listRecordings();
        const recordings = response.data || [];
        logger.debug(`Found ${recordings.length} recordings`);
        
        // Format recordings as resource contents
        const contents = recordings.map(recording => ({
          uri: `digitalsamba://recordings/${recording.id}`,
          text: JSON.stringify(recording, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching recordings', { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    }
  );

  // Resource for getting a specific recording
  server.resource(
    'recording',
    new ResourceTemplate('digitalsamba://recordings/{recordingId}', { list: undefined }),
    async (uri, params, request) => {
      const { recordingId } = params;
      
      if (!recordingId) {
        throw new Error('Recording ID is required.');
      }
      
      logger.info('Getting recording details', { recordingId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get recording from API
        const recording = await client.getRecording(recordingId as string);
        
        // Format recording as resource content
        const content = {
          uri: uri.href,
          text: JSON.stringify(recording, null, 2),
        };
        
        return { contents: [content] };
      } catch (error) {
        logger.error('Error fetching recording', { 
          recordingId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Resource for listing recordings for a specific room
  server.resource(
    'room-recordings',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/recordings', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Listing recordings for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get recordings from API for the specific room
        const response = await client.listRecordings({ room_id: roomId as string });
        const recordings = response.data || [];
        logger.debug(`Found ${recordings.length} recordings for room ${roomId}`);
        
        // Format recordings as resource contents
        const contents = recordings.map(recording => ({
          uri: `digitalsamba://recordings/${recording.id}`,
          text: JSON.stringify(recording, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching room recordings', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // Resource for listing archived recordings
  server.resource(
    'archived-recordings',
    new ResourceTemplate('digitalsamba://recordings/archived', { list: undefined }),
    async (uri, _params, request) => {
      logger.info('Listing archived recordings');
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get archived recordings from API
        const response = await client.listArchivedRecordings();
        const recordings = response.data || [];
        logger.debug(`Found ${recordings.length} archived recordings`);
        
        // Format recordings as resource contents
        const contents = recordings.map(recording => ({
          uri: `digitalsamba://recordings/archived/${recording.id}`,
          text: JSON.stringify(recording, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching archived recordings', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    }
  );

  // -------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------

  // Tool for retrieving all recordings
  server.tool(
    'get-recordings',
    {
      roomId: z.string().optional(),
      status: z.enum(['IN_PROGRESS', 'PENDING_CONVERSION', 'READY']).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
      archived: z.boolean().optional(),
    },
    async (params, request) => {
      const { roomId, status, limit, offset, archived } = params;
      
      logger.info('Retrieving recordings', { 
        roomId, 
        status,
        archived: archived ? true : false
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
        let recordings;
        
        if (archived) {
          // Get archived recordings
          const response = await client.listArchivedRecordings({
            room_id: roomId,
            limit,
            offset
          });
          recordings = response.data || [];
          logger.debug(`Found ${recordings.length} archived recordings`);
        } else {
          // Get standard recordings
          const response = await client.listRecordings({
            room_id: roomId,
            status,
            limit,
            offset
          });
          recordings = response.data || [];
          logger.debug(`Found ${recordings.length} recordings`);
        }
        
        // Format response
        let responseText = `Found ${recordings.length} recording(s)`;
        if (roomId) responseText += ` for room ${roomId}`;
        if (status) responseText += ` with status ${status}`;
        if (archived) responseText += ` (archived)`;
        responseText += ':\n\n';
        
        // Add a formatted list of recordings
        if (recordings.length === 0) {
          responseText += 'No recordings found.';
        } else {
          responseText += recordings.map((recording, index) => {
            let recordingInfo = `${index + 1}. ID: ${recording.id}\n`;
            recordingInfo += `   Status: ${recording.status}\n`;
            recordingInfo += `   Room: ${recording.room_id}\n`;
            recordingInfo += `   Created: ${new Date(recording.created_at).toLocaleString()}\n`;
            if (recording.duration) {
              recordingInfo += `   Duration: ${recording.duration} seconds\n`;
            }
            return recordingInfo;
          }).join('\n');
          
          // Add instruction for getting details
          responseText += '\n\nTo get details for a specific recording, use the get-recording-download-link tool with the recording ID.';
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error retrieving recordings', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving recordings: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for starting a recording in a room
  server.tool(
    'start-recording',
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
      
      logger.info('Starting recording for room', { roomId });
      
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
        // Start recording
        await client.startRecording(roomId);
        logger.info('Recording started successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Recording started successfully for room ${roomId}. The recording will be available in the list of recordings when it's ready.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error starting recording', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error starting recording: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for stopping a recording in a room
  server.tool(
    'stop-recording',
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
      
      logger.info('Stopping recording for room', { roomId });
      
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
        // Stop recording
        await client.stopRecording(roomId);
        logger.info('Recording stopped successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Recording stopped successfully for room ${roomId}. The recording will be processed and available in the list of recordings.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error stopping recording', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error stopping recording: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting a recording
  server.tool(
    'delete-recording',
    {
      recordingId: z.string(),
    },
    async (params, request) => {
      const { recordingId } = params;
      
      if (!recordingId) {
        return {
          content: [{ type: 'text', text: 'Recording ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Deleting recording', { recordingId });
      
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
        // Delete recording
        await client.deleteRecording(recordingId);
        logger.info('Recording deleted successfully', { recordingId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Recording ${recordingId} deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting recording', { 
          recordingId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting recording: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for getting a specific recording
  server.tool(
    'get-recording',
    {
      recordingId: z.string(),
    },
    async (params, request) => {
      const { recordingId } = params;
      
      if (!recordingId) {
        return {
          content: [{ type: 'text', text: 'Recording ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Getting recording details', { recordingId });
      
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
        // Get recording
        const recording = await client.getRecording(recordingId);
        logger.info('Recording details retrieved successfully', { recordingId });
        
        // Format detailed response for human readability
        let responseText = `Recording Details for ID: ${recording.id}\n\n`;
        responseText += `Status: ${recording.status}\n`;
        responseText += `Room ID: ${recording.room_id}\n`;
        
        if (recording.name) {
          responseText += `Name: ${recording.name}\n`;
        }
        
        if (recording.friendly_url) {
          responseText += `Friendly URL: ${recording.friendly_url}\n`;
        }
        
        if (recording.participant_name) {
          responseText += `Recorded by: ${recording.participant_name}\n`;
        }
        
        if (recording.duration) {
          const minutes = Math.floor(recording.duration / 60);
          const seconds = recording.duration % 60;
          responseText += `Duration: ${minutes}m ${seconds}s\n`;
        }
        
        responseText += `Created: ${new Date(recording.created_at).toLocaleString()}\n`;
        responseText += `Updated: ${new Date(recording.updated_at).toLocaleString()}\n\n`;
        
        // Add download link instructions
        if (recording.status === 'READY') {
          responseText += `To get a download link, use the get-recording-download-link tool with this recording ID.`;
        } else {
          responseText += `This recording is not ready for download yet (status: ${recording.status}).`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting recording details', { 
          recordingId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error getting recording details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for getting a recording download link
  server.tool(
    'get-recording-download-link',
    {
      recordingId: z.string(),
      validForMinutes: z.number().min(1).max(1440).optional(),
    },
    async (params, request) => {
      const { recordingId, validForMinutes } = params;
      
      if (!recordingId) {
        return {
          content: [{ type: 'text', text: 'Recording ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Getting download link for recording', { 
        recordingId,
        validForMinutes
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
        // Get download link
        const downloadLink = await client.getRecordingDownloadLink(recordingId, validForMinutes);
        logger.info('Download link generated successfully', { recordingId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Download link generated successfully!\n\n${JSON.stringify(downloadLink, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating download link', { 
          recordingId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error generating download link: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for archiving a recording
  server.tool(
    'archive-recording',
    {
      recordingId: z.string(),
    },
    async (params, request) => {
      const { recordingId } = params;
      
      if (!recordingId) {
        return {
          content: [{ type: 'text', text: 'Recording ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Archiving recording', { recordingId });
      
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
        // Archive recording
        await client.archiveRecording(recordingId);
        logger.info('Recording archived successfully', { recordingId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Recording ${recordingId} archived successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error archiving recording', { 
          recordingId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error archiving recording: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for unarchiving a recording
  server.tool(
    'unarchive-recording',
    {
      recordingId: z.string(),
    },
    async (params, request) => {
      const { recordingId } = params;
      
      if (!recordingId) {
        return {
          content: [{ type: 'text', text: 'Recording ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Unarchiving recording', { recordingId });
      
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
        // Unarchive recording
        await client.unarchiveRecording(recordingId);
        logger.info('Recording unarchived successfully', { recordingId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Recording ${recordingId} unarchived successfully.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error unarchiving recording', { 
          recordingId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error unarchiving recording: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Recording functionality set up successfully');
}
