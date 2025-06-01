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
import { AnalyticsResource } from '../../analytics.js';
import logger from '../../logger.js';

/**
 * Register all analytics resources
 * 
 * @param apiClient - The Digital Samba API client instance
 * @returns Array of MCP Resource definitions
 */
export function registerAnalyticsResources(apiClient: DigitalSambaApiClient): Resource[] {
  const _analytics = new AnalyticsResource(apiClient);
  
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
  
  // Parse the URI to determine which resource is being requested
  const uriParts = uri.split('/');
  const resourceType = uriParts[3]; // analytics/[resourceType]
  
  switch (resourceType) {
    case 'participants':
      logger.info('Fetching participant analytics');
      return await _analytics.getAllParticipants();
      
    case 'usage':
      logger.info('Fetching usage statistics');
      return await _analytics.getUsageStatistics();
      
    case 'rooms':
      logger.info('Fetching room analytics');
      return await _analytics.getRoomAnalytics();
      
    case 'team':
      logger.info('Fetching team statistics');
      return await _analytics.getTeamGlobalStatistics();
      
    default:
      throw new Error(`Unknown analytics resource: ${resourceType}`);
  }
}