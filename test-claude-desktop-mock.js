#!/usr/bin/env node

/**
 * This script tests the Claude Desktop MCP server by creating a mock
 * stdin/stdout environment that simulates the Claude Desktop integration.
 * It validates that the server can process MCP protocol messages properly.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear existing logs
const logFile = path.join(__dirname, 'claude-desktop-mock.log');
fs.writeFileSync(logFile, '');

// Log function that writes to both console and file
function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, `${message}\n`);
}

// Hardcoded API key for testing (use a valid API key)
// This is just for local testing, not for production
const apiKey = process.env.DIGITAL_SAMBA_API_KEY || 'test-api-key';

// Determine CLI script path
const cliPath = path.join(__dirname, 'dist', 'bin', 'cli.js');

// Log startup
log('Starting Digital Samba MCP server with mock Claude Desktop integration');
log(`API Key: ${apiKey.substring(0, 5)}...`);
log(`CLI Path: ${cliPath}`);

// Define a sample MCP initialize message
const initializeMsg = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    capabilities: {
      resources: {},
      tools: {}
    },
    client: {
      name: 'Claude Desktop (Mock)',
      version: '1.0.0'
    }
  },
  id: 1
};

// Run the CLI script with stdio pipes
const proc = spawn('node', [cliPath, apiKey], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    MCP_JSON_RPC_MODE: 'true'
  }
});

// Handle process events
proc.on('error', (err) => {
  log(`Failed to start server process: ${err.message}`);
  process.exit(1);
});

proc.on('exit', (code) => {
  log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Log that we've started the process
log(`Server process started with PID: ${proc.pid}`);

// Set up data processing for stdout
proc.stdout.on('data', (data) => {
  const output = data.toString();
  log(`Received from server: ${output}`);
  
  try {
    // Try to parse as JSON, might throw if partial or non-JSON output
    const message = JSON.parse(output);
    
    // If we got an initialize response, send a listTools message
    if (message.id === 1 && message.result) {
      log('Successfully received initialize response, sending listTools request');
      
      // Send a listTools request
      const listToolsMsg = {
        jsonrpc: '2.0',
        method: 'listTools',
        params: {},
        id: 2
      };
      
      proc.stdin.write(JSON.stringify(listToolsMsg) + '\n');
      log(`Sent listTools request: ${JSON.stringify(listToolsMsg)}`);
    }
    
    // If we got a listTools response, we have confirmed successful communication
    if (message.id === 2 && message.result) {
      log('Successfully received listTools response, server is working correctly!');
      log(`Available tools: ${JSON.stringify(message.result.tools)}`);
      
      // Successfully validated, now close the server
      setTimeout(() => {
        log('Test completed successfully, shutting down');
        proc.kill('SIGTERM');
      }, 1000);
    }
  } catch (e) {
    log(`Error parsing server output: ${e.message}`);
  }
});

// Wait a moment, then send initialize message
setTimeout(() => {
  log(`Sending initialize message: ${JSON.stringify(initializeMsg)}`);
  proc.stdin.write(JSON.stringify(initializeMsg) + '\n');
}, 500);

// Keep process running and handle termination signals
process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down server...');
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down server...');
  proc.kill('SIGTERM');
});

// Force exit after 10 seconds if test hasn't completed
setTimeout(() => {
  log('Test timeout exceeded, forcing exit');
  proc.kill('SIGKILL');
  process.exit(1);
}, 10000);
