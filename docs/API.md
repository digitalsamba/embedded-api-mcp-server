# Digital Samba MCP Server API Reference

## Overview

The Digital Samba MCP Server provides resources (read-only data) and tools (actions) following the Model Context Protocol specification.

## Resources

Resources are read-only endpoints that provide access to Digital Samba data.

### Room Resources

#### `digitalsamba://rooms`
List all rooms in your account.

**Response**: Array of room objects with details like ID, name, privacy settings, etc.

#### `digitalsamba://rooms/{roomId}`
Get details for a specific room.

**Parameters**:
- `roomId` - The unique identifier of the room

### Session Resources

#### `digitalsamba://sessions`
List all sessions across rooms.

#### `digitalsamba://sessions/{sessionId}`
Get details for a specific session.

### Recording Resources

#### `digitalsamba://recordings`
List all available recordings.

#### `digitalsamba://recordings/{recordingId}`
Get details for a specific recording.

### Analytics Resources

#### `digitalsamba://analytics/team`
Get team-wide analytics and usage statistics.

#### `digitalsamba://analytics/rooms`
Get analytics data for all rooms.

#### `digitalsamba://analytics/sessions`
Get analytics data for sessions.

### Content Resources

#### `digitalsamba://content`
List all content in the library.

#### `digitalsamba://content/{contentId}`
Get details for specific content.

## Tools

Tools perform actions and modifications via the Digital Samba API.

### Room Management

#### `create-room`
Create a new room.

**Input**:
- `friendly_url` (string, optional) - Custom URL for the room
- `description` (string, optional) - Room description
- `privacy` (string, optional) - "public" or "private"
- `external_id` (string, optional) - External system ID

#### `update-room`
Update an existing room.

**Input**:
- `roomId` (string, required) - Room to update
- `description` (string, optional) - New description
- `privacy` (string, optional) - New privacy setting

#### `delete-room`
Delete a room permanently.

**Input**:
- `roomId` (string, required) - Room to delete

#### `generate-room-token`
Generate an access token for joining a room.

**Input**:
- `roomId` (string, required) - Room ID
- `userName` (string, optional) - Display name for the user
- `role` (string, optional) - User role (e.g., "moderator")
- `expirationMinutes` (number, optional) - Token validity duration

### Session Management

#### `end-session`
End an active session.

**Input**:
- `sessionId` (string, required) - Session to end

#### `get-session-summary`
Get detailed summary of a session.

**Input**:
- `sessionId` (string, required) - Session ID

### Live Session Controls

#### `remove-participant`
Remove a participant from an active session.

**Input**:
- `sessionId` (string, required) - Session ID
- `participantId` (string, required) - Participant to remove

#### `mute-all-participants`
Mute all participants in a session.

**Input**:
- `sessionId` (string, required) - Session ID

#### `set-room-lock`
Lock or unlock a room.

**Input**:
- `roomId` (string, required) - Room ID
- `locked` (boolean, required) - Lock state

### Communication Tools

#### `send-chat-message`
Send a message to session chat.

**Input**:
- `sessionId` (string, required) - Session ID
- `message` (string, required) - Message text

#### `create-poll`
Create a poll in a session.

**Input**:
- `sessionId` (string, required) - Session ID
- `question` (string, required) - Poll question
- `options` (array, required) - Answer options

### Analytics Tools

#### `get-team-analytics`
Query team analytics with filters.

**Input**:
- `startDate` (string, optional) - Start date (ISO format)
- `endDate` (string, optional) - End date (ISO format)

#### `get-room-analytics`
Get analytics for specific rooms.

**Input**:
- `roomId` (string, optional) - Specific room or all rooms
- `startDate` (string, optional) - Start date
- `endDate` (string, optional) - End date

#### `get-session-analytics`
Get detailed session analytics.

**Input**:
- `sessionId` (string, required) - Session ID

## Error Handling

All tools return standardized error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {}
}
```

Common error types:
- `AuthenticationError` - Invalid or missing API key
- `ResourceNotFoundError` - Requested resource doesn't exist
- `ValidationError` - Invalid input parameters
- `RateLimitError` - API rate limit exceeded

## Authentication

The server uses environment variable authentication:

```bash
export DIGITAL_SAMBA_API_KEY=your_api_key
```

Or pass via command line:

```bash
npx @digitalsamba/embedded-api-mcp-server --api-key YOUR_API_KEY
```