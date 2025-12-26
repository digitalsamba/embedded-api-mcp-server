/**
 * Session Management Tools Module
 *
 * This module provides comprehensive session management tools for the Digital Samba MCP Server.
 * It implements session-related tools for managing room sessions, deleting session data,
 * and performing session operations.
 *
 * @module tools/session-management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
// import { z } from 'zod'; // Removed: unused
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import { getApiKeyFromRequest } from "../../auth.js";
import logger from "../../logger.js";
import { getToolAnnotations } from "../../tool-annotations.js";

/**
 * Register all session management tools
 *
 * @returns Array of MCP Tool definitions
 */
export function registerSessionTools(): Tool[] {
  return [
    {
      name: "get-all-room-sessions",
      description:
        '[Session Management] Get all sessions (past and live) for a specific room. Use when users say: "list sessions for room", "show room sessions", "get meeting history", "show past meetings", "list all sessions", "show live sessions". Requires roomId. Returns paginated session list with details.',
      annotations: getToolAnnotations("get-all-room-sessions"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID (required)",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 1000,
            description: "Number of results to return",
          },
          offset: {
            type: "number",
            minimum: 0,
            description: "Number of results to skip",
          },
          order: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort order",
          },
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          live: {
            type: "boolean",
            description: "Filter for live sessions only",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "hard-delete-session-resources",
      description:
        '[Session Management] Permanently delete ALL stored data for a session including recordings, chats, Q&A. Use when users say: "permanently delete session data", "remove all session resources", "hard delete session", "wipe session data", "delete everything from session". Requires sessionId. This action cannot be undone!',
      annotations: getToolAnnotations("hard-delete-session-resources"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "bulk-delete-session-data",
      description:
        '[Session Management] Delete specific types of session data (chat, Q&A, transcripts, etc). Use when users say: "delete session chat and transcripts", "remove multiple session data types", "bulk delete session content", "clean up session data". Requires sessionId and dataTypes array. More selective than hard-delete.',
      annotations: getToolAnnotations("bulk-delete-session-data"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
          dataTypes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "chat",
                "questions",
                "summaries",
                "transcripts",
                "polls",
                "recordings",
                "resources",
              ],
            },
            minItems: 1,
            description: "Types of data to delete",
          },
        },
        required: ["sessionId", "dataTypes"],
      },
    },
    {
      name: "get-session-summary",
      description:
        '[Session Management] Get a comprehensive summary of a session including participants, duration, and activities. Use when users say: "show session summary", "get meeting summary", "session details", "what happened in the session", "meeting report". Requires sessionId. Returns detailed session information.',
      annotations: getToolAnnotations("get-session-summary"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "end-session",
      description:
        '[Session Management] Force end a currently live/active session. Use when users say: "end the session", "stop the meeting", "close the session", "terminate the call", "end live session now". Requires sessionId. Only works on active sessions. Disconnects all participants.',
      annotations: getToolAnnotations("end-session"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "get-session-statistics",
      description:
        '[Session Management] Get detailed usage statistics and metrics for a session. Use when users say: "show session statistics", "get meeting metrics", "session analytics", "participant statistics", "session usage data". Requires sessionId. Returns participant count, duration, activity metrics.',
      annotations: getToolAnnotations("get-session-statistics"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
          metrics: {
            type: "string",
            description: "Specific metrics to retrieve (optional)",
          },
        },
        required: ["sessionId"],
      },
    },
    // Reader tools for session resources (hybrid approach for Claude Desktop compatibility)
    {
      name: "list-sessions",
      description:
        '[Session Management - TOOL] List all sessions across all rooms. Use when users say: "show all sessions", "list meetings", "session history", "all past meetings", "meeting directory". This TOOL provides the same data as the digitalsamba://sessions resource. Returns paginated list of session objects with room info, start/end times, and participant counts.',
      annotations: getToolAnnotations("list-sessions"),
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of sessions to return",
          },
          offset: {
            type: "number",
            description: "Number of sessions to skip for pagination",
          },
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
        },
      },
    },
    {
      name: "get-session-details",
      description:
        '[Session Management - TOOL] Get comprehensive details for a specific session. Use when users say: "session details", "meeting summary", "what happened in session", "session report", "session overview". Requires sessionId. This TOOL provides the same data as digitalsamba://sessions/{sessionId} resource. Returns detailed session data with duration, participants, and activity.',
      annotations: getToolAnnotations("get-session-details"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "list-session-participants",
      description:
        '[Session Management - TOOL] List all participants in a session. Use when users say: "who attended session", "session attendees", "participant list", "meeting participants", "session roster". Requires sessionId. This TOOL provides the same data as digitalsamba://sessions/{sessionId}/participants resource. Returns participant details with join/leave times and roles.',
      annotations: getToolAnnotations("list-session-participants"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "get-session-statistics-details",
      description:
        '[Session Management - TOOL] Get detailed usage statistics for a session. Use when users say: "session metrics details", "detailed session analytics", "comprehensive participant statistics", "full meeting usage data", "complete session performance". Requires sessionId. This TOOL provides the same data as digitalsamba://sessions/{sessionId}/statistics resource. Returns participant count, duration, activity metrics.',
      annotations: getToolAnnotations("get-session-statistics-details"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "list-room-sessions",
      description:
        '[Session Management - TOOL] List all sessions for a specific room. Use when users say: "room meeting history", "sessions in room", "room session list", "meetings for this room", "room activity history". Requires roomId. This TOOL provides the same data as digitalsamba://rooms/{roomId}/sessions resource. Returns chronological list of sessions in that room.',
      annotations: getToolAnnotations("list-room-sessions"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID (required)",
          },
          limit: {
            type: "number",
            description: "Maximum number of sessions to return",
          },
          offset: {
            type: "number",
            description: "Number of sessions to skip for pagination",
          },
        },
        required: ["roomId"],
      },
    },
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
  request: any,
): Promise<any> {
  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "No API key found. Please include an Authorization header with a Bearer token.",
        },
      ],
      isError: true,
    };
  }

  switch (toolName) {
    case "get-all-room-sessions": {
      logger.info("Getting all room sessions", {
        roomId: args.roomId,
        limit: args.limit,
        offset: args.offset,
      });

      try {
        const sessionParams = {
          limit: args.limit,
          offset: args.offset,
          order: args.order,
          date_start: args.dateStart,
          date_end: args.dateEnd,
          live: args.live,
        };

        const sessions = await apiClient.listRoomSessions(
          args.roomId,
          sessionParams,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessions: sessions.data,
                  total_count: sessions.total_count,
                  pagination: {
                    limit: args.limit || 50,
                    offset: args.offset || 0,
                    total: sessions.total_count,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting room sessions", {
          roomId: args.roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting room sessions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "hard-delete-session-resources": {
      logger.info("Hard deleting all session resources", {
        sessionId: args.sessionId,
      });

      try {
        await apiClient.deleteSessionData(args.sessionId, "resources");

        return {
          content: [
            {
              type: "text",
              text: `Successfully hard deleted all stored resource data for session ${args.sessionId}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error hard deleting session resources", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error hard deleting session resources: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "bulk-delete-session-data": {
      logger.info("Bulk deleting session data", {
        sessionId: args.sessionId,
        dataTypes: args.dataTypes,
      });

      try {
        const results = [];
        const errors = [];

        // Delete each data type
        for (const dataType of args.dataTypes) {
          try {
            await apiClient.deleteSessionData(args.sessionId, dataType);
            results.push(`✅ Successfully deleted ${dataType}`);
            logger.info(`Deleted session ${dataType}`, {
              sessionId: args.sessionId,
              dataType,
            });
          } catch (error) {
            const errorMsg = `❌ Failed to delete ${dataType}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            logger.error(`Failed to delete session ${dataType}`, {
              sessionId: args.sessionId,
              dataType,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const summary = {
          sessionId: args.sessionId,
          requested: args.dataTypes,
          results: results,
          errors: errors,
          success: errors.length === 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
          isError: errors.length > 0,
        };
      } catch (error) {
        logger.error("Error in bulk delete session data", {
          sessionId: args.sessionId,
          dataTypes: args.dataTypes,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error in bulk delete operation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-session-summary": {
      logger.info("Getting session summary", { sessionId: args.sessionId });

      try {
        const summary = await apiClient.getSessionSummary(args.sessionId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting session summary", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting session summary: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "end-session": {
      logger.info("Ending session", { sessionId: args.sessionId });

      try {
        await apiClient.endSession(args.sessionId);

        return {
          content: [
            {
              type: "text",
              text: `Successfully ended session ${args.sessionId}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error ending session", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error ending session: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-session-statistics": {
      logger.info("Getting session statistics", {
        sessionId: args.sessionId,
        metrics: args.metrics,
      });

      try {
        const statistics = await apiClient.getSessionStatistics(
          args.sessionId,
          args.metrics,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(statistics, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting session statistics", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting session statistics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Reader tools for resources (hybrid approach)
    case "list-sessions": {
      logger.info("Listing all sessions");

      try {
        const params = {
          limit: args.limit,
          offset: args.offset,
          date_start: args.dateStart,
          date_end: args.dateEnd,
        };

        const sessions = await apiClient.listSessions(params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sessions, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing sessions", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing sessions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-session-details": {
      logger.info("Getting session details", { sessionId: args.sessionId });

      try {
        const session = await apiClient.getSessionSummary(args.sessionId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting session details", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting session details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list-session-participants": {
      logger.info("Listing session participants", { sessionId: args.sessionId });

      try {
        const participants = await apiClient.listSessionParticipants(args.sessionId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(participants, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing session participants", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing session participants: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-session-statistics-details": {
      logger.info("Getting session statistics details", { sessionId: args.sessionId });

      try {
        const statistics = await apiClient.getSessionStatistics(args.sessionId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(statistics, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting session statistics", {
          sessionId: args.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting session statistics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list-room-sessions": {
      logger.info("Listing room sessions", { roomId: args.roomId });

      try {
        const params = {
          limit: args.limit,
          offset: args.offset,
        };

        const sessions = await apiClient.listRoomSessions(args.roomId, params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sessions, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing room sessions", {
          roomId: args.roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing room sessions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown session tool: ${toolName}`);
  }
}
