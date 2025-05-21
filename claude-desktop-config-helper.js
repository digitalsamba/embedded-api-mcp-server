#!/usr/bin/env node

/**
 * Claude Desktop Integration Helper
 * 
 * This script generates the proper configuration for Claude Desktop
 * and creates a claude-desktop-config.json file that can be copied
 * into Claude Desktop's configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from command line arguments
const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Error: API key is required');
  console.error('Usage: node claude-desktop-config-helper.js YOUR_API_KEY');
  process.exit(1);
}

// Prepare configuration
const batFile = path.resolve(__dirname, 'claude-desktop-wrapper.bat');
const config = {
  mcpServers: {
    Digital_Samba: {
      command: batFile.replace(/\\/g, '\\\\'),
      args: [apiKey]
    }
  }
};

// Write configuration to file
const configFile = path.resolve(__dirname, 'claude-desktop-config.json');
fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

console.log(`Configuration file generated at: ${configFile}`);
console.log('');
console.log('To use this with Claude Desktop:');
console.log('1. Open Claude Desktop');
console.log('2. Go to Settings > Advanced > MCP Servers');
console.log('3. Add a new Server with the following configuration:');
console.log(`   - Name: Digital Samba`);
console.log(`   - Command: ${batFile.replace(/\\/g, '\\\\')}`);
console.log(`   - Args: [${apiKey}]`);
console.log('4. Save and select Digital Samba from the MCP server dropdown');
console.log('');
console.log('Alternatively, you can add the following to your Claude Desktop configuration:');
console.log(JSON.stringify({ mcpServers: { Digital_Samba: config.mcpServers.Digital_Samba } }, null, 2));
