/**
 * Export Tools Module
 * 
 * Provides tool equivalents for export resources to ensure compatibility with AI assistants
 * that can only access tools, not resources.
 * 
 * @module tools/export-tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getApiKeyFromRequest } from "../../auth.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";
import { ExportResources } from "../../resources/exports/index.js";
import { getToolAnnotations } from "../../tool-annotations.js";

/**
 * Execute export tool function
 */
export async function executeExportTool(
  toolName: string,
  params: any,
  request: any,
  options: { apiUrl?: string },
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    logger.info(`Executing export tool: ${toolName}`, { params, toolName });

    const apiKey = getApiKeyFromRequest(request) || process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
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

    const apiUrl = options.apiUrl || process.env.DIGITAL_SAMBA_API_URL;
    const api = new DigitalSambaApiClient(apiKey, apiUrl);
    const exportResources = new ExportResources(api);

    switch (toolName) {
      case "export-chat-messages":
        return await handleExportChatMessages(params, exportResources);
      case "export-qa-data":
        return await handleExportQA(params, exportResources);
      case "export-session-transcripts":
        return await handleExportTranscripts(params, exportResources);
      case "export-poll-results":
        return await handleExportPolls(params, exportResources);
      case "export-recording-metadata":
        return await handleExportRecordingMetadata(params, exportResources);
      case "export-session-summary":
        return await handleExportSessionSummary(params, exportResources);
      case "export-session-metadata":
        return await handleExportSessionMetadata(params, exportResources);
      default:
        logger.error(`Unknown export tool in switch statement`, {
          toolName,
          validTools: [
            "export-chat-messages",
            "export-qa-data", 
            "export-session-transcripts",
            "export-poll-results",
            "export-recording-metadata",
            "export-session-summary",
            "export-session-metadata"
          ]
        });
        throw new Error(`Unknown export tool: ${toolName}`);
    }
  } catch (error) {
    logger.error(`Error executing export tool ${toolName}`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler functions for each export tool
 */

async function handleExportChatMessages(
  params: { roomId: string; format?: string; sessionId?: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/communications/${params.roomId}/chat${
    params.format || params.sessionId
      ? `?${new URLSearchParams({
          ...(params.format && { format: params.format }),
          ...(params.sessionId && { session_id: params.sessionId }),
        }).toString()}`
      : ""
  }`;

  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

async function handleExportQA(
  params: { roomId: string; format?: string; sessionId?: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/communications/${params.roomId}/qa${
    params.format || params.sessionId
      ? `?${new URLSearchParams({
          ...(params.format && { format: params.format }),
          ...(params.sessionId && { session_id: params.sessionId }),
        }).toString()}`
      : ""
  }`;

  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

async function handleExportTranscripts(
  params: { sessionId: string; format?: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/communications/${params.sessionId}/transcripts${
    params.format ? `?format=${params.format}` : ""
  }`;

  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

async function handleExportPolls(
  params: { roomId: string; format?: string; sessionId?: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/polls/${params.roomId}${
    params.format || params.sessionId
      ? `?${new URLSearchParams({
          ...(params.format && { format: params.format }),
          ...(params.sessionId && { session_id: params.sessionId }),
        }).toString()}`
      : ""
  }`;

  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

async function handleExportRecordingMetadata(
  params: { recordingId: string },
  exportResources: ExportResources,
): Promise<any> {
  logger.info("handleExportRecordingMetadata called", { params });

  if (!params.recordingId || params.recordingId.trim() === "") {
    logger.error("Missing recordingId parameter", { params });
    return {
      content: [
        {
          type: "text",
          text: "Recording ID is required to export recording metadata.",
        },
      ],
      isError: true,
    };
  }

  try {
    const uri = `digitalsamba://exports/recordings/${params.recordingId}`;
    logger.info("Fetching recording metadata", { uri, recordingId: params.recordingId });
    const result = await exportResources.handleResourceRequest(uri);
    logger.info("Recording metadata fetched successfully", { recordingId: params.recordingId });
    return { content: result.contents };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error("Error fetching recording metadata", {
      recordingId: params.recordingId,
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name
    });
    return {
      content: [
        {
          type: "text",
          text: `Error exporting recording metadata: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleExportSessionSummary(
  params: { sessionId: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/sessions/${params.sessionId}/summary`;
  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

async function handleExportSessionMetadata(
  params: { sessionId: string },
  exportResources: ExportResources,
): Promise<any> {
  const uri = `digitalsamba://exports/sessions/${params.sessionId}/metadata`;
  const result = await exportResources.handleResourceRequest(uri);
  return { content: result.contents };
}

/**
 * Register export tools with the MCP server
 */
export function registerExportTools(): Tool[] {
  return [
    {
      name: "export-chat-messages",
      description:
        "[Export Tools] Export chat messages from a room. Use when users say: \"export chat\", \"download chat messages\", \"export room chat\", \"get chat history\", \"save chat messages\". Mirrors digitalsamba://exports/communications/{roomId}/chat resource for AI assistant compatibility. Requires roomId. Supports format (txt/json) and optional sessionId for specific sessions.",
      annotations: getToolAnnotations("export-chat-messages", "Export Chat Messages"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID to export chat messages from",
          },
          format: {
            type: "string",
            enum: ["txt", "json"],
            description: "Export format (default: json)",
          },
          sessionId: {
            type: "string",
            description: "Optional session ID to filter messages",
          },
        },
        required: ["roomId"],
      } as const,
    },
    {
      name: "export-qa-data",
      description:
        "[Export Tools] Export questions and answers from a room. Use when users say: \"export Q&A\", \"download questions\", \"export Q&A data\", \"get question history\", \"save Q&A session\". Mirrors digitalsamba://exports/communications/{roomId}/qa resource for AI assistant compatibility. Requires roomId. Supports format and optional sessionId.",
      annotations: getToolAnnotations("export-qa-data", "Export Q&A Data"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID to export Q&A from",
          },
          format: {
            type: "string",
            enum: ["txt", "json"],
            description: "Export format (default: json)",
          },
          sessionId: {
            type: "string",
            description: "Optional session ID to filter Q&A",
          },
        },
        required: ["roomId"],
      } as const,
    },
    {
      name: "export-session-transcripts",
      description:
        "[Export Tools] Export transcription data from a session. Use when users say: \"export transcript\", \"download transcripts\", \"export transcription\", \"get transcript\", \"save meeting transcript\". Mirrors digitalsamba://exports/communications/{sessionId}/transcripts resource for AI assistant compatibility. Requires sessionId.",
      annotations: getToolAnnotations("export-session-transcripts", "Export Session Transcripts"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to export transcripts from",
          },
          format: {
            type: "string",
            enum: ["txt", "json"],
            description: "Export format (default: json)",
          },
        },
        required: ["sessionId"],
      } as const,
    },
    {
      name: "export-poll-results",
      description:
        "[Export Tools] Export poll questions, options, and results from a room. Use when users say: \"export polls\", \"download poll results\", \"export poll data\", \"get poll results\", \"save poll information\". Mirrors digitalsamba://exports/polls/{roomId} resource for AI assistant compatibility. Requires roomId.",
      annotations: getToolAnnotations("export-poll-results", "Export Poll Results"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "Room ID to export polls from",
          },
          format: {
            type: "string",
            enum: ["txt", "json"],
            description: "Export format (default: json)",
          },
          sessionId: {
            type: "string",
            description: "Optional session ID to filter polls",
          },
        },
        required: ["roomId"],
      } as const,
    },
    {
      name: "export-recording-metadata",
      description:
        "[Export Tools] Get recording metadata and download information. Use when users say: \"export recording info\", \"get recording metadata\", \"recording export details\", \"recording information\", \"download recording details\". Mirrors digitalsamba://exports/recordings/{recordingId} resource for AI assistant compatibility. Requires recordingId.",
      annotations: getToolAnnotations("export-recording-metadata", "Export Recording Metadata"),
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "Recording ID to export metadata for",
          },
        },
        required: ["recordingId"],
      } as const,
    },
    {
      name: "export-session-summary",
      description:
        "[Export Tools] Export comprehensive session summary with key metrics. Use when users say: \"export session summary\", \"get meeting report\", \"session overview\", \"meeting summary\", \"export session report\". Mirrors digitalsamba://exports/sessions/{sessionId}/summary resource for AI assistant compatibility. Requires sessionId.",
      annotations: getToolAnnotations("export-session-summary", "Export Session Summary"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to export summary for",
          },
        },
        required: ["sessionId"],
      } as const,
    },
    {
      name: "export-session-metadata",
      description:
        "[Export Tools] Export complete session metadata in JSON format. Use when users say: \"export session metadata\", \"get full session data\", \"complete session info\", \"session raw data\", \"export technical session data\". Mirrors digitalsamba://exports/sessions/{sessionId}/metadata resource for AI assistant compatibility. Requires sessionId.",
      annotations: getToolAnnotations("export-session-metadata", "Export Session Metadata"),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to export metadata for",
          },
        },
        required: ["sessionId"],
      } as const,
    },
  ];
}