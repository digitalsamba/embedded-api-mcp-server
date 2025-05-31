/**
 * Analytics Tools Module
 * 
 * This module provides analytics query tools for the Digital Samba MCP Server.
 * These tools allow for complex analytics queries with filters and parameters.
 * 
 * @module tools/analytics-tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { AnalyticsResource, AnalyticsFilters } from '../../analytics.js';
import logger from '../../logger.js';

/**
 * Register all analytics tools
 * 
 * @returns Array of MCP Tool definitions
 */
export function registerAnalyticsTools(): Tool[] {
  return [
    {
      name: 'get-participant-statistics',
      description: 'Get detailed participant statistics with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          participant_id: {
            type: 'string',
            description: 'Specific participant ID (optional)'
          },
          date_start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          date_end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          },
          room_id: {
            type: 'string',
            description: 'Filter by room ID'
          },
          session_id: {
            type: 'string',
            description: 'Filter by session ID'
          }
        },
        required: []
      }
    },
    {
      name: 'get-room-analytics',
      description: 'Get comprehensive room analytics with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          room_id: {
            type: 'string',
            description: 'Specific room ID (optional)'
          },
          date_start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          date_end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          },
          period: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            description: 'Analytics period'
          }
        },
        required: []
      }
    },
    {
      name: 'get-usage-statistics',
      description: 'Get usage statistics and growth metrics',
      inputSchema: {
        type: 'object',
        properties: {
          date_start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          date_end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          },
          period: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            description: 'Analytics period'
          }
        },
        required: []
      }
    },
    {
      name: 'get-session-statistics',
      description: 'Get session statistics with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'Specific session ID (optional)'
          },
          room_id: {
            type: 'string',
            description: 'Filter by room ID'
          },
          date_start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          date_end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          }
        },
        required: []
      }
    }
  ];
}

/**
 * Handle analytics tool execution
 * 
 * @param toolName - The name of the tool being executed
 * @param args - The tool arguments
 * @param apiClient - The Digital Samba API client instance
 * @returns The tool execution result
 */
export async function executeAnalyticsTool(
  toolName: string, 
  args: any, 
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const analytics = new AnalyticsResource(apiClient);
  
  // Build filters from arguments
  const filters: AnalyticsFilters = {
    date_start: args.date_start,
    date_end: args.date_end,
    room_id: args.room_id,
    session_id: args.session_id,
    participant_id: args.participant_id,
    period: args.period
  };
  
  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key as keyof AnalyticsFilters] === undefined) {
      delete filters[key as keyof AnalyticsFilters];
    }
  });
  
  switch (toolName) {
    case 'get-participant-statistics':
      logger.info('Executing participant statistics query', { args });
      return await analytics.getParticipantStatistics(args.participant_id, filters);
      
    case 'get-room-analytics':
      logger.info('Executing room analytics query', { args });
      return await analytics.getRoomAnalytics(args.room_id, filters);
      
    case 'get-usage-statistics':
      logger.info('Executing usage statistics query', { args });
      return await analytics.getUsageStatistics(filters);
      
    case 'get-session-statistics':
      logger.info('Executing session statistics query', { args });
      return await analytics.getSessionStatistics(args.session_id, filters);
      
    default:
      throw new Error(`Unknown analytics tool: ${toolName}`);
  }
}