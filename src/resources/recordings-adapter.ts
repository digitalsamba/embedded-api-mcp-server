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
      description: '[Recording Data] List all recordings in your account. Use to access: "show all recordings", "list videos", "recording directory", "meeting recordings", "video library". Returns array of recording objects with status, duration, room info, and download availability.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://recordings/{recordingId}',
      name: 'recording',
      description: '[Recording Data] Get detailed information about a specific recording. Use to access: "recording details", "video info", "recording metadata", "recording status", "video details". Requires recordingId. Returns complete recording data including name, duration, status, and download URLs.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://recordings/archived',
      name: 'archived-recordings',
      description: '[Recording Data] List all archived recordings. Use to access: "archived recordings", "old recordings", "archived videos", "stored recordings", "recording archive". Returns recordings in archived status for long-term storage. Archived recordings may need to be unarchived before downloading.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}/recordings',
      name: 'room-recordings',
      description: '[Recording Data] List all recordings for a specific room. Use to access: "room recordings", "recordings for this room", "room video history", "meeting recordings for room", "videos from room". Requires roomId. Returns recordings filtered to that specific room with session details.',
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