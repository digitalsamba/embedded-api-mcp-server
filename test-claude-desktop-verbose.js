#!/usr/bin/env node

/**
 * This script tests the Claude Desktop MCP server by running it
 * directly with verbose logging enabled.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear existing logs
const logFile = path.join(__dirname, 'claude-desktop-verbose.log');
fs.writeFileSync(logFile, '');

// Hardcoded API key for testing (use a valid API key)
// This is just for local testing, not for production
const apiKey = process.env.DIGITAL_SAMBA_API_KEY || 'test-api-key';

// Determine CLI script path
const cliPath = path.join(__dirname, 'bin', 'cli.js');

// Log startup
console.log('Starting Digital Samba MCP server in verbose mode');
console.log(`API Key: ${apiKey.substring(0, 5)}...`);
console.log(`CLI Path: ${cliPath}`);

// Run the CLI script with debugging enabled
const proc = spawn(process.execPath, [
  '--trace-warnings',
  cliPath,
  apiKey,
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DEBUG: 'true',
    LOG_LEVEL: 'debug',
    MCP_FORCE_START: 'true',
    NODE_OPTIONS: '--trace-warnings --trace-uncaught'
  }
});

// Handle process events
proc.on('error', (err) => {
  console.error(`Failed to start server process: ${err.message}`);
  fs.appendFileSync(logFile, `ERROR: Failed to start server process: ${err.message}\n`);
  process.exit(1);
});

proc.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  fs.appendFileSync(logFile, `Server process exited with code ${code}\n`);
  process.exit(code);
});

// Log that we've started the process
fs.appendFileSync(logFile, `Started server process, PID: ${proc.pid}\n`);
console.log(`Server process started with PID: ${proc.pid}`);

// Keep process running and handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...');
  fs.appendFileSync(logFile, 'Received SIGINT signal, shutting down server...\n');
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...');
  fs.appendFileSync(logFile, 'Received SIGTERM signal, shutting down server...\n');
  proc.kill('SIGTERM');
});
