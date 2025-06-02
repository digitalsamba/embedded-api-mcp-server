# Digital Samba MCP Server - Comprehensive Testing Plan

## Overview
This document outlines a comprehensive testing strategy for the Digital Samba MCP Server, including all resources and tools.

## Test Environment Setup

### Prerequisites
1. **API Key**: Valid Digital Samba API key with appropriate permissions
2. **Test Data**: Pre-created test rooms, sessions, and recordings
3. **Claude Desktop**: Latest version for integration testing
4. **Test Scripts**: Automated scripts for repetitive tests

### Test Data Structure
```javascript
const testData = {
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  testRoom: {
    id: null,  // Created during setup
    name: "MCP Test Room",
    friendly_url: "mcp-test-room"
  },
  testSession: {
    id: null,  // Created during tests
    roomId: null
  },
  testRecording: {
    id: null,  // From existing recordings
  },
  testLibrary: {
    id: null,  // Created during setup
    externalId: "mcp-test-library"
  }
};
```

## Resource Testing Plan

### 1. Room Resources
- [ ] Test `digitalsamba://rooms` - List all rooms
- [ ] Test `digitalsamba://rooms/{id}` - Get specific room details
- [ ] Test `digitalsamba://rooms/{id}/participants` - Get room participants
- [ ] Test pagination parameters
- [ ] Test error cases (invalid room ID, etc.)

### 2. Session Resources
- [ ] Test `digitalsamba://sessions` - List all sessions
- [ ] Test `digitalsamba://sessions?room_id={id}` - Filter by room
- [ ] Test `digitalsamba://sessions/{id}` - Get specific session
- [ ] Test `digitalsamba://sessions/{id}/participants` - Get session participants
- [ ] Test date filtering parameters

### 3. Recording Resources
- [ ] Test `digitalsamba://recordings` - List all recordings
- [ ] Test `digitalsamba://recordings?room_id={id}` - Filter by room
- [ ] Test `digitalsamba://recordings/{id}` - Get specific recording
- [ ] Test downloading recordings

### 4. Analytics Resources
- [ ] Test `digitalsamba://analytics/team` - Team statistics
- [ ] Test `digitalsamba://analytics/rooms` - Room analytics
- [ ] Test `digitalsamba://analytics/rooms/{id}` - Specific room analytics
- [ ] Test `digitalsamba://analytics/sessions` - Session analytics
- [ ] Test `digitalsamba://analytics/sessions/{id}` - Specific session analytics
- [ ] Test date range filtering

### 5. Export Resources
- [ ] Test `digitalsamba://exports/sessions/{id}/chat` - Export chat
- [ ] Test `digitalsamba://exports/sessions/{id}/qa` - Export Q&A
- [ ] Test `digitalsamba://exports/sessions/{id}/transcripts` - Export transcripts
- [ ] Test `digitalsamba://exports/sessions/{id}/summary` - Export summary
- [ ] Test `digitalsamba://exports/sessions/{id}/polls` - Export polls

### 6. Content Resources
- [ ] Test `digitalsamba://content/libraries` - List libraries
- [ ] Test `digitalsamba://content/libraries/{id}` - Get library details
- [ ] Test `digitalsamba://content/libraries/{id}/folders` - List folders
- [ ] Test `digitalsamba://content/libraries/{id}/files` - List files

## Tool Testing Plan

### 1. Room Management Tools
- [ ] Test `create-room` - Create new room with various settings
- [ ] Test `update-room` - Update room properties
- [ ] Test `delete-room` - Delete test room
- [ ] Test `generate-room-token` - Generate access token

### 2. Session Management Tools
- [ ] Test `end-session` - End active session
- [ ] Test `get-session-summary` - Get AI summary

### 3. Recording Tools
- [ ] Test `start-recording` - Start recording in room
- [ ] Test `stop-recording` - Stop recording
- [ ] Test `delete-recording` - Delete test recording

### 4. Analytics Tools
- [ ] Test `get-team-analytics` - Get team statistics
- [ ] Test `get-room-analytics` - Get room statistics
- [ ] Test `get-session-analytics` - Get session statistics
- [ ] Test `get-participant-analytics` - Get participant stats

### 5. Live Session Controls
- [ ] Test `start-transcription` - Start transcription
- [ ] Test `stop-transcription` - Stop transcription
- [ ] Test `phone-participants-joined` - Register phone participants
- [ ] Test `phone-participants-left` - Unregister phone participants
- [ ] Test `set-room-lock` - Lock/unlock room
- [ ] Test `remove-participant` - Remove participant
- [ ] Test `mute-participant` - Mute participant
- [ ] Test `update-room-media-settings` - Update media settings

### 6. Communication Management Tools
- [ ] Test `delete-session-chats` - Delete chat messages
- [ ] Test `delete-room-chats` - Delete all room chats
- [ ] Test `delete-session-qa` - Delete Q&A
- [ ] Test `delete-room-qa` - Delete all room Q&A
- [ ] Test `delete-session-transcripts` - Delete transcripts
- [ ] Test `delete-room-transcripts` - Delete all room transcripts
- [ ] Test `delete-session-summaries` - Delete summaries
- [ ] Test `delete-room-summaries` - Delete all room summaries

### 7. Poll Management Tools
- [ ] Test `create-poll` - Create new poll
- [ ] Test `update-poll` - Update poll settings
- [ ] Test `delete-poll` - Delete specific poll
- [ ] Test `delete-session-polls` - Delete all session polls
- [ ] Test `delete-room-polls` - Delete all room polls
- [ ] Test `publish-poll-results` - Publish results

### 8. Library Management Tools
- [ ] Test `create-library` - Create content library
- [ ] Test `update-library` - Update library details
- [ ] Test `delete-library` - Delete library
- [ ] Test `create-library-folder` - Create folder
- [ ] Test `update-library-folder` - Update folder
- [ ] Test `delete-library-folder` - Delete folder
- [ ] Test `create-library-file` - Get upload URL
- [ ] Test `update-library-file` - Update file details
- [ ] Test `delete-library-file` - Delete file
- [ ] Test `get-file-links` - Get viewing links
- [ ] Test `create-webapp` - Create webapp
- [ ] Test `create-whiteboard` - Create whiteboard

## Testing Scripts

### Setup Script (test-setup.js)
```javascript
// Create test room, library, and gather existing data
const setup = async () => {
  // 1. Create test room
  // 2. Create test library
  // 3. Find existing recordings
  // 4. Save test data to file
};
```

### Resource Test Script (test-resources.js)
```javascript
// Test all resource endpoints
const testResources = async () => {
  // Test each resource systematically
  // Log results
  // Track failures
};
```

### Tool Test Script (test-tools.js)
```javascript
// Test all tool executions
const testTools = async () => {
  // Test each tool with valid data
  // Test error cases
  // Log results
};
```

### Cleanup Script (test-cleanup.js)
```javascript
// Clean up test data
const cleanup = async () => {
  // Delete test rooms
  // Delete test libraries
  // Remove test files
};
```

## Claude Desktop Integration Testing

### Installation Test
1. Build and publish beta version
2. Update Claude Desktop config to use new version
3. Verify tool appears and is enabled
4. Test basic functionality

### Functionality Test
1. Test resource reading through Claude
2. Test tool execution through Claude
3. Test error handling
4. Test multi-step workflows

## Session Handover Considerations

### What to Document for Handover
1. **Current State**: 
   - Fixed schema format issue (v1.5.1-beta.3 pending)
   - All tools converted to JSON Schema
   - Claude Desktop integration pending test

2. **Pending Tasks**:
   - Test new beta version in Claude Desktop
   - Execute comprehensive testing plan
   - Fix any discovered issues
   - Update documentation

3. **Known Issues**:
   - Some API endpoints may not exist yet (transcription)
   - Need real API key for testing
   - Need to create test data

4. **Next Steps**:
   - Wait for beta deployment (~5-10 minutes)
   - Install new version in Claude Desktop
   - Begin systematic testing
   - Document results

## Error Tracking Template

```markdown
### Tool/Resource: [Name]
- **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial
- **Test Date**: [Date]
- **Issues Found**: 
  - Issue 1
  - Issue 2
- **Notes**: Additional observations
```

## Success Criteria

1. **All Resources**: Return valid data without errors
2. **All Tools**: Execute successfully with valid inputs
3. **Error Handling**: Graceful errors for invalid inputs
4. **Performance**: Response times under 2 seconds
5. **Claude Desktop**: Tool enabled and functional

## Automation Goals

1. Create GitHub Actions workflow for automated testing
2. Test on every PR to develop/main branches
3. Generate test reports
4. Monitor API compatibility