/**
 * Room Resources Module
 *
 * This module provides read-only room resources for the Digital Samba MCP Server.
 * It implements resources for listing and retrieving room information.
 *
 * @module resources/rooms
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
// Removed enhanced client import - using standard client
import { getApiKeyFromRequest } from "../../auth.js";
import logger from "../../logger.js";

/**
 * Register all room resources
 *
 * @returns Array of MCP Resource definitions
 */
export function registerRoomResources(): Resource[] {
  return [
    {
      uri: "digitalsamba://rooms",
      name: "rooms",
      description:
        '[Room Data - RESOURCE] List all rooms in your account. Use when users say: "show rooms", "list rooms", "show all rooms", "get rooms", "display rooms", "view rooms", "list meeting rooms", "get room list", "what rooms exist", "room directory", "all rooms", "my rooms". This is a READ-ONLY RESOURCE, not a tool. Returns array of room objects with IDs, names, settings, and join URLs. Useful for browsing available meeting spaces or finding specific rooms.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://rooms/{roomId}",
      name: "room",
      description:
        '[Room Data] Get complete details for a specific room. Use to access: "show room details", "get room info", "room configuration", "room settings", "what are room parameters". Requires roomId parameter. Returns full room object with all settings, max participants, features, and URLs.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://rooms/live",
      name: "rooms-live",
      description:
        '[Live Sessions] List all rooms currently with active participants. Use when users say: "show live rooms", "active meetings", "rooms with participants", "current sessions", "who is online", "active rooms". Returns rooms with participant counts and session duration.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://rooms/live/participants",
      name: "rooms-live-participants",
      description:
        '[Live Sessions] List all rooms with detailed participant information. Use when users say: "show who is in meetings", "list participants in all rooms", "active participants", "who is in which room". Returns rooms with full participant details including names and join times.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://rooms/{roomId}/live",
      name: "room-live",
      description:
        '[Live Session] Get live session info for a specific room. Use when users say: "is room active", "how many in room", "room participant count", "check if meeting is live". Requires roomId. Returns participant count and session duration.',
      mimeType: "application/json",
    },
    {
      uri: "digitalsamba://rooms/{roomId}/live/participants",
      name: "room-live-participants",
      description:
        '[Live Session] Get detailed participant list for a specific room. Use when users say: "who is in the room", "list room participants", "show attendees", "participant details". Requires roomId. Returns full participant information.',
      mimeType: "application/json",
    },
  ];
}

/**
 * Handle room resource requests
 *
 * @param uri - The resource URI being requested
 * @param params - URL parameters from the URI
 * @param request - The MCP request object
 * @param options - Server options including API configuration
 * @returns The resource content
 */
export async function handleRoomResource(
  uri: string,
  params: any,
  request: any,
  options: {
    apiUrl: string;
    apiKey?: string;
    apiCache?: any;
    enableConnectionManagement?: boolean;
    enableTokenManagement?: boolean;
    enableResourceOptimization?: boolean;
    connectionPoolSize?: number;
  },
): Promise<any> {
  const { apiUrl, apiCache } = options;

  // Parse the URI to determine which resource is being requested
  const uriParts = uri.split("/");
  const isLiveRequest = uri.includes("/live");
  const isParticipantsRequest = uri.includes("/live/participants");
  const isSpecificRoom = uriParts.length > 3 && uriParts[3] !== "" && uriParts[3] !== "live";

  // Handle live rooms listing (all rooms with live sessions)
  if (uri === "digitalsamba://rooms/live" || uri === "digitalsamba://rooms/live/participants") {
    logger.info("Listing live rooms", { includeParticipants: isParticipantsRequest });

    // Get API key
    let apiKey = options?.apiKey;
    if (!apiKey) {
      apiKey = getApiKeyFromRequest(request);
    }
    if (!apiKey && process.env.DIGITAL_SAMBA_API_KEY) {
      apiKey = process.env.DIGITAL_SAMBA_API_KEY;
    }
    if (!apiKey) {
      throw new Error("No API key found. Please include an Authorization header with a Bearer token.");
    }

    const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);

    try {
      // Fetch live rooms from API
      const liveRooms = isParticipantsRequest 
        ? await client.getLiveRoomsWithParticipants()
        : await client.getLiveRooms();

      logger.info("Fetched live rooms successfully", { count: liveRooms.data.length });

      // Format as resource contents
      const contents = liveRooms.data.map((room) => ({
        uri: `digitalsamba://rooms/${room.id}/live`,
        text: JSON.stringify(room, null, 2),
        mimeType: "application/json",
      }));

      return { contents };
    } catch (error) {
      logger.error("Error fetching live rooms", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (isSpecificRoom || (uriParts.length > 3 && isLiveRequest)) {
    // Handle specific room request
    const roomId = params.roomId || uriParts[3];

    if (!roomId) {
      throw new Error("Room ID is required.");
    }

    logger.info("Getting room details", { roomId });

    // Get API key from session context
    const apiKey = getApiKeyFromRequest(request);
    if (!apiKey) {
      throw new Error(
        "No API key found. Please include an Authorization header with a Bearer token.",
      );
    }

    // Create API client
    logger.debug("Creating API client using context API key");

    // Use standard API client
    const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);

    try {
      // Determine which endpoint to call based on the URI
      let data;
      if (isParticipantsRequest) {
        // Get live participants data for specific room
        data = await client.getRoomLiveParticipantsData(roomId);
      } else if (isLiveRequest) {
        // Get live participant count for specific room
        data = await client.getRoomLiveParticipantsCount(roomId);
      } else {
        // Get room details
        data = await client.getRoom(roomId);
      }

      // Format as resource content
      const content = {
        uri: uri,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json",
      };

      return { contents: [content] };
    } catch (error) {
      logger.error("Error fetching room data", {
        roomId,
        isLive: isLiveRequest,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  } else {
    // Handle room listing
    logger.info("Listing rooms");

    // Get API key from various sources in priority order:
    // 1. Direct API key passed in options during server creation
    // 2. API key from session context
    // 3. Environment variable
    let apiKey = options?.apiKey;

    if (!apiKey) {
      apiKey = getApiKeyFromRequest(request);
    }

    if (!apiKey && process.env.DIGITAL_SAMBA_API_KEY) {
      apiKey = process.env.DIGITAL_SAMBA_API_KEY;
      logger.debug("Using API key from environment variable");
    }

    if (!apiKey) {
      throw new Error(
        "No API key found. Please include an Authorization header with a Bearer token.",
      );
    }

    // Create API client
    logger.debug("Creating API client with key", {
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiUrl: apiUrl,
    });

    // Use standard API client
    const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);

    try {
      // Fetch rooms from API
      const rooms = await client.listRooms();
      logger.info("Fetched rooms successfully", { count: rooms.data.length });

      // Format rooms as resource contents
      const contents = rooms.data.map((room) => ({
        uri: `digitalsamba://rooms/${room.id}`,
        text: JSON.stringify(room, null, 2),
        mimeType: "application/json",
      }));

      return { contents };
    } catch (error) {
      logger.error("Error fetching rooms", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
