#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your Digital Samba MCP server project
const serverDir = __dirname;

// Parse arguments for API key
const args = process.argv.slice(2);
let apiKey = '';
const apiKeyIndex = args.findIndex(arg => arg === '--api-key' || arg === '-k');
if (apiKeyIndex !== -1 && apiKeyIndex + 1 < args.length) {
  apiKey = args[apiKeyIndex + 1];
}

// Create environment with API key
const env = {
  ...process.env,
  PORT: '3000',
  DIGITAL_SAMBA_API_URL: 'https://api.digitalsamba.com/api/v1'
};

if (apiKey) {
  env.DIGITAL_SAMBA_API_KEY = apiKey;
  console.log(`Starting Digital Samba MCP server with API key: ${apiKey.substring(0, 5)}...`);
} else {
  console.log('Starting Digital Samba MCP server (no API key provided)');
  console.log('You will need to provide an API key in the Authorization header of each request');
}

console.log(`Server directory: ${serverDir}`);
console.log(`Server will run on port: ${env.PORT}`);
console.log(`API URL: ${env.DIGITAL_SAMBA_API_URL}`);
console.log('Starting server...');

// Find the location of Node.js executable
const isWindows = process.platform === 'win32';
const nodeExecutable = process.execPath;
console.log(`Node executable: ${nodeExecutable}`);

// Determine the best way to run the server
let command, commandArgs;

// Check if the dist/index.js file exists (compiled JavaScript)
if (existsSync(path.join(serverDir, 'dist', 'index.js'))) {
  console.log('Found compiled JavaScript. Running with Node.js directly.');
  command = nodeExecutable;
  commandArgs = [path.join(serverDir, 'dist', 'index.js')];
} else {
  // If not, try to run using tsx for TypeScript
  console.log('No compiled JavaScript found. Trying to run with tsx...');
  
  // Check if we're on Windows
  if (isWindows) {
    // On Windows, use npx to run tsx
    command = nodeExecutable;
    commandArgs = [
      path.join(serverDir, 'node_modules', '.bin', 'tsx.cmd'),
      path.join(serverDir, 'src', 'index.ts')
    ];
  } else {
    // On Unix, use the tsx executable directly
    command = path.join(serverDir, 'node_modules', '.bin', 'tsx');
    commandArgs = [path.join(serverDir, 'src', 'index.ts')];
  }
}

console.log(`Running command: ${command} ${commandArgs.join(' ')}`);

// Run the server
const proc = spawn(command, commandArgs, {
  cwd: serverDir,
  env,
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...');
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...');
  proc.kill('SIGTERM');
});

proc.on('error', (err) => {
  console.error('Failed to start server process:', err);
});

proc.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

console.log('Digital Samba MCP server wrapper is running. Press Ctrl+C to stop.');
