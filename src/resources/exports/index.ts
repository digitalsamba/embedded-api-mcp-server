/**
 * Export Resources Module
 *
 * This module provides MCP resources for exporting various types of data from Digital Samba:
 * - Communication data (chat messages, Q&A, transcripts)
 * - Poll data and results
 * - Recording downloads and metadata
 *
 * Resources in this module are read-only and provide data export capabilities.
 *
 * @module resources/exports
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import logger from "../../logger.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";

/**
 * Export Resources Class
 * Handles MCP resource requests for data exports
 */
export class ExportResources {
  private api: DigitalSambaApiClient;

  constructor(api: DigitalSambaApiClient) {
    this.api = api;
  }

  /**
   * Handle export resource requests
   */
  async handleResourceRequest(
    uri: string,
  ): Promise<{ contents: Array<{ type: string; text: string }> }> {
    try {
      logger.info(`Handling export resource request: ${uri}`);

      const url = new URL(uri);
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts.length < 2) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "Invalid export resource URI format",
        );
      }

      const exportType = pathParts[1]; // exports/{exportType}/...

      switch (exportType) {
        case "communications":
          return this.handleCommunicationExport(pathParts, url.searchParams);
        case "polls":
          return this.handlePollsExport(pathParts, url.searchParams);
        case "recordings":
          return this.handleRecordingExport(pathParts, url.searchParams);
        case "sessions":
          return this.handleSessionExport(pathParts, url.searchParams);
        default:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown export type: ${exportType}`,
          );
      }
    } catch (error) {
      logger.error(`Error handling export resource request: ${error}`);
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Export resource error: ${error}`,
      );
    }
  }

  /**
   * Handle communication data exports (chat, Q&A, transcripts)
   */
  private async handleCommunicationExport(
    pathParts: string[],
    searchParams: URLSearchParams,
  ): Promise<{ contents: Array<{ type: string; text: string }> }> {
    if (pathParts.length < 4) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Communication export requires: /communications/{roomId}/{type}",
      );
    }

    const roomId = pathParts[2];
    const commType = pathParts[3]; // chat, qa, transcripts

    const format = searchParams.get("format") || "json";
    const sessionId = searchParams.get("session_id") || undefined;

    let exportData: string;
    let description: string;

    switch (commType) {
      case "chat":
        exportData = await this.api.exportChatMessages(roomId, {
          format: format as "txt" | "json",
          session_id: sessionId,
        });
        description = `Chat messages export for room ${roomId}`;
        break;
      case "qa":
        exportData = await this.api.exportQA(roomId, {
          format: format as "txt" | "json",
          session_id: sessionId,
        });
        description = `Q&A export for room ${roomId}`;
        break;
      case "transcripts":
        if (!sessionId) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Transcript export requires session_id parameter",
          );
        }
        exportData = await this.api.exportTranscripts(sessionId, {
          format: format as "txt" | "json",
        });
        description = `Transcript export for session ${sessionId}`;
        break;
      default:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown communication type: ${commType}`,
        );
    }

    return {
      contents: [
        {
          type: "text",
          text: `# ${description}\n\nFormat: ${format.toUpperCase()}\n${sessionId ? `Session: ${sessionId}\n` : ""}\n\`\`\`${format}\n${exportData}\n\`\`\``,
        },
      ],
    };
  }

  /**
   * Handle polls data export
   */
  private async handlePollsExport(
    pathParts: string[],
    searchParams: URLSearchParams,
  ): Promise<{ contents: Array<{ type: string; text: string }> }> {
    if (pathParts.length < 3) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Polls export requires: /polls/{roomId}",
      );
    }

    const roomId = pathParts[2];
    const format = searchParams.get("format") || "json";
    const sessionId = searchParams.get("session_id") || undefined;

    const exportData = await this.api.exportPolls(roomId, {
      format: format as "txt" | "json",
      session_id: sessionId,
    });

    return {
      contents: [
        {
          type: "text",
          text: `# Polls Export for Room ${roomId}\n\nFormat: ${format.toUpperCase()}\n${sessionId ? `Session: ${sessionId}\n` : ""}\n\`\`\`${format}\n${exportData}\n\`\`\``,
        },
      ],
    };
  }

  /**
   * Handle recording export/download
   */
  private async handleRecordingExport(
    pathParts: string[],
    _searchParams: URLSearchParams,
  ): Promise<{ contents: Array<{ type: string; text: string }> }> {
    if (pathParts.length < 3) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Recording export requires: /recordings/{recordingId}",
      );
    }

    const recordingId = pathParts[2];

    try {
      // Get recording metadata first
      const recording = await this.api.getRecording(recordingId);

      return {
        contents: [
          {
            type: "text",
            text: `# Recording Export Information\n\n**Recording ID**: ${recordingId}\n**Name**: ${recording.name || "Unnamed"}\n**Status**: ${recording.status}\n**Duration**: ${recording.duration || "Unknown"}\n\n**Download URL**: Use the \`download-recording\` tool to get the download link.\n\n**Metadata**:\n\`\`\`json\n${JSON.stringify(recording, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Recording ${recordingId} not found or not accessible`,
      );
    }
  }

  /**
   * Handle session data export
   */
  private async handleSessionExport(
    pathParts: string[],
    _searchParams: URLSearchParams,
  ): Promise<{ contents: Array<{ type: string; text: string }> }> {
    if (pathParts.length < 4) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Session export requires: /sessions/{sessionId}/{type}",
      );
    }

    const sessionId = pathParts[2];
    const exportType = pathParts[3]; // summary, metadata

    try {
      const session = await this.api.getSessionStatistics(sessionId);

      switch (exportType) {
        case "summary":
          return {
            contents: [
              {
                type: "text",
                text: `# Session Summary\n\n**Session ID**: ${sessionId}\n**Room**: ${session.room_description || session.room_id}\n**Started**: ${session.session_start_time}\n**Ended**: ${session.session_end_time || "Ongoing"}\n**Duration**: ${session.session_duration || "Unknown"} minutes\n**Live**: ${session.session_live ? "Yes" : "No"}\n**Participation Minutes**: ${session.participation_minutes}\n\n**Session Data**:\n\`\`\`json\n${JSON.stringify(session, null, 2)}\n\`\`\``,
              },
            ],
          };
        case "metadata":
          return {
            contents: [
              {
                type: "text",
                text: `# Session Metadata Export\n\n\`\`\`json\n${JSON.stringify(session, null, 2)}\n\`\`\``,
              },
            ],
          };
        default:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown session export type: ${exportType}`,
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Session ${sessionId} not found or not accessible`,
      );
    }
  }
}

/**
 * Register export resources with the MCP server
 */
export function registerExportResources(): Resource[] {
  return [
    {
      uri: "digitalsamba://exports/communications/{roomId}/chat",
      name: "Chat Messages Export",
      description:
        '[Export Data] Export chat messages from a room in formatted text. Use to access: "chat export", "download chat messages", "export room chat", "chat history export", "save chat messages". Requires roomId. Supports format (txt/json) and session_id parameters for specific sessions.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/communications/{roomId}/qa",
      name: "Q&A Export",
      description:
        '[Export Data] Export questions and answers from a room. Use to access: "Q&A export", "download questions", "export Q&A data", "question export", "save Q&A session". Requires roomId. Supports format (txt/json) and session_id parameters for filtering to specific sessions.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/communications/{sessionId}/transcripts",
      name: "Transcript Export",
      description:
        '[Export Data] Export session transcription data in formatted text. Use to access: "transcript export", "download transcripts", "export transcription", "transcript download", "save meeting transcript". Requires sessionId. Supports format (txt/json) parameter for output formatting.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/polls/{roomId}",
      name: "Polls Export",
      description:
        '[Export Data] Export poll questions, options, and results from a room. Use to access: "poll export", "download poll results", "export poll data", "poll results export", "save poll information". Requires roomId. Supports format (txt/json) and session_id parameters.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/recordings/{recordingId}",
      name: "Recording Export Info",
      description:
        '[Export Data] Get recording metadata and download information in readable format. Use to access: "recording export info", "recording metadata", "video export details", "recording information", "download recording info". Requires recordingId. Returns formatted recording details and download instructions.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/sessions/{sessionId}/summary",
      name: "Session Summary Export",
      description:
        '[Export Data] Export comprehensive session summary with key metrics. Use to access: "session summary export", "meeting report", "session overview", "meeting summary", "export session data". Requires sessionId. Returns formatted summary with participation, duration, and activity data.',
      mimeType: "text/plain",
    },
    {
      uri: "digitalsamba://exports/sessions/{sessionId}/metadata",
      name: "Session Metadata Export",
      description:
        '[Export Data] Export complete session metadata in JSON format. Use to access: "session metadata export", "full session data", "complete session info", "session raw data", "export session metadata". Requires sessionId. Returns complete technical session data.',
      mimeType: "text/plain",
    },
  ];
}
