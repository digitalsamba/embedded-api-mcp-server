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
      description: '[Recording Management] Permanently delete a recording. Use when users say: "delete recording", "remove recording", "delete video", "remove video recording", "delete meeting recording". Requires recordingId. This action cannot be undone.',
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
      description: '[Recording Management] Update recording metadata like name or description. Use when users say: "rename recording", "update recording name", "change recording title", "edit recording details". Requires recordingId. Currently limited to name updates.',
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
      description: '[Recording Management] Get a list of all recordings with optional filters. Use when users say: "list recordings", "show recordings", "get all recordings", "show videos", "list meeting recordings", "recordings for room". Returns paginated list with recording details, status, and duration.',
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
      description: '[Recording Management] Start recording an active room session. Use when users say: "start recording", "begin recording", "record this meeting", "start recording the room", "record session". Requires room_id. Room must have an active session.',
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
      description: '[Recording Management] Stop an ongoing room recording. Use when users say: "stop recording", "end recording", "finish recording", "stop recording the room", "halt recording". Requires room_id. Only works if recording is currently active.',
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
      description: '[Recording Management] Move a recording to archived status for long-term storage. Use when users say: "archive recording", "archive video", "move to archive", "store recording", "archive old recording". Requires recordingId. Archived recordings can be unarchived later.',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording to archive' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'get-recording',
      description: '[Recording Management] Get detailed information about a specific recording. Use when users say: "show recording details", "get recording info", "recording information", "details about recording", "show video details". Requires recordingId. Returns full recording metadata including status, duration, and URLs.',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'get-recording-download-link',
      description: '[Recording Management] Generate a temporary download link for a recording. Use when users say: "download recording", "get download link", "export recording", "download video", "get recording URL". Requires recordingId. Returns a time-limited download URL. Recording must be in READY status.',
      inputSchema: {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'The ID of the recording' },
          validForMinutes: { type: 'number', description: 'How long the link should be valid (1-1440 minutes)' }
        },
        required: ['recordingId']
      }
    },
    {
      name: 'unarchive-recording',
      description: '[Recording Management] Restore an archived recording back to active status. Use when users say: "unarchive recording", "restore recording", "unarchive video", "bring back from archive", "restore archived recording". Requires recordingId. Only works on archived recordings.',
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