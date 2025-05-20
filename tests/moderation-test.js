/**
 * Test script for Digital Samba MCP Server moderation functionality
 * 
 * This script tests the moderation tools and resources provided by the MCP server.
 */

const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;
if (!API_KEY) {
  console.error('ERROR: DIGITAL_SAMBA_API_KEY environment variable is required');
  process.exit(1);
}

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

// Function to make MCP requests
async function mcpRequest(method, params = {}) {
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 10000),
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
    }

    return data.result;
  } catch (error) {
    console.error(`Error in mcpRequest (${method}):`, error.message);
    throw error;
  }
}

// Test procedure
async function runTests() {
  console.log('=== Digital Samba MCP Server Moderation Functionality Test ===');
  console.log('Testing connection to MCP server...');

  try {
    // Test initialize
    const initResult = await mcpRequest('initialize', {
      client: {
        name: 'Moderation Test Client',
        version: '1.0.0'
      }
    });
    console.log('Connected to MCP server ✅');
    console.log(`Server name: ${initResult.server.name}`);
    console.log(`Server version: ${initResult.server.version}`);
    console.log(''); // Blank line

    // Get list of tools
    console.log('Fetching list of tools...');
    const toolsResult = await mcpRequest('listTools');
    
    const moderationTools = toolsResult.tools.filter(tool => 
      tool.name === 'set-room-lock' ||
      tool.name === 'remove-participant' ||
      tool.name === 'set-participant-mute' ||
      tool.name === 'update-room-media-settings' ||
      tool.name === 'set-participant-role' ||
      tool.name === 'ban-participant' ||
      tool.name === 'unban-participant' ||
      tool.name === 'list-banned-participants'
    );
    
    console.log(`Found ${moderationTools.length} moderation tools:`);
    moderationTools.forEach(tool => {
      console.log(`- ${tool.name}`);
    });
    console.log(''); // Blank line

    // Get list of resources
    console.log('Fetching list of resources...');
    const resourcesResult = await mcpRequest('listResources');
    
    const moderationResources = resourcesResult.resources.filter(resource => 
      resource.uriTemplate.includes('moderation') ||
      resource.uriTemplate.includes('banned-participants')
    );
    
    console.log(`Found ${moderationResources.length} moderation resources:`);
    moderationResources.forEach(resource => {
      console.log(`- ${resource.uriTemplate}`);
    });
    console.log(''); // Blank line

    // Create a test room
    console.log('Creating a test room...');
    const createRoomResult = await mcpRequest('callTool', {
      name: 'create-room',
      arguments: {
        name: 'Moderation Test Room',
        description: 'Test room for moderation features',
        privacy: 'public'
      }
    });
    
    // Extract information from tool call result
    const roomContent = createRoomResult.content[0].text;
    const roomData = JSON.parse(roomContent.substring(roomContent.indexOf('{')));
    const roomId = roomData.id;
    
    console.log(`Test room created with ID: ${roomId} ✅`);
    console.log(''); // Blank line

    // Test updating media settings
    console.log('Testing update-room-media-settings tool...');
    const updateMediaResult = await mcpRequest('callTool', {
      name: 'update-room-media-settings',
      arguments: {
        roomId,
        chat_enabled: false,
        private_chat_enabled: false
      }
    });
    
    console.log('Media settings updated successfully ✅');
    console.log(updateMediaResult.content[0].text);
    console.log(''); // Blank line

    // Test setting room lock
    console.log('Testing set-room-lock tool...');
    const lockRoomResult = await mcpRequest('callTool', {
      name: 'set-room-lock',
      arguments: {
        roomId,
        lock: true
      }
    });
    
    console.log('Room lock set successfully ✅');
    console.log(lockRoomResult.content[0].text);
    console.log(''); // Blank line

    // Get moderation settings using the resource
    console.log('Fetching room moderation settings...');
    const moderationSettingsResult = await mcpRequest('readResource', {
      uri: `digitalsamba://rooms/${roomId}/moderation`
    });
    
    console.log('Retrieved moderation settings ✅');
    moderationSettingsResult.contents.forEach(content => {
      console.log(content.text);
    });
    console.log(''); // Blank line

    // Clean up - delete the test room
    console.log('Cleaning up: Deleting test room...');
    const deleteRoomResult = await mcpRequest('callTool', {
      name: 'delete-room',
      arguments: {
        roomId
      }
    });
    
    console.log('Test room deleted successfully ✅');
    console.log(deleteRoomResult.content[0].text);
    console.log(''); // Blank line

    console.log('Moderation functionality test completed successfully! ✅');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
