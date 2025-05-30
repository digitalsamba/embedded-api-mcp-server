/**
 * Sessions Module for Digital Samba MCP Server
 * 
 * This module provides comprehensive session management functionality for the Digital Samba API.
 * It implements session-related tools for managing room sessions, deleting session data,
 * and performing session operations.
 * 
 * @module sessions
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getApiKeyFromRequest } from './auth.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import { 
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError, 
  ValidationError
} from './errors.js';
import logger from './logger.js';

/**
 * Set up session tools for the MCP server
 * 
 * This function registers all session-related tools with the MCP server.
 * It creates tools for session management, data deletion, and session operations.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register session functionality with the MCP server
 * setupSessionTools(mcpServer, 'https://api.digitalsamba.com/api/v1');
 */
export function setupSessionTools(server: McpServer, apiUrl: string) {
  // -------------------------------------------------------------------
  // Session Management Tools
  // -------------------------------------------------------------------

  // Tool for getting all room sessions
  server.tool(
    'get-all-room-sessions',
    {
      roomId: z.string().min(1, 'Room ID is required'),
      limit: z.number().min(1).max(1000).optional(),
      offset: z.number().min(0).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      dateStart: z.string().optional(),
      dateEnd: z.string().optional(),
      live: z.boolean().optional(),
    },
    async (params, request) => {
      const { roomId, limit, offset, order, dateStart, dateEnd, live } = params;
      
      logger.info('Getting all room sessions', { roomId, limit, offset });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        const sessionParams = {
          limit,
          offset,
          order,
          date_start: dateStart,
          date_end: dateEnd,
          live
        };
        
        const sessions = await client.listRoomSessions(roomId, sessionParams);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              sessions: sessions.data,
              total_count: sessions.total_count,
              pagination: {
                limit: limit || 50,
                offset: offset || 0,
                total: sessions.total_count
              }
            }, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting room sessions', { 
          roomId,
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
  );

  // Tool for deleting session chats
  server.tool(
    'delete-session-chats',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Deleting session chats', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.deleteSessionData(sessionId, 'chat');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted all chat messages for session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error deleting session chats', { 
          sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting session chats: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting session Q&A
  server.tool(
    'delete-session-qa',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Deleting session Q&A', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.deleteSessionData(sessionId, 'questions');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted all Q&A data for session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error deleting session Q&A', { 
          sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting session Q&A: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting session summaries
  server.tool(
    'delete-session-summaries',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Deleting session summaries', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.deleteSessionData(sessionId, 'summaries');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted all summaries for session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error deleting session summaries', { 
          sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting session summaries: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting session polls
  server.tool(
    'delete-session-polls',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Deleting session polls', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.deleteSessionData(sessionId, 'polls');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted all polls for session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error deleting session polls', { 
          sessionId,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error deleting session polls: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool for hard delete all session resource data
  server.tool(
    'hard-delete-session-resources',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Hard deleting all session resources', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.deleteSessionData(sessionId, 'resources');
        
        return {
          content: [{
            type: 'text',
            text: `Successfully hard deleted all stored resource data for session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error hard deleting session resources', { 
          sessionId,
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
  );

  // Tool for bulk delete session data
  server.tool(
    'bulk-delete-session-data',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
      dataTypes: z.array(z.enum(['chat', 'questions', 'summaries', 'transcripts', 'polls', 'recordings', 'resources'])).min(1, 'At least one data type must be specified'),
    },
    async (params, request) => {
      const { sessionId, dataTypes } = params;
      
      logger.info('Bulk deleting session data', { sessionId, dataTypes });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        const results = [];
        const errors = [];
        
        // Delete each data type
        for (const dataType of dataTypes) {
          try {
            await client.deleteSessionData(sessionId, dataType);
            results.push(`✅ Successfully deleted ${dataType}`);
            logger.info(`Deleted session ${dataType}`, { sessionId, dataType });
          } catch (error) {
            const errorMsg = `❌ Failed to delete ${dataType}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            logger.error(`Failed to delete session ${dataType}`, { 
              sessionId, 
              dataType, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
        
        const summary = {
          sessionId,
          requested: dataTypes,
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
          sessionId,
          dataTypes,
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
  );

  // Tool for getting session summary
  server.tool(
    'get-session-summary',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Getting session summary', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        const summary = await client.getSessionSummary(sessionId);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting session summary', { 
          sessionId,
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
  );

  // Tool for ending a live session
  server.tool(
    'end-session',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
    },
    async (params, request) => {
      const { sessionId } = params;
      
      logger.info('Ending session', { sessionId });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        await client.endSession(sessionId);
        
        return {
          content: [{
            type: 'text',
            text: `Successfully ended session ${sessionId}`,
          }],
        };
      } catch (error) {
        logger.error('Error ending session', { 
          sessionId,
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
  );

  // Tool for getting session statistics
  server.tool(
    'get-session-statistics',
    {
      sessionId: z.string().min(1, 'Session ID is required'),
      metrics: z.string().optional(),
    },
    async (params, request) => {
      const { sessionId, metrics } = params;
      
      logger.info('Getting session statistics', { sessionId, metrics });
      
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
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        const statistics = await client.getSessionStatistics(sessionId, metrics);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(statistics, null, 2),
          }],
        };
      } catch (error) {
        logger.error('Error getting session statistics', { 
          sessionId,
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
  );
}

export default setupSessionTools;