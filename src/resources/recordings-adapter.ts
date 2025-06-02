/**
 * Recordings Resource Adapter
 * Temporary adapter to bridge old and new patterns
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerRecordingResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://recordings',
      name: 'recordings',
      description: 'List all recordings',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://recordings/{recordingId}',
      name: 'recording',
      description: 'Get details for a specific recording',
      mimeType: 'application/json'
    }
  ];
}

export async function handleRecordingResource(uri: string, client: DigitalSambaApiClient): Promise<any> {
  const parts = uri.split('/');
  const recordingId = parts[3];
  
  if (recordingId) {
    const recording = await client.getRecording(recordingId);
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(recording, null, 2)
      }]
    };
  } else {
    const recordings = await client.listRecordings();
    return {
      contents: recordings.data.map(rec => ({
        uri: `digitalsamba://recordings/${rec.id}`,
        text: JSON.stringify(rec, null, 2)
      }))
    };
  }
}