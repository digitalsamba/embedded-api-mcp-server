/**
 * Room Management Tools Module
 * 
 * This module provides room management tools for the Digital Samba MCP Server.
 * It implements tools for creating, updating, deleting rooms and generating tokens.
 * 
 * @module tools/room-management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
// import { z } from 'zod'; // Removed: unused
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
// Removed enhanced client import - using standard client
import { getApiKeyFromRequest } from '../../auth.js';
import logger from '../../logger.js';

/**
 * Register all room management tools
 * 
 * @returns Array of MCP Tool definitions
 */
export function registerRoomTools(): Tool[] {
  return [
    {
      name: 'create-room',
      description: '[Room Management] Create a new room with specified settings. Use when users say: "create a room", "set up a meeting space", "make a new video room", "create a conference room", "set up a virtual meeting room". Returns the created room object with ID, join URL, and all settings.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
            description: 'Room name'
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Room description'
          },
          friendly_url: {
            type: 'string',
            minLength: 3,
            maxLength: 32,
            description: 'Friendly URL for the room'
          },
          privacy: {
            type: 'string',
            enum: ['public', 'private'],
            default: 'public',
            description: 'Room privacy setting'
          },
          max_participants: {
            type: 'number',
            minimum: 2,
            maximum: 2000,
            description: 'Maximum number of participants'
          }
        },
        required: []
      }
    },
    {
      name: 'update-room',
      description: '[Room Management] Update an existing room\'s settings. Use when users say: "change room settings", "update the room", "modify room configuration", "edit room details", "change max participants", "rename the room". Requires roomId. Returns the updated room object.',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'Room ID (required)'
          },
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
            description: 'Room name'
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Room description'
          },
          friendly_url: {
            type: 'string',
            minLength: 3,
            maxLength: 32,
            description: 'Friendly URL for the room'
          },
          privacy: {
            type: 'string',
            enum: ['public', 'private'],
            description: 'Room privacy setting'
          },
          max_participants: {
            type: 'number',
            minimum: 2,
            maximum: 2000,
            description: 'Maximum number of participants'
          }
        },
        required: ['roomId']
      }
    },
    {
      name: 'delete-room',
      description: '[Room Management] Permanently delete a room. Use when users say: "delete the room", "remove this room", "delete meeting room", "remove conference room", "permanently delete room". Requires roomId. This action cannot be undone.',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'Room ID (required)'
          }
        },
        required: ['roomId']
      }
    },
    {
      name: 'generate-token',
      description: '[Room Management] Generate an access token for users to join a room. Use when users say: "create a join link", "generate access token", "create invite link", "get room access", "invite someone to room", "create moderator link". Requires roomId. Returns a token with join URL.',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'Room ID (required)'
          },
          userName: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'User name for the token'
          },
          role: {
            type: 'string',
            description: 'User role (e.g., moderator, participant)'
          },
          externalId: {
            type: 'string',
            description: 'External user ID'
          }
        },
        required: ['roomId']
      }
    },
    {
      name: 'get-default-room-settings',
      description: '[Room Management] Get the default settings that are automatically applied to all new rooms. Use when users say: "show default room settings", "what are the default settings", "get room defaults", "show room template settings". Returns all default configuration options.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'update-default-room-settings',
      description: '[Room Management] Update the default settings template for all future rooms. Use when users say: "change default room settings", "update room defaults", "modify default configuration", "set default language", "change default room template". Requires settings object. Affects only new rooms created after this change.',
      inputSchema: {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            description: 'Settings object with configuration options',
            properties: {
              language: { type: 'string' },
              language_selection_enabled: { type: 'boolean' },
              topbar_enabled: { type: 'boolean' },
              toolbar_enabled: { type: 'boolean' },
              toolbar_position: { 
                type: 'string',
                enum: ['left', 'right', 'bottom']
              },
              toolbar_color: { type: 'string' },
              primary_color: { type: 'string' },
              background_color: { type: 'string' },
              palette_mode: {
                type: 'string',
                enum: ['light', 'dark']
              },
              audio_on_join_enabled: { type: 'boolean' },
              video_on_join_enabled: { type: 'boolean' },
              screenshare_enabled: { type: 'boolean' },
              participants_list_enabled: { type: 'boolean' },
              chat_enabled: { type: 'boolean' },
              private_chat_enabled: { type: 'boolean' },
              recordings_enabled: { type: 'boolean' },
              max_participants: { type: 'number' },
              max_broadcasters: { type: 'number' },
              default_role: { type: 'string' }
            }
          }
        },
        required: ['settings']
      }
    }
  ];
}

/**
 * Execute a room management tool
 * 
 * This function handles the execution of room-related tools such as creating,
 * updating, deleting rooms, and generating access tokens. It manages API client
 * creation and error handling for all room operations.
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} args - Tool arguments specific to each tool
 * @param {any} request - MCP request object containing session context
 * @param {Object} options - Execution options
 * @param {string} options.apiUrl - Digital Samba API base URL
 * @param {any} [options.apiCache] - Cache instance for API responses
 * @param {boolean} [options.enableConnectionManagement] - Enable connection pooling
 * @param {boolean} [options.enableTokenManagement] - Enable automatic token refresh
 * @param {boolean} [options.enableResourceOptimization] - Enable resource optimization
 * @param {number} [options.connectionPoolSize] - Size of connection pool
 * @returns {Promise<Object>} Tool execution result with content array
 * 
 * @example
 * // Create a room
 * const result = await executeRoomTool('create-room', {
 *   name: 'Team Meeting',
 *   privacy: 'private',
 *   max_participants: 50
 * }, request, { apiUrl: 'https://api.digitalsamba.com/api/v1' });
 * 
 * @example
 * // Generate access token
 * const result = await executeRoomTool('generate-token', {
 *   roomId: 'room-123',
 *   options: {
 *     u: 'John Doe',
 *     role: 'moderator'
 *   }
 * }, request, { apiUrl: 'https://api.digitalsamba.com/api/v1' });
 * 
 * @since 1.0.0
 */
export async function executeRoomTool(
  toolName: string,
  args: any,
  request: any,
  options: {
    apiUrl: string;
    apiCache?: any;
    enableConnectionManagement?: boolean;
    enableTokenManagement?: boolean;
    enableResourceOptimization?: boolean;
    connectionPoolSize?: number;
  }
): Promise<any> {
  const { apiUrl, apiCache, enableConnectionManagement, enableTokenManagement, enableResourceOptimization, connectionPoolSize } = options;
  
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

  // Create API client with the provided key
  logger.debug('Creating API client with key', { 
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiUrl
  });
  
  // Use standard API client
  const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);

  switch (toolName) {
    case 'create-room': {
      const { name, description, friendly_url, privacy, max_participants } = args;
      
      logger.info('Creating room', { 
        roomName: name, 
        privacy
      });
      
      try {
        // Create room settings object
        const roomSettings = {
          name: name || 'Test Room',  // Ensure we have a name
          description,
          friendly_url,
          privacy: privacy || 'public',
          max_participants,
        };
        
        // Create room
        const room = await client.createRoom(roomSettings);
        logger.info('Room created successfully', { roomId: room.id });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error creating room', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error creating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'update-room': {
      const { roomId, name, description, friendly_url, privacy, max_participants } = args;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Updating room', { 
        roomId, 
        name, 
        privacy
      });
      
      try {
        // Create room settings object
        const roomSettings = {
          name,
          description,
          friendly_url,
          privacy,
          max_participants,
        };
        
        // Update room
        const room = await client.updateRoom(roomId, roomSettings);
        logger.info('Room updated successfully', { roomId: room.id });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room updated successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error updating room', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error updating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'delete-room': {
      const { roomId } = args;
      
      if (!roomId) {
        return {
          content: [{ type: 'text', text: 'Room ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Deleting room', { roomId });
      
      try {
        // Delete room
        await client.deleteRoom(roomId);
        logger.info('Room deleted successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Room ${roomId} deleted successfully!`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting room', { 
          roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'generate-token': {
      const { roomId, userName, role, externalId } = args;
      
      // Validate required fields
      if (!roomId) {
        throw new Error('roomId is required');
      }
      
      logger.info('Generating room token', { 
        roomId, 
        userName, 
        role
      });
      
      try {
        // Generate token options
        const tokenOptions = {
          u: userName || undefined,
          role: role || undefined,
          ud: externalId || undefined,
        };
        
        // Generate token - use token refresh if enabled
        let token;
        if (enableTokenManagement && request.sessionId) {
          // Use token refresh
          token = await client.generateRoomToken(roomId, tokenOptions);
          logger.info('Generated token with auto-refresh', { roomId, expiresAt: token.expiresAt });
        } else {
          // Standard token generation
          token = await client.generateRoomToken(roomId, tokenOptions);  
        }
        logger.info('Token generated successfully', { roomId });
        
        return {
          content: [
            {
              type: 'text',
              text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating token', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error generating token: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'get-default-room-settings': {
      logger.info('Getting default room settings');
      
      try {
        const settings = await client.getDefaultRoomSettings();
        
        return {
          content: [
            { 
              type: 'text', 
              text: `Default room settings retrieved successfully:\n\n${JSON.stringify(settings, null, 2)}`
            }
          ],
        };
      } catch (error) {
        logger.error('Error getting default room settings', { 
          error: error instanceof Error ? error.message : error 
        });
        
        return {
          content: [
            { 
              type: 'text', 
              text: `Error getting default room settings: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true,
        };
      }
    }

    case 'update-default-room-settings': {
      const { settings } = args;
      
      logger.info('Updating default room settings', { 
        settingsKeys: Object.keys(settings || {})
      });
      
      try {
        const updatedSettings = await client.updateDefaultRoomSettings(settings);
        
        return {
          content: [
            { 
              type: 'text', 
              text: `Default room settings updated successfully. Updated settings:\n\n${JSON.stringify(updatedSettings, null, 2)}`
            }
          ],
        };
      } catch (error) {
        logger.error('Error updating default room settings', { 
          error: error instanceof Error ? error.message : error 
        });
        
        return {
          content: [
            { 
              type: 'text', 
              text: `Error updating default room settings: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown room tool: ${toolName}`);
  }
}