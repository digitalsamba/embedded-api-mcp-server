/**
 * Room Tools Handler
 * Simple handler for room tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRoomTools(): Tool[] {
  return [
    {
      name: 'create-room',
      description: 'Create a new room',
      inputSchema: {
        type: 'object',
        properties: {
          friendly_url: { type: 'string', description: 'Friendly URL for the room' },
          description: { type: 'string', description: 'Room description' },
          privacy: { type: 'string', enum: ['public', 'private'], description: 'Room privacy setting' },
          external_id: { type: 'string', description: 'External ID for integration' }
        }
      }
    },
    {
      name: 'update-room',
      description: 'Update an existing room',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'string', description: 'The ID of the room to update' },
          description: { type: 'string', description: 'Room description' },
          privacy: { type: 'string', enum: ['public', 'private'], description: 'Room privacy setting' }
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
          roomId: { type: 'string', description: 'The ID of the room to delete' }
        },
        required: ['roomId']
      }
    },
    {
      name: 'generate-room-token',
      description: 'Generate a token for joining a room',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'string', description: 'The ID of the room' },
          userName: { type: 'string', description: 'User name for the token' },
          role: { type: 'string', description: 'User role' },
          expirationMinutes: { type: 'number', description: 'Token expiration in minutes' }
        },
        required: ['roomId']
      }
    }
  ];
}

export async function executeRoomTool(name: string, args: any, client: DigitalSambaApiClient) {
  switch (name) {
    case 'create-room':
      const newRoom = await client.createRoom(args);
      return {
        content: [{
          type: 'text',
          text: `Room created successfully. ID: ${newRoom.id}`
        }]
      };
      
    case 'update-room':
      const { roomId, ...updateData } = args;
      const updatedRoom = await client.updateRoom(roomId, updateData);
      return {
        content: [{
          type: 'text',
          text: `Room ${roomId} updated successfully`
        }]
      };
      
    case 'delete-room':
      await client.deleteRoom(args.roomId);
      return {
        content: [{
          type: 'text',
          text: `Room ${args.roomId} deleted successfully`
        }]
      };
      
    case 'generate-room-token':
      const tokenData = {
        user_name: args.userName,
        role: args.role,
        expires_in_minutes: args.expirationMinutes
      };
      const token = await client.generateRoomToken(args.roomId, tokenData);
      return {
        content: [{
          type: 'text',
          text: `Token generated: ${token.token}`
        }]
      };
      
    default:
      throw new Error(`Unknown room tool: ${name}`);
  }
}