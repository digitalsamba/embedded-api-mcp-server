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
      
    default:
      throw new Error(`Unknown recording tool: ${name}`);
  }
}