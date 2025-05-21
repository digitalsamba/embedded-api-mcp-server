#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseArgs } from 'node:util';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variable to indicate we're in JSON-RPC mode when running via MCP
if (!process.stdout.isTTY) {
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
    help: {
      type: 'boolean',
      short: 'h',
      default: false
    }
  },
  allowPositionals: true
});

// Display help information if requested
if (args.help) {
  console.log(`
Digital Samba MCP Server

Usage: npx digital-samba-mcp-server [options] [API_KEY]

Options:
  -p, --port <port>                 Port to run the server on (default: 4521)
  -k, --api-key <key>               Digital Samba API key
  -u, --api-url <url>               Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
  -l, --log-level <level>           Log level (default: info)
  -w, --webhook-secret <secret>     Secret for webhook verification
  -e, --webhook-endpoint <path>     Webhook endpoint path (default: /webhooks/digitalsamba)
  --public-url <url>                Public URL for the server (for webhook callbacks)
  -h, --help                        Display this help message

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

// If NO_CONSOLE_OUTPUT is set, completely suppress console output
if (process.env.NO_CONSOLE_OUTPUT === 'true') {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Replace with no-op functions
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
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
  if (!process.env.MCP_JSON_RPC_MODE) {
    console.error('No API key provided. Please specify an API key using --api-key or as a positional argument, or set DIGITAL_SAMBA_API_KEY environment variable.');
  }
  process.exit(1);
}

// Start the server
try {
  // Try a direct import first
  import('../dist/src/index.js').then(module => {
    // Check if we're in JSON-RPC mode (for MCP communication)
    const isJsonRpcMode = process.env.MCP_JSON_RPC_MODE === 'true' || !process.stdout.isTTY;
    
    if (!isJsonRpcMode) {
      console.log('Starting Digital Samba MCP Server...');
    }
    
    // Check if module has the startServer function
    if (typeof module.startServer !== 'function') {
      console.error('ERROR: startServer function not found in module. This may indicate a build issue.');
      console.error('Module exports:', Object.keys(module));
      process.exit(1);
    }
    
    // Start the server with enhanced error handling
    try {
      const server = module.startServer();
      
      // Add error handling for the server
      if (server && typeof server.on === 'function') {
        server.on('error', (err) => {
          console.error('Server error:', err.message);
          process.exit(1);
        });
      }
    } catch (startError) {
      console.error('Error starting server:', startError.message);
      console.error(startError.stack);
      process.exit(1);
    }
  }).catch(importError => {
    console.error('Failed to import server module:', importError.message);
    console.error('This may indicate a build issue or missing files.');
    console.error('Try running "npm run build" before starting the server.');
    console.error(importError.stack);
    process.exit(1);
  });
} catch (error) {
  console.error('Critical error loading server:', error.message);
  console.error(error.stack);
  process.exit(1);
}
