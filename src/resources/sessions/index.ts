/**
 * Session Resources Module
 * 
 * This module provides read-only session resources for the Digital Samba MCP Server.
 * It implements resources for listing sessions, retrieving session details,
 * session participants, and session statistics.
 * 
 * @module resources/sessions
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { getApiKeyFromRequest } from '../../auth.js';
import logger from '../../logger.js';

/**
 * Register all session resources
 * 
 * @returns Array of MCP Resource definitions
 */
export function registerSessionResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://sessions',
      name: 'sessions',
      description: '[Session Data] List all sessions across all rooms. Use to access: "show all sessions", "list meetings", "session history", "all past meetings", "meeting directory". Returns paginated list of session objects with room info, start/end times, and participant counts.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://sessions/{sessionId}',
      name: 'session',
      description: '[Session Data] Get comprehensive summary for a specific session. Use to access: "session details", "meeting summary", "what happened in session", "session report", "session overview". Requires sessionId. Returns detailed session data with duration, participants, and activity.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://sessions/{sessionId}/participants',
      name: 'session-participants',
      description: '[Session Data] List all participants in a session. Use to access: "who attended session", "session attendees", "participant list", "meeting participants", "session roster". Requires sessionId. Returns participant details with join/leave times and roles.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://sessions/{sessionId}/statistics',
      name: 'session-statistics',
      description: '[Session Data] Get detailed usage statistics for a session. Use to access: "session metrics", "session analytics", "participant statistics", "meeting usage data", "session performance". Requires sessionId. Returns participant count, duration, activity metrics.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/{roomId}/sessions',
      name: 'room-sessions',
      description: '[Session Data] List all sessions for a specific room. Use to access: "room meeting history", "sessions in room", "room session list", "meetings for this room", "room activity history". Requires roomId. Returns chronological list of sessions in that room.',
      mimeType: 'application/json'
    }
  ];
}

/**
 * Handle session resource requests
 * 
 * @param uri - The resource URI being requested
 * @param params - URL parameters from the URI
 * @param request - The MCP request object
 * @param options - Server options including API configuration
 * @returns The resource content
 */
export async function handleSessionResource(
  uri: string,
  params: any,
  request: any,
  options: {
    apiUrl: string;
    apiCache?: any;
  }
): Promise<any> {
  const { apiUrl, apiCache } = options;
  
  // Get API key from session context
  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) {
    throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
  }
  
  // Create API client
  const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);
  
  // Parse the URI to determine which resource is being requested
  const uriParts = uri.split('/');
  
  try {
    // Handle different session resource types
    if (uri.includes('/rooms/') && uri.endsWith('/sessions')) {
      // Room sessions: digitalsamba://rooms/{roomId}/sessions
      const roomId = params.roomId || uriParts[3];
      
      if (!roomId) {
        throw new Error('Room ID is required.');
      }
      
      logger.info('Fetching sessions for room', { roomId });
      const response = await client.listRoomSessions(roomId);
      const sessions = response.data || [];
      
      // Format sessions as resource contents
      const contents = sessions.map(session => ({
        uri: `digitalsamba://sessions/${session.id}`,
        text: JSON.stringify(session, null, 2),
        mimeType: 'application/json'
      }));
      
      return { contents };
      
    } else if (uri.includes('/participants')) {
      // Session participants: digitalsamba://sessions/{sessionId}/participants
      const sessionId = params.sessionId || uriParts[3];
      
      if (!sessionId) {
        throw new Error('Session ID is required.');
      }
      
      logger.info('Fetching participants for session', { sessionId });
      const response = await client.listSessionParticipants(sessionId);
      const participants = response.data || [];
      
      // Format participants as resource contents
      const contents = participants.map(participant => ({
        uri: `digitalsamba://participants/${participant.id}`,
        text: JSON.stringify(participant, null, 2),
        mimeType: 'application/json'
      }));
      
      return { contents };
      
    } else if (uri.includes('/statistics')) {
      // Session statistics: digitalsamba://sessions/{sessionId}/statistics
      const sessionId = params.sessionId || uriParts[3];
      
      if (!sessionId) {
        throw new Error('Session ID is required.');
      }
      
      logger.info('Fetching statistics for session', { sessionId });
      const statistics = await client.getSessionStatistics(sessionId);
      
      return {
        contents: [{
          uri: uri,
          text: JSON.stringify(statistics, null, 2),
          mimeType: 'application/json'
        }]
      };
      
    } else if (uriParts.length > 3 && uriParts[3] !== '') {
      // Specific session: digitalsamba://sessions/{sessionId}
      const sessionId = params.sessionId || uriParts[3];
      
      if (!sessionId) {
        throw new Error('Session ID is required.');
      }
      
      logger.info('Fetching session summary', { sessionId });
      const session = await client.getSessionSummary(sessionId);
      
      return {
        contents: [{
          uri: uri,
          text: JSON.stringify(session, null, 2),
          mimeType: 'application/json'
        }]
      };
      
    } else {
      // List all sessions: digitalsamba://sessions
      logger.info('Fetching all sessions');
      const response = await client.listSessions();
      const sessions = response.data || [];
      
      // Format sessions as resource contents
      const contents = sessions.map(session => ({
        uri: `digitalsamba://sessions/${session.id}`,
        text: JSON.stringify(session, null, 2),
        mimeType: 'application/json'
      }));
      
      return { contents };
    }
  } catch (error) {
    logger.error('Error handling session resource', {
      uri,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}