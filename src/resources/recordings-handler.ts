/**
 * Recording Resources Handler
 * Simple handler for recording resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRecordingResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://recordings',
      name: 'All Recordings',
      description: 'List all recordings',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://recordings/archived',
      name: 'Archived Recordings',
      description: 'List archived recordings',
      mimeType: 'application/json'
    }
  ];
}

export async function handleRecordingResource(uri: string, client: DigitalSambaApiClient) {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] === 'recordings') {
    if (pathParts.length === 1) {
      // List all recordings
      const recordings = await client.listRecordings();
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(recordings, null, 2)
        }]
      };
    } else if (pathParts[1] === 'archived') {
      // List archived recordings
      const recordings = await client.listArchivedRecordings();
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(recordings, null, 2)
        }]
      };
    }
  }
  
  throw new Error(`Unknown recording resource: ${uri}`);
}