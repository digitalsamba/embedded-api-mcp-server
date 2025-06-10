/**
 * Analytics Resources Module
 *
 * This module provides read-only analytics resources for the Digital Samba MCP Server.
 * It implements comprehensive analytics resources for collecting participant, room,
 * session, and team statistics.
 *
 * @module resources/analytics
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import { AnalyticsResource } from "../../types/analytics-resource.js";
import logger from "../../logger.js";

/**
 * Register all analytics resources
 *
 * @param apiClient - The Digital Samba API client instance
 * @returns Array of MCP Resource definitions
 */
export function registerAnalyticsResources(
  apiClient: DigitalSambaApiClient,
): Resource[] {
  // Analytics resource instance - currently not used directly but needed for future expansion
  const _analytics = new AnalyticsResource(apiClient);
  void _analytics;

  return [
    {
      uri: "digitalsamba://analytics/participants",
      name: "analytics-participants",
      description:
        '[Analytics Data] Get participant behavior and engagement analytics. Use to access: "participant stats", "user analytics", "attendee behavior", "participant engagement", "user activity patterns". Supports filters for date range and specific participants. Returns attendance, participation time, and activity metrics.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/usage",
      name: "analytics-usage",
      description:
        '[Analytics Data] Get platform usage statistics and growth trends. Use to access: "usage trends", "platform growth", "total meeting minutes", "usage statistics", "growth metrics". Supports date filters and period grouping. Returns total sessions, participants, minutes, and growth rates.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/rooms",
      name: "analytics-rooms",
      description:
        '[Analytics Data] Get room-specific analytics and usage patterns. Use to access: "room performance", "room usage analytics", "room activity metrics", "meeting room stats", "room utilization". Requires roomId parameter. Returns usage patterns, participant counts, session frequency.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/team",
      name: "analytics-team",
      description:
        '[Analytics Data - RESOURCE] Get current team-wide statistics and organizational metrics. Use when users say: "show analytics", "show team analytics", "display analytics", "view analytics", "current analytics", "analytics overview". For date-filtered analytics use get-usage-statistics tool. Returns current team activity, usage patterns, and key metrics.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/live",
      name: "analytics-live",
      description:
        '[Analytics Data] Get real-time analytics for all active sessions. Use to access: "live session data", "current activity", "real-time analytics", "active sessions", "live meeting stats". Supports includeParticipants parameter. Returns current active sessions and participant counts.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/live/{roomId}",
      name: "analytics-live-room",
      description:
        '[Analytics Data] Get real-time analytics for a specific room. Use to access: "live room analytics", "current room activity", "real-time room data", "active room session", "live room stats". Requires roomId. Returns current session status and participant activity for that room.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/sessions/{sessionId}",
      name: "analytics-session",
      description:
        '[Analytics Data] Get detailed analytics for a specific session. Use to access: "session analytics", "meeting analytics", "session performance data", "session metrics", "meeting statistics". Requires sessionId. Returns comprehensive session analytics including participant engagement and activity patterns.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://analytics/participants/{participantId}",
      name: "analytics-participant",
      description:
        '[Analytics Data] Get analytics for a specific participant across sessions. Use to access: "user analytics", "participant history", "individual user stats", "participant metrics", "user engagement data". Requires participantId. Returns participant activity across all sessions they joined.',
      mimeType: "application/json",
    },
  ];
}

/**
 * Handle analytics resource requests
 *
 * @param uri - The resource URI being requested
 * @param apiClient - The Digital Samba API client instance
 * @returns The resource content
 */
export async function handleAnalyticsResource(
  uri: string,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const _analytics = new AnalyticsResource(apiClient);

  // Parse the URI - handle digitalsamba:// protocol
  // For digitalsamba://analytics/team, the URL parser treats 'analytics' as hostname
  const url = new URL(uri);

  // Extract path from the URI properly
  // For digitalsamba://analytics/team, url.hostname = 'analytics' and url.pathname = '/team'
  const pathParts = [url.hostname, ...url.pathname.split("/").filter(Boolean)];

  if (pathParts[0] !== "analytics") {
    throw new Error(`Invalid analytics resource URI: ${uri}`);
  }

  const resourceType = pathParts[1] || "team"; // Default to team if no subpath

  switch (resourceType) {
    case "team": {
      logger.info("Fetching team analytics");
      const filters = Object.fromEntries(url.searchParams);
      const teamData = await _analytics.getTeamAnalytics(filters);
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(teamData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    case "rooms": {
      if (pathParts.length < 3) {
        throw new Error(
          "Room analytics requires room ID: analytics/rooms/{roomId}",
        );
      }
      const roomId = pathParts[2];
      logger.info(`Fetching analytics for room ${roomId}`);
      const roomData = await _analytics.getRoomAnalytics(roomId);
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(roomData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    case "sessions": {
      if (pathParts.length < 3) {
        throw new Error(
          "Session analytics requires session ID: analytics/sessions/{sessionId}",
        );
      }
      const sessionId = pathParts[2];
      logger.info(`Fetching analytics for session ${sessionId}`);
      const sessionData = await _analytics.getSessionAnalytics(sessionId);
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(sessionData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    case "participants": {
      // Check if specific participant ID is provided
      const participantId = pathParts[2];
      if (participantId) {
        logger.info(`Fetching analytics for participant ${participantId}`);
      } else {
        logger.info("Fetching all participants analytics");
      }
      const participantData =
        await _analytics.getParticipantAnalytics(participantId);
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(participantData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    case "usage": {
      logger.info("Fetching usage analytics");
      const usageFilters = Object.fromEntries(url.searchParams);
      const usageData = await _analytics.getUsageAnalytics(usageFilters);
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(usageData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    case "live": {
      // Handle live analytics for rooms
      const liveRoomId = pathParts[2];
      const includeParticipants =
        url.searchParams.get("includeParticipants") === "true";
      if (liveRoomId) {
        logger.info(`Fetching live analytics for room ${liveRoomId}`);
      } else {
        logger.info("Fetching live analytics for all rooms");
      }
      const liveData = await _analytics.getLiveAnalytics(
        liveRoomId,
        includeParticipants,
      );
      return {
        contents: [
          {
            uri: uri,
            text: JSON.stringify(liveData, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown analytics resource: ${resourceType}`);
  }
}
