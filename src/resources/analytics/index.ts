/**
 * Analytics Resources Module
 * 
 * This module provides read-only analytics resources for the Digital Samba MCP Server.
 * It implements comprehensive analytics resources for collecting participant, room, 
 * session, and team statistics.
 * 
 * @module resources/analytics
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { AnalyticsResource } from '../../types/analytics-resource.js';
import logger from '../../logger.js';

/**
 * Register all analytics resources
 * 
 * @param apiClient - The Digital Samba API client instance
 * @returns Array of MCP Resource definitions
 */
export function registerAnalyticsResources(apiClient: DigitalSambaApiClient): Resource[] {
  // Analytics resource instance - currently not used directly but needed for future expansion
  const _analytics = new AnalyticsResource(apiClient);
  void _analytics;
  
  return [
    {
      uri: 'digitalsamba://analytics/participants',
      name: 'analytics-participants',
      description: 'Get participant analytics and statistics',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://analytics/usage',
      name: 'analytics-usage',
      description: 'Get usage statistics and growth metrics',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://analytics/rooms',
      name: 'analytics-rooms',
      description: 'Get room analytics and statistics',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://analytics/team',
      name: 'analytics-team',
      description: 'Get team-wide statistics and metrics',
      mimeType: 'application/json'
    }
  ];
}

/**
 * Handle analytics resource requests
 * 
 * @param uri - The resource URI being requested
 * @param apiClient - The Digital Samba API client instance
 * @returns The resource content
 */
export async function handleAnalyticsResource(uri: string, apiClient: DigitalSambaApiClient): Promise<any> {
  const _analytics = new AnalyticsResource(apiClient);
  
  // Parse the URI - handle digitalsamba:// protocol
  // For digitalsamba://analytics/team, the URL parser treats 'analytics' as hostname
  const url = new URL(uri);
  
  // Extract path from the URI properly
  // For digitalsamba://analytics/team, url.hostname = 'analytics' and url.pathname = '/team'
  const pathParts = [url.hostname, ...url.pathname.split('/').filter(Boolean)];
  
  if (pathParts[0] !== 'analytics') {
    throw new Error(`Invalid analytics resource URI: ${uri}`);
  }
  
  const resourceType = pathParts[1] || 'team'; // Default to team if no subpath
  
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