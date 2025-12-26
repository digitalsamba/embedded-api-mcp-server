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
// import { z } from "zod"; // Removed: unused

// MCP SDK imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // TODO: Direct MCP server integration
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

// Local modules
// import { getApiKeyFromRequest } from '../../auth.js'; // Removed: unused
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";
import { normalizeBoolean } from "../../utils.js";
import { getToolAnnotations } from "../../tool-annotations.js";

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  annotations?: {
    audience?: string[];
    title?: string;
  };
}

// Removed Zod schema - using JSON Schema directly in tool definitions

/**
 * Register poll management tools with the MCP SDK
 *
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerPollTools(): ToolDefinition[] {
  return [
    {
      name: "create-poll",
      description:
        '[Poll Management] Create a new poll/survey in a room. Use when users say: "create a poll", "add a survey", "make a poll", "create voting question", "add multiple choice question". Requires room_id, question, and at least 2 options. Returns poll ID for tracking.',
      annotations: getToolAnnotations("create-poll"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to create the poll in",
          },
          question: {
            type: "string",
            description: "The poll question",
          },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The text of the poll option",
                },
                id: {
                  type: "string",
                  description: "Optional ID for the option",
                },
              },
              required: ["text"],
            },
            minItems: 2,
            description: "Array of poll options (minimum 2)",
          },
          type: {
            type: "string",
            enum: ["single", "multiple"],
            description: "Poll type: single choice or multiple choice",
          },
          anonymous: {
            type: "boolean",
            description: "Whether the poll is anonymous",
          },
          show_results: {
            type: "boolean",
            description: "Whether to show results to participants",
          },
        },
        required: ["room_id", "question", "options"],
      },
    },
    {
      name: "update-poll",
      description:
        '[Poll Management] Update an existing poll\'s question, options, or settings. Use when users say: "change poll question", "update poll", "edit poll options", "modify survey", "change poll settings". Requires room_id and poll_id. Can update question, options, type, or visibility settings.',
      annotations: getToolAnnotations("update-poll"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the poll",
          },
          poll_id: {
            type: "string",
            description: "The ID of the poll to update",
          },
          question: {
            type: "string",
            description: "Updated poll question",
          },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The text of the poll option",
                },
                id: {
                  type: "string",
                  description: "Optional ID for the option",
                },
              },
              required: ["text"],
            },
            description: "Updated poll options",
          },
          type: {
            type: "string",
            enum: ["single", "multiple"],
            description: "Updated poll type",
          },
          anonymous: {
            type: "boolean",
            description: "Updated anonymous setting",
          },
          show_results: {
            type: "boolean",
            description: "Updated show results setting",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
    {
      name: "delete-poll",
      description:
        '[Poll Management] Delete a specific poll from a room. Use when users say: "delete poll", "remove poll", "delete survey", "remove voting question", "cancel poll". Requires room_id and poll_id. This action cannot be undone.',
      annotations: getToolAnnotations("delete-poll"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the poll",
          },
          poll_id: {
            type: "string",
            description: "The ID of the poll to delete",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
    {
      name: "delete-session-polls",
      description:
        '[Poll Management] Delete ALL polls from a specific session. Use when users say: "delete all session polls", "remove all polls from session", "clear session polls", "delete all surveys from meeting". Requires session_id. Removes all poll data from that session.',
      annotations: getToolAnnotations("delete-session-polls"),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The ID of the session to delete polls from",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "delete-room-polls",
      description:
        '[Poll Management] Delete ALL polls from ALL sessions in a room. Use when users say: "delete all room polls", "remove all polls from room", "clear room poll history", "wipe all room surveys". Requires room_id. Affects all past and current session polls.',
      annotations: getToolAnnotations("delete-room-polls"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to delete polls from",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "publish-poll-results",
      description:
        '[Poll Management] Publish/share poll results with participants. Use when users say: "show poll results", "publish poll results", "share voting results", "display poll outcome", "reveal survey results". Requires room_id, poll_id, and session_id. Makes results visible to all participants.',
      annotations: getToolAnnotations("publish-poll-results"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the poll",
          },
          poll_id: {
            type: "string",
            description: "The ID of the poll to publish results for",
          },
          session_id: {
            type: "string",
            description: "The ID of the specific session (optional)",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
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
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  switch (toolName) {
    case "create-poll":
      return handleCreatePoll(params, apiClient);
    case "update-poll":
      return handleUpdatePoll(params, apiClient);
    case "delete-poll":
      return handleDeletePoll(params, apiClient);
    case "delete-session-polls":
      return handleDeleteSessionPolls(params, apiClient);
    case "delete-room-polls":
      return handleDeleteRoomPolls(params, apiClient);
    case "publish-poll-results":
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
    room_id: string;
    question: string;
    options: Array<{ text: string; id?: string }>;
    type?: "single" | "multiple";
    anonymous?: boolean;
    show_results?: boolean;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const {
    room_id,
    question,
    options,
    type = "single",
    anonymous = false,
    show_results = true,
  } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to create a poll.",
        },
      ],
      isError: true,
    };
  }

  if (!question || question.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Poll question is required.",
        },
      ],
      isError: true,
    };
  }

  if (!options || options.length < 2) {
    return {
      content: [
        {
          type: "text",
          text: "At least 2 poll options are required.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Creating poll", {
    roomId: room_id,
    question,
    optionCount: options.length,
  });

  try {
    // Normalize boolean values (Claude sometimes sends 0/1 instead of true/false)
    const normalizedAnonymous = normalizeBoolean(anonymous) ?? false;
    const normalizedShowResults = normalizeBoolean(show_results) ?? true;

    const pollData = {
      question,
      options,
      type,
      anonymous: normalizedAnonymous,
      show_results: normalizedShowResults,
    };

    const result = await apiClient.createPoll(room_id, pollData);

    return {
      content: [
        {
          type: "text",
          text: `Successfully created poll "${question}" with ${options.length} options in room ${room_id}. Poll ID: ${result.id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error creating poll", {
      roomId: room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating poll: ${errorMessage}`;

    if (
      errorMessage.includes("Room not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Room with ID ${room_id} not found`;
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
 * Handle update poll
 */
async function handleUpdatePoll(
  params: {
    room_id: string;
    poll_id: string;
    question?: string;
    options?: Array<{ text: string; id?: string }>;
    type?: "single" | "multiple";
    anonymous?: boolean;
    show_results?: boolean;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, poll_id, ...updateData } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to update a poll.",
        },
      ],
      isError: true,
    };
  }

  if (!poll_id || poll_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Poll ID is required to update a poll.",
        },
      ],
      isError: true,
    };
  }

  // Check if there's anything to update
  const hasUpdates = Object.keys(updateData).length > 0;
  if (!hasUpdates) {
    return {
      content: [
        {
          type: "text",
          text: "No updates provided for the poll.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Updating poll", { pollId: poll_id, updates: Object.keys(updateData) });

  try {
    // Transform and normalize update data for API
    const apiUpdateData: any = { ...updateData };

    // Normalize boolean values (Claude sometimes sends 0/1 instead of true/false)
    if ("anonymous" in apiUpdateData) {
      const normalized = normalizeBoolean(apiUpdateData.anonymous);
      if (normalized !== undefined) {
        apiUpdateData.anonymous = normalized;
      }
    }
    if ("show_results" in apiUpdateData) {
      const normalized = normalizeBoolean(apiUpdateData.show_results);
      if (normalized !== undefined) {
        apiUpdateData.show_results = normalized;
      }
    }

    await apiClient.updatePoll(room_id, poll_id, apiUpdateData);

    const updateSummary = Object.keys(updateData).join(", ");

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated poll ${poll_id}. Updated fields: ${updateSummary}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error updating poll", {
      pollId: poll_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating poll: ${errorMessage}`;

    if (
      errorMessage.includes("Poll not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Poll with ID ${poll_id} not found`;
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
 * Handle delete poll
 */
async function handleDeletePoll(
  params: { room_id: string; poll_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, poll_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete a poll.",
        },
      ],
      isError: true,
    };
  }

  if (!poll_id || poll_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Poll ID is required to delete a poll.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting poll", { roomId: room_id, pollId: poll_id });

  try {
    await apiClient.deletePoll(room_id, poll_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted poll ${poll_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting poll", {
      pollId: poll_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting poll: ${errorMessage}`;

    if (
      errorMessage.includes("Poll not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Poll with ID ${poll_id} not found`;
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
 * Handle delete session polls
 */
async function handleDeleteSessionPolls(
  params: { session_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete polls.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session polls", { sessionId: session_id });

  try {
    await apiClient.deleteSessionPolls(session_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all polls for session ${session_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session polls", {
      sessionId: session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session polls: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${session_id} not found`;
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
 * Handle delete room polls
 */
async function handleDeleteRoomPolls(
  params: { room_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete polls.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room polls", { roomId: room_id });

  try {
    // Get all sessions for the room
    const sessionsResponse = await apiClient.listSessions({ room_id: room_id });
    const sessions = sessionsResponse.data;

    if (!sessions || sessions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No sessions found for room ${room_id}`,
          },
        ],
      };
    }

    // Delete polls for each session
    let deletedCount = 0;
    for (const session of sessions) {
      try {
        await apiClient.deleteSessionPolls(session.id);
        deletedCount++;
      } catch (error) {
        logger.warn("Failed to delete polls for session", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted polls from ${deletedCount} sessions in room ${room_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room polls", {
      roomId: room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room polls: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle publish poll results
 */
async function handlePublishPollResults(
  params: { room_id: string; poll_id: string; session_id?: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, poll_id, session_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to publish results.",
        },
      ],
      isError: true,
    };
  }

  if (!poll_id || poll_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Poll ID is required to publish results.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Publishing poll results", { roomId: room_id, pollId: poll_id, sessionId: session_id });

  try {
    // The API method expects session_id as a required parameter
    // If not provided, we'll need to get the current session or return an error
    if (!session_id) {
      return {
        content: [
          {
            type: "text",
            text: "Session ID is required to publish poll results. Please provide the session ID.",
          },
        ],
        isError: true,
      };
    }

    await apiClient.publishPollResults(poll_id, session_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully published results for poll ${poll_id} in room ${room_id} (session ${session_id})`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error publishing poll results", {
      roomId: room_id,
      pollId: poll_id,
      sessionId: session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error publishing poll results: ${errorMessage}`;

    if (
      errorMessage.includes("Poll not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Poll with ID ${poll_id} not found`;
    } else if (errorMessage.includes("Session not found")) {
      displayMessage = `Session with ID ${session_id} not found`;
    } else if (errorMessage.includes("Room not found")) {
      displayMessage = `Room with ID ${room_id} not found`;
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
