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
import { getToolAnnotations } from "../../tool-annotations.js";
import { normalizeBoolean } from "../../utils.js";

/**
 * The billing-period switch shared by the team and room statistics tools. The
 * current-period endpoints return the same body as the date-range ones, with
 * the team's subscription start and end as the range.
 */
const CURRENT_PERIOD_PROPERTY = {
  type: "boolean",
  description:
    "Report the team's current billing period (subscription start to end) instead of a date range. Cannot be combined with dateStart, dateEnd or period; the API ignores dates for this.",
} as const;

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
        '[Analytics] Get participant statistics. Use when users say: "show participant stats", "participant analytics", "user activity report", "attendee statistics", "who attended meetings", "participant engagement metrics". With participantId: that participant\'s statistics across sessions. Without it: the list of participants, optionally narrowed to one room (roomId) or session (sessionId). Date filters are not supported by these endpoints; for date-range totals use get-usage-statistics.',
      annotations: getToolAnnotations(
        "get-participant-statistics",
        "Get Participant Statistics",
      ),
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
      annotations: getToolAnnotations(
        "get-room-analytics",
        "Get Room Analytics",
      ),
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
            description:
              "Shorthand for a date range ending today (day = last 24h, week = last 7 days, month, year). Translated by this server into dateStart/dateEnd, which the API takes instead; ignored if you supply either date yourself.",
          },
          currentPeriod: CURRENT_PERIOD_PROPERTY,
        },
        required: [],
      },
    },
    {
      name: "get-usage-statistics",
      description:
        '[Analytics - TOOL] Get filtered platform usage statistics with specific date ranges and periods. Use when users need: "analytics for specific dates", "weekly/monthly analytics", "analytics for last week", "analytics between dates". For simple "show analytics" use digitalsamba://analytics/team resource instead. Returns sessions, participants, minutes filtered by your criteria.',
      annotations: getToolAnnotations(
        "get-usage-statistics",
        "Get Usage Statistics",
      ),
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
            description:
              "Shorthand for a date range ending today (day = last 24h, week = last 7 days, month, year). Translated by this server into dateStart/dateEnd, which the API takes instead; ignored if you supply either date yourself.",
          },
          currentPeriod: CURRENT_PERIOD_PROPERTY,
        },
        required: [],
      },
    },
    // Reader tools for analytics resources (hybrid approach for Claude Desktop compatibility)
    {
      name: "get-usage-analytics",
      description:
        '[Analytics - TOOL] Get platform usage statistics and growth trends. Use when users say: "usage trends", "platform growth", "total meeting minutes", "usage statistics", "growth metrics". This TOOL provides the same data as digitalsamba://analytics/usage resource. Supports date filters and period grouping. Returns total sessions, participants, minutes, and growth rates.',
      annotations: getToolAnnotations(
        "get-usage-analytics",
        "Get Usage Analytics",
      ),
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
            description:
              "Shorthand for a date range ending today (day = last 24h, week = last 7 days, month, year). Translated by this server into dateStart/dateEnd, which the API takes instead; ignored if you supply either date yourself.",
          },
          currentPeriod: CURRENT_PERIOD_PROPERTY,
        },
      },
    },
    {
      name: "get-live-analytics",
      description:
        '[Analytics - TOOL] Get real-time analytics for all active sessions. Use when users say: "live session data", "current activity", "real-time analytics", "active sessions", "live meeting stats". This TOOL provides the same data as digitalsamba://analytics/live resource. Returns current active sessions and participant counts.',
      annotations: getToolAnnotations(
        "get-live-analytics",
        "Get Live Analytics",
      ),
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
      annotations: getToolAnnotations(
        "get-live-room-analytics",
        "Get Live Room Analytics",
      ),
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
      annotations: getToolAnnotations(
        "get-session-analytics",
        "Get Session Analytics",
      ),
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
      annotations: getToolAnnotations(
        "get-participant-analytics",
        "Get Participant Analytics",
      ),
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
    {
      name: "get-plan-usage",
      description:
        '[Analytics - TOOL] Get the participation minutes used in the current billing period against the plan\'s included minutes. Use when users say: "how many minutes have we used", "are we near our limit", "plan usage", "minutes left this month", "usage vs quota". Returns minutes used, the plan limit, the percentage used and the billing period dates. Limit and percentage are null on a plan with no minutes limit. This is the figure the usage alert emails are based on.',
      annotations: getToolAnnotations("get-plan-usage", "Get Plan Usage"),
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get-current-period-statistics",
      description:
        '[Analytics - TOOL] Get a snapshot of the current billing period: live sessions, live participants and active recorders right now, plus the period\'s participation, recorded, transcription and stored recording minutes, summaries and concurrency peaks. Use when users say: "how are we doing this billing period", "current period stats", "what is happening right now and this month". For the full metric set over the billing period use get-usage-statistics with currentPeriod.',
      annotations: getToolAnnotations(
        "get-current-period-statistics",
        "Get Current Period Statistics",
      ),
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get-usage-by-tag",
      description:
        '[Analytics - TOOL] Get usage totals per room tag: rooms that held a session, participants, and participation, recorded, transcription and E2EE minutes. Use when users say: "usage per client", "usage by tag", "bill each customer", "multi-tenant usage report". Every tag of the team is listed, with zeroes when unused. Untagged rooms report under "common", and a room with several tags counts in full under each, so the tags can add up to more than the team total. Without dates it covers all time.',
      annotations: getToolAnnotations("get-usage-by-tag", "Get Usage by Tag"),
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
            description:
              "Shorthand for a date range ending today (day = last 24h, week = last 7 days, month, year). Ignored if you supply either date yourself.",
          },
        },
      },
    },
    {
      name: "list-started-sessions",
      description:
        '[Analytics - TOOL] Count how many sessions each browser started (was the first to join), most first. Use when users say: "who starts the most meetings", "returning hosts", "how many sessions did each device start". Browsers are identified by browser_id, an anonymous per-browser UUID, not a user or participant ID. Paginated: returns total_count (distinct browsers) and data.',
      annotations: getToolAnnotations(
        "list-started-sessions",
        "List Started Sessions",
      ),
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
          limit: {
            type: "number",
            description: "Browsers to return (1-100, default 100)",
          },
          offset: {
            type: "number",
            description: "Number of browsers to skip, for pagination",
          },
          order: {
            type: "string",
            enum: ["asc", "desc"],
            description:
              "Sort by sessions started: desc (most first, default) or asc",
          },
        },
      },
    },
  ];
}

/**
 * Translate the `period` shorthand into the date range the API actually accepts.
 *
 * The statistics endpoints take `date_start` and `date_end` only — there is no
 * `period` parameter on any of them, so sending one had no effect and callers
 * asking for "last week" silently received all-time figures. Deriving an
 * explicit range here makes the parameter mean what the tools advertise.
 *
 * Returns undefined for an unknown period, so an unrecognised value falls back
 * to the unbounded query rather than inventing a range.
 */
function periodToDateRange(
  period?: string,
): { date_start: string; date_end: string } | undefined {
  if (!period) return undefined;

  const end = new Date();
  const start = new Date(end);

  switch (period) {
    case "day":
      start.setUTCDate(start.getUTCDate() - 1);
      break;
    case "week":
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "month":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "year":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    default:
      return undefined;
  }

  const asDate = (d: Date) => d.toISOString().slice(0, 10);
  return { date_start: asDate(start), date_end: asDate(end) };
}

/** An error result naming arguments the endpoint behind a tool cannot honour. */
function unsupported(
  toolName: string,
  args: any,
  names: string[],
  hint: string,
) {
  const given = names.filter((n) => args[n] !== undefined && args[n] !== null);
  if (given.length === 0) return null;
  return {
    content: [
      {
        type: "text",
        text: `${toolName}: ${given.join(", ")} ${given.length === 1 ? "is" : "are"} not supported here. ${hint}`,
      },
    ],
    isError: true,
  };
}

function asText(result: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

/**
 * Whether the caller asked for the current billing period. Returns an error
 * result instead when dates were sent with it: the current-period endpoints
 * ignore them, so honouring both would silently drop the caller's range.
 */
function currentPeriodRequested(toolName: string, args: any) {
  if (normalizeBoolean(args.currentPeriod) !== true) {
    return { current: false as const };
  }
  const rejected = unsupported(
    toolName,
    args,
    ["dateStart", "dateEnd", "period"],
    "currentPeriod reports the billing period; drop it to use a date range.",
  );
  return rejected ? { rejected } : { current: true as const };
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

    // An explicit range always wins; `period` only fills in when neither bound
    // was given. `period` itself is never forwarded — the API has no such
    // parameter and ignores it.
    const derivedRange =
      args.dateStart || args.dateEnd
        ? undefined
        : periodToDateRange(args.period);

    // Build filters from arguments and convert to snake_case
    const filters: AnalyticsFilters = {
      date_start: args.dateStart ?? derivedRange?.date_start,
      date_end: args.dateEnd ?? derivedRange?.date_end,
      room_id: args.roomId,
      session_id: args.sessionId,
      participant_id: args.participantId,
    };

    // Remove undefined and null values
    Object.keys(filters).forEach((key) => {
      if (
        filters[key as keyof AnalyticsFilters] === undefined ||
        filters[key as keyof AnalyticsFilters] === null
      ) {
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
        const period = currentPeriodRequested(toolName, args);
        if (period.rejected) return period.rejected;
        if (period.current) {
          // GET /rooms/{room}/statistics/current, or the team's
          // GET /statistics/team/current when no room is given.
          if (!args.roomId) {
            return asText(await apiClient.getTeamCurrentStatistics());
          }
          return asText(await apiClient.getRoomCurrentStatistics(args.roomId));
        }
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
        // Session statistics are addressed by the session ID alone; the
        // date/room/participant filters do not apply to this endpoint.
        const sessionResult = await analytics.getSessionAnalytics(
          args.sessionId,
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
        // This used to call GET /statistics with the filters as query
        // parameters. That endpoint reads only date_start/date_end, so every
        // call returned the whole team's totals as if they were the answer.
        if (args.participantId) {
          const rejected = unsupported(
            toolName,
            args,
            ["dateStart", "dateEnd", "roomId", "sessionId"],
            "Participant statistics cover all of that participant's sessions; call without those filters.",
          );
          if (rejected) return rejected;
          return asText(
            await apiClient.getParticipantStatistics(args.participantId),
          );
        }
        const rejected = unsupported(
          toolName,
          args,
          ["dateStart", "dateEnd"],
          "The participant list cannot be filtered by date; use get-usage-statistics for date-range totals.",
        );
        if (rejected) return rejected;
        return asText(
          await apiClient.listParticipants({
            room_id: args.roomId,
            session_id: args.sessionId,
          }),
        );
      }

      case "get-usage-statistics": {
        logger.info("Executing usage statistics query", { args });
        const period = currentPeriodRequested(toolName, args);
        if (period.rejected) return period.rejected;
        if (period.current) {
          return asText(await apiClient.getTeamCurrentStatistics());
        }
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
        const period = currentPeriodRequested(toolName, args);
        if (period.rejected) return period.rejected;
        if (period.current) {
          return asText(await apiClient.getTeamCurrentStatistics());
        }
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
        // Rooms with people in them right now (GET /rooms/live, or
        // /rooms/live/participants), as the digitalsamba://analytics/live
        // resource returns. This used to return the team's historical totals.
        return asText(
          await analytics.getLiveAnalytics(
            undefined,
            args.includeParticipants === true,
          ),
        );
      }

      case "get-live-room-analytics": {
        logger.info("Executing live room analytics query", {
          roomId: args.roomId,
        });
        // GET /rooms/{room}/live, as the digitalsamba://analytics/live/{roomId}
        // resource returns. This used to return the room's historical
        // statistics with an ignored live=true.
        return asText(await analytics.getLiveAnalytics(args.roomId, false));
      }

      case "get-participant-analytics": {
        logger.info("Executing participant analytics query", {
          participantId: args.participantId,
        });
        // GET /participants/{id}, as the
        // digitalsamba://analytics/participants/{participantId} resource
        // returns. This used to return the team's totals.
        return asText(
          await analytics.getParticipantAnalytics(args.participantId),
        );
      }

      case "get-plan-usage": {
        return asText(await apiClient.getCurrentUsage());
      }

      case "get-current-period-statistics": {
        // GET /statistics/current: live counts plus billing-period totals.
        return asText(await apiClient.getSimplifiedTeamCurrentStatistics());
      }

      case "get-usage-by-tag": {
        return asText(
          await apiClient.getTeamStatisticsByTags({
            date_start: filters.date_start,
            date_end: filters.date_end,
          }),
        );
      }

      case "list-started-sessions": {
        const limit = args.limit === undefined ? undefined : Number(args.limit);
        if (
          limit !== undefined &&
          (!Number.isInteger(limit) || limit < 1 || limit > 100)
        ) {
          return {
            content: [
              {
                type: "text",
                text: `${toolName}: limit must be a whole number from 1 to 100 (got ${args.limit}).`,
              },
            ],
            isError: true,
          };
        }
        const offset =
          args.offset === undefined ? undefined : Number(args.offset);
        if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
          return {
            content: [
              {
                type: "text",
                text: `${toolName}: offset must be a whole number of 0 or more (got ${args.offset}).`,
              },
            ],
            isError: true,
          };
        }
        const order =
          typeof args.order === "string" ? args.order.toLowerCase() : undefined;
        if (order !== undefined && order !== "asc" && order !== "desc") {
          return {
            content: [
              {
                type: "text",
                text: `${toolName}: order must be "asc" or "desc" (got ${args.order}).`,
              },
            ],
            isError: true,
          };
        }
        return asText(
          await apiClient.getStartedSessionsByParticipant({
            date_start: args.dateStart,
            date_end: args.dateEnd,
            limit,
            offset,
            order: order as "asc" | "desc" | undefined,
          }),
        );
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
