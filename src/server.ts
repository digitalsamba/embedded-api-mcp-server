/**
 * Digital Samba MCP Server Factory
 *
 * Creates and configures the MCP server with all tools and resources.
 * This module is transport-agnostic - it can be used with stdio or HTTP transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { DigitalSambaApiClient } from "./digital-samba-api.js";
import { getApiKeyFromRequest } from "./auth.js";
import logger from "./logger.js";
import { setUserAgentVersion } from "./user-agent.js";
import {
  clientLabel,
  keyFingerprint,
  logToolCall,
  ToolOutcome,
} from "./usage-log.js";

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
  registerAccountTools,
  executeAccountTool,
  ACCOUNT_TOOL_NAMES,
} from "./tools/account-management/index.js";
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
  DIAGNOSTICS_TOOL_NAMES,
  registerDiagnosticsTools,
  executeDiagnosticsTool,
} from "./tools/diagnostics-tools/index.js";

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
// Capped: in the hosted multi-tenant server every distinct OAuth token creates
// an entry, so an unbounded map grows for the life of the process.
const API_CLIENT_CACHE_MAX = 500;
let apiClientCache: Map<string, DigitalSambaApiClient> = new Map();

/**
 * Get or create API client with the provided API key and URL
 *
 * Uses composite cache key (apiKey:apiUrl) to ensure OAuth sessions
 * get clients with the correct /oauth-api/v1/* URL while direct API key
 * sessions get clients with /api/v1/* URL.
 *
 * LRU eviction: Map preserves insertion order, so re-inserting on access
 * keeps the oldest-used entry first and evictable.
 */
function getApiClient(apiKey: string, apiUrl: string): DigitalSambaApiClient {
  const cacheKey = `${apiKey}:${apiUrl}`;
  const cached = apiClientCache.get(cacheKey);
  if (cached) {
    apiClientCache.delete(cacheKey);
    apiClientCache.set(cacheKey, cached);
    return cached;
  }

  if (apiClientCache.size >= API_CLIENT_CACHE_MAX) {
    const oldestKey = apiClientCache.keys().next().value;
    if (oldestKey !== undefined) {
      apiClientCache.delete(oldestKey);
    }
  }

  const client = new DigitalSambaApiClient(apiKey, apiUrl);
  apiClientCache.set(cacheKey, client);
  return client;
}

/**
 * Resource to tool mapping for helpful error messages
 */
const resourceToToolMap: Record<string, string> = {
  rooms: "list-rooms",
  room: "get-room-details",
  "rooms-live": "list-live-rooms",
  "rooms-live-participants": "list-live-participants",
  "room-live": "list-live-rooms",
  "room-live-participants": "list-live-participants",
  "room-settings": "get-default-room-settings",
  sessions: "list-sessions",
  session: "get-session-details",
  "session-participants": "list-session-participants",
  "session-statistics": "get-session-statistics",
  "room-sessions": "list-room-sessions",
  recordings: "get-recordings",
  recording: "get-recording-details",
  "team-analytics": "get-usage-statistics",
  "room-analytics": "get-room-analytics",
  "session-analytics": "get-session-analytics",
  content: "list-libraries",
  "content-library": "get-library",
};

export interface ServerConfig {
  /** API key for Digital Samba API (optional - can be provided per-request in HTTP mode) */
  apiKey?: string;
  /** Base URL for Digital Samba API */
  apiUrl?: string;
}

/**
 * Convert a handler result to a valid ReadResource result.
 *
 * The export and library resource handlers return tool-style content
 * (`{ content | contents: [{ type: "text", text }] }`) because the matching
 * reader tools reuse them. A resource read must return
 * `{ contents: [{ uri, text, mimeType }] }`; clients reject anything else.
 */
function asResourceContents(
  uri: string,
  mimeType: string,
  result: { content?: unknown; contents?: unknown },
): { contents: { uri: string; mimeType: string; text: string }[] } {
  const items = result.contents ?? result.content;
  return {
    contents: (Array.isArray(items) ? items : []).map((item) => ({
      uri: typeof item?.uri === "string" ? item.uri : uri,
      mimeType: typeof item?.mimeType === "string" ? item.mimeType : mimeType,
      text: typeof item?.text === "string" ? item.text : "",
    })),
  };
}

function listAllTools(): any[] {
  return [
    ...registerRoomTools(),
    ...registerSessionTools(),
    ...registerRecordingTools(),
    ...registerAnalyticsTools(),
    ...registerAccountTools(),
    ...registerLiveSessionTools(),
    ...registerCommunicationTools(),
    ...registerPollTools(),
    ...registerQuizTools(),
    ...registerLibraryTools(),
    ...registerRoleTools(),
    ...registerWebhookTools(),
    ...registerExportTools(),
    ...registerDiagnosticsTools(),
  ];
}

let requiredByTool: Map<string, string[]> | null = null;

/**
 * Check a call for the required ID arguments it is missing.
 *
 * Nothing enforced inputSchema.required, so a missing or misnamed ID (both
 * room_id and roomId conventions exist across tools) reached the API as
 * "/undefined" and came back as a 404 for something that exists.
 *
 * Only ID arguments are enforced. Some schemas mark other fields required
 * that callers have always been able to omit (create-room's name is not even
 * an API field, #37), and failing those calls now would break working clients.
 *
 * @returns an error message naming what is missing, or null if complete
 */
export function missingRequiredArguments(
  toolName: string,
  args: Record<string, unknown> | undefined,
): string | null {
  requiredByTool ??= new Map(
    listAllTools().map((t) => [
      t.name,
      ((t.inputSchema?.required ?? []) as string[]).filter((k) =>
        /id$/i.test(k),
      ),
    ]),
  );
  const required = requiredByTool.get(toolName);
  if (!required?.length) return null;

  const given = args ?? {};
  const missing = required.filter(
    (key) =>
      given[key] === undefined ||
      given[key] === null ||
      (typeof given[key] === "string" && (given[key] as string).trim() === ""),
  );
  if (!missing.length) return null;

  // Point out the other naming convention when that is what was sent.
  const norm = (k: string) => k.toLowerCase().replace(/_/g, "");
  const hints = missing
    .map((key) => {
      const sent = Object.keys(given).find(
        (k) => k !== key && norm(k) === norm(key),
      );
      return sent ? `${key} (you sent ${sent}; this tool uses ${key})` : key;
    })
    .join(", ");
  return `Missing required argument(s) for ${toolName}: ${hints}. Nothing was sent to the API.`;
}

/**
 * Creates and configures the MCP server with all handlers
 */
export function createServer(config: ServerConfig = {}): Server {
  setUserAgentVersion(VERSION);
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

  const apiUrl =
    config.apiUrl ||
    process.env.DIGITAL_SAMBA_API_URL ||
    "https://api.digitalsamba.com/api/v1";

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

    // Room-scoped collections are owned by the session and recording modules.
    // They must be matched before the generic rooms prefix, which would
    // otherwise answer them with the room object itself.
    if (/^digitalsamba:\/\/rooms\/[^/]+\/sessions$/.test(uri)) {
      return handleSessionResource(uri, {}, request, { apiUrl });
    } else if (/^digitalsamba:\/\/rooms\/[^/]+\/recordings$/.test(uri)) {
      return handleRecordingResource(uri, client);
    } else if (uri.startsWith("digitalsamba://rooms")) {
      return handleRoomResource(uri, {}, request, { apiUrl });
    } else if (uri.startsWith("digitalsamba://sessions")) {
      return handleSessionResource(uri, {}, request, { apiUrl });
    } else if (uri.startsWith("digitalsamba://recordings")) {
      return handleRecordingResource(uri, client);
    } else if (uri.startsWith("digitalsamba://analytics")) {
      return handleAnalyticsResource(uri, client);
    } else if (uri.startsWith("digitalsamba://exports")) {
      const exportResources = new ExportResources(client);
      return asResourceContents(
        uri,
        "text/plain",
        await exportResources.handleResourceRequest(uri),
      );
    } else if (
      // The library resources are advertised as digitalsamba://libraries...;
      // "content" was the only prefix routed, so none of them could be read.
      // It stays as an alias.
      uri.startsWith("digitalsamba://libraries") ||
      uri.startsWith("digitalsamba://content")
    ) {
      return asResourceContents(
        uri,
        "application/json",
        await handleContentResource(uri, client),
      );
    }

    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown resource URI: ${uri}`,
    );
  });

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = listAllTools();

    logger.debug(`ListToolsRequest: Registered ${allTools.length} total tools`);

    return { tools: allTools };
  });

  // ctx.apiStatus carries the API's HTTP status out of the catch below, before
  // the error is rewrapped as an McpError, for the usage log.
  const callTool = async (
    request: CallToolRequest,
    ctx: { apiStatus?: number },
  ) => {
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

    const missing = missingRequiredArguments(name, args);
    if (missing) {
      throw new McpError(ErrorCode.InvalidParams, missing);
    }

    try {
      // Call diagnostics tools
      if ((DIAGNOSTICS_TOOL_NAMES as readonly string[]).includes(name)) {
        return await executeDiagnosticsTool(name, args || {}, client);
      }
      // Room management tools
      else if (
        name === "create-room" ||
        name === "update-room" ||
        name === "delete-room" ||
        name === "generate-token" ||
        name === "get-default-room-settings" ||
        name === "update-default-room-settings" ||
        name === "list-rooms" ||
        name === "get-room-details" ||
        name === "list-live-rooms" ||
        name === "list-live-participants" ||
        name === "delete-rooms-by-tag" ||
        name === "list-room-participants" ||
        name === "delete-room-resources"
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
        name === "get-participant-analytics" ||
        name === "get-plan-usage" ||
        name === "get-current-period-statistics" ||
        name === "get-usage-by-tag" ||
        name === "list-started-sessions"
      ) {
        return await executeAnalyticsTool(name, args || {}, client);
      }
      // Account administration tools (alert recipients, system checks)
      else if ((ACCOUNT_TOOL_NAMES as readonly string[]).includes(name)) {
        return await executeAccountTool(name, args || {}, client);
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
      // export-room-transcripts belongs to the communication module below
      else if (name.includes("export-") && name !== "export-room-transcripts") {
        return await executeExportTool(name, args || {}, request, { apiUrl });
      }
      // Recording management tools
      // delete-session-recordings contains "recording" but belongs to the
      // communication module below; routed here it could never run.
      else if (
        (name.includes("recording") && name !== "delete-session-recordings") ||
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
        name === "update-participant" ||
        name === "raise-participant-hand" ||
        name === "lower-participant-hand" ||
        name === "raise-phone-participant-hand" ||
        name === "lower-phone-participant-hand" ||
        name === "mute-phone-participant" ||
        name === "unmute-phone-participant" ||
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
      // (all Q&A interaction tools contain "question"; live-answer tools are
      // named *-question-live-answer so they match too)
      else if (
        name.includes("-chats") ||
        name.includes("-qa") ||
        name.includes("-transcripts") ||
        name.includes("-summaries") ||
        name.includes("question") ||
        name === "send-chat-message" ||
        name === "list-chat-messages" ||
        name === "delete-room-shared-notes" ||
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
          `'${name}' is a resource, not a tool. Use the '${suggestedTool}' tool instead.`,
        );
      }

      logger.error(`Unknown tool requested: ${name}`);
      throw new McpError(ErrorCode.InvalidRequest, `Unknown tool: ${name}`);
    } catch (error: any) {
      logger.error(`Tool execution error: ${error.message}`, error);
      if (typeof error?.statusCode === "number") {
        ctx.apiStatus = error.statusCode;
      }

      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${error.message}`,
      );
    }
  };

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const started = Date.now();
    const ctx: { apiStatus?: number } = {};
    const base = () => ({
      tool: request.params.name,
      ms: Date.now() - started,
      session: extra?.sessionId,
      // The HTTP transport puts the caller's key in apiKeyContext; the API
      // client uses that one first, so fingerprint the same key.
      caller: keyFingerprint(getApiKeyFromRequest(null) ?? getApiKey()),
      client: clientLabel(server.getClientVersion()),
    });
    try {
      const result = await callTool(request, ctx);
      logToolCall({
        ...base(),
        outcome: result?.isError ? "tool_error" : "ok",
      });
      return result;
    } catch (error) {
      let outcome: ToolOutcome = "error";
      if (error instanceof McpError) {
        if (error.code === ErrorCode.InvalidParams) outcome = "invalid_params";
        else if (error.code === ErrorCode.InvalidRequest) {
          outcome = "invalid_request";
        }
      }
      logToolCall({ ...base(), outcome, status: ctx.apiStatus });
      throw error;
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
