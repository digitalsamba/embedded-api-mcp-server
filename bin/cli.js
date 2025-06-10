#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseArgs } from 'node:util';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for version flag early before stdio detection
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  // Don't enter stdio mode for version check
  // Continue to parse args below
} else {
  // Detect if we're running in stdio mode (for Claude Desktop)
  // This happens when:
  // 1. Not a TTY (piped)
  // 2. Has --stdio flag
  // 3. MCP_MODE environment variable is set
  var isStdioMode = !process.stdout.isTTY || process.argv.includes('--stdio') || process.env.MCP_MODE === 'stdio';
}

// Set environment variable to indicate we're in JSON-RPC mode when running via MCP
if (typeof isStdioMode !== 'undefined' && isStdioMode) {
  process.env.MCP_JSON_RPC_MODE = 'true';
  process.env.NO_CONSOLE_OUTPUT = 'true'; // Complete silence in JSON-RPC mode
  
  // Completely replace stdout write to ensure ONLY JSON is written
  const originalStdoutWrite = process.stdout.write;
  process.stdout.write = function(buffer, encoding, callback) {
    // Only allow properly formatted JSON-RPC messages
    const str = buffer.toString();
    if (str.trim().startsWith('{') && str.includes('"jsonrpc":"2.0"')) {
      return originalStdoutWrite.apply(this, arguments);
    }
    // For non-JSON messages, log to stderr instead
    process.stderr.write(`[FILTERED]: ${str}\n`);
    
    // Pretend we wrote it to maintain the expected behavior
    if (callback) callback();
    return true;
  };
  
  // Completely suppress all console output to stdout
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Only keep minimal error logging to stderr
  console.warn = (...args) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
  console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
}

// Check if we're in JSON-RPC mode (for MCP communication)
const isJsonRpcMode = process.env.MCP_JSON_RPC_MODE === 'true';

// Parse command-line arguments

// Handle positional arguments for API key
const positionalArgs = [];
let hasExplicitApiKey = false;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--api-key' || arg === '-k') {
    hasExplicitApiKey = true;
    break;
  }
  
  // If not starting with a dash, treat it as a positional argument
  if (!arg.startsWith('-') && !process.argv[i-1]?.startsWith('-')) {
    positionalArgs.push(arg);
  }
}
const { values: args, positionals } = parseArgs({
  options: {
    version: {
      type: 'boolean',
      short: 'v',
      default: false
    },
    port: {
      type: 'string',
      short: 'p',
      default: '4521'
    },
    'api-key': {
      type: 'string',
      short: 'k'
    },
    'api-url': {
      type: 'string',
      short: 'u',
      default: 'https://api.digitalsamba.com/api/v1'
    },
    'log-level': {
      type: 'string',
      short: 'l',
      default: 'info'
    },
    'webhook-secret': {
      type: 'string',
      short: 'w'
    },
    'webhook-endpoint': {
      type: 'string',
      short: 'e',
      default: '/webhooks/digitalsamba'
    },
    'public-url': {
      type: 'string',
      default: ''
    },
    // stdio flag kept for backward compatibility but has no effect
    // Server always runs in stdio mode for MCP protocol
    stdio: {
      type: 'boolean',
      default: false
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false
    }
  },
  allowPositionals: true
});

// Check if version flag is set
if (args.version) {
  try {
    // Try to load version info from the built version file
    const versionModule = await import('../dist/src/version.js').catch(async () => {
      // Fallback to reading package.json directly
      const fs = await import('fs');
      const packageJsonPath = resolve(__dirname, '..', 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return {
        VERSION: packageData.version,
        PACKAGE_NAME: packageData.name,
        BUILD_TIME: 'development'
      };
    });
    console.log(`${versionModule.PACKAGE_NAME} v${versionModule.VERSION}`);
    if (versionModule.BUILD_TIME !== 'development') {
      console.log(`Build time: ${versionModule.BUILD_TIME}`);
    }
  } catch (error) {
    console.error('Could not read version information');
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
  -p, --port <port>                 Port to run the server on (default: 4521)
  -k, --api-key <key>               Digital Samba API key
  -u, --api-url <url>               Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
  -l, --log-level <level>           Log level (default: info)
  -w, --webhook-secret <secret>     Secret for webhook verification
  -e, --webhook-endpoint <path>     Webhook endpoint path (default: /webhooks/digitalsamba)
  --public-url <url>                Public URL for the server (for webhook callbacks)
  --stdio                           [Deprecated] Server always runs in stdio mode
  -h, --help                        Display this help message
  -v, --version                     Show version information

Environment Variables:
  PORT                              Port to run the server on
  DIGITAL_SAMBA_API_KEY             Digital Samba API key
  DIGITAL_SAMBA_API_URL             Digital Samba API URL
  LOG_LEVEL                         Log level
  WEBHOOK_SECRET                    Secret for webhook verification
  WEBHOOK_ENDPOINT                  Webhook endpoint path
  PUBLIC_URL                        Public URL for the server

Examples:
  npx digital-samba-mcp-server YOUR_API_KEY
  npx digital-samba-mcp-server --api-key YOUR_API_KEY
  npx digital-samba-mcp-server --port 4000 --api-key YOUR_API_KEY --log-level debug
  `);
  process.exit(0);
}

// Set environment variables from command-line arguments
process.env.PORT = args.port;
process.env.LOG_LEVEL = args['log-level'];
process.env.DIGITAL_SAMBA_API_URL = args['api-url'];
process.env.WEBHOOK_SECRET = args['webhook-secret'];
process.env.WEBHOOK_ENDPOINT = args['webhook-endpoint'];
process.env.PUBLIC_URL = args['public-url'] || `http://localhost:${args.port}`;

// If NO_CONSOLE_OUTPUT is set, redirect console to stderr for debugging
// This allows error messages to still be visible in logs while keeping stdout clean
if (process.env.NO_CONSOLE_OUTPUT === 'true') {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Redirect to stderr instead of silencing completely
  console.log = (...args) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
  console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
  console.warn = (...args) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
  console.info = (...args) => process.stderr.write(`[INFO] ${args.join(' ')}\n`);
  console.debug = (...args) => process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);
}

// Set API key from options or positional arguments or environment variable
if (args['api-key']) {
  process.env.DIGITAL_SAMBA_API_KEY = args['api-key'];
  if (!process.env.MCP_JSON_RPC_MODE) {
    console.log(`Using API key from --api-key option: ${args['api-key'].substring(0, 5)}...`);
  }
} else if (positionals && positionals.length > 0) {
  // Use the first positional argument as the API key
  process.env.DIGITAL_SAMBA_API_KEY = positionals[0];
  if (!process.env.MCP_JSON_RPC_MODE) {
    console.log(`Using API key from positional argument: ${positionals[0].substring(0, 5)}...`);
  }
} else if (positionalArgs.length > 0) {
  // Fallback for older Node.js versions
  process.env.DIGITAL_SAMBA_API_KEY = positionalArgs[0];
  if (!process.env.MCP_JSON_RPC_MODE) {
    console.log(`Using API key from positional argument: ${positionalArgs[0].substring(0, 5)}...`);
  }
} else if (process.env.DIGITAL_SAMBA_API_KEY) {
  // API key already set in environment variable
  if (!process.env.MCP_JSON_RPC_MODE) {
    console.log(`Using API key from environment: ${process.env.DIGITAL_SAMBA_API_KEY.substring(0, 5)}...`);
  }
} else {
  if (!process.env.MCP_JSON_RPC_MODE && !isStdioMode) {
    console.error('No API key provided. Please specify an API key using --api-key or as a positional argument, or set DIGITAL_SAMBA_API_KEY environment variable.');
    process.exit(1);
  }
  // In stdio mode, API key is optional - will be checked when needed
}

// Start the server
try {
  // The server always runs in stdio mode for MCP protocol
  // The --stdio flag is kept for backward compatibility but has no effect
  
  if (!process.env.MCP_JSON_RPC_MODE && !isStdioMode) {
    console.log('Starting Digital Samba Embedded API MCP Server...');
  }
  
  // Always use stdio mode - this is the only mode supported
  console.error('[INFO] Digital Samba Embedded API MCP Server starting (stdio mode)');
  
  // Execute the direct stdio server
  import('./stdio-direct.js').catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Critical error loading server:', error.message);
  console.error(error.stack);
  process.exit(1);
}
