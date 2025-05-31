/**
 * Digital Samba MCP Server - Recording Resources
 * 
 * This module implements resources for accessing Digital Samba room recordings.
 * It provides MCP resources for listing and retrieving recording information.
 * 
 * Resources provided:
 * - recordings: List all recordings
 * - recording: Get specific recording details  
 * - room-recordings: List recordings for a specific room
 * - archived-recordings: List archived recordings
 * 
 * @module resources/recordings
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

// Local modules
import { getApiKeyFromRequest } from '../../auth.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { 
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError, 
  ValidationError
} from '../../errors.js';
import logger from '../../logger.js';

/**
 * Set up recording resources for the MCP server
 * 
 * This function registers all recording-related resources with the MCP server.
 * Resources are read-only endpoints that provide access to recording data.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 */
export function setupRecordingResources(server: McpServer, apiUrl: string): void {
  // Resource for listing all recordings
  server.resource(
    'recordings',
    new ResourceTemplate('digitalsamba://recordings', { list: undefined }),
    async (uri, _params, request) => {
      try {
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required to access recordings');
        }

        const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
        const recordings = await apiClient.listRecordings();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(recordings, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error in recordings resource', { error: error instanceof Error ? error.message : String(error) });
        return {
          content: [{
            type: 'text',
            text: `Error fetching recordings: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Resource for getting a specific recording
  server.resource(
    'recording',
    new ResourceTemplate('digitalsamba://recordings/{recordingId}', { list: undefined }),
    async (uri, params, request) => {
      try {
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required to access recording details');
        }

        const { recordingId } = params;
        if (!recordingId) {
          throw new ValidationError('Recording ID is required', {
            validationErrors: { recordingId: 'Recording ID cannot be empty' }
          });
        }

        const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
        const recording = await apiClient.getRecording(recordingId);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(recording, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error in recording resource', { error: error instanceof Error ? error.message : String(error) });
        
        if (error instanceof ResourceNotFoundError) {
          return {
            content: [{
              type: 'text',
              text: `Recording not found: ${error.message}`,
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Error fetching recording: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Resource for listing recordings for a specific room
  server.resource(
    'room-recordings',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/recordings', { list: undefined }),
    async (uri, params, request) => {
      try {
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required to access room recordings');
        }

        const { roomId } = params;
        if (!roomId) {
          throw new ValidationError('Room ID is required', {
            validationErrors: { roomId: 'Room ID cannot be empty' }
          });
        }

        const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
        const recordings = await apiClient.listRecordings({ room_id: roomId });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(recordings, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error in room-recordings resource', { error: error instanceof Error ? error.message : String(error) });
        return {
          content: [{
            type: 'text',
            text: `Error fetching room recordings: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Resource for listing archived recordings
  server.resource(
    'archived-recordings',
    new ResourceTemplate('digitalsamba://recordings/archived', { list: undefined }),
    async (uri, _params, request) => {
      try {
        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
          throw new AuthenticationError('API key is required to access archived recordings');
        }

        const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
        const recordings = await apiClient.listArchivedRecordings();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(recordings, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error in archived-recordings resource', { error: error instanceof Error ? error.message : String(error) });
        return {
          content: [{
            type: 'text',
            text: `Error fetching archived recordings: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}