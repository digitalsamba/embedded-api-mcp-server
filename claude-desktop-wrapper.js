#!/usr/bin/env node

/**
 * Claude Desktop MCP Server Wrapper
 * 
 * This script is specifically designed to run the Digital Samba MCP server
 * for Claude Desktop integration. It suppresses console output to avoid
 * interfering with the JSON-RPC protocol communication.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from command line arguments
const apiKey = process.argv[2];
if (!apiKey) {
  // Write to a log file instead of console to avoid breaking JSON-RPC
  const logError = (msg) => {
    fs.appendFileSync(
      path.join(__dirname, 'claude-desktop-error.log'),
      `${new Date().toISOString()} - ${msg}\n`
    );
  };
  
  logError('Error: API key is required');
  logError('Usage: node claude-desktop-wrapper.js YOUR_API_KEY');
  process.exit(1);
}

// Determine CLI script path
const cliPath = path.join(__dirname, 'bin', 'cli.js');

// Suppress all console output to avoid interfering with JSON-RPC
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Redirect console output to log file
const logFile = path.join(__dirname, 'claude-desktop.log');
const logger = (level, ...args) => {
  try {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    fs.appendFileSync(logFile, `${timestamp} [${level}] ${message}\n`);
  } catch (err) {
    // If logging fails, we don't want to crash the process
  }
};

// Override console methods
console.log = (...args) => logger('INFO', ...args);
console.error = (...args) => logger('ERROR', ...args);
console.warn = (...args) => logger('WARN', ...args);
console.info = (...args) => logger('INFO', ...args);

// Log startup
console.log(`Starting Digital Samba MCP server for Claude Desktop`);
console.log(`API Key: ${apiKey.substring(0, 5)}...`);
console.log(`CLI Path: ${cliPath}`);

// Run the CLI script with environment variables set for JSON-RPC mode
const proc = spawn(process.execPath, [cliPath, apiKey], {
  stdio: 'inherit', // Pass stdio through to the parent process
  env: {
    ...process.env,
    MCP_JSON_RPC_MODE: 'true',
    LOG_LEVEL: 'error', // Only show errors in the log
    NODE_ENV: 'production'
  }
});

// Handle process termination
proc.on('error', (err) => {
  console.error(`Failed to start server process: ${err.message}`);
  process.exit(1);
});

proc.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Keep process running and handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...');
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...');
  proc.kill('SIGTERM');
});
