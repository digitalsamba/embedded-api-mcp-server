#!/usr/bin/env node

/**
 * Local Test Script for Digital Samba MCP
 * 
 * This script simulates running the package via npx by directly calling the bin/cli.js file.
 * It's useful for local development and testing before publishing to npm.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from command line arguments
const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Error: API key is required');
  console.error('Usage: node test-local-npx.js YOUR_API_KEY [--port PORT] [--log-level LEVEL]');
  process.exit(1);
}

// Build the arguments array
const args = [path.join(__dirname, 'bin', 'cli.js'), apiKey];

// Pass through any additional arguments
if (process.argv.length > 3) {
  args.push(...process.argv.slice(3));
}

console.log(`Starting local test with: node ${args.join(' ')}`);

// Run the CLI script
const proc = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down...');
  proc.kill('SIGINT');
});

proc.on('error', (err) => {
  console.error('Failed to start process:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
