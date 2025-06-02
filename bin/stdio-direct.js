#!/usr/bin/env node

// Direct stdio server for Claude Desktop
// Simply imports and runs the main server which already handles stdio

// Import the main server entry point
import '../dist/src/index.js';

// The main server handles everything including stdio transport
// No additional setup needed