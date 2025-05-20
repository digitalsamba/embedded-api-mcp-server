/**
 * Digital Samba MCP Server - Recording Functionality
 * 
 * This module implements resources and tools for managing Digital Samba room recordings.
 * It provides capabilities for listing, retrieving, creating, and managing recordings
 * through the MCP interface, exposing the Digital Samba recording API to MCP clients.
 * 
 * Features include:
 * - Listing all recordings (standard and archived)
 * - Retrieving specific recording details
 * - Starting and stopping recordings
 * - Generating download links
 * - Archiving and unarchiving recordings
 * - Deleting recordings
 * 
 * @module recordings
 * @author Digital Samba Team
 * @version 0.1.0
 */
// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { getApiKeyFromRequest } from './auth.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import { 
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError, 
  ValidationError
} from './errors.js';
import logger from './logger.js';

/**
 * Set up recording resources and tools for the MCP server
 * 
 * This function registers all recording-related resources and tools with the MCP server.
 * It creates resources for listing and retrieving recordings, as well as tools for
 * managing recording operations.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register recording functionality with the MCP server
 * setupRecordingFunctionality(mcpServer, 'https://api.digitalsamba.com/api/v1');
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
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
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
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle authentication errors
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            throw new AuthenticationError('Authentication failed. Please check your API key.');
          }
          
          // Rethrow the original error with more context if it's not a specific case
          throw new ApiResponseError(`Failed to fetch recordings`, {
            statusCode: error.message.includes('404') ? 404 : 500,
            apiErrorMessage: error.message
          });
        }
        
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
        throw new ValidationError('Recording ID is required.', {
          validationErrors: { recordingId: 'This field is required' }
        });
      }
      
      logger.info('Getting recording details', { recordingId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
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
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            throw new ResourceNotFoundError(`Recording with ID ${recordingId} not found`, {
              resourceId: recordingId as string,
              resourceType: 'recording'
            });
          }
          
          // Handle authentication errors
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            throw new AuthenticationError('Authentication failed. Please check your API key.');
          }
          
          // Rethrow the original error with more context if it's not a specific case
          throw new ApiResponseError(`Failed to fetch recording details`, {
            statusCode: error.message.includes('404') ? 404 : 500,
            apiErrorMessage: error.message
          });
        }
        
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
        throw new ValidationError('Room ID is required.', {
          validationErrors: { roomId: 'This field is required' }
        });
      }
      
      logger.info('Listing recordings for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
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
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            throw new ResourceNotFoundError(`Room with ID ${roomId} not found`, {
              resourceId: roomId as string,
              resourceType: 'room'
            });
          }
          
          // Handle authentication errors
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            throw new AuthenticationError('Authentication failed. Please check your API key.');
          }
          
          // Rethrow the original error with more context if it's not a specific case
          throw new ApiResponseError(`Failed to fetch recordings for room ${roomId}`, {
            statusCode: error.message.includes('404') ? 404 : 500,
            apiErrorMessage: error.message
          });
        }
        
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
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
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
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle authentication errors
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            throw new AuthenticationError('Authentication failed. Please check your API key.');
          }
          
          // Rethrow the original error with more context if it's not a specific case
          throw new ApiResponseError(`Failed to fetch archived recordings`, {
            statusCode: error.message.includes('404') ? 404 : 500,
            apiErrorMessage: error.message
          });
        }
        
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
        
        // Format error message based on error type
        let errorMessage = 'Error retrieving recordings. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            if (roomId) {
              errorMessage = `Room with ID ${roomId} not found.`;
            } else {
              errorMessage = `Requested resource not found.`;
            }
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to access these recordings.';
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error retrieving recordings: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Room ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error starting recording. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Room with ID ${roomId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to start recordings in this room.';
          }
          
          // Handle already recording errors
          else if (error.message.toLowerCase().includes('already recording') || 
                   error.message.toLowerCase().includes('recording in progress')) {
            errorMessage = `A recording is already in progress for room ${roomId}.`;
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error starting recording: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Room ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error stopping recording. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Room with ID ${roomId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to stop recordings in this room.';
          }
          
          // Handle no active recording errors
          else if (error.message.toLowerCase().includes('no recording') || 
                   error.message.toLowerCase().includes('not recording')) {
            errorMessage = `There is no active recording in room ${roomId} to stop.`;
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error stopping recording: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Recording ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error deleting recording. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Recording with ID ${recordingId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to delete this recording.';
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error deleting recording: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Recording ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error getting recording details. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Recording with ID ${recordingId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to view this recording.';
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error getting recording details: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Recording ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error generating download link. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Recording with ID ${recordingId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to download this recording.';
          }
          
          // Handle recording not ready errors
          else if (error.message.toLowerCase().includes('not ready') || 
                   error.message.toLowerCase().includes('in progress') ||
                   error.message.toLowerCase().includes('pending')) {
            errorMessage = `Recording is not ready for download yet. Current status may be 'IN_PROGRESS' or 'PENDING_CONVERSION'.`;
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error generating download link: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Recording ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error archiving recording. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Recording with ID ${recordingId} not found.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to archive this recording.';
          }
          
          // Handle already archived errors
          else if (error.message.toLowerCase().includes('already archived')) {
            errorMessage = `Recording ${recordingId} is already archived.`;
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error archiving recording: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
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
          content: [{ 
            type: 'text', 
            text: 'Recording ID is required.' 
          }],
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
        
        // Format error message based on error type
        let errorMessage = 'Error unarchiving recording. Please try again.';
        
        if (error instanceof Error) {
          // Handle 404 errors specifically for better user experience
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Recording with ID ${recordingId} not found in the archive.`;
          }
          
          // Handle authentication errors
          else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication failed. Please check your API key.';
          }
          
          // Handle permission errors
          else if (error.message.includes('403') || error.message.includes('forbidden')) {
            errorMessage = 'You do not have permission to unarchive this recording.';
          }
          
          // Handle not archived errors
          else if (error.message.toLowerCase().includes('not archived')) {
            errorMessage = `Recording ${recordingId} is not currently archived.`;
          }
          
          // Use the original error message for any other cases
          else {
            errorMessage = `Error unarchiving recording: ${error.message}`;
          }
        }
        
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  logger.info('Recording functionality set up successfully');
}
