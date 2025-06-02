/**
 * Analytics Resources Handler
 * Simple handler for analytics resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';
import { AnalyticsResource } from '../types/analytics-resource.js';
import logger from '../logger.js';

export function registerAnalyticsResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://analytics/team',
      name: 'Team Analytics',
      description: 'Get team-wide analytics and statistics',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://analytics/rooms/{roomId}',
      name: 'Room Analytics',
      description: 'Get analytics for a specific room',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://analytics/sessions/{sessionId}',
      name: 'Session Analytics',
      description: 'Get analytics for a specific session',
      mimeType: 'application/json'
    }
  ];
}

export async function handleAnalyticsResource(uri: string, apiClient: DigitalSambaApiClient): Promise<any> {
  const _analytics = new AnalyticsResource(apiClient);
  
  // Parse the URI to determine which resource is being requested
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] !== 'analytics' || pathParts.length < 2) {
    throw new Error(`Invalid analytics resource URI: ${uri}`);
  }
  
  const resourceType = pathParts[1];
  
  switch (resourceType) {
    case 'team':
      logger.info('Fetching team analytics');
      const filters = Object.fromEntries(url.searchParams);
      const teamData = await _analytics.getTeamAnalytics(filters);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(teamData, null, 2)
        }]
      };
      
    case 'rooms':
      if (pathParts.length < 3) {
        throw new Error('Room analytics requires room ID: analytics/rooms/{roomId}');
      }
      const roomId = pathParts[2];
      logger.info(`Fetching analytics for room ${roomId}`);
      const roomData = await _analytics.getRoomAnalytics(roomId);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(roomData, null, 2)
        }]
      };
      
    case 'sessions':
      if (pathParts.length < 3) {
        throw new Error('Session analytics requires session ID: analytics/sessions/{sessionId}');
      }
      const sessionId = pathParts[2];
      logger.info(`Fetching analytics for session ${sessionId}`);
      const sessionData = await _analytics.getSessionAnalytics(sessionId);
      return {
        contents: [{
          type: 'application/json',
          text: JSON.stringify(sessionData, null, 2)
        }]
      };
      
    default:
      throw new Error(`Unknown analytics resource: ${resourceType}`);
  }
}