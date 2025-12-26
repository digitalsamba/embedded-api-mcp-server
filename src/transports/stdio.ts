/**
 * Stdio Transport for Digital Samba MCP Server
 *
 * Traditional stdio-based transport for local MCP connections.
 * Used when running the server locally via Claude Desktop or CLI.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer, VERSION, VERSION_INFO } from "../server.js";
import { PACKAGE_NAME } from "../version.js";
import logger from "../logger.js";

export interface StdioTransportConfig {
  /** API key for Digital Samba API */
  apiKey?: string;
  /** Base URL for Digital Samba API */
  apiUrl?: string;
  /** Show version banner on start (default: true) */
  showVersion?: boolean;
}

/**
 * Start the stdio transport server
 */
export async function startStdioServer(config: StdioTransportConfig = {}): Promise<void> {
  const apiKey = config.apiKey || process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  const apiUrl = config.apiUrl || process.env.DIGITAL_SAMBA_API_URL;
  const showVersion = config.showVersion ?? process.env.DS_SHOW_VERSION_ON_START !== "false";

  // Log API key status
  if (!apiKey) {
    logger.warn(
      "DIGITAL_SAMBA_DEVELOPER_KEY not set. Developer key will be required for operations.",
    );
  } else {
    logger.info("Developer key configured");
  }

  // Create server with config
  const server = createServer({ apiKey, apiUrl });

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Show version banner
  if (showVersion) {
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info(`Digital Samba Embedded API MCP Server`);
    logger.info(`Package: ${PACKAGE_NAME}`);
    logger.info(`Version: ${VERSION}`);
    logger.info(`Transport: stdio`);
    if (VERSION_INFO.buildTime !== "development") {
      logger.info(`Build: ${VERSION_INFO.buildTime}`);
    }
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("Server started and waiting for client connection...");
  } else {
    logger.info(`${PACKAGE_NAME}@${VERSION} started (stdio)`);
  }

  logger.debug(`Full build info:`, VERSION_INFO);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down Digital Samba MCP Server...");
    await server.close();
    process.exit(0);
  });
}
