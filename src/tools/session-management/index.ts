/**
 * Session Management Tools Module
 * 
 * This module provides comprehensive session management tools for the Digital Samba MCP Server.
 * It implements session-related tools for managing room sessions, deleting session data,
 * and performing session operations.
 * 
 * @module tools/session-management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
// import { z } from 'zod'; // Removed: unused
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import { getApiKeyFromRequest } from '../../auth.js';
import logger from '../../logger.js';

/**
 * Register all session management tools
 * 
 * @returns Array of MCP Tool definitions
 */
export function registerSessionTools(): Tool[] {
  return [
    {
      name: 'get-all-room-sessions',
      description: 'Get all sessions for a specific room with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'Room ID (required)'
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 1000,
            description: 'Number of results to return'
          },
          offset: {
            type: 'number',
            minimum: 0,
            description: 'Number of results to skip'
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort order'
          },
          dateStart: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          dateEnd: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          },
          live: {
            type: 'boolean',
            description: 'Filter for live sessions only'
          }
        },
        required: ['roomId']
      }
    },
    {
      name: 'hard-delete-session-resources',
      description: 'Permanently delete all stored resource data for a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID (required)'
          }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'bulk-delete-session-data',
      description: 'Delete multiple types of session data in a single operation',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID (required)'
          },
          dataTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['chat', 'questions', 'summaries', 'transcripts', 'polls', 'recordings', 'resources']
            },
            minItems: 1,
            description: 'Types of data to delete'
          }
        },
        required: ['sessionId', 'dataTypes']
      }
    },
    {
      name: 'get-session-summary',
      description: 'Get a comprehensive summary of a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID (required)'
          }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'end-session',
      description: 'End a live session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID (required)'
          }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'get-session-statistics',
      description: 'Get detailed statistics for a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID (required)'
          },
          metrics: {
            type: 'string',
            description: 'Specific metrics to retrieve (optional)'
          }
        },
        required: ['sessionId']
      }
    }
  ];
}

/**
 * Execute a session management tool
 * 
 * @param toolName - The name of the tool to execute
 * @param args - The tool arguments
 * @param apiClient - The Digital Samba API client instance
 * @param request - The MCP request object for authentication
 * @returns The tool execution result
 */
export async function executeSessionTool(
  toolName: string,
  args: any,
  apiClient: DigitalSambaApiClient,
  request: any
): Promise<any> {
  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No API key found. Please include an Authorization header with a Bearer token.'
      }],
      isError: true,
    };
  }

  switch (toolName) {
    case 'get-all-room-sessions': {
      logger.info('Getting all room sessions', { roomId: args.roomId, limit: args.limit, offset: args.offset });
      
      try {
        const sessionParams = {
          limit: args.limit,
          offset: args.offset,
          order: args.order,
          date_start: args.dateStart,
          date_end: args.dateEnd,
          live: args.live
        };
        
        const sessions = await apiClient.listRoomSessions(args.roomId, sessionParams);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              sessions: sessions.data,
              total_count: sessions.total_count,
              pagination: {
                limit: args.limit || 50,
                offset: args.offset || 0,
                total: sessions.total_count
              }
            }, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting room sessions', { 
          roomId: args.roomId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error getting room sessions: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    case 'hard-delete-session-resources': {
      logger.info('Hard deleting all session resources', { sessionId: args.sessionId });
      
      try {
        await apiClient.deleteSessionData(args.sessionId, 'resources');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully hard deleted all stored resource data for session ${args.sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error hard deleting session resources', { 
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error hard deleting session resources: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    case 'bulk-delete-session-data': {
      logger.info('Bulk deleting session data', { sessionId: args.sessionId, dataTypes: args.dataTypes });
      
      try {
        const results = [];
        const errors = [];
        
        // Delete each data type
        for (const dataType of args.dataTypes) {
          try {
            await apiClient.deleteSessionData(args.sessionId, dataType);
            results.push(`✅ Successfully deleted ${dataType}`);
            logger.info(`Deleted session ${dataType}`, { sessionId: args.sessionId, dataType });
          } catch (error) {
            const errorMsg = `❌ Failed to delete ${dataType}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            logger.error(`Failed to delete session ${dataType}`, { 
              sessionId: args.sessionId, 
              dataType, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
        
        const summary = {
          sessionId: args.sessionId,
          requested: args.dataTypes,
          results: results,
          errors: errors,
          success: errors.length === 0
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          }],
          isError: errors.length > 0,
        };
      } catch (error) {
        logger.error('Error in bulk delete session data', { 
          sessionId: args.sessionId,
          dataTypes: args.dataTypes,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error in bulk delete operation: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    case 'get-session-summary': {
      logger.info('Getting session summary', { sessionId: args.sessionId });
      
      try {
        const summary = await apiClient.getSessionSummary(args.sessionId);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting session summary', { 
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error getting session summary: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    case 'end-session': {
      logger.info('Ending session', { sessionId: args.sessionId });
      
      try {
        await apiClient.endSession(args.sessionId);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully ended session ${args.sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error ending session', { 
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error ending session: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    case 'get-session-statistics': {
      logger.info('Getting session statistics', { sessionId: args.sessionId, metrics: args.metrics });
      
      try {
        const statistics = await apiClient.getSessionStatistics(args.sessionId, args.metrics);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(statistics, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting session statistics', { 
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error getting session statistics: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown session tool: ${toolName}`);
  }
}