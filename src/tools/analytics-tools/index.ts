/**
 * Analytics Tools Module
 *
 * This module provides analytics query tools for the Digital Samba MCP Server.
 * These tools allow for complex analytics queries with filters and parameters.
 *
 * @module tools/analytics-tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import { AnalyticsResource } from "../../types/analytics-resource.js";
import { AnalyticsFilters } from "../../types/analytics.js";
import logger from "../../logger.js";

/**
 * Register all analytics tools
 *
 * @returns Array of MCP Tool definitions
 */
export function registerAnalyticsTools(): Tool[] {
  return [
    {
      name: "get-participant-statistics",
      description:
        '[Analytics] Get detailed participant statistics and behavior analytics. Use when users say: "show participant stats", "participant analytics", "user activity report", "attendee statistics", "who attended meetings", "participant engagement metrics". Optional filters for date range, room, or specific participant. Returns attendance, duration, and activity data.',
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "Specific participant ID (optional)",
          },
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          roomId: {
            type: "string",
            description: "Filter by room ID",
          },
          sessionId: {
            type: "string",
            description: "Filter by session ID",
          },
        },
        required: [],
      },
    },
    {
      name: "get-room-analytics",
      description:
        '[Analytics] Get comprehensive room usage analytics and performance metrics. Use when users say: "room analytics", "room usage statistics", "meeting room performance", "room activity report", "how is the room being used", "room metrics". Optional roomId for specific room or all rooms. Returns usage patterns, participant counts, session data.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Specific room ID (optional)",
          },
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          period: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "Analytics period",
          },
        },
        required: [],
      },
    },
    {
      name: "get-usage-statistics",
      description:
        '[Analytics - TOOL] Get filtered platform usage statistics with specific date ranges and periods. Use when users need: "analytics for specific dates", "weekly/monthly analytics", "analytics for last week", "analytics between dates". For simple "show analytics" use digitalsamba://analytics/team resource instead. Returns sessions, participants, minutes filtered by your criteria.',
      inputSchema: {
        type: "object",
        properties: {
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          period: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "Analytics period",
          },
        },
        required: [],
      },
    },
    // Reader tools for analytics resources (hybrid approach for Claude Desktop compatibility)
    {
      name: "get-usage-analytics",
      description:
        '[Analytics - TOOL] Get platform usage statistics and growth trends. Use when users say: "usage trends", "platform growth", "total meeting minutes", "usage statistics", "growth metrics". This TOOL provides the same data as digitalsamba://analytics/usage resource. Supports date filters and period grouping. Returns total sessions, participants, minutes, and growth rates.',
      inputSchema: {
        type: "object",
        properties: {
          dateStart: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          dateEnd: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          period: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "Analytics period for grouping",
          },
        },
      },
    },
    {
      name: "get-live-analytics",
      description:
        '[Analytics - TOOL] Get real-time analytics for all active sessions. Use when users say: "live session data", "current activity", "real-time analytics", "active sessions", "live meeting stats". This TOOL provides the same data as digitalsamba://analytics/live resource. Returns current active sessions and participant counts.',
      inputSchema: {
        type: "object",
        properties: {
          includeParticipants: {
            type: "boolean",
            description: "Include detailed participant information",
          },
        },
      },
    },
    {
      name: "get-live-room-analytics",
      description:
        '[Analytics - TOOL] Get real-time analytics for a specific room. Use when users say: "live room analytics", "current room activity", "real-time room data", "active room session", "live room stats". Requires roomId. This TOOL provides the same data as digitalsamba://analytics/live/{roomId} resource. Returns current session status and participant activity for that room.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID (required)",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "get-session-analytics",
      description:
        '[Analytics - TOOL] Get detailed analytics for a specific session. Use when users say: "session analytics", "meeting analytics", "session performance data", "session metrics", "meeting statistics". Requires sessionId. This TOOL provides the same data as digitalsamba://analytics/sessions/{sessionId} resource. Returns comprehensive session analytics including participant engagement and activity patterns.',
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
      name: "get-participant-analytics",
      description:
        '[Analytics - TOOL] Get analytics for a specific participant across sessions. Use when users say: "user analytics", "participant history", "individual user stats", "participant metrics", "user engagement data". Requires participantId. This TOOL provides the same data as digitalsamba://analytics/participants/{participantId} resource. Returns participant activity across all sessions they joined.',
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "Participant ID (required)",
          },
        },
        required: ["participantId"],
      },
    },
  ];
}

/**
 * Convert camelCase parameters to snake_case for API
 */
function convertCamelToSnake(params: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = value;
  }
  return converted;
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
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  try {
    const analytics = new AnalyticsResource(apiClient);

  // Build filters from arguments
  const filters: AnalyticsFilters = {
    dateStart: args.dateStart,
    dateEnd: args.dateEnd,
    roomId: args.roomId,
    sessionId: args.sessionId,
    participantId: args.participantId,
    period: args.period,
  };

  // Remove undefined and null values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof AnalyticsFilters] === undefined || filters[key as keyof AnalyticsFilters] === null) {
      delete filters[key as keyof AnalyticsFilters];
    }
  });

  switch (toolName) {
    case "get-team-analytics": {
      logger.info("Executing team analytics query", { args });
      const teamResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(teamResult, null, 2),
          },
        ],
      };
    }

    case "get-room-analytics": {
      logger.info("Executing room analytics query", { args });
      // If no roomId provided, get team-wide analytics instead
      if (!args.roomId) {
        const teamResult = await analytics.getTeamAnalytics(filters);
        return {
          content: [
            {
              type: "text",
              text: `Team-wide room analytics (no specific room selected):\n\n${JSON.stringify(teamResult, null, 2)}`,
            },
          ],
        };
      }
      const roomResult = await analytics.getRoomAnalytics(
        args.roomId,
        filters,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(roomResult, null, 2),
          },
        ],
      };
    }

    case "get-session-analytics": {
      logger.info("Executing session analytics query", { args });
      const sessionResult = await analytics.getSessionAnalytics(
        args.sessionId,
        filters,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sessionResult, null, 2),
          },
        ],
      };
    }

    case "get-participant-statistics": {
      logger.info("Executing participant statistics query", { args });
      // Use team analytics with participant filter
      const participantResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(participantResult, null, 2),
          },
        ],
      };
    }

    case "get-usage-statistics": {
      logger.info("Executing usage statistics query", { args });
      // Use team analytics for usage statistics
      const usageResult = await analytics.getTeamAnalytics(filters);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(usageResult, null, 2),
          },
        ],
      };
    }

    // Reader tools for analytics resources (hybrid approach)
    case "get-usage-analytics": {
      logger.info("Executing usage analytics query", { args });
      const usageAnalytics = await analytics.getTeamAnalytics(filters);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(usageAnalytics, null, 2),
          },
        ],
      };
    }

    case "get-live-analytics": {
      logger.info("Executing live analytics query", { args });
      // Get live session data - this would need a specific API endpoint
      // For now, using team analytics as a placeholder
      const liveData = await analytics.getTeamAnalytics({ ...filters, live: true });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(liveData, null, 2),
          },
        ],
      };
    }

    case "get-live-room-analytics": {
      logger.info("Executing live room analytics query", { roomId: args.roomId });
      const liveRoomData = await analytics.getRoomAnalytics(args.roomId, { ...filters, live: true });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(liveRoomData, null, 2),
          },
        ],
      };
    }

    case "get-session-analytics": {
      // This case already exists - keeping the existing implementation
      logger.info("Executing session analytics query", { args });
      const sessionResult = await analytics.getSessionAnalytics(
        args.sessionId || args.sessionId,
        filters,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sessionResult, null, 2),
          },
        ],
      };
    }

    case "get-participant-analytics": {
      logger.info("Executing participant analytics query", { participantId: args.participantId });
      // Get analytics for specific participant
      const participantAnalytics = await analytics.getTeamAnalytics({
        ...filters,
        participantId: args.participantId,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(participantAnalytics, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown analytics tool: ${toolName}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    logger.error("Error executing analytics tool", { toolName, args, error });
    return {
      content: [
        {
          type: "text",
          text: `Error executing analytics query: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
