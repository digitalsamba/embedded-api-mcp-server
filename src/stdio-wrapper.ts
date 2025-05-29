#!/usr/bin/env node

import { runFullStdioServer } from './stdio-full-server.js';

// Redirect all console output to stderr to avoid interfering with JSON-RPC
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

console.log = (...args: any[]) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.info = (...args: any[]) => process.stderr.write(`[INFO] ${args.join(' ')}\n`);
console.warn = (...args: any[]) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
console.error = (...args: any[]) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
console.debug = (...args: any[]) => process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);

export async function runStdioServer(): Promise<void> {
  // Use the full stdio server implementation
  return runFullStdioServer();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStdioServer().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}