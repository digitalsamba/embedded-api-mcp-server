#!/usr/bin/env node

// Debug script to test MCP server tools and resources locally

import { createStdioServer } from './dist/src/create-stdio-server.js';

const apiKey = process.env.DIGITAL_SAMBA_API_KEY || process.argv[2];

if (!apiKey) {
  console.error('Please provide API key as argument or DIGITAL_SAMBA_API_KEY env var');
  process.exit(1);
}

console.log('🔍 Debugging MCP Server Tools and Resources\n');

// Create server
const server = createStdioServer(apiKey);

// List all resources
console.log('📚 Available Resources:');
if (server._resources) {
  for (const [name, resource] of server._resources) {
    console.log(`  - ${name}: ${resource.uri || resource}`);
  }
} else {
  console.log('  No resources found!');
}

console.log('\n🛠️ Available Tools:');
if (server._tools) {
  for (const [name, tool] of server._tools) {
    console.log(`  - ${name}`);
    if (tool.inputSchema) {
      console.log(`    Schema: ${JSON.stringify(tool.inputSchema.shape || tool.inputSchema, null, 2)}`);
    }
  }
} else {
  console.log('  No tools found!');
}

// Test specific tools
console.log('\n🧪 Testing Tools:');

// Test rooms resource
console.log('\n1. Testing rooms resource:');
try {
  const roomsResource = server._resources?.get('rooms');
  if (roomsResource && roomsResource.handler) {
    const result = await roomsResource.handler(new URL('digitalsamba://rooms'));
    console.log('Rooms result:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
  }
} catch (error) {
  console.error('Error fetching rooms:', error.message);
}

// Test recordings resource
console.log('\n2. Testing recordings resource:');
try {
  const recordingsResource = server._resources?.get('recordings');
  if (recordingsResource && recordingsResource.handler) {
    const result = await recordingsResource.handler(new URL('digitalsamba://recordings'));
    console.log('Recordings result:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
  }
} catch (error) {
  console.error('Error fetching recordings:', error.message);
}

// Test get-recordings tool
console.log('\n3. Testing get-recordings tool:');
try {
  const getRecordingsTool = server._tools?.get('get-recordings');
  if (getRecordingsTool && getRecordingsTool.handler) {
    const result = await getRecordingsTool.handler({});
    console.log('Get-recordings result:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
  }
} catch (error) {
  console.error('Error with get-recordings tool:', error.message);
}

console.log('\n✅ Debug complete');