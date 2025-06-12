#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import { parseArgs } from "node:util";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MCP servers always run in stdio mode - detect if we're in a piped environment
const isPipedMode = !process.stdout.isTTY;

// In piped mode (Claude Desktop), ensure only JSON-RPC messages go to stdout
if (isPipedMode) {
  process.env.MCP_JSON_RPC_MODE = "true";

  // Redirect console output to stderr to keep stdout clean for JSON-RPC
  console.log = (...args) => process.stderr.write(`[LOG] ${args.join(" ")}\n`);
  console.error = (...args) =>
    process.stderr.write(`[ERROR] ${args.join(" ")}\n`);
  console.warn = (...args) =>
    process.stderr.write(`[WARN] ${args.join(" ")}\n`);
  console.info = (...args) =>
    process.stderr.write(`[INFO] ${args.join(" ")}\n`);
  console.debug = (...args) =>
    process.stderr.write(`[DEBUG] ${args.join(" ")}\n`);
}

// Parse command-line arguments
const { values: args, positionals } = parseArgs({
  options: {
    version: {
      type: "boolean",
      short: "v",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
    "developer-key": {
      type: "string",
      short: "k",
    },
    "api-url": {
      type: "string",
      short: "u",
      default: "https://api.digitalsamba.com/api/v1",
    },
    "log-level": {
      type: "string",
      short: "l",
      default: "info",
    },
    "show-version-on-start": {
      type: "boolean",
      default: true,
    },
  },
  allowPositionals: true,
});

// Check if version flag is set
if (args.version) {
  try {
    // Try to load version info from the built version file
    const versionModule = await import("../src/version.js").catch(async () => {
      // Fallback to reading package.json directly
      const fs = await import("fs");
      const packageJsonPath = resolve(__dirname, "..", "package.json");
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      return {
        VERSION: packageData.version,
        PACKAGE_NAME: packageData.name,
        BUILD_TIME: "development",
      };
    });
    console.log(`${versionModule.PACKAGE_NAME} v${versionModule.VERSION}`);
    if (versionModule.BUILD_TIME !== "development") {
      console.log(`Build time: ${versionModule.BUILD_TIME}`);
    }
  } catch (error) {
    console.error("Could not read version information");
  }
  process.exit(0);
}

// Display help information if requested
if (args.help) {
  console.log(`
Digital Samba Embedded API MCP Server

Usage: npx @digitalsamba/embedded-api-mcp-server [options] [API_KEY]

Options:
  -v, --version                     Show version information
  -h, --help                        Display this help message
  -k, --developer-key <key>         Digital Samba developer key
  -u, --api-url <url>               Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
  -l, --log-level <level>           Log level (default: info)

Environment Variables:
  DIGITAL_SAMBA_DEVELOPER_KEY       Digital Samba developer key
  DIGITAL_SAMBA_API_URL             Digital Samba API URL
  DS_LOG_LEVEL                      Log level

Examples:
  npx @digitalsamba/embedded-api-mcp-server YOUR_DEVELOPER_KEY
  npx @digitalsamba/embedded-api-mcp-server --developer-key YOUR_DEVELOPER_KEY
  npx @digitalsamba/embedded-api-mcp-server --developer-key YOUR_DEVELOPER_KEY --log-level debug

For use with Claude Desktop, add to your config file:
  {
    "mcpServers": {
      "digitalsamba": {
        "command": "npx",
        "args": ["@digitalsamba/embedded-api-mcp-server", "--developer-key", "YOUR_DEVELOPER_KEY"]
      }
    }
  }
`);
  process.exit(0);
}

// Set environment variables from command-line arguments
process.env.DS_LOG_LEVEL = args["log-level"];
process.env.DIGITAL_SAMBA_API_URL = args["api-url"];
process.env.DS_SHOW_VERSION_ON_START = args["show-version-on-start"]
  ? "true"
  : "false";

// Set developer key from options or positional arguments or environment variable
if (args["developer-key"]) {
  process.env.DIGITAL_SAMBA_DEVELOPER_KEY = args["developer-key"];
} else if (positionals && positionals.length > 0) {
  // Use the first positional argument as the API key
  process.env.DIGITAL_SAMBA_DEVELOPER_KEY = positionals[0];
} else if (!process.env.DIGITAL_SAMBA_DEVELOPER_KEY) {
  // Developer key not provided - will be checked when needed
  if (!isPipedMode) {
    console.warn(
      "No developer key provided. Server will start but API operations will fail.",
    );
    console.warn(
      "Provide a developer key using --developer-key, as a positional argument, or via DIGITAL_SAMBA_DEVELOPER_KEY environment variable.",
    );
  }
}

// Start the server
async function startServer() {
  // Find the server entry point
  const paths = [
    resolve(__dirname, "../dist/src/index.js"), // Production build
    resolve(__dirname, "../src/index.js"), // Development (if running with tsx)
  ];

  let serverPath;
  for (const path of paths) {
    if (existsSync(path)) {
      serverPath = path;
      break;
    }
  }

  if (!serverPath) {
    console.error(
      'Could not find server entry point. Make sure to run "npm run build" first.',
    );
    console.error("Searched paths:", paths);
    process.exit(1);
  }

  try {
    if (!isPipedMode) {
      console.log("Starting Digital Samba Embedded API MCP Server...");
    }

    // Convert to file URL for cross-platform compatibility
    const fileUrl = pathToFileURL(serverPath).href;
    const serverModule = await import(fileUrl);

    // Call the main function if it exists
    if (serverModule.main && typeof serverModule.main === "function") {
      await serverModule.main();
    }
    // Otherwise the server starts on import
  } catch (error) {
    console.error("Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle errors gracefully
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  // Don't exit in piped mode to maintain connection
  if (!isPipedMode) {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  // Don't exit in piped mode to maintain connection
  if (!isPipedMode) {
    process.exit(1);
  }
});

// Start the server
startServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
