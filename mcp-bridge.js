#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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
const LOG_FILE = path.join(__dirname, 'mcp-launcher.log');

// Setup logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${message}\n`);
};

// Log basic info
log('Starting Digital Samba MCP Server launcher');
log(`Working directory: ${__dirname}`);
log(`API key: ${apiKey.substring(0, 5)}...`);

// Create environment for the server
const env = {
  ...process.env,
  PORT: PORT.toString(),
  DIGITAL_SAMBA_API_URL: 'https://api.digitalsamba.com/api/v1',
  AUTHORIZATION: `Bearer ${apiKey}`,
  LOG_LEVEL: 'debug'
};

// Determine the server path
let serverPath;
if (fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
  serverPath = path.join(__dirname, 'dist', 'index.js');
  log(`Using compiled version: ${serverPath}`);
} else if (fs.existsSync(path.join(__dirname, 'src', 'index.ts'))) {
  serverPath = path.join(__dirname, 'src', 'index.ts');
  log(`Using TypeScript source: ${serverPath}`);
} else {
  log('Error: Could not find server code');
  process.exit(1);
}

// This function will be the only thing we output to stdout/stderr
// This function should return a valid JSON-RPC response for the initialize request
const respondToInitialize = () => {
  const response = {
    jsonrpc: '2.0',
    id: 0,
    result: {
      serverInfo: {
        name: 'Digital Samba MCP Server',
        version: '0.1.0'
      },
      capabilities: {
        resources: {},
        tools: {},
        prompts: {}
      }
    }
  };
  
  // Write to stdout
  process.stdout.write(JSON.stringify(response) + '\n');
};

// Start MCP server with no stdout/stderr output
const startServer = () => {
  let command, args;
  
  if (serverPath.endsWith('.ts')) {
    // For TypeScript, use tsx
    const isWindows = process.platform === 'win32';
    command = isWindows ? 
      path.join(__dirname, 'node_modules', '.bin', 'tsx.cmd') : 
      path.join(__dirname, 'node_modules', '.bin', 'tsx');
    args = [serverPath];
  } else {
    // For JavaScript, use node
    command = process.execPath;
    args = ['--no-warnings', serverPath];
  }
  
  log(`Starting server: ${command} ${args.join(' ')}`);
  
  // Launch the actual server process
  const serverProcess = spawn(command, args, {
    cwd: __dirname,
    env: env,
    stdio: 'ignore',  // Don't capture any output
    detached: true    // Allow it to run independently
  });
  
  // Detach so it keeps running
  serverProcess.unref();
  
  log('Server process started and detached');
};

// The actual execution
try {
  // Give the process a moment to start
  setTimeout(() => {
    startServer();
    log('Wait for server to start...');
    
    // Wait a bit longer before responding to initialize
    setTimeout(() => {
      log('Sending initialize response');
      respondToInitialize();
    }, 1000);
  }, 200);
} catch (error) {
  log(`Error: ${error.message}`);
  log(error.stack);
  process.exit(1);
}

// Keep this process running
setInterval(() => {
  // Just keep alive
}, 60000);
