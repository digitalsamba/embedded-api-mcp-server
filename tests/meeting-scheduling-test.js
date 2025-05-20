/**
 * Digital Samba MCP Server - Meeting Scheduling Test Script
 * 
 * This script tests the meeting scheduling functionality of the Digital Samba MCP Server.
 */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

// Configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;
const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';

// Validate API key
if (!API_KEY) {
  console.error('ERROR: DIGITAL_SAMBA_API_KEY environment variable must be set.');
  process.exit(1);
}

// Run the test
async function runTest() {
  console.log('Digital Samba MCP Server - Meeting Scheduling Test');
  console.log('=================================================');
  
  try {
    // Create MCP client
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });
    
    // Create transport with API key
    const transport = new StreamableHTTPClientTransport(
      new URL(SERVER_URL),
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    // Connect to the server
    console.log(`Connecting to ${SERVER_URL}...`);
    await client.connect(transport);
    console.log('Connected successfully!');
    
    // List tools to verify meeting scheduling tools are available
    console.log('\nListing available tools...');
    const tools = await client.listTools();
    const meetingTools = tools.filter(tool => 
      tool.name.includes('meeting') || 
      tool.name.includes('schedule')
    );
    
    console.log(`Found ${meetingTools.length} meeting-related tools:`);
    meetingTools.forEach(tool => {
      console.log(`- ${tool.name}`);
    });
    
    // Create a new room for testing
    console.log('\nCreating a test room...');
    const createRoomResult = await client.callTool({
      name: 'create-room',
      arguments: {
        name: 'Meeting Test Room',
        description: 'Room for testing meeting scheduling functionality',
        privacy: 'private'
      }
    });
    
    const roomData = JSON.parse(createRoomResult.content[0].text.split('!\n\n')[1]);
    const roomId = roomData.id;
    console.log(`Created room with ID: ${roomId}`);
    
    // Create a scheduled meeting
    console.log('\nCreating a scheduled meeting...');
    
    // Get current date and time
    const now = new Date();
    
    // Set start time to 1 hour from now
    const startTime = new Date(now);
    startTime.setHours(startTime.getHours() + 1);
    
    // Set end time to 2 hours from now
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 2);
    
    // Format dates as ISO strings
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    
    const createMeetingResult = await client.callTool({
      name: 'create-scheduled-meeting',
      arguments: {
        title: 'Test Meeting',
        description: 'This is a test meeting',
        room_id: roomId,
        start_time: startTimeISO,
        end_time: endTimeISO,
        timezone: 'UTC',
        host_name: 'Test Host',
        host_email: 'test@example.com',
        participants: [
          {
            name: 'Test Participant',
            email: 'participant@example.com'
          }
        ],
        send_invitations: false
      }
    });
    
    console.log(createMeetingResult.content[0].text);
    
    // Extract meeting ID from the response
    const meetingId = createMeetingResult.content[0].text.match(/Meeting ID: ([a-zA-Z0-9-]+)/)[1];
    console.log(`Created meeting with ID: ${meetingId}`);
    
    // List scheduled meetings
    console.log('\nListing scheduled meetings...');
    const listMeetingsResult = await client.readResource({
      uri: 'digitalsamba://meetings'
    });
    
    const meetings = listMeetingsResult.contents.map(content => JSON.parse(content.text));
    console.log(`Found ${meetings.length} scheduled meetings:`);
    meetings.forEach(meeting => {
      console.log(`- ${meeting.title} (ID: ${meeting.id}, Room: ${meeting.room_id})`);
    });
    
    // Get meeting details
    console.log(`\nGetting details for meeting ${meetingId}...`);
    const meetingDetailsResult = await client.readResource({
      uri: `digitalsamba://meetings/${meetingId}`
    });
    
    const meetingDetails = JSON.parse(meetingDetailsResult.contents[0].text);
    console.log('Meeting details retrieved successfully:');
    console.log(`- Title: ${meetingDetails.title}`);
    console.log(`- Start: ${new Date(meetingDetails.start_time).toLocaleString()} (${meetingDetails.timezone})`);
    console.log(`- End: ${new Date(meetingDetails.end_time).toLocaleString()} (${meetingDetails.timezone})`);
    console.log(`- Host: ${meetingDetails.host_name}`);
    console.log(`- Status: ${meetingDetails.status}`);
    
    // Update the meeting
    console.log('\nUpdating the meeting...');
    const updateMeetingResult = await client.callTool({
      name: 'update-scheduled-meeting',
      arguments: {
        meeting_id: meetingId,
        title: 'Updated Test Meeting',
        description: 'This meeting has been updated'
      }
    });
    
    console.log(updateMeetingResult.content[0].text);
    
    // Get updated meeting details
    console.log('\nGetting updated meeting details...');
    const updatedMeetingResult = await client.readResource({
      uri: `digitalsamba://meetings/${meetingId}`
    });
    
    const updatedMeeting = JSON.parse(updatedMeetingResult.contents[0].text);
    console.log(`Updated title: ${updatedMeeting.title}`);
    console.log(`Updated description: ${updatedMeeting.description}`);
    
    // Add a participant to the meeting
    console.log('\nAdding a new participant to the meeting...');
    const addParticipantResult = await client.callTool({
      name: 'add-meeting-participants',
      arguments: {
        meeting_id: meetingId,
        participants: [
          {
            name: 'New Participant',
            email: 'new@example.com',
            role: 'attendee'
          }
        ],
        send_invitations: false
      }
    });
    
    console.log(addParticipantResult.content[0].text);
    
    // Get participants list
    console.log('\nGetting meeting participants...');
    const participantsResult = await client.readResource({
      uri: `digitalsamba://meetings/${meetingId}/participants`
    });
    
    const participants = participantsResult.contents.map(content => JSON.parse(content.text));
    console.log(`Meeting has ${participants.length} participants:`);
    participants.forEach(participant => {
      console.log(`- ${participant.name} (${participant.email})${participant.role ? ` [${participant.role}]` : ''}`);
    });
    
    // Generate a join link
    console.log('\nGenerating a join link for the meeting...');
    const joinLinkResult = await client.callTool({
      name: 'generate-meeting-join-link',
      arguments: {
        meeting_id: meetingId,
        participant_name: 'Join Test User',
        participant_email: 'jointest@example.com'
      }
    });
    
    console.log(joinLinkResult.content[0].text);
    
    // Cancel the meeting
    console.log('\nCancelling the meeting...');
    const cancelMeetingResult = await client.callTool({
      name: 'cancel-scheduled-meeting',
      arguments: {
        meeting_id: meetingId,
        notify_participants: false
      }
    });
    
    console.log(cancelMeetingResult.content[0].text);
    
    // Get cancelled meeting details
    console.log('\nGetting cancelled meeting details...');
    const cancelledMeetingResult = await client.readResource({
      uri: `digitalsamba://meetings/${meetingId}`
    });
    
    const cancelledMeeting = JSON.parse(cancelledMeetingResult.contents[0].text);
    console.log(`Meeting status after cancellation: ${cancelledMeeting.status}`);
    
    // Delete the meeting
    console.log('\nDeleting the meeting...');
    const deleteMeetingResult = await client.callTool({
      name: 'delete-scheduled-meeting',
      arguments: {
        meeting_id: meetingId
      }
    });
    
    console.log(deleteMeetingResult.content[0].text);
    
    // Delete the test room
    console.log('\nDeleting the test room...');
    const deleteRoomResult = await client.callTool({
      name: 'delete-room',
      arguments: {
        roomId: roomId
      }
    });
    
    console.log(deleteRoomResult.content[0].text);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
