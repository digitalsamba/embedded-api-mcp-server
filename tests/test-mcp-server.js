#!/usr/bin/env node

/**
 * MCP Server Test Client
 * 
 * This script tests the Digital Samba MCP server by:
 * 1. Connecting to the server
 * 2. Testing the API key authentication
 * 3. Retrieving resources
 * 4. Calling tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input with a question
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main test function
async function testMcpServer() {
  try {
    console.log('🧪 Digital Samba MCP Server Test Client');
    console.log('----------------------------------------');

    // Get server URL and API key
    const serverUrl = await prompt('Enter MCP server URL (default: http://localhost:3000/mcp): ') || 'http://localhost:3000/mcp';
    const apiKey = await prompt('Enter Digital Samba API key: ');

    if (!apiKey) {
      console.error('❌ API key is required.');
      process.exit(1);
    }

    console.log('\n📡 Connecting to MCP server...');
    
    // Create client
    const client = new Client({
      name: 'mcp-test-client',
      version: '1.0.0'
    });

    // Create transport with headers
    const transport = new StreamableHTTPClientTransport(
      new URL(serverUrl),
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to MCP server successfully!');

    // Test resources
    console.log('\n📋 Testing resources...');
    
    try {
      console.log('  📝 Listing rooms...');
      const rooms = await client.listResources({
        pattern: 'digitalsamba://rooms'
      });
      console.log(`  ✅ Found ${rooms.resources.length} resources. First one: ${rooms.resources[0]?.uri || 'none'}`);
      
      if (rooms.resources.length > 0) {
        console.log('  📝 Reading room details...');
        const roomUri = rooms.resources[0].uri;
        const roomResource = await client.readResource({
          uri: roomUri
        });
        console.log(`  ✅ Successfully read room details: ${roomResource.contents[0]?.uri || 'none'}`);
      }
    } catch (error) {
      console.error(`  ❌ Resource test failed: ${error.message}`);
    }

    // Test tools
    console.log('\n🔧 Testing tools...');
    
    try {
      console.log('  📝 Listing tools...');
      const tools = await client.listTools();
      console.log(`  ✅ Found ${tools.tools.length} tools.`);
      
      if (tools.tools.length > 0) {
        // Find the create-room tool
        const createRoomTool = tools.tools.find(tool => tool.name === 'create-room');
        
        if (createRoomTool) {
          console.log('  📝 Testing create-room tool...');
          
          // Ask if user wants to create a test room
          const createRoom = await prompt('  Would you like to create a test room? (y/n): ');
          
          if (createRoom.toLowerCase() === 'y') {
            const roomName = await prompt('  Enter room name (default: Test Room): ') || 'Test Room';
            
            // Call the create-room tool
            const result = await client.callTool({
              name: 'create-room',
              arguments: {
                name: roomName,
                description: 'Created by MCP Server Test Client',
                privacy: 'public'
              }
            });
            
            console.log(`  ✅ Room created successfully: ${result.content[0]?.text || 'Success'}`);
          } else {
            console.log('  ⏭️ Skipping room creation.');
          }
        } else {
          console.log('  ⚠️ create-room tool not found.');
        }
      }
    } catch (error) {
      console.error(`  ❌ Tool test failed: ${error.message}`);
    }

    console.log('\n✅ MCP Server test completed.');
    console.log('----------------------------------------');
    
    // Close client connection
    await transport.close();
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    rl.close();
  }
}

// Run the test
testMcpServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});