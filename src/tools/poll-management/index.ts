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
 * - delete-room-polls: Delete all polls in a room (room-level endpoint)
 * - publish-poll-results: unsupported; the API has no publish-results endpoint,
 *   so this reports failure rather than silently doing nothing
 * - list-polls: List a room's polls
 * - get-poll: Get one poll with its options
 * - get-poll-results: Get a poll's results, one entry per ended run
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
import type { PollCreateSettings } from "../../types/communication.js";
import logger from "../../logger.js";
import { normalizeBoolean } from "../../utils.js";
import { getToolAnnotations } from "../../tool-annotations.js";
import { countOf, verifiedWrite } from "../verified-write.js";

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
      annotations: getToolAnnotations("create-poll", "Create Poll"),
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
                correct: {
                  type: "boolean",
                  description:
                    "Mark this option as a correct answer. A single-choice poll keeps only the first one marked; on update, options sent without correct keep their current mark. Ignored for type free.",
                },
              },
              required: ["text"],
            },
            description:
              "Array of poll options (minimum 2; not used for type free)",
          },
          type: {
            type: "string",
            enum: ["single", "multiple", "free"],
            description:
              "Poll type: single choice, multiple choice, or free (free-text answers; options are not used)",
          },
          anonymous: {
            type: "boolean",
            description: "Whether the poll is anonymous",
          },
          show_results: {
            type: "boolean",
            description:
              "Has no effect: Digital Samba polls have no such setting, so it is not sent. Kept for compatibility.",
          },
        },
        required: ["room_id", "question"],
      },
    },
    {
      name: "update-poll",
      description:
        '[Poll Management] Update an existing poll\'s question, options, or settings. Use when users say: "change poll question", "update poll", "edit poll options", "modify survey", "change poll settings". Requires room_id and poll_id. Can update question, options, type, or visibility settings.',
      annotations: getToolAnnotations("update-poll", "Update Poll"),
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
                correct: {
                  type: "boolean",
                  description:
                    "Mark this option as a correct answer. A single-choice poll keeps only the first one marked; on update, options sent without correct keep their current mark. Ignored for type free.",
                },
              },
              required: ["text"],
            },
            description: "Updated poll options",
          },
          type: {
            type: "string",
            enum: ["single", "multiple", "free"],
            description: "Updated poll type",
          },
          anonymous: {
            type: "boolean",
            description: "Updated anonymous setting",
          },
          show_results: {
            type: "boolean",
            description:
              "Has no effect: Digital Samba polls have no such setting, so it is not sent. Kept for compatibility.",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
    {
      name: "delete-poll",
      description:
        '[Poll Management] Delete a specific poll from a room. Use when users say: "delete poll", "remove poll", "delete survey", "remove voting question", "cancel poll". Requires room_id and poll_id. This action cannot be undone.',
      annotations: getToolAnnotations("delete-poll", "Delete Poll"),
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
      annotations: getToolAnnotations(
        "delete-session-polls",
        "Delete Session Polls",
      ),
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
        '[Poll Management] Delete ALL polls in a room, including polls created through the API or dashboard and those from past sessions. Use when users say: "delete all room polls", "remove all polls from room", "clear room poll history", "wipe all room surveys". Requires room_id. Cannot be undone.',
      annotations: getToolAnnotations("delete-room-polls", "Delete Room Polls"),
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
        "[Poll Management] NOT SUPPORTED — the Digital Samba API has no publish-results endpoint, so this tool always reports failure and changes nothing. Retained so that callers get an explicit error rather than a silent no-op. To read poll results, use export-poll-results.",
      annotations: getToolAnnotations(
        "publish-poll-results",
        "Publish Poll Results",
      ),
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
            description:
              "The ID of the session. Unused — there is no endpoint to send it to.",
          },
        },
        required: ["room_id", "poll_id", "session_id"],
      },
    },
    {
      name: "list-polls",
      description:
        '[Poll Management - TOOL] List all polls in a room. Use when users say: "list polls", "show polls", "what polls exist", "get room polls", "show surveys". Requires room_id. Returns each poll with its ID, question, type and options.',
      annotations: getToolAnnotations("list-polls", "List Polls"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to list polls for",
          },
          limit: {
            type: "number",
            description: "Maximum number of polls to return",
          },
          offset: {
            type: "number",
            description: "Number of polls to skip for pagination",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "get-poll",
      description:
        '[Poll Management] Get one poll: its question, type, anonymity, status and options (with which are marked correct). Use when users say: "show poll", "get poll details", "what are the options of this poll". Requires room_id and poll_id.',
      annotations: getToolAnnotations("get-poll", "Get Poll"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the poll",
          },
          poll_id: {
            type: "string",
            description: "The ID of the poll",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
    {
      name: "get-poll-results",
      description:
        '[Poll Management] Get the results of a poll as structured data: one entry per time the poll was run and ended, with total voters, votes per option and (unless the poll is anonymous) who voted for what. Use when users say: "poll results", "how did people vote", "who voted for", "show poll votes". Requires room_id and poll_id; optionally session_id. A poll that has never been run and ended has no results. For a file export of all polls in a room, use export-poll-results.',
      annotations: getToolAnnotations("get-poll-results", "Get Poll Results"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the poll",
          },
          poll_id: {
            type: "string",
            description: "The ID of the poll",
          },
          session_id: {
            type: "string",
            description: "Only return results from this session",
          },
        },
        required: ["room_id", "poll_id"],
      },
    },
    {
      name: "get-poll-import-template",
      description:
        '[Poll Management] Download the CSV template for bulk poll import. Use when users say: "get poll import template", "poll CSV template", "how do I bulk import polls". Requires room_id. Returns the CSV template content.',
      annotations: getToolAnnotations(
        "get-poll-import-template",
        "Get Poll Import Template",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "import-polls",
      description:
        '[Poll Management] Import polls into a room from CSV content. Use when users say: "import polls", "bulk create polls from CSV", "upload polls". Requires room_id and csv_content (CSV text matching the import template; max 2MB).',
      annotations: getToolAnnotations("import-polls", "Import Polls"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to import polls into",
          },
          csv_content: {
            type: "string",
            description:
              "CSV content matching the poll import template (get-poll-import-template)",
          },
        },
        required: ["room_id", "csv_content"],
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
      return handlePublishPollResults(params);
    case "list-polls":
      return handleListPolls(params, apiClient);
    case "get-poll":
      return handleGetPoll(params, apiClient);
    case "get-poll-results":
      return handleGetPollResults(params, apiClient);
    case "get-poll-import-template":
      return handleGetPollImportTemplate(params, apiClient);
    case "import-polls":
      return handleImportPolls(params, apiClient);
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
    options: Array<{ text: string; id?: string; correct?: boolean }>;
    type?: "single" | "multiple" | "free";
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

  if (type !== "free" && (!options || options.length < 2)) {
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
    optionCount: options?.length ?? 0,
  });

  try {
    // Normalize boolean values (Claude sometimes sends 0/1 instead of true/false)
    const normalizedAnonymous = normalizeBoolean(anonymous) ?? false;

    // show_results is not an API field (Polls/CreateUpdateRequest has no such
    // rule): it was sent and silently dropped. It is accepted and ignored.
    const pollData: PollCreateSettings = {
      question,
      type,
      anonymous: normalizedAnonymous,
    };
    if (type !== "free") pollData.options = options;

    const result = await apiClient.createPoll(room_id, pollData);

    return {
      content: [
        {
          type: "text",
          text:
            (type === "free"
              ? `Successfully created free-text poll "${question}" in room ${room_id}. Poll ID: ${result.id}`
              : `Successfully created poll "${question}" with ${options.length} options in room ${room_id}. Poll ID: ${result.id}`) +
            ("show_results" in params
              ? "\nNote: show_results has no effect (Digital Samba polls have no such setting) and was not sent."
              : ""),
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
    options?: Array<{ text: string; id?: string; correct?: boolean }>;
    type?: "single" | "multiple" | "free";
    anonymous?: boolean;
    show_results?: boolean;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  // show_results is not an API field; it is accepted for compatibility but
  // never sent, and never reported as updated.
  const { room_id, poll_id, show_results, ...updateData } = params;
  const ignoredShowResults = show_results !== undefined;

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
          text: ignoredShowResults
            ? "Nothing to update: show_results has no effect (Digital Samba polls have no such setting)."
            : "No updates provided for the poll.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Updating poll", {
    pollId: poll_id,
    updates: Object.keys(updateData),
  });

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

    await apiClient.updatePoll(room_id, poll_id, apiUpdateData);

    const updateSummary = Object.keys(updateData).join(", ");

    return {
      content: [
        {
          type: "text",
          text:
            `Successfully updated poll ${poll_id}. Updated fields: ${updateSummary}` +
            (ignoredShowResults
              ? "\nNote: show_results has no effect (Digital Samba polls have no such setting) and was not sent."
              : ""),
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
    // One room-level call. This used to list the room's sessions and delete
    // per session, which (a) never touched polls created through the API or
    // dashboard, because the session endpoint only removes polls created by
    // that session's participants, (b) stopped at the first 100 sessions, and
    // (c) answered "No sessions found" for a room that had polls but had
    // never been used.
    await apiClient.deleteRoomPolls(room_id);

    // Read back: a 204 is not evidence that the polls are gone.
    let remaining: number | undefined;
    try {
      const response = await apiClient.getPolls(room_id, { limit: 1 });
      remaining = Array.isArray(response)
        ? response.length
        : ((response as any)?.total_count ??
          ((response as any)?.data ?? []).length);
    } catch (error) {
      logger.warn("Could not verify room poll deletion", {
        roomId: room_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (remaining !== undefined && remaining > 0) {
      return {
        content: [
          {
            type: "text",
            text: `The API accepted the delete for room ${room_id}, but ${remaining} poll(s) are still listed. Nothing should be assumed deleted; check with list-polls.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            remaining === 0
              ? `Deleted all polls in room ${room_id} (verified: the room now lists no polls).`
              : `Delete of all polls in room ${room_id} was accepted by the API, but the result could not be verified. Check with list-polls.`,
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
async function handlePublishPollResults(params: {
  room_id: string;
  poll_id: string;
  session_id?: string;
}): Promise<any> {
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

  // There is no publish-results endpoint. The client posts to
  // /sessions/{session}/polls/{poll}/publish-results, which is not routed by the
  // API at all — confirmed against the backend source, where neither routes/ nor
  // any controller defines a `publish` action. The call can only ever 404, and
  // the previous "Session ID is required" refusal was this server's own guard,
  // never the API's, so the tool never reached the point of finding that out.
  logger.info("Refusing publish-poll-results: no such API endpoint", {
    roomId: room_id,
    pollId: poll_id,
    sessionId: session_id,
  });

  return {
    content: [
      {
        type: "text",
        text:
          `Publishing poll results is not supported: the Digital Samba API has no ` +
          `publish-results endpoint. Poll ${poll_id} in room ${room_id} was not ` +
          `changed and participants were not shown anything. Results can still be ` +
          `read with export-poll-results.`,
      },
    ],
    isError: true,
  };
}

/**
 * Handle get poll import template
 */
async function handleGetPollImportTemplate(
  params: { room_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  logger.info("Getting poll import template", { room_id });

  try {
    const template = await apiClient.getPollImportTemplate(room_id);
    return {
      content: [{ type: "text", text: template }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error getting poll import template", {
      room_id,
      error: message,
    });
    return {
      content: [{ type: "text", text: `Error getting template: ${message}` }],
      isError: true,
    };
  }
}

/**
 * Handle list polls
 *
 * Added because there was no way to list a room's polls: the API exposes
 * GET /rooms/{id}/polls and the client has getPolls, but no tool surfaced it,
 * so callers had to pull the entire room object and read its polls array.
 */
async function handleListPolls(
  params: { room_id: string; limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, limit, offset } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  logger.info("Listing polls", { room_id });

  try {
    const response = await apiClient.getPolls(room_id, {
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    });
    const polls = Array.isArray(response)
      ? response
      : ((response as any)?.data ?? []);

    if (polls.length === 0) {
      return {
        content: [{ type: "text", text: `No polls found in room ${room_id}.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Found ${polls.length} poll(s) in room ${room_id}:\n\n` +
            JSON.stringify(polls, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error listing polls", { room_id, error: message });
    return {
      content: [{ type: "text", text: `Error listing polls: ${message}` }],
      isError: true,
    };
  }
}

/**
 * Handle get poll
 */
async function handleGetPoll(
  params: { room_id: string; poll_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, poll_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }
  if (!poll_id || poll_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Poll ID is required." }],
      isError: true,
    };
  }

  logger.info("Getting poll", { room_id, poll_id });

  try {
    const poll = await apiClient.getPoll(room_id, poll_id);
    return {
      content: [{ type: "text", text: JSON.stringify(poll, null, 2) }],
    };
  } catch (error) {
    return pollReadError(error, "getting poll", room_id, poll_id);
  }
}

/**
 * Handle get poll results
 *
 * GET /rooms/{room}/polls/{poll}/results returns one entry per ended run of
 * the poll (PollResultCollection). Free-text polls list each distinct answer
 * as an option with no id; options carry voters only when someone voted
 * for them and the poll is not anonymous.
 */
async function handleGetPollResults(
  params: { room_id: string; poll_id: string; session_id?: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, poll_id, session_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }
  if (!poll_id || poll_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Poll ID is required." }],
      isError: true,
    };
  }

  logger.info("Getting poll results", { room_id, poll_id, session_id });

  try {
    const response = await apiClient.getPollResults(
      room_id,
      poll_id,
      session_id || undefined,
    );
    const runs = Array.isArray(response)
      ? response
      : ((response as any)?.data ?? []);

    if (runs.length === 0) {
      return {
        content: [
          {
            type: "text",
            text:
              `Poll ${poll_id} has no results` +
              (session_id ? ` in session ${session_id}` : "") +
              ". Results exist only once the poll has been run and ended in a live session.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Poll ${poll_id} has results from ${runs.length} run(s):\n\n` +
            JSON.stringify(runs, null, 2),
        },
      ],
    };
  } catch (error) {
    return pollReadError(error, "getting poll results", room_id, poll_id);
  }
}

/**
 * Error result for a poll read. Only a 404 means the poll (or room) is
 * missing; anything else is reported as the failure it was.
 */
function pollReadError(
  error: unknown,
  label: string,
  roomId: string,
  pollId: string,
): any {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Error ${label}`, { roomId, pollId, error: message });
  const notFound = (error as { statusCode?: number })?.statusCode === 404;
  return {
    content: [
      {
        type: "text",
        text: notFound
          ? `Poll ${pollId} not found in room ${roomId}.`
          : `Error ${label}: ${message}`,
      },
    ],
    isError: true,
  };
}

/**
 * Handle import polls from CSV
 */
async function handleImportPolls(
  params: { room_id: string; csv_content: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, csv_content } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!csv_content || csv_content.trim() === "") {
    return {
      content: [{ type: "text", text: "CSV content is required." }],
      isError: true,
    };
  }

  logger.info("Importing polls from CSV", { room_id });

  // Count first: the import endpoint returns 2xx with an empty body whether or
  // not it created anything, so the delta is the only proof it did.
  const before = await countPolls(room_id, apiClient);

  return verifiedWrite({
    describe: `polls into room ${room_id}`,
    verb: "Imported",
    errorLabel: "importing polls",
    action: () => apiClient.importPolls(room_id, csv_content),
    verify: async () => {
      const after = await countPolls(room_id, apiClient);
      if (before === undefined || after === undefined) {
        throw new Error("could not list the room's polls");
      }
      const created = after - before;
      return {
        landed: created > 0,
        evidence:
          created > 0
            ? `room now has ${after} poll(s), up from ${before}`
            : `room still has ${after} poll(s); no poll was created`,
      };
    },
  });
}

/**
 * Count the polls in a room, or undefined if they cannot be listed.
 */
async function countPolls(
  roomId: string,
  apiClient: DigitalSambaApiClient,
): Promise<number | undefined> {
  try {
    return countOf(await apiClient.getPolls(roomId));
  } catch (error) {
    logger.warn("Could not count polls for import verification", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
