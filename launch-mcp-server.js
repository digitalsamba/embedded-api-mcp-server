#!/usr/bin/env node

/**
 * Digital Samba MCP Server Launcher
 * 
 * This script properly launches the Digital Samba MCP server for use with Claude Desktop.
 * It suppresses console output that would interfere with the MCP protocol.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from command line arguments
const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Error: API key is required');
  console.error('Usage: node launch-mcp-server.js YOUR_API_KEY');
  process.exit(1);
}

// Configuration
const PORT = 4001;
const LOG_FILE = path.join(__dirname, 'launcher.log');
const SERVER_LOG = path.join(__dirname, 'server-launch.log');

// Setup logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage);
};

// Log to file instead of console to avoid breaking JSON-RPC communication
log('Launcher started');
log(`API Key: ${apiKey.substring(0, 5)}...`);

// Create environment variables for the server
const env = {
  ...process.env,
  PORT: PORT.toString(),
  DIGITAL_SAMBA_API_URL: 'https://api.digitalsamba.com/api/v1',
  AUTHORIZATION: `Bearer ${apiKey}`,
  LOG_LEVEL: 'debug'
};

// Check if port is already in use
const checkPort = () => {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${PORT} is already in use`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(PORT);
  });
};

// Launch the server
const launchServer = async () => {
  try {
    // Check if port is available
    const portAvailable = await checkPort();
    if (!portAvailable) {
      log(`ERROR: Port ${PORT} is already in use. Cannot start server.`);
      process.exit(1);
    }
    
    log('Port is available, launching server...');
    
    // Determine which script to run
    let command, args;
    
    if (fs.existsSync(path.join(__dirname, 'node_modules', '.bin', 'tsx'))) {
      log('Using tsx to run TypeScript source');
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        command = path.join(__dirname, 'node_modules', '.bin', 'tsx.cmd');
      } else {
        command = path.join(__dirname, 'node_modules', '.bin', 'tsx');
      }
      args = [path.join(__dirname, 'src', 'index.ts')];
    } else if (fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
      log('Using node to run compiled JavaScript');
      command = process.execPath; // Current node executable
      args = ['--no-warnings', path.join(__dirname, 'dist', 'index.js')];
    } else {
      log('ERROR: Could not find server code to run');
      process.exit(1);
    }
    
    // Open file for server output
    const serverLogStream = fs.openSync(SERVER_LOG, 'w');
    
    // Launch the server process
    log(`Launching: ${command} ${args.join(' ')}`);
    const serverProcess = spawn(command, args, {
      env,
      stdio: ['ignore', serverLogStream, serverLogStream],
      detached: true
    });
    
    // Detach the process so it continues running if this script exits
    serverProcess.unref();
    
    // Handle server exit (should not happen under normal circumstances)
    serverProcess.on('exit', (code) => {
      log(`Server process exited with code ${code}`);
    });
    
    // Wait for server to start
    log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if server is running
    try {
      const checkServer = () => {
        return new Promise((resolve, reject) => {
          const req = http.request({
            host: 'localhost',
            port: PORT,
            path: '/health',
            method: 'GET',
            timeout: 2000
          }, (res) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else {
              reject(new Error(`Health check failed with status: ${res.statusCode}`));
            }
          });
          
          req.on('error', (err) => {
            reject(err);
          });
          
          req.end();
        });
      };
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          await checkServer();
          log('Server is running and healthy!');
          break;
        } catch (err) {
          attempts++;
          log(`Health check attempt ${attempts} failed: ${err.message}`);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            log('WARNING: Server may not be running correctly');
          }
        }
      }
    } catch (err) {
      log(`Error checking server health: ${err.message}`);
    }
    
    // Keep this script running to maintain control of the server process
    log('Launcher will now stay running...');
    
    // Handle script termination to clean up the server
    process.on('SIGINT', () => {
      log('Received SIGINT signal, shutting down server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log('Received SIGTERM signal, shutting down server...');
      process.exit(0);
    });
    
  } catch (err) {
    log(`Error launching server: ${err.message}`);
    process.exit(1);
  }
};

// Run the main function
launchServer();
