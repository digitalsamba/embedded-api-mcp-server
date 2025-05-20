/**
 * Digital Samba MCP Server - Recording Functionality Test
 * 
 * This script tests the recording functionality of the Digital Samba MCP Server.
 * It will:
 * 1. List all recordings
 * 2. Start a recording in a room
 * 3. Wait a few seconds
 * 4. Stop the recording
 * 5. List recordings for that room
 * 6. Get a download link for the recording
 */

// Import fetch if using Node.js <18
// import fetch from 'node-fetch';

// Configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY || '';
const SERVER_URL = 'http://localhost:3000/mcp';

// Check if API key is provided
if (!API_KEY) {
  console.error('Error: No API key provided. Set the DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

// Define helper functions for MCP calls
async function callMcp(method, params) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  return data.result;
}

/**
 * Call MCP resource
 */
async function readResource(uri) {
  return callMcp('readResource', { uri });
}

/**
 * Call MCP tool
 */
async function callTool(name, args) {
  return callMcp('callTool', { 
    name,
    arguments: args
  });
}

/**
 * Main test function
 */
async function runTest() {
  try {
    console.log('=== Digital Samba MCP Server - Recording Functionality Test ===');
    
    // Step 1: Get available rooms
    console.log('\n1. Listing available rooms...');
    const roomsResource = await readResource('digitalsamba://rooms');
    
    if (!roomsResource.contents || roomsResource.contents.length === 0) {
      console.error('No rooms available. Please create a room first.');
      return;
    }
    
    // Parse the first room to get its ID
    const firstRoom = JSON.parse(roomsResource.contents[0].text);
    const roomId = firstRoom.id;
    console.log(`Using room: ${firstRoom.name || 'Unnamed Room'} (ID: ${roomId})`);
    
    // Step 2: List existing recordings
    console.log('\n2. Listing existing recordings...');
    const recordingsResource = await readResource('digitalsamba://recordings');
    console.log(`Found ${recordingsResource.contents ? recordingsResource.contents.length : 0} recordings`);
    
    // Step 2.5: Use the get-recordings tool
    console.log('\n2.5. Using get-recordings tool...');
    const listResult = await callTool('get-recordings', {});
    console.log(listResult.content[0].text);
    
    // Step 3: Start a recording
    console.log(`\n3. Starting recording in room ${roomId}...`);
    const startResult = await callTool('start-recording', { roomId });
    console.log(startResult.content[0].text);
    
    // Step 4: Wait a few seconds
    console.log('\n4. Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Stop the recording
    console.log(`\n5. Stopping recording in room ${roomId}...`);
    const stopResult = await callTool('stop-recording', { roomId });
    console.log(stopResult.content[0].text);
    
    // Step 6: List recordings for the room
    console.log(`\n6. Listing recordings for room ${roomId}...`);
    const roomRecordingsResource = await readResource(`digitalsamba://rooms/${roomId}/recordings`);
    console.log(`Found ${roomRecordingsResource.contents ? roomRecordingsResource.contents.length : 0} recordings for this room`);
    
    if (roomRecordingsResource.contents && roomRecordingsResource.contents.length > 0) {
      // Parse the first recording to get its ID
      const firstRecording = JSON.parse(roomRecordingsResource.contents[0].text);
      const recordingId = firstRecording.id;
      console.log(`Latest recording ID: ${recordingId} (Status: ${firstRecording.status})`);
      
      // Step 7: Get download link if recording is ready
      if (firstRecording.status === 'READY') {
        console.log(`\n7. Getting download link for recording ${recordingId}...`);
        const downloadResult = await callTool('get-recording-download-link', { 
          recordingId,
          validForMinutes: 60
        });
        console.log(downloadResult.content[0].text);
      } else {
        console.log(`\nRecording is not ready yet (status: ${firstRecording.status}). Skipping download link step.`);
        console.log('Wait for the recording to be processed and then try getting a download link.');
      }
      
      // Step 8: Get recording details using the tool
      console.log(`\n8. Getting detailed information for recording ${recordingId}...`);
      const recordingDetailsResult = await callTool('get-recording', { recordingId });
      console.log(recordingDetailsResult.content[0].text);
    }
    
    console.log('\n=== Test completed successfully ===');
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run the test
runTest();
