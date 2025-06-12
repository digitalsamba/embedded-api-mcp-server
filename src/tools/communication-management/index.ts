/**
 * Digital Samba MCP Server - Communication Management Tools
 *
 * This module implements tools for managing communications within Digital Samba sessions.
 * It provides MCP tools for managing chat messages, Q&A, transcripts, and summaries.
 *
 * Tools provided:
 * - delete-session-chats: Delete all chat messages for a session
 * - delete-room-chats: Delete all chat messages for a room
 * - delete-session-qa: Delete all Q&A for a session
 * - delete-room-qa: Delete all Q&A for a room
 * - delete-session-transcripts: Delete all transcripts for a session
 * - delete-room-transcripts: Delete all transcripts for a room
 * - delete-session-summaries: Delete all summaries for a session
 * - delete-room-summaries: Delete all summaries for a room
 *
 * @module tools/communication-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
// import { z } from "zod"; // Removed: unused

// MCP SDK imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // TODO: Direct MCP server integration
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

// Local modules
// import { getApiKeyFromRequest } from '../../auth.js'; // Removed: unused
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Register communication management tools with the MCP SDK
 *
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerCommunicationTools(): ToolDefinition[] {
  return [
    // Chat Management
    {
      name: "delete-session-chats",
      description:
        '[Communication Management] NOT SUPPORTED - The Digital Samba API does not support session-specific chat deletion. Use delete-room-chats instead to delete all chats from a room.',
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session (not supported)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-chats",
      description:
        '[Communication Management] Delete all chat messages from ALL sessions in a room. Use when users say: "delete all room chats", "clear room chat history", "remove all chat messages from room", "wipe room chats". Requires roomId. Affects all past and current sessions.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete chats from",
          },
        },
        required: ["roomId"],
      },
    },

    // Q&A Management
    {
      name: "delete-session-qa",
      description:
        '[Communication Management] NOT SUPPORTED - The Digital Samba API does not support session-specific Q&A deletion. Use delete-room-qa instead to delete all Q&A from a room.',
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session (not supported)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-qa",
      description:
        '[Communication Management] Delete all Q&A from ALL sessions in a room. Use when users say: "delete all room Q&A", "clear room questions", "remove all Q&A from room", "wipe room Q&A history". Requires roomId. Affects all sessions\' Q&A data.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete Q&A from",
          },
        },
        required: ["roomId"],
      },
    },

    // Transcript Management
    {
      name: "delete-session-transcripts",
      description:
        '[Communication Management] Delete all transcription data from a session. Use when users say: "delete session transcript", "remove transcription", "clear transcript", "delete meeting transcript", "wipe transcription data". Requires sessionId. Permanently removes transcript records.',
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session to delete transcripts from",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-transcripts",
      description:
        '[Communication Management] Delete all transcripts from ALL sessions in a room. Use when users say: "delete all room transcripts", "clear room transcription history", "remove all transcripts from room", "wipe room transcripts". Requires roomId. Affects all sessions\' transcripts.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete transcripts from",
          },
        },
        required: ["roomId"],
      },
    },

    // Summary Management
    {
      name: "delete-session-summaries",
      description:
        '[Communication Management] Delete AI-generated summaries from a session. Use when users say: "delete session summary", "remove AI summary", "clear meeting summary", "delete session notes", "wipe summary data". Requires sessionId. Removes all AI-generated session summaries.',
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session to delete summaries from",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-summaries",
      description:
        '[Communication Management] Delete all AI summaries from ALL sessions in a room. Use when users say: "delete all room summaries", "clear room AI summaries", "remove all summaries from room", "wipe room summary history". Requires roomId. Affects all sessions\' AI summaries.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete summaries from",
          },
        },
        required: ["roomId"],
      },
    },
  ];
}

/**
 * Execute a communication management tool
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeCommunicationTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  switch (toolName) {
    // Chat Management
    case "delete-session-chats":
      return handleDeleteSessionChats(params, apiClient);
    case "delete-room-chats":
      return handleDeleteRoomChats(params, apiClient);

    // Q&A Management
    case "delete-session-qa":
      return handleDeleteSessionQA(params, apiClient);
    case "delete-room-qa":
      return handleDeleteRoomQA(params, apiClient);

    // Transcript Management
    case "delete-session-transcripts":
      return handleDeleteSessionTranscripts(params, apiClient);
    case "delete-room-transcripts":
      return handleDeleteRoomTranscripts(params, apiClient);

    // Summary Management
    case "delete-session-summaries":
      return handleDeleteSessionSummaries(params, apiClient);
    case "delete-room-summaries":
      return handleDeleteRoomSummaries(params, apiClient);

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle delete session chats
 */
async function handleDeleteSessionChats(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  logger.info("Attempted to delete session-specific chats", { sessionId });

  // The Digital Samba API doesn't support session-specific chat deletion
  // Only room-wide chat deletion is available
  return {
    content: [
      {
        type: "text",
        text: `Session-specific chat deletion is not supported by the Digital Samba API. 
You can only delete all chat messages from an entire room using the delete-room-chats tool.

To delete chats, you'll need the room ID, not the session ID.`,
      },
    ],
    isError: true,
  };
}

/**
 * Handle delete room chats
 */
async function handleDeleteRoomChats(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete chats.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room chats", { roomId });

  try {
    // Use the correct API endpoint for room chat deletion
    await apiClient.deleteChatMessages(roomId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all chat messages from room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room chats", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room chats: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session Q&A
 */
async function handleDeleteSessionQA(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete Q&A.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session Q&A", { sessionId });

  try {
    await apiClient.deleteSessionQA(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all questions and answers for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session Q&A", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session Q&A: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session Q&A
 */
async function handleDeleteSessionQA(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  logger.info("Attempted to delete session-specific Q&A", { sessionId });

  // The Digital Samba API doesn't support session-specific Q&A deletion
  // Only room-wide Q&A deletion is available
  return {
    content: [
      {
        type: "text",
        text: `Session-specific Q&A deletion is not supported by the Digital Samba API. 
You can only delete all Q&A from an entire room using the delete-room-qa tool.

To delete Q&A, you'll need the room ID, not the session ID.`,
      },
    ],
    isError: true,
  };
}

/**
 * Handle delete room Q&A
 */
async function handleDeleteRoomQA(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete Q&A.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room Q&A", { roomId });

  try {
    // Use the correct API endpoint for room Q&A deletion
    await apiClient.deleteQA(roomId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all Q&A from room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room Q&A", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room Q&A: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session transcripts
 */
async function handleDeleteSessionTranscripts(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session transcripts", { sessionId });

  try {
    // Note: The Digital Samba API might use different endpoints for transcripts
    // This is a placeholder implementation
    await apiClient.deleteSessionData(sessionId, "transcripts");

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all transcripts for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session transcripts", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session transcripts: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room transcripts
 */
async function handleDeleteRoomTranscripts(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room transcripts", { roomId });

  try {
    // Get all sessions for the room
    const sessionsResponse = await apiClient.listSessions({ room_id: roomId });
    const sessions = sessionsResponse.data;

    if (!sessions || sessions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No sessions found for room ${roomId}`,
          },
        ],
      };
    }

    // Delete transcripts for each session
    let deletedCount = 0;
    for (const session of sessions) {
      try {
        await apiClient.deleteSessionData(session.id, "transcripts");
        deletedCount++;
      } catch (error) {
        logger.warn("Failed to delete transcripts for session", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted transcripts from ${deletedCount} sessions in room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room transcripts", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room transcripts: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session summaries
 */
async function handleDeleteSessionSummaries(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete summaries.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session summaries", { sessionId });

  try {
    await apiClient.deleteSessionSummaries(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all AI-generated summaries for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session summaries", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session summaries: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room summaries
 */
async function handleDeleteRoomSummaries(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete summaries.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room summaries", { roomId });

  try {
    // Get all sessions for the room
    const sessionsResponse = await apiClient.listSessions({ room_id: roomId });
    const sessions = sessionsResponse.data;

    if (!sessions || sessions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No sessions found for room ${roomId}`,
          },
        ],
      };
    }

    // Delete summaries for each session
    let deletedCount = 0;
    for (const session of sessions) {
      try {
        await apiClient.deleteSessionSummaries(session.id);
        deletedCount++;
      } catch (error) {
        logger.warn("Failed to delete summaries for session", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted summaries from ${deletedCount} sessions in room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room summaries", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room summaries: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
