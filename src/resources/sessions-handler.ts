/**
 * Session Resources Handler
 * Simple handler for session resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerSessionResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://sessions',
      name: 'Sessions List',
      description: 'List all sessions',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://sessions/{sessionId}',
      name: 'Session Details',
      description: 'Get statistics for a specific session',
      mimeType: 'application/json'
    }
  ];
}

export async function handleSessionResource(uri: string, client: DigitalSambaApiClient) {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] === 'sessions') {
    if (pathParts.length === 1) {
      // List all sessions
      const sessions = await client.listSessions();
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(sessions, null, 2)
        }]
      };
    } else if (pathParts.length === 2) {
      // Get specific session
      const sessionId = pathParts[1];
      const session = await client.getSessionStatistics(sessionId);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(session, null, 2)
        }]
      };
    }
  }
  
  throw new Error(`Unknown session resource: ${uri}`);
}