#!/usr/bin/env node

// Direct stdio server for Claude Desktop
// This handles the case where we need to find the correct path to index.js

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find and import the main server
async function startStdioServer() {
  // Possible paths where index.js might be located
  const paths = [
    resolve(__dirname, '../dist/src/index.js'),  // Production build
    resolve(__dirname, '../src/index.js'),       // Development
  ];
  
  for (const path of paths) {
    if (existsSync(path)) {
      console.error(`[INFO] Loading server from: ${path}`);
      try {
        const serverModule = await import(path);
        
        // The index.js file checks if it's being run directly
        // When imported, we need to manually start the server
        if (serverModule.main && typeof serverModule.main === 'function') {
          // If main is exported, call it
          await serverModule.main();
        } else {
          // Otherwise, the server should have started on import
          // If not, we may need to trigger it differently
          console.error('[INFO] Server module loaded, waiting for initialization...');
        }
        
        return; // Successfully loaded and started
      } catch (error) {
        console.error(`[ERROR] Failed to import ${path}:`, error.message);
        console.error(`[ERROR] Stack trace:`, error.stack);
      }
    }
  }
  
  console.error('[ERROR] Could not find server entry point');
  console.error('[ERROR] Searched paths:', paths);
  process.exit(1);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection:', reason);
  process.exit(1);
});

// Start the server
startStdioServer().catch(error => {
  console.error('[ERROR] Failed to start stdio server:', error);
  process.exit(1);
});