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
// import { z } from "zod"; // Removed: unused

// MCP SDK imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

// Local modules
import { getApiKeyFromRequest } from "../../auth.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";
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
      name: "start-transcription",
      description:
        '[Live Session Controls] Start real-time transcription for an active room session. Use when users say: "start transcription", "enable transcription", "transcribe the meeting", "turn on transcription", "start live captions". Requires roomId with an active session. Transcripts can be exported later.',
      annotations: getToolAnnotations("start-transcription", "Start Transcription"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to start transcription for",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "stop-transcription",
      description:
        '[Live Session Controls] Stop ongoing transcription in a room. Use when users say: "stop transcription", "disable transcription", "turn off transcription", "stop live captions", "end transcription". Requires roomId. Only works if transcription is currently active.',
      annotations: getToolAnnotations("stop-transcription", "Stop Transcription"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to stop transcription for",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "phone-participants-joined",
      description:
        '[Live Session Controls] Register phone/dial-in participants joining a room. Use when users say: "add phone participant", "someone dialed in", "phone user joined", "register dial-in participant". Requires roomId and participant details including callId. Used for tracking phone-based attendees.',
      annotations: getToolAnnotations("phone-participants-joined", "Phone Participants Joined"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room",
          },
          participants: {
            type: "array",
            description: "Array of phone participants joining",
            items: {
              type: "object",
              properties: {
                callId: {
                  type: "string",
                  description: "Unique identifier for the phone call",
                },
                name: {
                  type: "string",
                  description: "Name of the participant",
                },
                callerNumber: {
                  type: "string",
                  description: "Phone number of the participant",
                },
                externalId: {
                  type: "string",
                  description: "External identifier for the participant",
                },
              },
              required: ["callId"],
            },
          },
        },
        required: ["roomId", "participants"],
      },
    },
    {
      name: "phone-participants-left",
      description:
        '[Live Session Controls] Register phone/dial-in participants leaving a room. Use when users say: "phone participant left", "dial-in user disconnected", "remove phone participant", "phone user hung up". Requires roomId and callIds array. Updates participant tracking.',
      annotations: getToolAnnotations("phone-participants-left", "Phone Participants Left"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room",
          },
          callIds: {
            type: "array",
            description: "Array of call IDs for participants leaving",
            items: {
              type: "string",
            },
          },
        },
        required: ["roomId", "callIds"],
      },
    },
    {
      name: "raise-participant-hand",
      description:
        '[Live Session Controls] Raise a participant\'s hand in a live session. Use when users say: "raise hand for participant", "participant wants to speak", "raise their hand". Requires roomId and participantId. Only works during active sessions.',
      annotations: getToolAnnotations("raise-participant-hand", "Raise Participant Hand"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          participant_id: {
            type: "string",
            description: "The ID of the participant",
          },
        },
        required: ["room_id", "participant_id"],
      },
    },
    {
      name: "lower-participant-hand",
      description:
        '[Live Session Controls] Lower a participant\'s hand in a live session. Use when users say: "lower hand", "dismiss hand raise", "acknowledge participant". Requires roomId and participantId. Only works during active sessions.',
      annotations: getToolAnnotations("lower-participant-hand", "Lower Participant Hand"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          participant_id: {
            type: "string",
            description: "The ID of the participant",
          },
        },
        required: ["room_id", "participant_id"],
      },
    },
    {
      name: "raise-phone-participant-hand",
      description:
        '[Live Session Controls] Raise a phone participant\'s hand in a live session. Use when users say: "raise hand for phone user", "phone participant wants to speak". Requires roomId and callId. Only works for phone/dial-in participants.',
      annotations: getToolAnnotations("raise-phone-participant-hand", "Raise Phone Participant Hand"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          call_id: {
            type: "string",
            description: "The call ID of the phone participant",
          },
        },
        required: ["room_id", "call_id"],
      },
    },
    {
      name: "lower-phone-participant-hand",
      description:
        '[Live Session Controls] Lower a phone participant\'s hand in a live session. Use when users say: "lower phone participant hand", "dismiss phone user hand raise". Requires roomId and callId. Only works for phone/dial-in participants.',
      annotations: getToolAnnotations("lower-phone-participant-hand", "Lower Phone Participant Hand"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          call_id: {
            type: "string",
            description: "The call ID of the phone participant",
          },
        },
        required: ["room_id", "call_id"],
      },
    },
    {
      name: "connect-phone",
      description:
        '[Live Session Controls] Connect to SIP phone bridge for a room. Use when users say: "connect phone", "enable phone bridge", "connect SIP", "start phone dial-in". Requires room_id. Enables phone/dial-in capability for the room.',
      annotations: getToolAnnotations("connect-phone", "Connect Phone"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to connect phone bridge for",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "disconnect-phone",
      description:
        '[Live Session Controls] Disconnect from SIP phone bridge for a room. Use when users say: "disconnect phone", "disable phone bridge", "disconnect SIP", "stop phone dial-in". Requires room_id.',
      annotations: getToolAnnotations("disconnect-phone", "Disconnect Phone"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to disconnect phone bridge for",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "start-restreamer",
      description:
        '[Live Session Controls] Start live streaming to an external provider (YouTube, Vimeo, Cloudflare, or custom RTMP). Use when users say: "start streaming", "go live", "start restream", "broadcast to YouTube/Vimeo". Requires room_id and stream_key. Optionally specify type (youtube/vimeo/cloudflare) or custom server_url.',
      annotations: getToolAnnotations("start-restreamer", "Start Restreamer"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to start streaming from",
          },
          type: {
            type: "string",
            enum: ["youtube", "vimeo", "cloudflare"],
            description: "The streaming provider type (optional if server_url is provided)",
          },
          server_url: {
            type: "string",
            description: "Custom RTMP server URL (optional if type is provided)",
          },
          stream_key: {
            type: "string",
            description: "The stream key for authentication with the streaming provider (required)",
          },
        },
        required: ["room_id", "stream_key"],
      },
    },
    {
      name: "stop-restreamer",
      description:
        '[Live Session Controls] Stop live streaming to external provider. Use when users say: "stop streaming", "end broadcast", "stop restream", "go offline". Requires room_id.',
      annotations: getToolAnnotations("stop-restreamer", "Stop Restreamer"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to stop streaming from",
          },
        },
        required: ["room_id"],
      },
    },
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
  _apiClient: DigitalSambaApiClient,
): Promise<any> {
  switch (toolName) {
    case "start-transcription":
      return handleStartTranscription(params, _apiClient);
    case "stop-transcription":
      return handleStopTranscription(params, _apiClient);
    case "phone-participants-joined":
      return handlePhoneParticipantsJoined(params, _apiClient);
    case "phone-participants-left":
      return handlePhoneParticipantsLeft(params, _apiClient);
    case "raise-participant-hand":
      return handleRaiseParticipantHand(params, _apiClient);
    case "lower-participant-hand":
      return handleLowerParticipantHand(params, _apiClient);
    case "raise-phone-participant-hand":
      return handleRaisePhoneParticipantHand(params, _apiClient);
    case "lower-phone-participant-hand":
      return handleLowerPhoneParticipantHand(params, _apiClient);
    case "connect-phone":
      return handleConnectPhone(params, _apiClient);
    case "disconnect-phone":
      return handleDisconnectPhone(params, _apiClient);
    case "start-restreamer":
      return handleStartRestreamer(params, _apiClient);
    case "stop-restreamer":
      return handleStopRestreamer(params, _apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle start transcription tool
 */
async function handleStartTranscription(
  params: { roomId: string },
  _apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to start transcription.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Starting transcription", { roomId });

  try {
    await _apiClient.startTranscription(roomId);

    logger.info("Transcription started successfully", { roomId });

    return {
      content: [
        {
          type: "text",
          text: `Successfully started transcription for room ${roomId}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error starting transcription", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error starting transcription: ${errorMessage}`;

    if (
      errorMessage.includes("Room not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Room with ID ${roomId} not found`;
    } else if (errorMessage.includes("Already transcribing")) {
      displayMessage = `Transcription already in progress for room ${roomId}`;
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
 * Handle stop transcription tool
 */
async function handleStopTranscription(
  params: { roomId: string },
  _apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to stop transcription.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Stopping transcription", { roomId });

  try {
    await _apiClient.stopTranscription(roomId);

    logger.info("Transcription stopped successfully", { roomId });

    return {
      content: [
        {
          type: "text",
          text: `Successfully stopped transcription for room ${roomId}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error stopping transcription", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error stopping transcription: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
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
      callId: string;
      name?: string;
      callerNumber?: string;
      externalId?: string;
    }>;
  },
  _apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, participants } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required for phone participants.",
        },
      ],
      isError: true,
    };
  }

  if (!participants || participants.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "At least one participant is required.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Registering phone participants joined", {
    roomId,
    participantCount: participants.length,
  });

  try {
    // Convert camelCase to snake_case for API
    const apiParticipants = participants.map(p => ({
      call_id: p.callId,
      name: p.name,
      caller_number: p.callerNumber,
      external_id: p.externalId
    }));
    await _apiClient.phoneParticipantsJoined(roomId, apiParticipants);

    const participantNames = participants
      .map((p) => p.name || p.callerNumber || p.callId)
      .join(", ");

    return {
      content: [
        {
          type: "text",
          text: `Successfully registered ${participants.length} phone participant(s) joining room ${roomId}: ${participantNames}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error registering phone participants joined", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error registering phone participants: ${errorMessage}`;

    if (
      errorMessage.includes("Room not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Room with ID ${roomId} not found`;
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
 * Handle phone participants left tool
 */
async function handlePhoneParticipantsLeft(
  params: {
    roomId: string;
    callIds: string[];
  },
  _apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, callIds } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required for phone participants.",
        },
      ],
      isError: true,
    };
  }

  if (!callIds || callIds.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "At least one call ID is required.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Registering phone participants left", {
    roomId,
    callIdCount: callIds.length,
  });

  try {
    await _apiClient.phoneParticipantsLeft(roomId, callIds);

    return {
      content: [
        {
          type: "text",
          text: `Successfully registered ${callIds.length} phone participant(s) leaving room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error registering phone participants left", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error registering phone participants leaving: ${errorMessage}`;

    if (
      errorMessage.includes("Room not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Room with ID ${roomId} not found`;
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
 * Handle raise participant hand
 */
async function handleRaiseParticipantHand(
  params: { room_id: string; participant_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, participant_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!participant_id || participant_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Participant ID is required." }],
      isError: true,
    };
  }

  logger.info("Raising participant hand", { room_id, participant_id });

  try {
    await apiClient.raiseParticipantHand(room_id, participant_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully raised hand for participant ${participant_id} in room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error raising participant hand", {
      room_id,
      participant_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      content: [
        {
          type: "text",
          text: `Error raising hand: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle lower participant hand
 */
async function handleLowerParticipantHand(
  params: { room_id: string; participant_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, participant_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!participant_id || participant_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Participant ID is required." }],
      isError: true,
    };
  }

  logger.info("Lowering participant hand", { room_id, participant_id });

  try {
    await apiClient.lowerParticipantHand(room_id, participant_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully lowered hand for participant ${participant_id} in room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error lowering participant hand", {
      room_id,
      participant_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      content: [
        {
          type: "text",
          text: `Error lowering hand: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle raise phone participant hand
 */
async function handleRaisePhoneParticipantHand(
  params: { room_id: string; call_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, call_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!call_id || call_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Call ID is required." }],
      isError: true,
    };
  }

  logger.info("Raising phone participant hand", { room_id, call_id });

  try {
    await apiClient.raisePhoneParticipantHand(room_id, call_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully raised hand for phone participant ${call_id} in room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error raising phone participant hand", {
      room_id,
      call_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      content: [
        {
          type: "text",
          text: `Error raising hand: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle lower phone participant hand
 */
async function handleLowerPhoneParticipantHand(
  params: { room_id: string; call_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, call_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!call_id || call_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Call ID is required." }],
      isError: true,
    };
  }

  logger.info("Lowering phone participant hand", { room_id, call_id });

  try {
    await apiClient.lowerPhoneParticipantHand(room_id, call_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully lowered hand for phone participant ${call_id} in room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error lowering phone participant hand", {
      room_id,
      call_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      content: [
        {
          type: "text",
          text: `Error lowering hand: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle connect phone
 */
async function handleConnectPhone(
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

  logger.info("Connecting phone bridge", { room_id });

  try {
    await apiClient.connectPhone(room_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully connected phone bridge for room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error connecting phone bridge", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error connecting phone bridge: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Room with ID ${room_id} not found`;
    }

    return {
      content: [{ type: "text", text: displayMessage }],
      isError: true,
    };
  }
}

/**
 * Handle disconnect phone
 */
async function handleDisconnectPhone(
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

  logger.info("Disconnecting phone bridge", { room_id });

  try {
    await apiClient.disconnectPhone(room_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully disconnected phone bridge for room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error disconnecting phone bridge", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error disconnecting phone bridge: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle start restreamer
 */
async function handleStartRestreamer(
  params: {
    room_id: string;
    type?: "youtube" | "vimeo" | "cloudflare";
    server_url?: string;
    stream_key: string;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, type, server_url, stream_key } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: "Room ID is required." }],
      isError: true,
    };
  }

  if (!stream_key || stream_key.trim() === "") {
    return {
      content: [{ type: "text", text: "Stream key is required." }],
      isError: true,
    };
  }

  if (!type && !server_url) {
    return {
      content: [
        {
          type: "text",
          text: "Either type (youtube/vimeo/cloudflare) or server_url must be provided.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Starting restreamer", { room_id, type, server_url: server_url ? "[provided]" : undefined });

  try {
    await apiClient.startRestreamer(room_id, { type, server_url, stream_key });

    const destination = type || server_url;
    return {
      content: [
        {
          type: "text",
          text: `Successfully started live streaming from room ${room_id} to ${destination}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error starting restreamer", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error starting restreamer: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Room with ID ${room_id} not found`;
    } else if (errorMessage.includes("feature") || errorMessage.includes("enabled")) {
      displayMessage = `Restreaming feature may not be enabled for this account. ${errorMessage}`;
    }

    return {
      content: [{ type: "text", text: displayMessage }],
      isError: true,
    };
  }
}

/**
 * Handle stop restreamer
 */
async function handleStopRestreamer(
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

  logger.info("Stopping restreamer", { room_id });

  try {
    await apiClient.stopRestreamer(room_id);
    return {
      content: [
        {
          type: "text",
          text: `Successfully stopped live streaming for room ${room_id}.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error stopping restreamer", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error stopping restreamer: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
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
  logger.info("Setting up live session control tools");

  const tools = registerLiveSessionTools();

  tools.forEach((tool) => {
    server.tool(tool.name, tool.inputSchema, async (params, request) => {
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

      const apiClient = new DigitalSambaApiClient(apiKey, apiUrl);
      return executeLiveSessionTool(tool.name, params, apiClient);
    });
  });

  logger.info("Live session control tools set up successfully");
}
