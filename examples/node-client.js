/**
 * Node.js Client Integration with Digital Samba API
 * 
 * This example demonstrates how to use the Digital Samba API client
 * in a Node.js application.
 */

// Import the Digital Samba API client
import { DigitalSambaApiClient } from 'digital-samba-mcp/client';

// Initialize the API client
const apiClient = new DigitalSambaApiClient({
  apiKey: 'YOUR_DIGITAL_SAMBA_API_KEY', // Replace with your actual API key
  baseUrl: 'https://api.digitalsamba.com', // Base URL of the Digital Samba API
  timeout: 10000 // Request timeout in milliseconds
});

// Example: List all rooms
async function listRooms() {
  try {
    console.log('Fetching rooms...');
    const rooms = await apiClient.listRooms();
    console.log(`Found ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`- ${room.name} (${room.id})`);
    });
    return rooms;
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    throw error;
  }
}

// Example: Create a new room
async function createRoom(name, description) {
  try {
    console.log(`Creating room: ${name}`);
    const room = await apiClient.createRoom({
      name,
      description,
      settings: {
        waitingRoom: true,
        allowRecording: true
      }
    });
    console.log(`Room created successfully with ID: ${room.id}`);
    return room;
  } catch (error) {
    console.error('Failed to create room:', error);
    throw error;
  }
}

// Example: Get room details
async function getRoomDetails(roomId) {
  try {
    console.log(`Fetching details for room: ${roomId}`);
    const room = await apiClient.getRoom(roomId);
    console.log('Room details:', room);
    return room;
  } catch (error) {
    console.error(`Failed to fetch room details for ${roomId}:`, error);
    throw error;
  }
}

// Example: Get participant list
async function getRoomParticipants(roomId) {
  try {
    console.log(`Fetching participants for room: ${roomId}`);
    const participants = await apiClient.listParticipants(roomId);
    console.log(`Found ${participants.length} participants in the room`);
    participants.forEach(participant => {
      console.log(`- ${participant.name} (${participant.id})`);
    });
    return participants;
  } catch (error) {
    console.error(`Failed to fetch participants for room ${roomId}:`, error);
    throw error;
  }
}

// Run examples
async function main() {
  try {
    // List all rooms
    const rooms = await listRooms();
    
    if (rooms.length > 0) {
      // Get details of the first room
      await getRoomDetails(rooms[0].id);
      
      // Get participants of the first room
      await getRoomParticipants(rooms[0].id);
    } else {
      // Create a new room if none exist
      const newRoom = await createRoom('Example Room', 'Created via API client example');
      console.log('New room created:', newRoom);
    }
  } catch (error) {
    console.error('An error occurred in the main function:', error);
  }
}

main();
