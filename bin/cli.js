#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseArgs } from 'node:util';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command-line arguments
const { values: args } = parseArgs({
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
  }
});

// Display help information if requested
if (args.help) {
  console.log(`
Digital Samba MCP Server

Usage: digital-samba-mcp [options]

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
  digital-samba-mcp --api-key YOUR_API_KEY
  digital-samba-mcp --port 4000 --api-key YOUR_API_KEY --log-level debug
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

// Set API key if provided
if (args['api-key']) {
  process.env.DIGITAL_SAMBA_API_KEY = args['api-key'];
}

// Start the server
import('../dist/index.js').then(module => {
  console.log('Starting Digital Samba MCP Server...');
  module.startServer();
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
