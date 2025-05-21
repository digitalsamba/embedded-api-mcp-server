/**
 * Simple MCP Server Debugging Wrapper
 * 
 * This script helps debug MCP server issues by:
 * 1. Showing detailed logging of all protocol messages
 * 2. Adding a sync initialize handler to ensure proper connection
 * 3. Testing connection at startup
 */

// Import required modules
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// Configuration
const DEBUG_LOG_FILE = 'mcp-debug-log.txt';
const DETAILED_LOGGING = true;

// Clear previous log
if (fs.existsSync(DEBUG_LOG_FILE)) {
  fs.unlinkSync(DEBUG_LOG_FILE);
}

// Set up logging function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  
  // Log to file
  fs.appendFileSync(DEBUG_LOG_FILE, formattedMessage + '\n');
  
  // Also log to stderr (which doesn't interfere with JSON-RPC)
  console.error(formattedMessage);
};

log('Starting MCP Server Debug Wrapper');

// Parse command line to find API key
const apiKeyArg = process.argv.find(arg => arg.startsWith('--api-key='));
const apiKey = apiKeyArg ? apiKeyArg.split('=')[1] : process.argv[2];

if (!apiKey) {
  log('Error: No API key provided. Please supply an API key.');
  process.exit(1);
}

log(`API Key detected (masked): ${apiKey.substring(0, 4)}...`);

// Set environment variables for our server
const env = {
  ...process.env,
  DIGITAL_SAMBA_API_KEY: apiKey,
  MCP_JSON_RPC_MODE: 'true',
  MCP_DEBUG: 'true',
  NODE_OPTIONS: '--trace-warnings',
  DEBUG: '*'
};

// Find the server script path
let serverPath = './bin/cli.js';
if (!fs.existsSync(serverPath)) {
  serverPath = './dist/src/index.js';
  if (!fs.existsSync(serverPath)) {
    log('Error: Could not find server script. Please build the project first.');
    process.exit(1);
  }
}

log(`Using server path: ${serverPath}`);

// Track message state
let initialized = false;
let pendingRequests = new Map();
let lastRequestId = 0;

// Start the server process
log('Launching MCP server process...');
const server = spawn('node', [serverPath], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Set up stdio handlers
server.stdout.on('data', (data) => {
  const messages = data.toString().trim().split('\n');
  
  for (const message of messages) {
    try {
      // Only process JSON-RPC messages
      if (message.trim().startsWith('{') && message.includes('"jsonrpc":"2.0"')) {
        handleServerMessage(message);
      } else if (DETAILED_LOGGING) {
        log(`Non-JSON output: ${message}`);
      }
    } catch (error) {
      log(`Error processing message: ${error.message}`);
      log(`Problematic message: ${message}`);
    }
  }
});

// Forward all stderr output to our log
server.stderr.on('data', (data) => {
  log(`SERVER STDERR: ${data.toString().trim()}`);
});

// Send a message to the server
const sendToServer = (message) => {
  try {
    const messageStr = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    if (DETAILED_LOGGING) {
      log(`CLIENT -> SERVER: ${messageStr}`);
    }
    
    server.stdin.write(messageStr + '\n');
  } catch (error) {
    log(`Error sending message to server: ${error.message}`);
  }
};

// Handle messages from the server
const handleServerMessage = (messageStr) => {
  try {
    if (DETAILED_LOGGING) {
      log(`SERVER -> CLIENT: ${messageStr}`);
    }
    
    const message = JSON.parse(messageStr);
    
    // Handle initialization response
    if (message.id === 0 && message.result && !initialized) {
      initialized = true;
      log('Server initialized successfully!');
      
      // Test listing resources
      testListResources();
    }
    
    // Handle response to our test requests
    if (pendingRequests.has(message.id)) {
      const request = pendingRequests.get(message.id);
      log(`Received response for request: ${request.method}`);
      pendingRequests.delete(message.id);
    }
    
    // Forward message to stdout (to the client)
    process.stdout.write(messageStr + '\n');
  } catch (error) {
    log(`Error handling server message: ${error.message}`);
  }
};

// Send initialization message to server
const initializeServer = () => {
  const initMessage = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "debug-wrapper",
        version: "1.0.0"
      }
    }
  };
  
  log('Sending initialization message...');
  sendToServer(initMessage);
  
  // Store this as a pending request
  pendingRequests.set(0, {
    method: "initialize",
    sentAt: Date.now()
  });
};

// Test listing resources
const testListResources = () => {
  const requestId = ++lastRequestId;
  const listResourcesMessage = {
    jsonrpc: "2.0",
    id: requestId,
    method: "resources/list",
    params: {}
  };
  
  log('Testing resources/list...');
  sendToServer(listResourcesMessage);
  
  // Store this as a pending request
  pendingRequests.set(requestId, {
    method: "resources/list",
    sentAt: Date.now()
  });
};

// Set up process event handlers
process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down...');
  server.kill();
  process.exit(0);
});

server.on('error', (error) => {
  log(`Server process error: ${error.message}`);
});

server.on('exit', (code, signal) => {
  log(`Server process exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

// Set up message forwarding from client to server
process.stdin.on('data', (data) => {
  const messages = data.toString().trim().split('\n');
  
  for (const message of messages) {
    try {
      // Verify it's a JSON-RPC message before forwarding
      if (message.trim().startsWith('{') && message.includes('"jsonrpc":"2.0"')) {
        // Parse to keep track of requests
        const parsed = JSON.parse(message);
        if (parsed.id !== undefined && parsed.method) {
          // Store this as a pending request
          pendingRequests.set(parsed.id, {
            method: parsed.method,
            sentAt: Date.now()
          });
          
          if (DETAILED_LOGGING) {
            log(`CLIENT REQUEST: ${parsed.method} (ID: ${parsed.id})`);
          }
        }
        
        // Forward to server
        sendToServer(message);
      } else if (DETAILED_LOGGING) {
        log(`Ignoring non-JSON input: ${message}`);
      }
    } catch (error) {
      log(`Error processing client message: ${error.message}`);
    }
  }
});

// Periodically check for timed-out requests
setInterval(() => {
  const now = Date.now();
  
  // Look for requests that have been pending for more than 20 seconds
  for (const [id, request] of pendingRequests.entries()) {
    const elapsedTime = now - request.sentAt;
    
    if (elapsedTime > 20000) {
      log(`WARNING: Request ${request.method} (ID: ${id}) has been pending for ${elapsedTime}ms`);
    }
  }
}, 5000);

// Check connection state for debugging
setInterval(() => {
  if (!initialized) {
    log('WARNING: Server has not initialized yet!');
  } else {
    log(`Connection status: Initialized with ${pendingRequests.size} pending requests`);
  }
}, 10000);

// Start the initialization process
log('Starting server initialization...');
initializeServer();
