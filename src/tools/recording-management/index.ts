/**
 * Digital Samba MCP Server - Recording Management Tools
 * 
 * This module implements tools for managing Digital Samba room recordings.
 * It provides MCP tools for recording operations like retrieval, deletion,
 * archiving, and download link generation.
 * 
 * Tools provided:
 * - get-recordings: List recordings with filtering
 * - delete-recording: Delete a recording
 * - get-recording: Get specific recording details
 * - get-recording-download-link: Generate download links
 * - archive-recording: Archive a recording
 * - unarchive-recording: Unarchive a recording
 * 
 * @module tools/recording-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { getApiKeyFromRequest } from '../../auth.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import logger from '../../logger.js';

/**
 * Set up recording management tools for the MCP server
 * 
 * This function registers all recording-related tools with the MCP server.
 * Tools are action endpoints that allow manipulation of recording data.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 */
export function setupRecordingTools(server: McpServer, apiUrl: string): void {
  // Tool for starting recording in a room
  server.tool(
    'start-recording',
    {
      roomId: z.string(),
    },
    async (params, request) => {
      const { roomId } = params;
      
      // Validate required parameters
      if (!roomId || roomId.trim() === '') {
        return {
          content: [{ 
            type: 'text', 
            text: 'Room ID is required to start recording.'
          }],
          isError: true,
        };
      }
      
      logger.info('Starting recording', { roomId });
      
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
        await client.startRecording(roomId);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Recording started successfully in room ${roomId}`
          }],
        };
      } catch (error) {
        logger.error('Error starting recording', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        let displayMessage = `Error starting recording: ${errorMessage}`;
        
        // Transform specific error messages to match test expectations
        if (errorMessage.includes('Room not found') || errorMessage.includes('404')) {
          displayMessage = `Room with ID ${roomId} not found`;
        } else if (errorMessage.includes('Already recording')) {
          displayMessage = `Recording already in progress for room ${roomId}`;
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: displayMessage
          }],
          isError: true,
        };
      }
    }
  );

  // Tool for stopping recording in a room
  server.tool(
    'stop-recording',
    {
      roomId: z.string(),
    },
    async (params, request) => {
      const { roomId } = params;
      
      logger.info('Stopping recording', { roomId });
      
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
        await client.stopRecording(roomId);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Recording stopped successfully in room ${roomId}`
          }],
        };
      } catch (error) {
        logger.error('Error stopping recording', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Error stopping recording: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );

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
        responseText += ':\\n\\n';
        
        // Add a formatted list of recordings
        if (recordings.length === 0) {
          responseText += 'No recordings found.';
        } else {
          responseText += recordings.map((recording, index) => {
            let recordingInfo = `${index + 1}. ID: ${recording.id}\\n`;
            recordingInfo += `   Status: ${recording.status}\\n`;
            recordingInfo += `   Room: ${recording.room_id}\\n`;
            recordingInfo += `   Created: ${new Date(recording.created_at).toLocaleString()}\\n`;
            if (recording.duration) {
              recordingInfo += `   Duration: ${recording.duration} seconds\\n`;
            }
            return recordingInfo;
          }).join('\\n');
          
          // Add instruction for getting details
          responseText += '\\n\\nTo get details for a specific recording, use the get-recording-download-link tool with the recording ID.';
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
        let responseText = `Recording Details for ID: ${recording.id}\\n\\n`;
        responseText += `Status: ${recording.status}\\n`;
        responseText += `Room ID: ${recording.room_id}\\n`;
        
        if (recording.name) {
          responseText += `Name: ${recording.name}\\n`;
        }
        
        if (recording.friendly_url) {
          responseText += `Friendly URL: ${recording.friendly_url}\\n`;
        }
        
        if (recording.participant_name) {
          responseText += `Recorded by: ${recording.participant_name}\\n`;
        }
        
        if (recording.duration) {
          const minutes = Math.floor(recording.duration / 60);
          const seconds = recording.duration % 60;
          responseText += `Duration: ${minutes}m ${seconds}s\\n`;
        }
        
        responseText += `Created: ${new Date(recording.created_at).toLocaleString()}\\n`;
        responseText += `Updated: ${new Date(recording.updated_at).toLocaleString()}\\n\\n`;
        
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
              text: `Download link generated successfully!\\n\\n${JSON.stringify(downloadLink, null, 2)}`,
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

  logger.info('Recording management tools set up successfully');
}