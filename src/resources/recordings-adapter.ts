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
    },
    {
      uri: 'digitalsamba://recordings/archived',
      name: 'archived-recordings',
      description: 'List archived recordings',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}/recordings',
      name: 'room-recordings',
      description: 'List recordings for a specific room',
      mimeType: 'application/json'
    }
  ];
}

export async function handleRecordingResource(uri: string, client: DigitalSambaApiClient): Promise<any> {
  const parts = uri.split('/');
  
  // Handle room recordings: digitalsamba://rooms/{roomId}/recordings
  if (uri.includes('/rooms/') && uri.endsWith('/recordings')) {
    const roomId = parts[3];
    const recordings = await client.listRecordings({ room_id: roomId });
    return {
      contents: recordings.data.map(rec => ({
        uri: `digitalsamba://recordings/${rec.id}`,
        text: JSON.stringify(rec, null, 2),
        mimeType: 'application/json'
      }))
    };
  }
  
  // Handle archived recordings: digitalsamba://recordings/archived
  if (uri.endsWith('/archived')) {
    const recordings = await client.listArchivedRecordings();
    return {
      contents: recordings.data.map(rec => ({
        uri: `digitalsamba://recordings/${rec.id}`,
        text: JSON.stringify(rec, null, 2),
        mimeType: 'application/json'
      }))
    };
  }
  
  const recordingId = parts[3];
  
  // Handle specific recording: digitalsamba://recordings/{recordingId}
  if (recordingId) {
    const recording = await client.getRecording(recordingId);
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(recording, null, 2),
        mimeType: 'application/json'
      }]
    };
  } 
  // Handle all recordings: digitalsamba://recordings
  else {
    const recordings = await client.listRecordings();
    return {
      contents: recordings.data.map(rec => ({
        uri: `digitalsamba://recordings/${rec.id}`,
        text: JSON.stringify(rec, null, 2),
        mimeType: 'application/json'
      }))
    };
  }
}