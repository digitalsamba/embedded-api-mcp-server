#!/usr/bin/env node

/**
 * Digital Samba MCP Server
 *
 * A Model Context Protocol server that provides AI assistants with tools
 * to interact with Digital Samba's video conferencing API.
 *
 * Supports two transport modes:
 * - stdio (default): For local Claude Desktop / CLI usage
 * - http: For remote/hosted deployment
 *
 * Set TRANSPORT=http to enable HTTP mode.
 */

import { config as loadEnv } from "dotenv";

// Load environment variables
loadEnv();

import logger from "./logger.js";
import { startStdioServer } from "./transports/stdio.js";
import { startHttpServer } from "./transports/http.js";

// Re-export for programmatic use
export { createServer } from "./server.js";
export { startStdioServer } from "./transports/stdio.js";
export { startHttpServer } from "./transports/http.js";

/**
 * Parse command line arguments
 */
function parseArgs(): {
  transport: "stdio" | "http";
  apiKey?: string;
  port?: number;
} {
  const args = process.argv.slice(2);
  const result: { transport: "stdio" | "http"; apiKey?: string; port?: number } = {
    transport: (process.env.TRANSPORT as "stdio" | "http") || "stdio",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--developer-key" || arg === "-k") {
      result.apiKey = args[++i];
    } else if (arg === "--transport" || arg === "-t") {
      const transport = args[++i];
      if (transport === "stdio" || transport === "http") {
        result.transport = transport;
      } else {
        logger.error(`Invalid transport: ${transport}. Use 'stdio' or 'http'.`);
        process.exit(1);
      }
    } else if (arg === "--port" || arg === "-p") {
      result.port = parseInt(args[++i], 10);
    } else if (arg === "--http") {
      result.transport = "http";
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Digital Samba MCP Server

Usage:
  digitalsamba-mcp [options]

Options:
  -k, --developer-key <key>  Digital Samba API developer key
  -t, --transport <type>     Transport mode: stdio (default) or http
  --http                     Shorthand for --transport http
  -p, --port <port>          Port for HTTP transport (default: 3000)
  -h, --help                 Show this help message

Environment Variables:
  DIGITAL_SAMBA_DEVELOPER_KEY  API developer key
  DIGITAL_SAMBA_API_URL        API base URL (default: https://api.digitalsamba.com/api/v1)
  TRANSPORT                    Transport mode: stdio or http
  PORT                         Port for HTTP transport
  HOST                         Host for HTTP transport (default: 0.0.0.0)
  NODE_ENV                     Set to 'production' to require auth in HTTP mode

Examples:
  # Local stdio mode (for Claude Desktop)
  digitalsamba-mcp --developer-key YOUR_KEY

  # HTTP mode (for remote deployment)
  digitalsamba-mcp --http --port 8080

  # Using environment variables
  TRANSPORT=http PORT=3000 digitalsamba-mcp
`);
      process.exit(0);
    }
  }

  return result;
}

/**
 * Start the MCP server
 */
async function main() {
  const config = parseArgs();

  // Set API key from command line if provided
  if (config.apiKey) {
    process.env.DIGITAL_SAMBA_DEVELOPER_KEY = config.apiKey;
  }

  try {
    if (config.transport === "http") {
      await startHttpServer({ port: config.port });
    } else {
      await startStdioServer();
    }
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`, error);
    process.exit(1);
  }
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
