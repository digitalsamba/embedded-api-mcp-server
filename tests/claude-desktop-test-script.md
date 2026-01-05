# Digital Samba MCP Server - Claude Desktop Test Script

**Version**: 1.0.0-rc.1
**Server**: https://mcp-dev.digitalsamba.com
**Total Tools**: 113

## Instructions for AI Tester

Copy this entire document into a Claude Desktop conversation that has the Digital Samba MCP connector configured. Then ask Claude to run through the tests systematically.

### Test Execution Prompt

```
Please run through the Digital Samba MCP test script below. For each category:
1. Execute the test scenarios in order
2. Record PASS/FAIL for each tool
3. Note any error messages for failures
4. Clean up test artifacts after each category
5. Provide a summary at the end

Start with Category 1 (Room Management) and work through all categories.
```

---

## Test Results Template

| Category | Passed | Failed | Skipped | Notes |
|----------|--------|--------|---------|-------|
| Room Management | /11 | | | |
| Session Management | /12 | | | |
| Analytics | /8 | | | |
| Recordings | /10 | | | |
| Roles & Permissions | /6 | | | |
| Webhooks | /6 | | | |
| Content Libraries | /26 | | | |
| Polls | /6 | | | |
| Communication | /14 | | | |
| Export Tools | /7 | | | |
| Live Session Controls | /8 | | | |
| **TOTAL** | **/113** | | | |

---

## Category 1: Room Management (11 tools)

### Setup
None required.

### Tests

#### 1.1 list-rooms
```
Action: List all rooms with limit=5
Expected: Returns array of rooms with total_count
```

#### 1.2 create-room
```
Action: Create room with:
  - topic: "MCP Test Room - DELETE ME"
  - friendly_url: "mcp-test-room-delete-me"
  - max_participants: 10
Expected: Returns room object with id
Save: room_id for subsequent tests
```

#### 1.3 get-room-details
```
Action: Get details for room_id from 1.2
Expected: Returns full room object with settings
```

#### 1.4 update-room
```
Action: Update room_id with:
  - topic: "MCP Test Room - UPDATED"
  - max_participants: 20
Expected: Returns updated room object
```

#### 1.5 generate-token
```
Action: Generate token for room_id with:
  - user_name: "Test User"
  - role: "moderator"
  - valid_for_minutes: 60
Expected: Returns token and room_url
```

#### 1.6 list-live-rooms
```
Action: List all live rooms
Expected: Returns array (may be empty)
```

#### 1.7 list-live-participants
```
Action: List live participants (optionally filter by room_id)
Expected: Returns array of participants (may be empty)
```

#### 1.8 get-default-room-settings
```
Action: Get default room settings
Expected: Returns settings object OR error (known backend issue)
Note: May fail due to Team::accountTeam() type error
```

#### 1.9 update-default-room-settings
```
Action: Skip if 1.8 failed
Expected: Updates default settings OR error
Note: May fail due to same backend issue as 1.8
```

#### 1.10 delete-room
```
Action: Delete room_id from 1.2
Expected: Success confirmation
```

#### 1.11 Cleanup Verification
```
Action: Try to get-room-details for deleted room_id
Expected: 404 error (room not found)
```

---

## Category 2: Session Management (12 tools)

### Setup
Need existing sessions in the account.

### Tests

#### 2.1 list-sessions
```
Action: List sessions with limit=5
Expected: Returns array of sessions with pagination
Save: session_id from first result (if any)
```

#### 2.2 get-session-details
```
Action: Get details for session_id
Expected: Returns session object with timestamps
Skip: If no sessions exist
```

#### 2.3 get-session-summary
```
Action: Get summary for session_id
Expected: Returns summary data
Skip: If no sessions exist
```

#### 2.4 get-session-statistics
```
Action: Get statistics for session_id
Expected: Returns statistics object
Skip: If no sessions exist
```

#### 2.5 get-session-statistics-details
```
Action: Get detailed statistics for session_id
Expected: Returns detailed stats
Skip: If no sessions exist
```

#### 2.6 list-session-participants
```
Action: List participants for session_id
Expected: Returns participant array
Skip: If no sessions exist
```

#### 2.7 list-room-sessions
```
Action: List sessions for a specific room (use any room_id)
Expected: Returns sessions for that room
```

#### 2.8 get-all-room-sessions
```
Action: Get all sessions grouped by room
Expected: Returns room-session mapping
```

#### 2.9 end-session
```
Action: SKIP - requires active live session
Expected: Would end live session
```

#### 2.10 hard-delete-session-resources
```
Action: SKIP - destructive, use with caution
Expected: Would permanently delete session resources
```

#### 2.11 bulk-delete-session-data
```
Action: SKIP - destructive, use with caution
Expected: Would bulk delete session data
```

#### 2.12 Verification
```
Action: Verify session list still accessible
Expected: list-sessions returns data
```

---

## Category 3: Analytics (8 tools)

### Setup
None required.

### Tests

#### 3.1 get-usage-statistics
```
Action: Get usage statistics
Expected: Returns usage data with totals
```

#### 3.2 get-usage-analytics
```
Action: Get usage analytics with date range (last 30 days)
Expected: Returns analytics breakdown
```

#### 3.3 get-live-analytics
```
Action: Get current live analytics
Expected: Returns live session counts
```

#### 3.4 get-live-room-analytics
```
Action: Get live analytics for specific room (use any room_id)
Expected: Returns room-specific live data
```

#### 3.5 get-room-analytics
```
Action: Get analytics for specific room
Expected: Returns room analytics
```

#### 3.6 get-session-analytics
```
Action: Get analytics for specific session (if available)
Expected: Returns session analytics
Skip: If no sessions
```

#### 3.7 get-participant-analytics
```
Action: Get participant analytics for a session
Expected: Returns participant breakdown
Skip: If no sessions
```

#### 3.8 get-participant-statistics
```
Action: Get participant statistics
Expected: Returns participant stats
```

---

## Category 4: Recordings (10 tools)

### Setup
Need existing recordings in the account.

### Tests

#### 4.1 get-recordings
```
Action: List all recordings with limit=5
Expected: Returns array of recordings
Save: recording_id from first result (if any)
```

#### 4.2 get-recording
```
Action: Get details for recording_id
Expected: Returns recording object
Skip: If no recordings
```

#### 4.3 get-recording-download-link
```
Action: Get download link for recording_id
Expected: Returns download URL
Skip: If no recordings
```

#### 4.4 get-recording-bookmarks
```
Action: Get bookmarks for recording_id
Expected: Returns bookmarks array (may be empty)
Skip: If no recordings
```

#### 4.5 update-recording
```
Action: Update recording_id with new name: "MCP Test Recording"
Expected: Returns updated recording
Skip: If no recordings
```

#### 4.6 archive-recording
```
Action: Archive recording_id
Expected: Success confirmation
Skip: If no recordings or already archived
```

#### 4.7 unarchive-recording
```
Action: Unarchive recording_id
Expected: Success confirmation
Skip: If no recordings
```

#### 4.8 start-recording
```
Action: SKIP - requires active live session
Expected: Would start recording
```

#### 4.9 stop-recording
```
Action: SKIP - requires active recording
Expected: Would stop recording
```

#### 4.10 delete-recording
```
Action: SKIP - destructive, only test with disposable recording
Expected: Would delete recording permanently
```

---

## Category 5: Roles & Permissions (6 tools)

### Setup
None required.

### Tests

#### 5.1 get-permissions
```
Action: List all available permissions
Expected: Returns array of permission objects
```

#### 5.2 get-roles
```
Action: List all roles
Expected: Returns array of role objects
Save: Note default roles (moderator, speaker, attendee)
```

#### 5.3 create-role
```
Action: Create role with:
  - name: "MCP Test Role - DELETE ME"
  - display_name: "Test Role"
  - permissions: (subset of permissions from 5.1)
Expected: Returns created role object
Save: role_id
```

#### 5.4 get-role
```
Action: Get details for role_id
Expected: Returns role with permissions
```

#### 5.5 update-role
```
Action: Update role_id with:
  - display_name: "Updated Test Role"
Expected: Returns updated role
```

#### 5.6 delete-role
```
Action: Delete role_id
Expected: Success confirmation
```

---

## Category 6: Webhooks (6 tools)

### Setup
None required.

### Tests

#### 6.1 list-webhook-events
```
Action: List available webhook event types
Expected: Returns array of event types
```

#### 6.2 list-webhooks
```
Action: List all configured webhooks
Expected: Returns array of webhooks (may be empty)
```

#### 6.3 create-webhook
```
Action: Create webhook with:
  - endpoint: "https://httpbin.org/post"
  - events: ["room.created"]
Expected: Returns webhook object
Save: webhook_id
```

#### 6.4 get-webhook
```
Action: Get details for webhook_id
Expected: Returns webhook configuration
```

#### 6.5 update-webhook
```
Action: Update webhook_id with:
  - events: ["room.created", "room.deleted"]
Expected: Returns updated webhook
```

#### 6.6 delete-webhook
```
Action: Delete webhook_id
Expected: Success confirmation
```

---

## Category 7: Content Libraries (26 tools)

### Setup
None required - will create test library.

### Tests

#### 7.1 list-libraries
```
Action: List all libraries
Expected: Returns array of libraries
```

#### 7.2 create-library
```
Action: Create library with:
  - name: "MCP Test Library - DELETE ME"
Expected: Returns library object
Save: library_id
```

#### 7.3 get-library-details
```
Action: Get details for library_id
Expected: Returns library object
```

#### 7.4 search-libraries
```
Action: Search for "MCP Test"
Expected: Returns matching libraries
```

#### 7.5 verify-library-id
```
Action: Verify library_id exists
Expected: Returns true/valid
```

#### 7.6 update-library
```
Action: Update library_id with:
  - name: "MCP Test Library - UPDATED"
Expected: Returns updated library
```

#### 7.7 get-library-hierarchy
```
Action: Get folder hierarchy for library_id
Expected: Returns hierarchy structure
```

#### 7.8 create-library-folder
```
Action: Create folder in library_id with:
  - name: "Test Folder"
Expected: Returns folder object
Save: folder_id
```

#### 7.9 list-library-folders
```
Action: List folders in library_id
Expected: Returns array including Test Folder
```

#### 7.10 get-library-folder-details
```
Action: Get details for folder_id
Expected: Returns folder object
```

#### 7.11 update-library-folder
```
Action: Update folder_id with:
  - name: "Updated Test Folder"
Expected: Returns updated folder
```

#### 7.12 create-webapp
```
Action: Create webapp in library_id with:
  - name: "Test Web App"
  - url: "https://example.com"
Expected: Returns webapp object
Save: webapp_id
```

#### 7.13 create-whiteboard
```
Action: Create whiteboard in library_id with:
  - name: "Test Whiteboard"
Expected: Returns whiteboard object
Save: whiteboard_id
```

#### 7.14 list-library-files
```
Action: List files in library_id
Expected: Returns array including webapp and whiteboard
```

#### 7.15 get-library-file-details
```
Action: Get details for webapp_id
Expected: Returns file object
```

#### 7.16 get-file-links
```
Action: Get links for webapp_id
Expected: Returns link URLs
```

#### 7.17 update-library-file
```
Action: Update webapp_id with:
  - name: "Updated Test Web App"
Expected: Returns updated file
```

#### 7.18 create-library-file
```
Action: SKIP - requires file upload URL
Expected: Would create uploaded file
```

#### 7.19 move-library-file
```
Action: Move webapp_id to folder_id
Expected: File now in folder
```

#### 7.20 move-library-folder
```
Action: SKIP - need second folder
Expected: Would move folder to new parent
```

#### 7.21 copy-library-content
```
Action: SKIP - need destination library
Expected: Would copy content
```

#### 7.22 bulk-upload-library-files
```
Action: SKIP - requires file URLs
Expected: Would bulk upload files
```

#### 7.23 bulk-delete-library-files
```
Action: Delete whiteboard_id via bulk delete
Expected: Success confirmation
```

#### 7.24 delete-library-file
```
Action: Delete webapp_id
Expected: Success confirmation
```

#### 7.25 delete-library-folder
```
Action: Delete folder_id
Expected: Success confirmation
```

#### 7.26 delete-library
```
Action: Delete library_id
Expected: Success confirmation
```

---

## Category 8: Polls (6 tools)

### Setup
Need a room for poll tests.

### Tests

#### 8.1 Setup - Create Test Room
```
Action: Create room for poll testing:
  - topic: "Poll Test Room - DELETE ME"
Expected: Room created
Save: poll_room_id
```

#### 8.2 create-poll
```
Action: Create poll in poll_room_id with:
  - question: "Test Poll Question?"
  - options: ["Option A", "Option B", "Option C"]
Expected: Returns poll object
Save: poll_id
```

#### 8.3 update-poll
```
Action: Update poll_id with:
  - question: "Updated Poll Question?"
Expected: Returns updated poll
```

#### 8.4 publish-poll-results
```
Action: SKIP - requires active session
Expected: Would publish results
```

#### 8.5 delete-poll
```
Action: Delete poll_id
Expected: Success confirmation
```

#### 8.6 delete-room-polls
```
Action: SKIP - no polls left to delete
Expected: Would delete all room polls
```

#### 8.7 delete-session-polls
```
Action: SKIP - requires session
Expected: Would delete session polls
```

#### 8.8 Cleanup
```
Action: Delete poll_room_id
Expected: Room deleted
```

---

## Category 9: Communication Management (14 tools)

### Setup
Need existing sessions for transcript/chat tests.

### Tests

#### 9.1 list-room-transcripts
```
Action: List transcripts for a room (use any room with sessions)
Expected: Returns array of transcripts (may be empty)
```

#### 9.2 list-session-transcripts
```
Action: List transcripts for a session
Expected: Returns array of transcripts (may be empty)
Skip: If no sessions
```

#### 9.3 export-room-transcripts
```
Action: Export transcripts for a room
Expected: Returns export data or empty
```

#### 9.4 delete-session-chats
```
Action: SKIP - destructive, requires test session
Expected: Would delete session chat history
```

#### 9.5 delete-room-chats
```
Action: SKIP - destructive
Expected: Would delete room chat history
```

#### 9.6 delete-session-qa
```
Action: SKIP - destructive
Expected: Would delete session Q&A
```

#### 9.7 delete-room-qa
```
Action: SKIP - destructive
Expected: Would delete room Q&A
```

#### 9.8 delete-session-transcripts
```
Action: SKIP - destructive
Expected: Would delete session transcripts
```

#### 9.9 delete-room-transcripts
```
Action: SKIP - destructive
Expected: Would delete room transcripts
```

#### 9.10 delete-session-summaries
```
Action: SKIP - destructive
Expected: Would delete session summaries
```

#### 9.11 delete-room-summaries
```
Action: SKIP - destructive
Expected: Would delete room summaries
```

#### 9.12 delete-session-recordings
```
Action: SKIP - destructive
Expected: Would delete session recordings
```

#### 9.13 delete-session-resources
```
Action: SKIP - destructive
Expected: Would delete all session resources
```

#### 9.14 Verification
```
Action: list-room-transcripts for any room
Expected: Tool still works
```

---

## Category 10: Export Tools (7 tools)

### Setup
Need existing sessions with data.

### Tests

#### 10.1 export-chat-messages
```
Action: Export chat for a session_id
Expected: Returns chat export (may be empty)
Skip: If no sessions
```

#### 10.2 export-qa-data
```
Action: Export Q&A for a session_id
Expected: Returns Q&A export (may be empty)
Skip: If no sessions
```

#### 10.3 export-session-transcripts
```
Action: Export transcripts for a session_id
Expected: Returns transcript export
Skip: If no sessions
```

#### 10.4 export-poll-results
```
Action: Export poll results for a session_id
Expected: Returns poll export (may be empty)
Skip: If no sessions
```

#### 10.5 export-recording-metadata
```
Action: Export recording metadata for recording_id
Expected: Returns metadata export
Skip: If no recordings
```

#### 10.6 export-session-summary
```
Action: Export summary for session_id
Expected: Returns summary export
Skip: If no sessions
```

#### 10.7 export-session-metadata
```
Action: Export metadata for session_id
Expected: Returns metadata export
Skip: If no sessions
```

---

## Category 11: Live Session Controls (8 tools)

### IMPORTANT: Requires Active Live Session

Most of these tools require an active live session with participants.

### Tests

#### 11.1 start-transcription
```
Action: SKIP - requires live session
Expected: Would start transcription
```

#### 11.2 stop-transcription
```
Action: SKIP - requires active transcription
Expected: Would stop transcription
```

#### 11.3 phone-participants-joined
```
Action: SKIP - requires live session
Expected: Would add phone participants
```

#### 11.4 phone-participants-left
```
Action: SKIP - requires live session with phone participants
Expected: Would remove phone participants
```

#### 11.5 raise-participant-hand
```
Action: SKIP - requires live session with participant
Expected: Would raise participant's hand
```

#### 11.6 lower-participant-hand
```
Action: SKIP - requires live session with raised hand
Expected: Would lower participant's hand
```

#### 11.7 raise-phone-participant-hand
```
Action: SKIP - requires live session with phone participant
Expected: Would raise phone participant's hand
```

#### 11.8 lower-phone-participant-hand
```
Action: SKIP - requires live session with raised phone hand
Expected: Would lower phone participant's hand
```

---

## Final Cleanup Checklist

Before ending the test session, verify cleanup:

- [ ] Test rooms deleted (search for "DELETE ME" or "MCP Test")
- [ ] Test webhooks deleted
- [ ] Test roles deleted
- [ ] Test libraries deleted

Run these commands to verify:
```
list-rooms with search "DELETE ME" - should return empty
list-webhooks - verify no test webhooks remain
get-roles - verify no "MCP Test Role" remains
list-libraries - verify no "MCP Test Library" remains
```

---

## Test Completion Summary

### Date: ___________
### Tester: ___________
### Server Version: ___________

### Results

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Room Management | | | |
| Session Management | | | |
| Analytics | | | |
| Recordings | | | |
| Roles & Permissions | | | |
| Webhooks | | | |
| Content Libraries | | | |
| Polls | | | |
| Communication | | | |
| Export Tools | | | |
| Live Session Controls | | | |
| **TOTAL** | | | |

### Failed Tools (Detail)

| Tool Name | Error Message | Category |
|-----------|---------------|----------|
| | | |
| | | |
| | | |

### Known Issues
- `get-default-room-settings` / `update-default-room-settings` may fail due to backend Team::accountTeam() type error

### Notes

___________________________________________________________
___________________________________________________________
___________________________________________________________
