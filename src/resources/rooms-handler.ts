/**
 * Room Resources Handler
 * Simple handler for room resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRoomResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://rooms',
      name: 'Rooms List',
      description: 'List all rooms',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}',
      name: 'Room Details',
      description: 'Get details for a specific room',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}/participants',
      name: 'Room Participants',
      description: 'List participants in a room',
      mimeType: 'application/json'
    }
  ];
}

export async function handleRoomResource(uri: string, client: DigitalSambaApiClient) {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] === 'rooms') {
    if (pathParts.length === 1) {
      // List all rooms
      const rooms = await client.listRooms();
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(rooms, null, 2)
        }]
      };
    } else if (pathParts.length === 2) {
      // Get specific room
      const roomId = pathParts[1];
      const room = await client.getRoom(roomId);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(room, null, 2)
        }]
      };
    } else if (pathParts.length === 3 && pathParts[2] === 'participants') {
      // Get room participants
      const roomId = pathParts[1];
      const participants = await client.listRoomParticipants(roomId);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(participants, null, 2)
        }]
      };
    }
  }
  
  throw new Error(`Unknown room resource: ${uri}`);
}