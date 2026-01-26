/**
 * Digital Samba MCP Server Factory
 *
 * Creates and configures the MCP server with all tools and resources.
 * This module is transport-agnostic - it can be used with stdio or HTTP transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { DigitalSambaApiClient } from "./digital-samba-api.js";
import logger from "./logger.js";

// Import resources
import {
  registerRoomResources,
  handleRoomResource,
} from "./resources/rooms/index.js";
import {
  registerSessionResources,
  handleSessionResource,
} from "./resources/sessions/index.js";
import {
  registerAnalyticsResources,
  handleAnalyticsResource,
} from "./resources/analytics/index.js";
import {
  registerRecordingResources,
  handleRecordingResource,
} from "./resources/recordings-adapter.js";
import {
  ExportResources,
  registerExportResources,
} from "./resources/exports/index.js";
import {
  registerContentResources,
  handleContentResource,
} from "./resources/content/index.js";

// Import tools
import {
  registerRoomTools,
  executeRoomTool,
} from "./tools/room-management/index.js";
import {
  registerSessionTools,
  executeSessionTool,
} from "./tools/session-management/index.js";
import {
  registerRecordingTools,
  executeRecordingTool,
} from "./tools/recording-tools-adapter.js";
import {
  registerAnalyticsTools,
  executeAnalyticsTool,
} from "./tools/analytics-tools/index.js";
import {
  registerLiveSessionTools,
  executeLiveSessionTool,
} from "./tools/live-session-controls/index.js";
import {
  registerCommunicationTools,
  executeCommunicationTool,
} from "./tools/communication-management/index.js";
import {
  registerPollTools,
  executePollTool,
} from "./tools/poll-management/index.js";
import {
  registerQuizTools,
  executeQuizTool,
} from "./tools/quiz-management/index.js";
import {
  registerLibraryTools,
  executeLibraryTool,
} from "./tools/library-management/index.js";
import {
  registerRoleTools,
  executeRoleTool,
} from "./tools/role-management/index.js";
import {
  registerWebhookTools,
  executeWebhookTool,
} from "./tools/webhook-management/index.js";
import {
  registerExportTools,
  executeExportTool,
} from "./tools/export-tools/index.js";

import {
  VERSION,
  VERSION_INFO,
  GIT_COMMIT,
  GIT_REF,
  COMMITS_AHEAD,
  getDisplayVersion,
  isDevBuild,
} from "./version.js";

// API client instance cache - keyed by apiKey:apiUrl to support different URLs per session
let apiClientCache: Map<string, DigitalSambaApiClient> = new Map();

/**
 * Get or create API client with the provided API key and URL
 *
 * Uses composite cache key (apiKey:apiUrl) to ensure OAuth sessions
 * get clients with the correct /oauth-api/v1/* URL while direct API key
 * sessions get clients with /api/v1/* URL.
 */
function getApiClient(apiKey: string, apiUrl: string): DigitalSambaApiClient {
  const cacheKey = `${apiKey}:${apiUrl}`;
  if (!apiClientCache.has(cacheKey)) {
    apiClientCache.set(cacheKey, new DigitalSambaApiClient(apiKey, apiUrl));
  }
  return apiClientCache.get(cacheKey)!;
}

/**
 * Resource to tool mapping for helpful error messages
 */
const resourceToToolMap: Record<string, string> = {
  "rooms": "list-rooms",
  "room": "get-room-details",
  "rooms-live": "list-live-rooms",
  "rooms-live-participants": "list-live-participants",
  "room-live": "list-live-rooms",
  "room-live-participants": "list-live-participants",
  "room-settings": "get-default-room-settings",
  "sessions": "list-sessions",
  "session": "get-session-details",
  "session-participants": "list-session-participants",
  "session-statistics": "get-session-statistics",
  "room-sessions": "list-room-sessions",
  "recordings": "get-recordings",
  "recording": "get-recording-details",
  "team-analytics": "get-usage-statistics",
  "room-analytics": "get-room-analytics",
  "session-analytics": "get-session-analytics",
  "content": "list-libraries",
  "content-library": "get-library",
};

export interface ServerConfig {
  /** API key for Digital Samba API (optional - can be provided per-request in HTTP mode) */
  apiKey?: string;
  /** Base URL for Digital Samba API */
  apiUrl?: string;
}

/**
 * Creates and configures the MCP server with all handlers
 */
export function createServer(config: ServerConfig = {}): Server {
  const server = new Server(
    {
      name: "digital-samba",
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );

  const apiUrl = config.apiUrl || process.env.DIGITAL_SAMBA_API_URL || "https://api.digitalsamba.com/api/v1";

  // Helper to get API key from config or environment
  const getApiKey = (): string | undefined => {
    return config.apiKey || process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  };

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const apiKey = getApiKey();
    let client = null;
    if (apiKey) {
      client = getApiClient(apiKey, apiUrl);
    }

    return {
      resources: [
        ...registerRoomResources(),
        ...registerSessionResources(),
        ...registerRecordingResources(),
        ...(client ? registerAnalyticsResources(client) : []),
        ...registerExportResources(),
        ...registerContentResources(),
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "API key not configured. Set DIGITAL_SAMBA_DEVELOPER_KEY or provide via authentication.",
      );
    }

    const client = getApiClient(apiKey, apiUrl);
    const { uri } = request.params;

    logger.debug(`Reading resource: ${uri}`);

    if (uri.startsWith("digitalsamba://rooms")) {
      return handleRoomResource(uri, {}, request, { apiUrl });
    } else if (uri.startsWith("digitalsamba://sessions")) {
      return handleSessionResource(uri, {}, request, { apiUrl });
    } else if (uri.startsWith("digitalsamba://recordings")) {
      return handleRecordingResource(uri, client);
    } else if (uri.startsWith("digitalsamba://analytics")) {
      return handleAnalyticsResource(uri, client);
    } else if (uri.startsWith("digitalsamba://exports")) {
      const exportResources = new ExportResources(client);
      return exportResources.handleResourceRequest(uri);
    } else if (uri.startsWith("digitalsamba://content")) {
      return handleContentResource(uri, client);
    }

    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
  });

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [
      ...registerRoomTools(),
      ...registerSessionTools(),
      ...registerRecordingTools(),
      ...registerAnalyticsTools(),
      ...registerLiveSessionTools(),
      ...registerCommunicationTools(),
      ...registerPollTools(),
      ...registerQuizTools(),
      ...registerLibraryTools(),
      ...registerRoleTools(),
      ...registerWebhookTools(),
      ...registerExportTools(),
    ];

    logger.debug(`ListToolsRequest: Registered ${allTools.length} total tools`);

    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "API key not configured. Set DIGITAL_SAMBA_DEVELOPER_KEY or provide via authentication.",
      );
    }

    const client = getApiClient(apiKey, apiUrl);
    const { name, arguments: args } = request.params;

    logger.debug(`Executing tool: ${name}`);

    try {
      // Room management tools
      if (
        name === "create-room" ||
        name === "update-room" ||
        name === "delete-room" ||
        name === "generate-token" ||
        name === "get-default-room-settings" ||
        name === "update-default-room-settings" ||
        name === "list-rooms" ||
        name === "get-room-details" ||
        name === "list-live-rooms" ||
        name === "list-live-participants"
      ) {
        return await executeRoomTool(name, args || {}, request, { apiUrl });
      }
      // Analytics tools
      else if (
        name === "get-participant-statistics" ||
        name === "get-room-analytics" ||
        name === "get-usage-statistics" ||
        name === "get-usage-analytics" ||
        name === "get-live-analytics" ||
        name === "get-live-room-analytics" ||
        name === "get-session-analytics" ||
        name === "get-participant-analytics"
      ) {
        return await executeAnalyticsTool(name, args || {}, client);
      }
      // Session management tools
      else if (
        name === "end-session" ||
        name === "get-session-summary" ||
        name === "get-all-room-sessions" ||
        name === "hard-delete-session-resources" ||
        name === "bulk-delete-session-data" ||
        name === "get-session-statistics" ||
        name === "get-session-statistics-details" ||
        name === "list-sessions" ||
        name === "get-session-details" ||
        name === "list-session-participants" ||
        name === "list-room-sessions"
      ) {
        return await executeSessionTool(name, args || {}, client, request);
      }
      // Export tools (check BEFORE recording tools - export-recording-metadata contains "recording")
      else if (name.includes("export-")) {
        return await executeExportTool(name, args || {}, request, { apiUrl });
      }
      // Recording management tools
      else if (
        name.includes("recording") ||
        name === "get-recordings" ||
        name === "archive-recording" ||
        name === "unarchive-recording"
      ) {
        return await executeRecordingTool(name, args || {}, client);
      }
      // Live session control tools
      else if (
        name === "start-transcription" ||
        name === "stop-transcription" ||
        name === "phone-participants-joined" ||
        name === "phone-participants-left" ||
        name === "raise-participant-hand" ||
        name === "lower-participant-hand" ||
        name === "raise-phone-participant-hand" ||
        name === "lower-phone-participant-hand" ||
        name === "connect-phone" ||
        name === "disconnect-phone" ||
        name === "start-restreamer" ||
        name === "stop-restreamer"
      ) {
        return await executeLiveSessionTool(name, args || {}, client);
      }
      // Quiz management tools
      else if (name.includes("quiz")) {
        return await executeQuizTool(name, args || {}, client);
      }
      // Communication management tools
      else if (
        name.includes("-chats") ||
        name.includes("-qa") ||
        name.includes("-transcripts") ||
        name.includes("-summaries") ||
        name === "delete-session-recordings" ||
        name === "delete-session-resources"
      ) {
        return await executeCommunicationTool(name, args || {}, client);
      }
      // Poll management tools
      else if (name.includes("poll")) {
        return await executePollTool(name, args || {}, client);
      }
      // Library management tools
      else if (
        name.includes("library") ||
        name.includes("libraries") ||
        name.includes("webapp") ||
        name.includes("whiteboard") ||
        name === "get-file-links"
      ) {
        return await executeLibraryTool(name, args || {}, client);
      }
      // Role management tools
      else if (name.includes("role") || name === "get-permissions") {
        return await executeRoleTool(name, args || {}, client);
      }
      // Webhook management tools
      else if (name.includes("webhook") || name === "list-webhook-events") {
        return await executeWebhookTool(name, args || {}, client);
      }

      // Check if user tried to call a resource name as a tool
      if (resourceToToolMap[name]) {
        const suggestedTool = resourceToToolMap[name];
        throw new McpError(
          ErrorCode.InvalidRequest,
          `'${name}' is a resource, not a tool. Use the '${suggestedTool}' tool instead.`
        );
      }

      logger.error(`Unknown tool requested: ${name}`);
      throw new McpError(ErrorCode.InvalidRequest, `Unknown tool: ${name}`);
    } catch (error: any) {
      logger.error(`Tool execution error: ${error.message}`, error);

      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${error.message}`,
      );
    }
  });

  return server;
}

export {
  VERSION,
  VERSION_INFO,
  GIT_COMMIT,
  GIT_REF,
  COMMITS_AHEAD,
  getDisplayVersion,
  isDevBuild,
};
