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
import { AnalyticsResource } from '../../types/analytics-resource.js';
import { AnalyticsFilters } from '../../types/analytics.js';
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
      description: '[Analytics] Get detailed participant statistics and behavior analytics. Use when users say: "show participant stats", "participant analytics", "user activity report", "attendee statistics", "who attended meetings", "participant engagement metrics". Optional filters for date range, room, or specific participant. Returns attendance, duration, and activity data.',
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
      description: '[Analytics] Get comprehensive room usage analytics and performance metrics. Use when users say: "room analytics", "room usage statistics", "meeting room performance", "room activity report", "how is the room being used", "room metrics". Optional room_id for specific room or all rooms. Returns usage patterns, participant counts, session data.',
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
      description: '[Analytics - TOOL] Get filtered platform usage statistics with specific date ranges and periods. Use when users need: "analytics for specific dates", "weekly/monthly analytics", "analytics for last week", "analytics between dates". For simple "show analytics" use digitalsamba://analytics/team resource instead. Returns sessions, participants, minutes filtered by your criteria.',
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
    case 'get-team-analytics':
      logger.info('Executing team analytics query', { args });
      const teamResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(teamResult, null, 2)
        }]
      };
      
    case 'get-room-analytics':
      logger.info('Executing room analytics query', { args });
      // If no room_id provided, get team-wide analytics instead
      if (!args.room_id) {
        const teamResult = await analytics.getTeamAnalytics(filters);
        return {
          content: [{
            type: 'text',
            text: `Team-wide room analytics (no specific room selected):\n\n${JSON.stringify(teamResult, null, 2)}`
          }]
        };
      }
      const roomResult = await analytics.getRoomAnalytics(args.room_id, filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(roomResult, null, 2)
        }]
      };
      
    case 'get-session-analytics':
      logger.info('Executing session analytics query', { args });
      const sessionResult = await analytics.getSessionAnalytics(args.session_id, filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(sessionResult, null, 2)
        }]
      };
      
    case 'get-participant-statistics':
      logger.info('Executing participant statistics query', { args });
      // Use team analytics with participant filter
      const participantResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(participantResult, null, 2)
        }]
      };
      
    case 'get-usage-statistics':
      logger.info('Executing usage statistics query', { args });
      // Use team analytics for usage statistics
      const usageResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(usageResult, null, 2)
        }]
      };
      
    default:
      throw new Error(`Unknown analytics tool: ${toolName}`);
  }
}