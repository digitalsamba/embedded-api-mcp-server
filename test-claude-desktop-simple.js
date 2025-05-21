#!/usr/bin/env node

/**
 * This script provides a direct test of the MCP CLI script without requiring
 * a full build process. It will help diagnose issues with the Claude Desktop integration.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear existing logs
const logFile = path.join(__dirname, 'claude-desktop-simple-test.log');
fs.writeFileSync(logFile, '');

// Log function that writes to both console and file
function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, `${message}\n`);
}

// Hardcoded API key for testing
const apiKey = process.env.DIGITAL_SAMBA_API_KEY || 'test-api-key';

// Determine CLI script path - use the direct bin path
const cliPath = path.join(__dirname, 'bin', 'cli.js');

// Log startup
log('Starting direct test of Digital Samba MCP CLI script');
log(`API Key: ${apiKey.substring(0, 5)}...`);
log(`CLI Path: ${cliPath}`);

// Create debug function to inspect what's happening
async function checkFileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Check if the CLI file exists
(async () => {
  const cliExists = await checkFileExists(cliPath);
  log(`CLI file exists: ${cliExists}`);
  
  if (!cliExists) {
    log('CLI file does not exist. Cannot proceed with test.');
    process.exit(1);
  }
  
  // Run the CLI script directly
  log('Starting CLI process with node...');
  
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
        name: 'Claude Desktop (Simple Test)',
        version: '1.0.0'
      }
    },
    id: 1
  };
  
  // Run the CLI script with stdio pipes for direct JSON-RPC communication
  const proc = spawn('node', [cliPath, apiKey, '--port', '3001'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      MCP_JSON_RPC_MODE: 'true',
      DEBUG: 'true',
      NODE_OPTIONS: '--trace-warnings'
    }
  });
  
  // Handle process events
  proc.on('error', (err) => {
    log(`Failed to start CLI process: ${err.message}`);
    process.exit(1);
  });
  
  proc.on('exit', (code) => {
    log(`CLI process exited with code ${code || 0}`);
    process.exit(code || 0);
  });
  
  // Log that we've started the process
  log(`CLI process started with PID: ${proc.pid}`);
  
  // Set up data processing for stdout
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    log(`Received from CLI: ${output}`);
    
    try {
      // Try to parse as JSON, might throw if partial or non-JSON output
      if (output.startsWith('{') && output.endsWith('}')) {
        const message = JSON.parse(output);
        
        if (message.id === 1 && message.result) {
          log('Successfully received initialize response! MCP communication is working.');
          
          // Test passed, shut down after a short delay
          setTimeout(() => {
            log('Test completed successfully, shutting down');
            proc.kill('SIGTERM');
          }, 1000);
        }
      }
    } catch (e) {
      log(`Error parsing CLI output: ${e.message}`);
    }
  });
  
  // Wait a moment, then send initialize message
  setTimeout(() => {
    log(`Sending initialize message: ${JSON.stringify(initializeMsg)}`);
    proc.stdin.write(JSON.stringify(initializeMsg) + '\n');
  }, 1000);
  
  // Force exit after 10 seconds if test hasn't completed
  setTimeout(() => {
    log('Test timeout exceeded, forcing exit');
    proc.kill('SIGKILL');
    process.exit(1);
  }, 10000);
})();
