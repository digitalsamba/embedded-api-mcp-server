/**
 * Digital Samba MCP Server - Poll Management Tools
 * 
 * This module implements tools for managing polls within Digital Samba sessions.
 * It provides MCP tools for creating, updating, deleting, and managing poll results.
 * 
 * Tools provided:
 * - create-poll: Create a new poll in a session
 * - update-poll: Update an existing poll
 * - delete-poll: Delete a specific poll
 * - delete-session-polls: Delete all polls for a session
 * - delete-room-polls: Delete all polls for all sessions in a room
 * - publish-poll-results: Publish poll results to participants
 * 
 * @module tools/poll-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { 
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
import { getApiKeyFromRequest } from '../../auth.js';
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import logger from '../../logger.js';

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Poll option schema
 */
const pollOptionSchema = z.object({
  text: z.string().describe('The text of the poll option'),
  id: z.string().optional().describe('Optional ID for the option'),
});

/**
 * Register poll management tools with the MCP SDK
 * 
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerPollTools(): ToolDefinition[] {
  return [
    {
      name: 'create-poll',
      description: 'Create a new poll in a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room to create the poll in'),
        question: z.string().describe('The poll question'),
        options: z.array(pollOptionSchema).min(2).describe('Array of poll options (minimum 2)'),
        type: z.enum(['single', 'multiple']).optional().describe('Poll type: single choice or multiple choice'),
        anonymous: z.boolean().optional().describe('Whether the poll is anonymous'),
        showResults: z.boolean().optional().describe('Whether to show results to participants'),
      }
    },
    {
      name: 'update-poll',
      description: 'Update an existing poll',
      inputSchema: {
        roomId: z.string().describe('The ID of the room containing the poll'),
        pollId: z.string().describe('The ID of the poll to update'),
        question: z.string().optional().describe('Updated poll question'),
        options: z.array(pollOptionSchema).optional().describe('Updated poll options'),
        type: z.enum(['single', 'multiple']).optional().describe('Updated poll type'),
        anonymous: z.boolean().optional().describe('Updated anonymous setting'),
        showResults: z.boolean().optional().describe('Updated show results setting'),
      }
    },
    {
      name: 'delete-poll',
      description: 'Delete a specific poll',
      inputSchema: {
        roomId: z.string().describe('The ID of the room containing the poll'),
        pollId: z.string().describe('The ID of the poll to delete'),
      }
    },
    {
      name: 'delete-session-polls',
      description: 'Delete all polls for a specific session',
      inputSchema: {
        sessionId: z.string().describe('The ID of the session to delete polls from'),
      }
    },
    {
      name: 'delete-room-polls',
      description: 'Delete all polls for all sessions in a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room to delete polls from'),
      }
    },
    {
      name: 'publish-poll-results',
      description: 'Publish poll results to participants',
      inputSchema: {
        roomId: z.string().describe('The ID of the room containing the poll'),
        pollId: z.string().describe('The ID of the poll to publish results for'),
        sessionId: z.string().optional().describe('The ID of the specific session (optional)'),
      }
    }
  ];
}

/**
 * Execute a poll management tool
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executePollTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient
): Promise<any> {
  switch (toolName) {
    case 'create-poll':
      return handleCreatePoll(params, apiClient);
    case 'update-poll':
      return handleUpdatePoll(params, apiClient);
    case 'delete-poll':
      return handleDeletePoll(params, apiClient);
    case 'delete-session-polls':
      return handleDeleteSessionPolls(params, apiClient);
    case 'delete-room-polls':
      return handleDeleteRoomPolls(params, apiClient);
    case 'publish-poll-results':
      return handlePublishPollResults(params, apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle create poll
 */
async function handleCreatePoll(
  params: {
    roomId: string;
    question: string;
    options: Array<{ text: string; id?: string }>;
    type?: 'single' | 'multiple';
    anonymous?: boolean;
    showResults?: boolean;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, question, options, type = 'single', anonymous = false, showResults = true } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to create a poll.'
      }],
      isError: true,
    };
  }
  
  if (!question || question.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Poll question is required.'
      }],
      isError: true,
    };
  }
  
  if (!options || options.length < 2) {
    return {
      content: [{ 
        type: 'text', 
        text: 'At least 2 poll options are required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating poll', { roomId, question, optionCount: options.length });
  
  try {
    const pollData = {
      question,
      options,
      type,
      anonymous,
      show_results: showResults,
    };
    
    const result = await apiClient.createPoll(roomId, pollData);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created poll "${question}" with ${options.length} options in room ${roomId}. Poll ID: ${result.id}`
      }],
    };
  } catch (error) {
    logger.error('Error creating poll', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating poll: ${errorMessage}`;
    
    if (errorMessage.includes('Room not found') || errorMessage.includes('404')) {
      displayMessage = `Room with ID ${roomId} not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle update poll
 */
async function handleUpdatePoll(
  params: {
    roomId: string;
    pollId: string;
    question?: string;
    options?: Array<{ text: string; id?: string }>;
    type?: 'single' | 'multiple';
    anonymous?: boolean;
    showResults?: boolean;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, pollId, ...updateData } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to update a poll.'
      }],
      isError: true,
    };
  }
  
  if (!pollId || pollId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Poll ID is required to update a poll.'
      }],
      isError: true,
    };
  }
  
  // Check if there's anything to update
  const hasUpdates = Object.keys(updateData).length > 0;
  if (!hasUpdates) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided for the poll.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating poll', { pollId, updates: Object.keys(updateData) });
  
  try {
    // Transform showResults to show_results for API
    const apiUpdateData: any = { ...updateData };
    if ('showResults' in apiUpdateData) {
      apiUpdateData.show_results = apiUpdateData.showResults;
      delete apiUpdateData.showResults;
    }
    
    await apiClient.updatePoll(roomId, pollId, apiUpdateData);
    
    const updateSummary = Object.keys(updateData).join(', ');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated poll ${pollId}. Updated fields: ${updateSummary}`
      }],
    };
  } catch (error) {
    logger.error('Error updating poll', { 
      pollId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating poll: ${errorMessage}`;
    
    if (errorMessage.includes('Poll not found') || errorMessage.includes('404')) {
      displayMessage = `Poll with ID ${pollId} not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle delete poll
 */
async function handleDeletePoll(
  params: { roomId: string; pollId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, pollId } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to delete a poll.'
      }],
      isError: true,
    };
  }
  
  if (!pollId || pollId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Poll ID is required to delete a poll.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting poll', { roomId, pollId });
  
  try {
    await apiClient.deletePoll(roomId, pollId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted poll ${pollId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting poll', { 
      pollId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting poll: ${errorMessage}`;
    
    if (errorMessage.includes('Poll not found') || errorMessage.includes('404')) {
      displayMessage = `Poll with ID ${pollId} not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle delete session polls
 */
async function handleDeleteSessionPolls(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { sessionId } = params;
  
  if (!sessionId || sessionId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Session ID is required to delete polls.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting session polls', { sessionId });
  
  try {
    await apiClient.deleteSessionPolls(sessionId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted all polls for session ${sessionId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting session polls', { 
      sessionId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session polls: ${errorMessage}`;
    
    if (errorMessage.includes('Session not found') || errorMessage.includes('404')) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle delete room polls
 */
async function handleDeleteRoomPolls(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to delete polls.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting room polls', { roomId });
  
  try {
    // Get all sessions for the room
    const sessionsResponse = await apiClient.listSessions({ room_id: roomId });
    const sessions = sessionsResponse.data;
    
    if (!sessions || sessions.length === 0) {
      return {
        content: [{ 
          type: 'text', 
          text: `No sessions found for room ${roomId}`
        }],
      };
    }
    
    // Delete polls for each session
    let deletedCount = 0;
    for (const session of sessions) {
      try {
        await apiClient.deleteSessionPolls(session.id);
        deletedCount++;
      } catch (error) {
        logger.warn('Failed to delete polls for session', { 
          sessionId: session.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted polls from ${deletedCount} sessions in room ${roomId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting room polls', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error deleting room polls: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle publish poll results
 */
async function handlePublishPollResults(
  params: { roomId: string; pollId: string; sessionId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, pollId, sessionId } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to publish results.'
      }],
      isError: true,
    };
  }
  
  if (!pollId || pollId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Poll ID is required to publish results.'
      }],
      isError: true,
    };
  }
  
  logger.info('Publishing poll results', { roomId, pollId, sessionId });
  
  try {
    // The API method expects sessionId as a required parameter
    // If not provided, we'll need to get the current session or return an error
    if (!sessionId) {
      return {
        content: [{ 
          type: 'text', 
          text: 'Session ID is required to publish poll results. Please provide the session ID.'
        }],
        isError: true,
      };
    }
    
    await apiClient.publishPollResults(pollId, sessionId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully published results for poll ${pollId} in room ${roomId} (session ${sessionId})`
      }],
    };
  } catch (error) {
    logger.error('Error publishing poll results', { 
      roomId,
      pollId, 
      sessionId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error publishing poll results: ${errorMessage}`;
    
    if (errorMessage.includes('Poll not found') || errorMessage.includes('404')) {
      displayMessage = `Poll with ID ${pollId} not found`;
    } else if (errorMessage.includes('Session not found')) {
      displayMessage = `Session with ID ${sessionId} not found`;
    } else if (errorMessage.includes('Room not found')) {
      displayMessage = `Room with ID ${roomId} not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}