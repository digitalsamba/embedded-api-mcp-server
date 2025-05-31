/**
 * Room Management Tools Module
 * 
 * This module provides room management tools for the Digital Samba MCP Server.
 * It implements tools for creating, updating, deleting rooms and generating tokens.
 * 
 * @module tools/room-management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { EnhancedDigitalSambaApiClient } from '../../digital-samba-api-enhanced.js';
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
      description: 'Create a new room with specified settings',
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
      description: 'Update an existing room',
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
      description: 'Delete a room',
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
      description: 'Generate an access token for a room',
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
    }
  ];
}

/**
 * Execute a room management tool
 * 
 * @param toolName - The name of the tool to execute
 * @param args - The tool arguments
 * @param request - The MCP request object for authentication
 * @param options - Server options including API configuration
 * @returns The tool execution result
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
  
  let client: DigitalSambaApiClient | EnhancedDigitalSambaApiClient;
  if (enableConnectionManagement || enableTokenManagement || enableResourceOptimization) {
    // Use enhanced API client
    logger.debug('Using enhanced API client with additional features enabled');
    client = new EnhancedDigitalSambaApiClient(
      apiKey,
      apiUrl,
      apiCache,
      {
        enableConnectionManagement,
        enableTokenManagement,
        enableResourceOptimization,
        connectionPoolSize
      }
    );
  } else {
    // Use standard API client
    client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);
  }

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
        if (enableTokenManagement && client instanceof EnhancedDigitalSambaApiClient && request.sessionId) {
          // Use token refresh
          token = await client.generateRoomTokenWithRefresh(roomId, tokenOptions, request.sessionId);
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

    default:
      throw new Error(`Unknown room tool: ${toolName}`);
  }
}