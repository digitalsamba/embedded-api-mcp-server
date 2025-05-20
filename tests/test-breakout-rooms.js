/**
 * Test script for breakout rooms functionality
 */
import { DigitalSambaApiClient } from './src/digital-samba-api.js';
import { createServer } from './src/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;
const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;

// Validate API key
if (!API_KEY) {
  console.error('ERROR: No API key provided. Please set the DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

async function main() {
  try {
    console.log('Starting test for Digital Samba MCP breakout rooms functionality...');
    
    // Start the MCP server
    const { server, port } = createServer({ port: PORT });
    console.log(`Server started on port ${port}`);
    
    // Create Digital Samba API client
    const apiClient = new DigitalSambaApiClient(API_KEY);
    console.log('Created Digital Samba API client');
    
    // Create MCP client
    const client = new Client({ name: 'MCP Test Client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_URL),
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    
    await client.connect(transport);
    console.log('Connected to MCP server');
    
    // Get a list of rooms
    const rooms = await client.listResources({ uri: 'digitalsamba://rooms' });
    
    if (!rooms || !rooms.contents || rooms.contents.length === 0) {
      console.log('No rooms found. Creating a test room...');
      
      // Create a test room
      const createRoomResult = await client.callTool({
        name: 'create-room',
        arguments: {
          name: 'Breakout Room Test - ' + new Date().toISOString().substring(0, 16),
          description: 'Test room for breakout rooms functionality',
          privacy: 'public'
        }
      });
      
      console.log('Test room created successfully');
      
      // Extract the room ID from the result
      const roomData = JSON.parse(createRoomResult.content[0].text.substring(
        createRoomResult.content[0].text.indexOf('{')
      ));
      
      const roomId = roomData.id;
      console.log(`Room ID: ${roomId}`);
      
      // Test creating breakout rooms
      console.log('Creating breakout rooms...');
      const createBreakoutResult = await client.callTool({
        name: 'create-breakout-rooms',
        arguments: {
          roomId,
          numRooms: 3,
          namePrefix: 'Test Breakout',
          assignParticipants: false
        }
      });
      
      console.log('Breakout rooms creation result:');
      console.log(createBreakoutResult.content[0].text);
      
      // List breakout rooms
      console.log('Listing breakout rooms...');
      const breakoutRooms = await client.listResources({ uri: `digitalsamba://rooms/${roomId}/breakout-rooms` });
      
      if (breakoutRooms && breakoutRooms.contents && breakoutRooms.contents.length > 0) {
        console.log(`Found ${breakoutRooms.contents.length} breakout rooms:`);
        
        // Get the first breakout room ID
        const firstBreakoutRoom = JSON.parse(breakoutRooms.contents[0].text);
        const breakoutRoomId = firstBreakoutRoom.id;
        console.log(`First breakout room ID: ${breakoutRoomId}`);
        
        // Test broadcasting to breakout rooms
        console.log('Broadcasting to breakout rooms...');
        const broadcastResult = await client.callTool({
          name: 'broadcast-to-breakout-rooms',
          arguments: {
            roomId,
            message: 'This is a test broadcast message to all breakout rooms.'
          }
        });
        
        console.log('Broadcast result:');
        console.log(broadcastResult.content[0].text);
        
        // Test closing breakout rooms
        console.log('Closing breakout rooms...');
        const closeResult = await client.callTool({
          name: 'close-breakout-rooms',
          arguments: {
            roomId
          }
        });
        
        console.log('Close result:');
        console.log(closeResult.content[0].text);
        
        // Test deleting all breakout rooms
        console.log('Deleting all breakout rooms...');
        const deleteAllResult = await client.callTool({
          name: 'delete-all-breakout-rooms',
          arguments: {
            roomId
          }
        });
        
        console.log('Delete all result:');
        console.log(deleteAllResult.content[0].text);
      } else {
        console.log('No breakout rooms found.');
      }
      
      // Delete the test room
      console.log('Deleting test room...');
      const deleteResult = await client.callTool({
        name: 'delete-room',
        arguments: {
          roomId
        }
      });
      
      console.log('Delete room result:');
      console.log(deleteResult.content[0].text);
    } else {
      console.log(`Found ${rooms.contents.length} rooms.`);
      
      // Use the first room for testing
      const room = JSON.parse(rooms.contents[0].text);
      const roomId = room.id;
      console.log(`Using room ID: ${roomId}`);
      
      // Test creating breakout rooms
      console.log('Creating breakout rooms...');
      const createBreakoutResult = await client.callTool({
        name: 'create-breakout-rooms',
        arguments: {
          roomId,
          numRooms: 3,
          namePrefix: 'Test Breakout',
          assignParticipants: false
        }
      });
      
      console.log('Breakout rooms creation result:');
      console.log(createBreakoutResult.content[0].text);
      
      // List breakout rooms
      console.log('Listing breakout rooms...');
      const breakoutRooms = await client.listResources({ uri: `digitalsamba://rooms/${roomId}/breakout-rooms` });
      
      if (breakoutRooms && breakoutRooms.contents && breakoutRooms.contents.length > 0) {
        console.log(`Found ${breakoutRooms.contents.length} breakout rooms:`);
        
        // Get the first breakout room ID
        const firstBreakoutRoom = JSON.parse(breakoutRooms.contents[0].text);
        const breakoutRoomId = firstBreakoutRoom.id;
        console.log(`First breakout room ID: ${breakoutRoomId}`);
        
        // Test broadcasting to breakout rooms
        console.log('Broadcasting to breakout rooms...');
        const broadcastResult = await client.callTool({
          name: 'broadcast-to-breakout-rooms',
          arguments: {
            roomId,
            message: 'This is a test broadcast message to all breakout rooms.'
          }
        });
        
        console.log('Broadcast result:');
        console.log(broadcastResult.content[0].text);
        
        // Test closing breakout rooms
        console.log('Closing breakout rooms...');
        const closeResult = await client.callTool({
          name: 'close-breakout-rooms',
          arguments: {
            roomId
          }
        });
        
        console.log('Close result:');
        console.log(closeResult.content[0].text);
        
        // Test deleting all breakout rooms
        console.log('Deleting all breakout rooms...');
        const deleteAllResult = await client.callTool({
          name: 'delete-all-breakout-rooms',
          arguments: {
            roomId
          }
        });
        
        console.log('Delete all result:');
        console.log(deleteAllResult.content[0].text);
      } else {
        console.log('No breakout rooms found.');
      }
    }
    
    console.log('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

main();
