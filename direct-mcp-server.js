#!/usr/bin/env node

/**
 * Digital Samba MCP Server - Minimal Direct Implementation
 * 
 * This script implements a minimal MCP server directly, without trying to proxy to another server.
 * It provides essential functionality to interact with Digital Samba API.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import http from 'http';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from command line arguments
const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Error: API key is required');
  process.exit(1);
}

// Configuration
const LOG_FILE = path.join(__dirname, 'direct-mcp.log');
const API_URL = 'https://api.digitalsamba.com/api/v1';

// Clear log file on startup
fs.writeFileSync(LOG_FILE, '');

// Setup logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${message}\n`);
};

// Log initial info
log('Starting Digital Samba MCP Server (Direct Implementation)');
log(`API key: ${apiKey.substring(0, 5)}...`);

// Keep track of request IDs
let idCounter = 1;

// Handle all requests from Claude Desktop (stdin)
const handleStdinMessages = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: null, // No output to stdout directly
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        // Parse the message from Claude Desktop
        const message = JSON.parse(line);
        log(`Received message: ${JSON.stringify(message)}`);
        
        // Process the message
        await processMessage(message);
      } catch (error) {
        log(`Error processing message: ${error.message}`);
        log(`Problematic message: ${line}`);
        
        // Try to identify the message ID for error response
        let id = null;
        try {
          const message = JSON.parse(line);
          id = message.id;
        } catch (e) {
          // Ignore parsing errors here
        }
        
        // Send error response if possible
        if (id !== null) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: `Internal error: ${error.message}`
            }
          });
        }
      }
    }
  }
};

// Process MCP messages
const processMessage = async (message) => {
  switch (message.method) {
    case 'initialize':
      handleInitialize(message);
      break;
    case 'listResources':
      handleListResources(message);
      break;
    case 'readResource':
      await handleReadResource(message);
      break;
    case 'listTools':
      handleListTools(message);
      break;
    case 'callTool':
      await handleCallTool(message);
      break;
    case 'shutdown':
      handleShutdown(message);
      break;
    default:
      log(`Unknown method: ${message.method}`);
      sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        }
      });
  }
};

// Handle initialize request
const handleInitialize = (message) => {
  log('Handling initialize request');
  
  const response = {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      serverInfo: {
        name: 'Digital Samba MCP Server',
        version: '0.1.0'
      },
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  };
  
  sendResponse(response);
};

// Handle listResources request
const handleListResources = (message) => {
  log('Handling listResources request');
  
  const response = {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      resources: [
        {
          uri: 'digitalsamba://rooms',
          description: 'List all rooms'
        }
      ]
    }
  };
  
  sendResponse(response);
};

// Handle readResource request
const handleReadResource = async (message) => {
  const uri = message.params.uri;
  log(`Handling readResource request for ${uri}`);
  
  if (uri === 'digitalsamba://rooms') {
    try {
      const rooms = await listRooms();
      
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          contents: [
            {
              uri: 'digitalsamba://rooms',
              text: JSON.stringify(rooms, null, 2)
            }
          ]
        }
      };
      
      sendResponse(response);
    } catch (error) {
      log(`Error reading resource: ${error.message}`);
      sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: `Error reading resource: ${error.message}`
        }
      });
    }
  } else {
    log(`Unknown resource URI: ${uri}`);
    sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32000,
        message: `Unknown resource URI: ${uri}`
      }
    });
  }
};

// Handle listTools request
const handleListTools = (message) => {
  log('Handling listTools request');
  
  const response = {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      tools: [
        {
          name: 'create-room',
          description: 'Create a new meeting room',
          parameters: [
            {
              name: 'name',
              description: 'Room name (min 3, max 100 characters)',
              required: true
            },
            {
              name: 'description',
              description: 'Room description (optional, max 500 characters)',
              required: false
            },
            {
              name: 'friendly_url',
              description: 'Friendly URL (optional, min 3, max 32 characters)',
              required: false
            },
            {
              name: 'privacy',
              description: '"public" or "private" (default: "public")',
              required: false
            }
          ]
        },
        {
          name: 'generate-token',
          description: 'Generate a token for joining a room',
          parameters: [
            {
              name: 'roomId',
              description: 'Room ID',
              required: true
            },
            {
              name: 'userName',
              description: 'User display name',
              required: false
            }
          ]
        }
      ]
    }
  };
  
  sendResponse(response);
};

// Handle callTool request
const handleCallTool = async (message) => {
  const toolName = message.params.name;
  const args = message.params.arguments || {};
  
  log(`Handling callTool request for ${toolName} with args: ${JSON.stringify(args)}`);
  
  switch (toolName) {
    case 'create-room':
      try {
        const room = await createRoom(args);
        
        sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`
              }
            ]
          }
        });
      } catch (error) {
        log(`Error creating room: ${error.message}`);
        sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error creating room: ${error.message}`
              }
            ],
            isError: true
          }
        });
      }
      break;
      
    case 'generate-token':
      try {
        const token = await generateToken(args.roomId, args);
        
        sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`
              }
            ]
          }
        });
      } catch (error) {
        log(`Error generating token: ${error.message}`);
        sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error generating token: ${error.message}`
              }
            ],
            isError: true
          }
        });
      }
      break;
      
    default:
      log(`Unknown tool: ${toolName}`);
      sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: `Unknown tool: ${toolName}`
        }
      });
  }
};

// Handle shutdown request
const handleShutdown = (message) => {
  log('Handling shutdown request');
  
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: null
  });
  
  // Exit after a short delay
  setTimeout(() => {
    log('Shutting down');
    process.exit(0);
  }, 100);
};

// Send response to Claude Desktop
const sendResponse = (response) => {
  log(`Sending response: ${JSON.stringify(response)}`);
  process.stdout.write(JSON.stringify(response) + '\n');
};

// API Helper: List Rooms
const listRooms = async () => {
  try {
    const response = await makeApiRequest('/rooms');
    return response.data;
  } catch (error) {
    log(`API Error (listRooms): ${error.message}`);
    throw error;
  }
};

// API Helper: Create Room
const createRoom = async (roomSettings) => {
  try {
    return await makeApiRequest('/rooms', 'POST', roomSettings);
  } catch (error) {
    log(`API Error (createRoom): ${error.message}`);
    throw error;
  }
};

// API Helper: Generate Token
const generateToken = async (roomId, tokenOptions) => {
  try {
    return await makeApiRequest(`/rooms/${roomId}/token`, 'POST', tokenOptions);
  } catch (error) {
    log(`API Error (generateToken): ${error.message}`);
    throw error;
  }
};

// Make API Request helper
const makeApiRequest = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_URL}${endpoint}`;
  log(`Making API request: ${method} ${url}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    // Return empty object for 204 No Content responses
    if (response.status === 204) {
      return {};
    }
    
    return await response.json();
  } catch (error) {
    log(`Fetch error: ${error.message}`);
    throw error;
  }
};

// Send notification to client (not used yet, but could be used for real-time updates)
const sendNotification = (method, params) => {
  const notification = {
    jsonrpc: '2.0',
    method,
    params
  };
  
  log(`Sending notification: ${JSON.stringify(notification)}`);
  process.stdout.write(JSON.stringify(notification) + '\n');
};

// Start handling messages
handleStdinMessages().catch(error => {
  log(`Fatal error: ${error.message}`);
  log(error.stack);
  process.exit(1);
});

// Keep the process running
setInterval(() => {
  // Just a heartbeat to keep the process alive
}, 30000);

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down...');
  process.exit(0);
});

log('Digital Samba MCP Server initialized and waiting for messages');
