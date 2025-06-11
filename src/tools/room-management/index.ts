/**
 * Room Management Tools Module
 *
 * This module provides room management tools for the Digital Samba MCP Server.
 * It implements tools for creating, updating, deleting rooms and generating tokens.
 *
 * @module tools/room-management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
// import { z } from 'zod'; // Removed: unused
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
// Removed enhanced client import - using standard client
import { getApiKeyFromRequest } from "../../auth.js";
import logger from "../../logger.js";

/**
 * Register all room management tools
 *
 * @returns Array of MCP Tool definitions
 */
export function registerRoomTools(): Tool[] {
  return [
    {
      name: "create-room",
      description:
        '[Room Management] Create a new room with specified settings. Use when users say: "create a room", "set up a meeting space", "make a new video room", "create a conference room", "set up a virtual meeting room", "create room with toolbar on right". Returns the created room object with ID, join URL, and all settings.',
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            description: "Room name (required)",
          },
          description: {
            type: "string",
            maxLength: 500,
            description: "Room description",
          },
          friendlyUrl: {
            type: "string",
            minLength: 3,
            maxLength: 32,
            description: "Friendly URL for the room",
          },
          privacy: {
            type: "string",
            enum: ["public", "private"],
            default: "public",
            description: "Room privacy setting",
          },
          externalId: {
            type: "string",
            description: "External identifier for the room",
          },
          maxParticipants: {
            type: "number",
            minimum: 2,
            maximum: 2000,
            description: "Maximum number of participants",
          },
          maxBroadcasters: {
            type: "number",
            description: "Maximum number of broadcasters",
          },
          isLocked: {
            type: "boolean",
            description: "Whether the room is locked",
          },
          roles: {
            type: "array",
            items: { type: "string" },
            description: "Available roles in the room",
          },
          defaultRole: {
            type: "string",
            description: "Default role for participants",
          },

          // UI Settings
          topbarEnabled: {
            type: "boolean",
            description: "Show/hide the top bar",
          },
          toolbarEnabled: {
            type: "boolean",
            description: "Show/hide the toolbar",
          },
          toolbarPosition: {
            type: "string",
            enum: ["left", "right", "bottom"],
            description: "Position of the toolbar",
          },
          toolbarColor: {
            type: "string",
            description: "Toolbar background color (hex)",
          },
          primaryColor: {
            type: "string",
            description: "Primary theme color (hex)",
          },
          backgroundColor: {
            type: "string",
            description: "Room background color (hex)",
          },
          paletteMode: {
            type: "string",
            enum: ["light", "dark"],
            description: "Color theme mode",
          },
          language: {
            type: "string",
            description: "Default language",
          },
          languageSelectionEnabled: {
            type: "boolean",
            description: "Allow users to change language",
          },

          // Meeting features
          audioOnJoinEnabled: {
            type: "boolean",
            description: "Auto-enable audio when joining",
          },
          videoOnJoinEnabled: {
            type: "boolean",
            description: "Auto-enable video when joining",
          },
          screenshareEnabled: {
            type: "boolean",
            description: "Allow screen sharing",
          },
          participantsListEnabled: {
            type: "boolean",
            description: "Show participants list",
          },
          chatEnabled: {
            type: "boolean",
            description: "Enable chat functionality",
          },
          privateChatEnabled: {
            type: "boolean",
            description: "Allow private messages",
          },
          recordingsEnabled: {
            type: "boolean",
            description: "Allow recording sessions",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "update-room",
      description:
        '[Room Management] Update an existing room\'s settings. Use when users say: "change room settings", "update the room", "modify room configuration", "edit room details", "change max participants", "rename the room", "change toolbar position", "update room colors", "change room layout". Requires roomId. Returns the updated room object.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID (required)",
          },
          name: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            description: "Room name",
          },
          description: {
            type: "string",
            maxLength: 500,
            description: "Room description",
          },
          friendlyUrl: {
            type: "string",
            minLength: 3,
            maxLength: 32,
            description: "Friendly URL for the room",
          },
          privacy: {
            type: "string",
            enum: ["public", "private"],
            description: "Room privacy setting",
          },
          maxParticipants: {
            type: "number",
            minimum: 2,
            maximum: 2000,
            description: "Maximum number of participants",
          },
          maxBroadcasters: {
            type: "number",
            description: "Maximum number of broadcasters",
          },
          isLocked: {
            type: "boolean",
            description: "Whether the room is locked",
          },
          roles: {
            type: "array",
            items: { type: "string" },
            description: "Available roles in the room",
          },
          defaultRole: {
            type: "string",
            description: "Default role for participants",
          },

          // UI Settings
          topbarEnabled: {
            type: "boolean",
            description: "Show/hide the top bar",
          },
          toolbarEnabled: {
            type: "boolean",
            description: "Show/hide the toolbar",
          },
          toolbarPosition: {
            type: "string",
            enum: ["left", "right", "bottom"],
            description: "Position of the toolbar",
          },
          toolbarColor: {
            type: "string",
            description: "Toolbar background color (hex)",
          },
          primaryColor: {
            type: "string",
            description: "Primary theme color (hex)",
          },
          backgroundColor: {
            type: "string",
            description: "Room background color (hex)",
          },
          paletteMode: {
            type: "string",
            enum: ["light", "dark"],
            description: "Color theme mode",
          },
          language: {
            type: "string",
            description: "Default language",
          },
          languageSelectionEnabled: {
            type: "boolean",
            description: "Allow users to change language",
          },

          // Meeting features
          audioOnJoinEnabled: {
            type: "boolean",
            description: "Auto-enable audio when joining",
          },
          videoOnJoinEnabled: {
            type: "boolean",
            description: "Auto-enable video when joining",
          },
          screenshareEnabled: {
            type: "boolean",
            description: "Allow screen sharing",
          },
          participantsListEnabled: {
            type: "boolean",
            description: "Show participants list",
          },
          chatEnabled: {
            type: "boolean",
            description: "Enable chat functionality",
          },
          privateChatEnabled: {
            type: "boolean",
            description: "Allow private messages",
          },
          recordingsEnabled: {
            type: "boolean",
            description: "Allow recording sessions",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "delete-room",
      description:
        '[Room Management] Permanently delete a room. Use when users say: "delete the room", "remove this room", "delete meeting room", "remove conference room", "permanently delete room". Requires roomId. This action cannot be undone.',
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
      name: "generate-token",
      description:
        '[Room Management] Generate an access token for users to join a room. Use when users say: "create a join link", "generate access token", "create invite link", "get room access", "invite someone to room", "create moderator link". Requires roomId. Returns a token with join URL.',
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID (required)",
          },
          userName: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "User name for the token",
          },
          role: {
            type: "string",
            description: "User role (e.g., moderator, participant)",
          },
          externalId: {
            type: "string",
            description: "External user ID",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "get-default-room-settings",
      description:
        '[Room Management] Get the default settings that are automatically applied to all new rooms. Use when users say: "show default room settings", "what are the default settings", "get room defaults", "show room template settings". Returns all default configuration options.',
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "update-default-room-settings",
      description:
        '[Room Management] Update the default settings template for all future rooms. Use when users say: "change default room settings", "update room defaults", "modify default configuration", "set default language", "change default room template". Requires settings object. Affects only new rooms created after this change.',
      inputSchema: {
        type: "object",
        properties: {
          settings: {
            type: "object",
            description: "Settings object with configuration options",
            properties: {
              language: { type: "string" },
              languageSelectionEnabled: { type: "boolean" },
              topbarEnabled: { type: "boolean" },
              toolbarEnabled: { type: "boolean" },
              toolbarPosition: {
                type: "string",
                enum: ["left", "right", "bottom"],
              },
              toolbarColor: { type: "string" },
              primaryColor: { type: "string" },
              backgroundColor: { type: "string" },
              paletteMode: {
                type: "string",
                enum: ["light", "dark"],
              },
              audioOnJoinEnabled: { type: "boolean" },
              videoOnJoinEnabled: { type: "boolean" },
              screenshareEnabled: { type: "boolean" },
              participantsListEnabled: { type: "boolean" },
              chatEnabled: { type: "boolean" },
              privateChatEnabled: { type: "boolean" },
              recordingsEnabled: { type: "boolean" },
              maxParticipants: { type: "number" },
              maxBroadcasters: { type: "number" },
              defaultRole: { type: "string" },
            },
          },
        },
        required: ["settings"],
      },
    },
    // Reader tools for room resources (hybrid approach for Claude Desktop compatibility)
    {
      name: "list-rooms",
      description:
        '[Room Management - TOOL] List all rooms in your account. Use when users say: "show rooms", "list rooms", "show all rooms", "get rooms", "display rooms", "view rooms", "list meeting rooms", "get room list", "what rooms exist", "room directory", "all rooms", "my rooms". This TOOL provides the same data as the digitalsamba://rooms resource but is accessible to AI assistants. Returns array of room objects with IDs, names, settings, and join URLs.',
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of rooms to return",
          },
          offset: {
            type: "number",
            description: "Number of rooms to skip for pagination",
          },
        },
      },
    },
    {
      name: "get-room-details",
      description:
        '[Room Management - TOOL] Get complete details for a specific room. Use when users say: "show room details", "get room info", "room configuration", "room settings", "what are room parameters", "describe room". Requires roomId. This TOOL provides the same data as the digitalsamba://rooms/{roomId} resource. Returns full room object with all settings, max participants, features, and URLs.',
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
      name: "list-live-rooms",
      description:
        '[Room Management - TOOL] List all rooms currently with active participants. Use when users say: "show live rooms", "active meetings", "rooms with participants", "current sessions", "who is online", "active rooms", "ongoing meetings". This TOOL provides the same data as the digitalsamba://rooms/live resource. Returns rooms with participant counts and session duration.',
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "list-live-participants",
      description:
        '[Room Management - TOOL] List all rooms with detailed participant information. Use when users say: "show who is in meetings", "list participants in all rooms", "active participants", "who is in which room", "all attendees". This TOOL provides the same data as the digitalsamba://rooms/live/participants resource. Returns rooms with full participant details including names and join times.',
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Execute a room management tool
 *
 * This function handles the execution of room-related tools such as creating,
 * updating, deleting rooms, and generating access tokens. It manages API client
 * creation and error handling for all room operations.
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {any} args - Tool arguments specific to each tool
 * @param {any} request - MCP request object containing session context
 * @param {Object} options - Execution options
 * @param {string} options.apiUrl - Digital Samba API base URL
 * @param {any} [options.apiCache] - Cache instance for API responses
 * @param {boolean} [options.enableConnectionManagement] - Enable connection pooling
 * @param {boolean} [options.enableTokenManagement] - Enable automatic token refresh
 * @param {boolean} [options.enableResourceOptimization] - Enable resource optimization
 * @param {number} [options.connectionPoolSize] - Size of connection pool
 * @returns {Promise<Object>} Tool execution result with content array
 *
 * @example
 * // Create a room
 * const result = await executeRoomTool('create-room', {
 *   name: 'Team Meeting',
 *   privacy: 'private',
 *   maxParticipants: 50
 * }, request, { apiUrl: 'https://api.digitalsamba.com/api/v1' });
 *
 * @example
 * // Generate access token
 * const result = await executeRoomTool('generate-token', {
 *   roomId: 'room-123',
 *   options: {
 *     u: 'John Doe',
 *     role: 'moderator'
 *   }
 * }, request, { apiUrl: 'https://api.digitalsamba.com/api/v1' });
 *
 * @since 1.0.0
 */
export async function executeRoomTool(
  toolName: string,
  args: any,
  request: any,
  options: {
    apiUrl: string;
    apiCache?: any;
    enableConnectionManagement?: boolean;
    enableTokenManagement?: boolean;
    enableResourceOptimization?: boolean;
    connectionPoolSize?: number;
  },
): Promise<any> {
  const { apiUrl, apiCache } = options;

  // Get API key from session context
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

  // Create API client with the provided key
  logger.debug("Creating API client with key", {
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiUrl,
  });

  // Use standard API client
  const client = new DigitalSambaApiClient(apiKey, apiUrl, apiCache);

  switch (toolName) {
    case "create-room": {
      const { roomId, ...settings } = args; // Extract all settings except roomId
      void roomId; // roomId is ignored in room creation since it's generated by the API

      logger.info("Creating room", {
        roomName: settings.name,
        privacy: settings.privacy,
      });

      try {
        // Ensure we have a name
        if (!settings.name) {
          settings.name = "Test Room";
        }

        // Ensure privacy field has a default value
        if (!settings.privacy) {
          settings.privacy = "public";
        }

        // Create room with all provided settings
        const room = await client.createRoom(settings);
        logger.info("Room created successfully", { roomId: room.id });

        return {
          content: [
            {
              type: "text",
              text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error creating room", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error creating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "update-room": {
      const { roomId, ...settings } = args; // Extract roomId and all other settings

      if (!roomId) {
        return {
          content: [{ type: "text", text: "Room ID is required." }],
          isError: true,
        };
      }

      logger.info("Updating room", {
        roomId,
        settings: Object.keys(settings), // Log which settings are being updated
      });

      try {
        // Update room with all provided settings
        const room = await client.updateRoom(roomId, settings);
        logger.info("Room updated successfully", { roomId: room.id });

        return {
          content: [
            {
              type: "text",
              text: `Room updated successfully!\n\n${JSON.stringify(room, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error updating room", {
          roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error updating room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "delete-room": {
      const { roomId } = args;

      if (!roomId) {
        return {
          content: [{ type: "text", text: "Room ID is required." }],
          isError: true,
        };
      }

      logger.info("Deleting room", { roomId });

      try {
        // Delete room
        await client.deleteRoom(roomId);
        logger.info("Room deleted successfully", { roomId });

        return {
          content: [
            {
              type: "text",
              text: `Room ${roomId} deleted successfully!`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error deleting room", {
          roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error deleting room: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "generate-token": {
      const { roomId, userName, role, externalId } = args;

      // Validate required fields
      if (!roomId) {
        throw new Error("roomId is required");
      }

      logger.info("Generating room token", {
        roomId,
        userName,
        role,
      });

      try {
        // Generate token options
        const tokenOptions = {
          u: userName || undefined,
          role: role || undefined,
          ud: externalId || undefined,
        };

        // Generate token - simplified version for MCP
        let token;
        if (request.sessionId) {
          // Use standard token generation
          token = await client.generateRoomToken(roomId, tokenOptions);
          logger.info("Generated token", {
            roomId,
            expiresAt: token.expiresAt,
          });
        } else {
          // Standard token generation
          token = await client.generateRoomToken(roomId, tokenOptions);
        }
        logger.info("Token generated successfully", { roomId });

        return {
          content: [
            {
              type: "text",
              text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error generating token", {
          roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error generating token: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-default-room-settings": {
      logger.info("Getting default room settings");

      try {
        const settings = await client.getDefaultRoomSettings();

        return {
          content: [
            {
              type: "text",
              text: `Default room settings retrieved successfully:\n\n${JSON.stringify(settings, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting default room settings", {
          error: error instanceof Error ? error.message : error,
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting default room settings: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "update-default-room-settings": {
      const { settings } = args;

      logger.info("Updating default room settings", {
        settingsKeys: Object.keys(settings || {}),
      });

      try {
        const updatedSettings =
          await client.updateDefaultRoomSettings(settings);

        return {
          content: [
            {
              type: "text",
              text: `Default room settings updated successfully. Updated settings:\n\n${JSON.stringify(updatedSettings, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Error updating default room settings", {
          error: error instanceof Error ? error.message : error,
        });

        return {
          content: [
            {
              type: "text",
              text: `Error updating default room settings: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Reader tools for resources (hybrid approach)
    case "list-rooms": {
      logger.info("Listing rooms");

      try {
        const { limit, offset } = args;
        const rooms = await client.listRooms({ limit, offset });
        logger.info("Fetched rooms successfully", { count: rooms.data.length });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(rooms, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing rooms", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-room-details": {
      const { roomId } = args;

      if (!roomId) {
        return {
          content: [{ type: "text", text: "Room ID is required." }],
          isError: true,
        };
      }

      logger.info("Getting room details", { roomId });

      try {
        const room = await client.getRoom(roomId);
        logger.info("Fetched room details successfully", { roomId });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(room, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error getting room details", {
          roomId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error getting room details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list-live-rooms": {
      logger.info("Listing live rooms");

      try {
        const liveRooms = await client.getLiveRooms();
        logger.info("Fetched live rooms successfully", { count: liveRooms.data.length });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(liveRooms, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing live rooms", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing live rooms: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list-live-participants": {
      logger.info("Listing live participants across all rooms");

      try {
        const liveRooms = await client.getLiveRoomsWithParticipants();
        logger.info("Fetched live participants successfully", { count: liveRooms.data.length });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(liveRooms, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error("Error listing live participants", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: "text",
              text: `Error listing live participants: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown room tool: ${toolName}`);
  }
}
