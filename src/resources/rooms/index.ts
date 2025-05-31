/**
 * Room Resources Module
 * 
 * This module provides read-only room resources for the Digital Samba MCP Server.
 * It implements resources for listing and retrieving room information.
 * 
 * @module resources/rooms
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { EnhancedDigitalSambaApiClient } from '../../digital-samba-api-enhanced.js';
import { getApiKeyFromRequest } from '../../auth.js';
import logger from '../../logger.js';

/**
 * Register all room resources
 * 
 * @returns Array of MCP Resource definitions
 */
export function registerRoomResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://rooms',
      name: 'rooms',
      description: 'List all rooms',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}',
      name: 'room',
      description: 'Get details for a specific room',
      mimeType: 'application/json'
    }
  ];
}

/**
 * Handle room resource requests
 * 
 * @param uri - The resource URI being requested
 * @param params - URL parameters from the URI
 * @param request - The MCP request object
 * @param options - Server options including API configuration
 * @returns The resource content
 */
export async function handleRoomResource(
  uri: string,
  params: any,
  request: any,
  options: {
    apiUrl: string;
    apiKey?: string;
    apiCache?: any;
    enableConnectionManagement?: boolean;
    enableTokenManagement?: boolean;
    enableResourceOptimization?: boolean;
    connectionPoolSize?: number;
  }
): Promise<any> {
  const { apiUrl, apiCache, enableConnectionManagement, enableTokenManagement, enableResourceOptimization, connectionPoolSize } = options;
  
  // Parse the URI to determine which resource is being requested
  const uriParts = uri.split('/');
  const isSpecificRoom = uriParts.length > 3 && uriParts[3] !== '';
  
  if (isSpecificRoom) {
    // Handle specific room request
    const roomId = params.roomId || uriParts[3];
    
    if (!roomId) {
      throw new Error('Room ID is required.');
    }
    
    logger.info('Getting room details', { roomId });
    
    // Get API key from session context
    const apiKey = getApiKeyFromRequest(request);
    if (!apiKey) {
      throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
    }
    
    // Create API client
    logger.debug('Creating API client using context API key');
    
    let client;
    if (enableConnectionManagement || enableTokenManagement || enableResourceOptimization) {
      // Use enhanced API client
      logger.debug('Using enhanced API client with additional features enabled');
      client = new EnhancedDigitalSambaApiClient(
        undefined,
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
      client = new DigitalSambaApiClient(undefined, apiUrl, apiCache);
    }
    
    try {
      // Get room from API
      const room = await client.getRoom(roomId);
      
      // Format room as resource content
      const content = {
        uri: uri,
        text: JSON.stringify(room, null, 2),
      };
      
      return { contents: [content] };
    } catch (error) {
      logger.error('Error fetching room', { 
        roomId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  } else {
    // Handle room listing
    logger.info('Listing rooms');
    
    // Get API key from various sources in priority order:
    // 1. Direct API key passed in options during server creation 
    // 2. API key from session context
    // 3. Environment variable
    let apiKey = options?.apiKey;
    
    if (!apiKey) {
      apiKey = getApiKeyFromRequest(request);
    }
    
    if (!apiKey && process.env.DIGITAL_SAMBA_API_KEY) {
      apiKey = process.env.DIGITAL_SAMBA_API_KEY;
      logger.debug('Using API key from environment variable');
    }
    
    if (!apiKey) {
      throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
    }
    
    // Create API client
    logger.debug('Creating API client with key', { 
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiUrl: apiUrl
    });
    
    let client;
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
    
    try {
      // Fetch rooms from API
      const rooms = await client.listRooms();
      logger.info('Fetched rooms successfully', { count: rooms.data.length });
      
      // Format rooms as resource contents
      const contents = rooms.data.map(room => ({
        uri: `digitalsamba://rooms/${room.id}`,
        text: JSON.stringify(room, null, 2),
      }));
      
      return { contents };
    } catch (error) {
      logger.error('Error fetching rooms', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}