#!/usr/bin/env node

/**
 * MCP Protocol Proxy for Digital Samba Server
 * 
 * This script acts as a bridge between Claude Desktop and the Digital Samba MCP Server.
 * It launches the server in the background and handles the MCP protocol communication.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';
import readline from 'readline';

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
const PORT = 4001;
const LOG_FILE = path.join(__dirname, 'mcp-proxy.log');

// Setup logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${message}\n`);
};

// Clear log file on startup
fs.writeFileSync(LOG_FILE, '');

// Log initial info
log('Starting Digital Samba MCP Proxy');
log(`Working directory: ${__dirname}`);
log(`API key: ${apiKey.substring(0, 5)}...`);

// Handle all requests from Claude Desktop (stdin) and forward to the MCP server
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
        log(`Received message from Claude Desktop: ${JSON.stringify(message)}`);
        
        // Handle the message
        await handleMessage(message);
      } catch (error) {
        log(`Error parsing message: ${error.message}`);
        log(`Problematic message: ${line}`);
      }
    }
  }
};

// Handle MCP messages
const handleMessage = async (message) => {
  // Check if it's an initialize message
  if (message.method === 'initialize') {
    log('Handling initialize request directly');
    
    // Start the actual MCP server
    startActualServer();
    
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Respond to initialize
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
    
    // Send response to Claude Desktop
    sendResponse(response);
    
    return;
  }
  
  // For all other messages, forward to the actual MCP server
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };
  
  try {
    const response = await httpRequest(options, JSON.stringify(message));
    log(`Received response from actual server: ${response}`);
    sendResponse(JSON.parse(response));
  } catch (error) {
    log(`Error forwarding message to actual server: ${error.message}`);
    
    // Send error response to Claude
    const errorResponse = {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32000,
        message: `Failed to communicate with MCP server: ${error.message}`
      }
    };
    
    sendResponse(errorResponse);
  }
};

// Helper function for HTTP requests
const httpRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`HTTP request failed with status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
};

// Send response to Claude Desktop
const sendResponse = (response) => {
  log(`Sending response to Claude Desktop: ${JSON.stringify(response)}`);
  process.stdout.write(JSON.stringify(response) + '\n');
};

// Start the actual Digital Samba MCP server
const startActualServer = () => {
  log('Starting actual Digital Samba MCP server...');
  
  // Environment for the actual server
  const env = {
    ...process.env,
    PORT: PORT.toString(),
    DIGITAL_SAMBA_API_URL: 'https://api.digitalsamba.com/api/v1',
    AUTHORIZATION: `Bearer ${apiKey}`,
    LOG_LEVEL: 'debug'
  };
  
  // Determine the server path
  let serverPath, command, args;
  
  if (fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
    serverPath = path.join(__dirname, 'dist', 'index.js');
    command = process.execPath; // node
    args = ['--no-warnings', serverPath];
    log(`Using compiled version: ${serverPath}`);
  } else if (fs.existsSync(path.join(__dirname, 'src', 'index.ts'))) {
    serverPath = path.join(__dirname, 'src', 'index.ts');
    const isWindows = process.platform === 'win32';
    command = isWindows ? 
      path.join(__dirname, 'node_modules', '.bin', 'tsx.cmd') : 
      path.join(__dirname, 'node_modules', '.bin', 'tsx');
    args = [serverPath];
    log(`Using TypeScript source: ${serverPath}`);
  } else {
    log('Error: Could not find server code');
    return;
  }
  
  log(`Starting server: ${command} ${args.join(' ')}`);
  
  // Create a log file for the actual server
  const serverLogFile = fs.openSync(path.join(__dirname, 'actual-server.log'), 'w');
  
  // Launch the actual server process
  const serverProcess = spawn(command, args, {
    cwd: __dirname,
    env: env,
    stdio: ['ignore', serverLogFile, serverLogFile],
    detached: true
  });
  
  // Detach so it keeps running
  serverProcess.unref();
  
  log('Actual server process started');
  
  // Check if server is up
  setTimeout(async () => {
    try {
      const healthResponse = await httpRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET'
      });
      
      log(`Server health check successful: ${healthResponse}`);
    } catch (error) {
      log(`Server health check failed: ${error.message}`);
    }
  }, 3000);
};

// Start handling messages
handleStdinMessages();

// Keep the proxy process running
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

log('MCP proxy initialized and waiting for messages');
