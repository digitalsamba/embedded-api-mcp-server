/**
 * Recording Tools Handler
 * Simple handler for recording tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRecordingTools(): Tool[] {
  return [
    {
      name: 'start-recording',
      description: 'Start recording a room session',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'string', description: 'The ID of the room to start recording' }
        },
        required: ['roomId']
      }
    },
    {
      name: 'stop-recording',
      description: 'Stop recording a room session',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'string', description: 'The ID of the room to stop recording' }
        },
        required: ['roomId']
      }
    },
    {
      name: 'delete-recording',
      description: 'Delete a recording',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording to delete' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'archive-recording',
      description: 'Archive a recording',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording to archive' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'unarchive-recording',
      description: 'Unarchive a recording',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording to unarchive' }
        },
        required: ['recordingId']
      }
    }
  ];
}

export async function executeRecordingTool(name: string, args: any, client: DigitalSambaApiClient) {
  switch (name) {
    case 'start-recording':
      const startResult = await client.startRecording(args.roomId);
      return {
        content: [{
          type: 'text',
          text: `Recording started for room ${args.roomId}`
        }]
      };
      
    case 'stop-recording':
      const stopResult = await client.stopRecording(args.roomId);
      return {
        content: [{
          type: 'text',
          text: `Recording stopped for room ${args.roomId}`
        }]
      };
      
    case 'delete-recording':
      await client.deleteRecording(args.recordingId);
      return {
        content: [{
          type: 'text',
          text: `Recording ${args.recordingId} deleted successfully`
        }]
      };
      
    case 'archive-recording':
      await client.archiveRecording(args.recordingId);
      return {
        content: [{
          type: 'text',
          text: `Recording ${args.recordingId} archived successfully`
        }]
      };
      
    case 'unarchive-recording':
      await client.unarchiveRecording(args.recordingId);
      return {
        content: [{
          type: 'text',
          text: `Recording ${args.recordingId} unarchived successfully`
        }]
      };
      
    default:
      throw new Error(`Unknown recording tool: ${name}`);
  }
}