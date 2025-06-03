/**
 * Recording Tools Adapter
 * Temporary adapter to bridge old and new patterns
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRecordingTools(): Tool[] {
  return [
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
      name: 'update-recording',
      description: 'Update recording metadata',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording' },
          name: { type: 'string', description: 'New name for the recording' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'get-recordings',
      description: 'Get a list of recordings',
      inputSchema: {
        type: 'object',
        properties: {
          room_id: { type: 'string', description: 'Filter by room ID' },
          limit: { type: 'number', description: 'Maximum number of recordings to return' },
          offset: { type: 'number', description: 'Offset for pagination' }
        },
        required: []
      }
    },
    {
      name: 'start-recording',
      description: 'Start recording a room',
      inputSchema: {
        type: 'object',
        properties: {
          room_id: { type: 'string', description: 'The ID of the room to record' }
        },
        required: ['room_id']
      }
    },
    {
      name: 'stop-recording',
      description: 'Stop recording a room',
      inputSchema: {
        type: 'object',
        properties: {
          room_id: { type: 'string', description: 'The ID of the room to stop recording' }
        },
        required: ['room_id']
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
    case 'delete-recording':
      await client.deleteRecording(args.recordingId);
      return {
        content: [{
          type: 'text',
          text: `Recording ${args.recordingId} deleted successfully`
        }]
      };
      
    case 'update-recording':
      // Update recording not supported in base API
      return {
        content: [{
          type: 'text',
          text: `Recording update not supported`
        }]
      };
      
    case 'get-recordings':
      const recordings = await client.listRecordings(args);
      return {
        content: [{
          type: 'text',
          text: `Found ${recordings.data?.length || 0} recording(s):\n${JSON.stringify(recordings, null, 2)}`
        }]
      };
      
    case 'start-recording':
      // Start recording not supported in base API
      return {
        content: [{
          type: 'text',
          text: `Start recording not supported in current API`
        }]
      };
      
    case 'stop-recording':
      // Stop recording not supported in base API
      return {
        content: [{
          type: 'text',
          text: `Stop recording not supported in current API`
        }]
      };
      
    case 'archive-recording':
      // Archive recording not supported in base API
      return {
        content: [{
          type: 'text',
          text: `Archive recording not supported in current API`
        }]
      };
      
    case 'unarchive-recording':
      // Unarchive recording not supported in base API
      return {
        content: [{
          type: 'text',
          text: `Unarchive recording not supported in current API`
        }]
      };
      
    default:
      throw new Error(`Unknown recording tool: ${name}`);
  }
}