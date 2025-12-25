#!/usr/bin/env node

/**
 * Digital Samba MCP Server
 *
 * A Model Context Protocol server that provides AI assistants with tools
 * to interact with Digital Samba's video conferencing API.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config as loadEnv } from "dotenv";

// Load environment variables
loadEnv();

// Local imports
import { DigitalSambaApiClient } from "./digital-samba-api.js";
import logger from "./logger.js";

// Import resources and tools
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

// Import version information
import { VERSION, PACKAGE_NAME, VERSION_INFO } from "./version.js";

// Create MCP server with actual version
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

// API client instance (created per request with API key)
let apiClient: DigitalSambaApiClient | null = null;

/**
 * Get or create API client with the provided API key
 */
function getApiClient(apiKey: string): DigitalSambaApiClient {
  if (!apiClient) {
    const baseUrl =
      process.env.DIGITAL_SAMBA_API_URL ||
      "https://api.digitalsamba.com/api/v1";
    apiClient = new DigitalSambaApiClient(apiKey, baseUrl);
  }
  return apiClient;
}

// Add version resource
const versionResource = {
  uri: "digitalsamba://version",
  name: "server-version",
  description: `[Server Info] Get the current version and build information of ${PACKAGE_NAME}. Use when users ask: "what version is this", "check version", "server version", "mcp version", "build info".`,
  mimeType: "application/json",
};

// Register handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // For listing resources, we don't need an API key - just return the schema
  // API key will be checked when actually reading resources
  const apiKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;

  // Create a dummy client if needed for analytics registration
  let client = null;
  if (apiKey) {
    client = getApiClient(apiKey);
  }

  return {
    resources: [
      versionResource,
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
  const apiKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "DIGITAL_SAMBA_DEVELOPER_KEY not configured",
    );
  }

  const client = getApiClient(apiKey);
  const { uri } = request.params;

  logger.debug(`Reading resource: ${uri}`);

  // Handle version resource
  if (uri === "digitalsamba://version") {
    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(VERSION_INFO, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }

  // Route to appropriate handler based on URI prefix
  if (uri.startsWith("digitalsamba://rooms")) {
    return handleRoomResource(uri, {}, request, {
      apiUrl:
        process.env.DIGITAL_SAMBA_API_URL ||
        "https://api.digitalsamba.com/api/v1",
    });
  } else if (uri.startsWith("digitalsamba://sessions")) {
    return handleSessionResource(uri, {}, request, {
      apiUrl:
        process.env.DIGITAL_SAMBA_API_URL ||
        "https://api.digitalsamba.com/api/v1",
    });
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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // For listing tools, we don't need an API key - just return the schema
  // API key will be checked when actually executing tools
  const allTools = [
    {
      name: "get-server-version",
      description: `[Server Info] Get the current version and build information of the MCP server. Use to check: "server version", "what version is running", "is this the latest version", "build time". Current version: ${VERSION}`,
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    ...registerRoomTools(),
    ...registerSessionTools(),
    ...registerRecordingTools(),
    ...registerAnalyticsTools(),
    ...registerLiveSessionTools(),
    ...registerCommunicationTools(),
    ...registerPollTools(),
    ...registerLibraryTools(),
    ...registerRoleTools(),
    ...registerWebhookTools(),
    ...registerExportTools(),
  ];
  
  // Log export tools for debugging
  const exportTools = allTools.filter(t => t.name.includes('export'));
  logger.debug(`ListToolsRequest: Registered ${allTools.length} total tools`);
  logger.debug(`Export tools (${exportTools.length}): ${exportTools.map(t => t.name).join(', ')}`);
  
  return {
    tools: allTools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const apiKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "DIGITAL_SAMBA_DEVELOPER_KEY not configured",
    );
  }

  const client = getApiClient(apiKey);
  const { name, arguments: args } = request.params;

  logger.debug(`Executing tool: ${name}`);

  try {
    // Route to appropriate tool handler based on name
    // Version tool
    if (name === "get-server-version") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(VERSION_INFO, null, 2),
          },
        ],
      };
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
      name === "list-live-participants"
    ) {
      return await executeRoomTool(name, args || {}, request, {
        apiUrl:
          process.env.DIGITAL_SAMBA_API_URL ||
          "https://api.digitalsamba.com/api/v1",
      });
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
      name === "list-sessions" ||
      name === "get-session-details" ||
      name === "list-session-participants" ||
      name === "list-room-sessions"
    ) {
      return await executeSessionTool(name, args || {}, client, request);
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
      name === "phone-participants-left"
    ) {
      return await executeLiveSessionTool(name, args || {}, client);
    }
    // Export tools (moved before communication tools to avoid conflicts)
    else if (name.includes("export-")) {
      logger.debug(`Routing export tool: ${name} to executeExportTool`);
      return await executeExportTool(name, args || {}, request, {
        apiUrl:
          process.env.DIGITAL_SAMBA_API_URL ||
          "https://api.digitalsamba.com/api/v1",
      });
    }
    // Communication management tools
    else if (
      name.includes("-chats") ||
      name.includes("-qa") ||
      name.includes("-transcripts") ||
      name.includes("-summaries")
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
    // This happens when Claude Desktop shows resources in the tools menu
    const resourceToToolMap: Record<string, string> = {
      // Room resources → tools
      "rooms": "list-rooms",
      "room": "get-room-details",
      "rooms-live": "list-live-rooms",
      "rooms-live-participants": "list-live-participants",
      "room-live": "list-live-rooms",
      "room-live-participants": "list-live-participants",
      "room-settings": "get-default-room-settings",
      // Session resources → tools
      "sessions": "list-sessions",
      "session": "get-session-details",
      "session-participants": "list-session-participants",
      "session-statistics": "get-session-statistics",
      "room-sessions": "list-room-sessions",
      // Recording resources → tools
      "recordings": "get-recordings",
      "recording": "get-recording-details",
      // Analytics resources → tools
      "team-analytics": "get-usage-statistics",
      "room-analytics": "get-room-analytics",
      "session-analytics": "get-session-analytics",
      // Content resources → tools
      "content": "list-libraries",
      "content-library": "get-library",
      // Version
      "server-version": "get-server-version",
    };

    if (resourceToToolMap[name]) {
      const suggestedTool = resourceToToolMap[name];
      throw new McpError(
        ErrorCode.InvalidRequest,
        `'${name}' is a resource, not a tool. Use the '${suggestedTool}' tool instead.`
      );
    }

    logger.error(`Unknown tool requested: ${name}`, {
      availablePatterns: [
        'get-server-version',
        'create-room, update-room, delete-room, etc.',
        'get-participant-statistics, get-room-analytics, etc.',
        'end-session, get-session-summary, etc.',
        'delete-recording, update-recording, etc.',
        'start-transcription, stop-transcription, etc.',
        'delete-session-chats, delete-room-chats, etc.',
        'create-poll, update-poll, etc.',
        'includes("library") or includes("libraries")',
        'includes("role") or get-permissions',
        'includes("webhook") or list-webhook-events',
        'includes("export-")'
      ]
    });
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

/**
 * Start the MCP server
 */
async function main() {
  const args = process.argv.slice(2);

  // Check for developer key in command line args
  const apiKeyArgIndex = args.findIndex(
    (arg) => arg === "--developer-key" || arg === "-k",
  );
  if (apiKeyArgIndex !== -1 && args[apiKeyArgIndex + 1]) {
    process.env.DIGITAL_SAMBA_DEVELOPER_KEY = args[apiKeyArgIndex + 1];
  }

  // Log developer key status (don't exit if not found - it will be checked when needed)
  if (!process.env.DIGITAL_SAMBA_DEVELOPER_KEY) {
    logger.warn(
      "DIGITAL_SAMBA_DEVELOPER_KEY not set. Developer key will be required for operations.",
    );
  } else {
    logger.info("Developer key configured");
  }

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Show version on start if enabled (default: true)
  if (process.env.DS_SHOW_VERSION_ON_START !== "false") {
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info(`Digital Samba Embedded API MCP Server`);
    logger.info(`Package: ${PACKAGE_NAME}`);
    logger.info(`Version: ${VERSION}`);
    if (VERSION_INFO.buildTime !== "development") {
      logger.info(`Build: ${VERSION_INFO.buildTime}`);
    }
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("Server started and waiting for client connection...");
  } else {
    logger.info(`${PACKAGE_NAME}@${VERSION} started`);
  }
  logger.debug(`Full build info:`, VERSION_INFO);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down Digital Samba MCP Server...");
    await server.close();
    process.exit(0);
  });
}

// Export main for programmatic use
export { main };

// Run the server if this is the main module
// Skip this check during testing
if (
  typeof jest === "undefined" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
