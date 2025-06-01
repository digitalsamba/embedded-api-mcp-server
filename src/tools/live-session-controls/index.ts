/**
 * Digital Samba MCP Server - Live Session Control Tools
 * 
 * This module implements tools for real-time control of live Digital Samba sessions.
 * It provides MCP tools for managing active sessions including transcription and
 * phone participant integration.
 * 
 * Tools provided:
 * - start-transcription: Start transcription for a session
 * - stop-transcription: Stop transcription for a session
 * - phone-participants-joined: Register phone participants joining
 * - phone-participants-left: Register phone participants leaving
 * 
 * Note: Recording controls (start/stop) are in the recording-management module
 * Note: Session termination (end-session) is in the session-management module
 * 
 * @module tools/live-session-controls
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
 * Register live session control tools with the MCP SDK
 * 
 * This function returns an array of tool definitions that can be registered
 * with the MCP server. It follows the modular pattern where tools are defined
 * here and registered in the main index.ts file.
 * 
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerLiveSessionTools(): ToolDefinition[] {
  return [
    {
      name: 'start-transcription',
      description: 'Start transcription for a live session in a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room to start transcription for'),
      }
    },
    {
      name: 'stop-transcription',
      description: 'Stop transcription for a live session in a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room to stop transcription for'),
      }
    },
    {
      name: 'phone-participants-joined',
      description: 'Register phone participants joining a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room'),
        participants: z.array(z.object({
          call_id: z.string().describe('Unique identifier for the phone call'),
          name: z.string().optional().describe('Name of the participant'),
          caller_number: z.string().optional().describe('Phone number of the participant'),
          external_id: z.string().optional().describe('External identifier for the participant')
        })).describe('Array of phone participants joining')
      }
    },
    {
      name: 'phone-participants-left',
      description: 'Register phone participants leaving a room',
      inputSchema: {
        roomId: z.string().describe('The ID of the room'),
        callIds: z.array(z.string()).describe('Array of call IDs for participants leaving')
      }
    }
  ];
}

/**
 * Execute a live session control tool
 * 
 * This function handles the execution of live session control tools.
 * It's called by the main server when a tool is invoked.
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeLiveSessionTool(
  toolName: string,
  params: any,
  _apiClient: DigitalSambaApiClient
): Promise<any> {
  switch (toolName) {
    case 'start-transcription':
      return handleStartTranscription(params, apiClient);
    case 'stop-transcription':
      return handleStopTranscription(params, apiClient);
    case 'phone-participants-joined':
      return handlePhoneParticipantsJoined(params, apiClient);
    case 'phone-participants-left':
      return handlePhoneParticipantsLeft(params, apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle start transcription tool
 */
async function handleStartTranscription(
  params: { roomId: string },
  _apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to start transcription.'
      }],
      isError: true,
    };
  }
  
  logger.info('Starting transcription', { roomId });
  
  try {
    // Note: The Digital Samba API might not have direct transcription endpoints yet
    // This is a placeholder implementation that would need to be updated when the API is available
    // For now, we'll simulate the expected behavior
    
    // In a real implementation, this would be:
    // await apiClient.startTranscription(roomId);
    
    logger.warn('Transcription API endpoint not yet available in Digital Samba API');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Transcription start requested for room ${roomId}. Note: This feature is pending Digital Samba API support.`
      }],
    };
  } catch (error) {
    logger.error('Error starting transcription', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error starting transcription: ${errorMessage}`;
    
    if (errorMessage.includes('Room not found') || errorMessage.includes('404')) {
      displayMessage = `Room with ID ${roomId} not found`;
    } else if (errorMessage.includes('Already transcribing')) {
      displayMessage = `Transcription already in progress for room ${roomId}`;
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
 * Handle stop transcription tool
 */
async function handleStopTranscription(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required to stop transcription.'
      }],
      isError: true,
    };
  }
  
  logger.info('Stopping transcription', { roomId });
  
  try {
    // Note: The Digital Samba API might not have direct transcription endpoints yet
    // This is a placeholder implementation that would need to be updated when the API is available
    // For now, we'll simulate the expected behavior
    
    // In a real implementation, this would be:
    // await apiClient.stopTranscription(roomId);
    
    logger.warn('Transcription API endpoint not yet available in Digital Samba API');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Transcription stop requested for room ${roomId}. Note: This feature is pending Digital Samba API support.`
      }],
    };
  } catch (error) {
    logger.error('Error stopping transcription', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error stopping transcription: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle phone participants joined tool
 */
async function handlePhoneParticipantsJoined(
  params: { 
    roomId: string;
    participants: Array<{
      call_id: string;
      name?: string;
      caller_number?: string;
      external_id?: string;
    }>;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, participants } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required for phone participants.'
      }],
      isError: true,
    };
  }
  
  if (!participants || participants.length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'At least one participant is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Registering phone participants joined', { 
    roomId, 
    participantCount: participants.length 
  });
  
  try {
    await apiClient.phoneParticipantsJoined(roomId, participants);
    
    const participantNames = participants
      .map(p => p.name || p.caller_number || p.call_id)
      .join(', ');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully registered ${participants.length} phone participant(s) joining room ${roomId}: ${participantNames}`
      }],
    };
  } catch (error) {
    logger.error('Error registering phone participants joined', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error registering phone participants: ${errorMessage}`;
    
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
 * Handle phone participants left tool
 */
async function handlePhoneParticipantsLeft(
  params: { 
    roomId: string;
    callIds: string[];
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roomId, callIds } = params;
  
  if (!roomId || roomId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Room ID is required for phone participants.'
      }],
      isError: true,
    };
  }
  
  if (!callIds || callIds.length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'At least one call ID is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Registering phone participants left', { 
    roomId, 
    callIdCount: callIds.length 
  });
  
  try {
    await apiClient.phoneParticipantsLeft(roomId, callIds);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully registered ${callIds.length} phone participant(s) leaving room ${roomId}`
      }],
    };
  } catch (error) {
    logger.error('Error registering phone participants left', { 
      roomId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error registering phone participants leaving: ${errorMessage}`;
    
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
 * Set up live session control tools for the MCP server (legacy function)
 * 
 * This function is kept for backward compatibility but delegates to the
 * modular registration system.
 * 
 * @deprecated Use registerLiveSessionTools() and executeLiveSessionTool() instead
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 */
export function setupLiveSessionTools(server: McpServer, apiUrl: string): void {
  logger.info('Setting up live session control tools');
  
  const tools = registerLiveSessionTools();
  
  tools.forEach(tool => {
    server.tool(
      tool.name,
      tool.inputSchema,
      async (params, request) => {
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
        
        const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
        return executeLiveSessionTool(tool.name, params, apiClient);
      }
    );
  });
  
  logger.info('Live session control tools set up successfully');
}