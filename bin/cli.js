#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseArgs } from 'node:util';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Parse command-line arguments
const { values: args, positionals } = parseArgs({
  options: {
    port: {
      type: 'string',
      short: 'p',
      default: '3000'
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

Usage: npx digital-samba-mcp [options] [API_KEY]

Options:
  -p, --port <port>                 Port to run the server on (default: 3000)
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
  npx digital-samba-mcp YOUR_API_KEY
  npx digital-samba-mcp --api-key YOUR_API_KEY
  npx digital-samba-mcp --port 4000 --api-key YOUR_API_KEY --log-level debug
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

// Set API key from options or positional arguments
if (args['api-key']) {
  process.env.DIGITAL_SAMBA_API_KEY = args['api-key'];
} else if (positionals && positionals.length > 0) {
  // Use the first positional argument as the API key
  process.env.DIGITAL_SAMBA_API_KEY = positionals[0];
  console.log(`Using API key from positional argument: ${positionals[0].substring(0, 5)}...`);
} else if (positionalArgs.length > 0) {
  // Fallback for older Node.js versions
  process.env.DIGITAL_SAMBA_API_KEY = positionalArgs[0];
  console.log(`Using API key from positional argument: ${positionalArgs[0].substring(0, 5)}...`);
}

// Start the server
import('../dist/src/index.js').then(module => {
  // Check if we're in JSON-RPC mode (for MCP communication)
  const isJsonRpcMode = process.env.MCP_JSON_RPC_MODE === 'true' || !process.stdout.isTTY;
  
  if (!isJsonRpcMode) {
    console.log('Starting Digital Samba MCP Server...');
  }
  
  module.startServer();
}).catch(error => {
  // Always show critical errors, even in JSON-RPC mode
  console.error('Failed to start server:', error);
  process.exit(1);
});
