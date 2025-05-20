# Digital Samba MCP Server

An implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for Digital Samba's video conferencing API. This server enables AI assistants to create and manage video conferencing rooms through a standardized interface.

Full [Digital Samba API documentation](docs/digital-samba-api.md) is available in the docs folder.

## NPM Package

The Digital Samba MCP Server is available as an npm package for easy integration with Claude Desktop and other MCP clients. See [PACKAGE.md](PACKAGE.md) for detailed installation and usage instructions.

```bash
# Install globally
npm install -g digital-samba-mcp

# Run with your API key
digital-samba-mcp --api-key YOUR_API_KEY
```

## Quick Start

To quickly get started with the Digital Samba MCP Server from the source code:

1. Run the installation script to install all required dependencies:
   ```
   install.bat
   ```

2. Start the server in development mode:
   ```
   run.bat
   ```
   
   Alternatively, you can use the npm scripts:
   ```
   npm run dev
   ```

The server will run on port 3000 by default and will be accessible at `http://localhost:3000/mcp` for MCP clients.

## Features

- **MCP TypeScript SDK Integration**: Built using the official MCP TypeScript SDK
- **Digital Samba API Integration**: Connects to Digital Samba's video conferencing API
- **Resources**: Access rooms and participants
- **Tools**: Create, update, delete rooms and generate access tokens
- **Webhook Support**: Real-time event handling via webhooks
- **Client-Provided API Key Architecture**: No API keys stored on the server
- **Streamable HTTP Transport**: Modern connection handling
- **Proper Logging**: Comprehensive logging with Winston
- **Error Handling**: Detailed error reporting
- **NPM Package**: Available as an npm package for easy installation and use

## Prerequisites

- Node.js 16+
- npm or yarn
- Digital Samba API key (provided by the client)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

## Running the Server

```bash
# Development mode
npm run dev

# Build and run in production mode
npm run build
npm start
```

## Configuration

The server can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| DIGITAL_SAMBA_API_URL | Digital Samba API URL | https://api.digitalsamba.com/api/v1 |
| LOG_LEVEL | Logging level (error, warn, info, verbose, debug) | info |
| WEBHOOK_SECRET | Secret for verifying webhook signatures | (none) |
| WEBHOOK_ENDPOINT | Endpoint path for receiving webhooks | /webhooks/digitalsamba |
| PUBLIC_URL | Public URL of the server for webhook registration | http://localhost:[PORT] |

## Authentication

Authentication with the Digital Samba API is handled through the `Authorization` header using a Bearer token. The API key is not stored on the server but provided by the client with each request.

### Authorization Header Format

```
Authorization: Bearer YOUR_API_KEY
```

The server extracts the API key from the Authorization header and uses it for all API requests to Digital Samba's services. The API key is associated with the current MCP session and reused for subsequent requests within the same session.

## Available Resources

| Resource URI | Description |
|--------------|-------------|
| `digitalsamba://rooms` | List all rooms |
| `digitalsamba://rooms/{roomId}` | Get room details |
| `digitalsamba://rooms/{roomId}/participants` | List room participants |
| `digitalsamba://rooms/{roomId}/moderation` | Get room moderation settings |
| `digitalsamba://rooms/{roomId}/banned-participants` | List banned participants |
| `digitalsamba://rooms/{roomId}/breakout-rooms` | List breakout rooms for a parent room |
| `digitalsamba://rooms/{roomId}/breakout-rooms/{breakoutRoomId}` | Get breakout room details |
| `digitalsamba://rooms/{roomId}/breakout-rooms/{breakoutRoomId}/participants` | List participants in a breakout room |
| `digitalsamba://recordings` | List all recordings |
| `digitalsamba://recordings/{recordingId}` | Get recording details |
| `digitalsamba://rooms/{roomId}/recordings` | List recordings for a room |

## Available Tools

### create-room

Creates a new meeting room.

**Parameters**:
- `name`: Room name (min 3, max 100 characters)
- `description`: Room description (optional, max 500 characters)
- `friendly_url`: Friendly URL (optional, min 3, max 32 characters)
- `privacy`: "public" or "private" (default: "public")
- `max_participants`: Maximum number of participants (optional, min 2, max 2000)

### update-room

Updates an existing meeting room.

**Parameters**:
- `roomId`: ID of the room to update (required)
- `name`: New room name (optional, min 3, max 100 characters)
- `description`: New room description (optional, max 500 characters)
- `friendly_url`: New friendly URL (optional, min 3, max 32 characters)
- `privacy`: "public" or "private" (optional)
- `max_participants`: New maximum number of participants (optional, min 2, max 2000)

### delete-room

Deletes a meeting room.

**Parameters**:
- `roomId`: ID of the room to delete (required)

### generate-token

Generates a token for joining a room.

**Parameters**:
- `roomId`: Room ID (required)
- `userName`: User's display name (optional)
- `role`: User role (optional)
- `externalId`: External user ID (optional)

### register-webhook

Registers a webhook with the Digital Samba API.

**Parameters**:
- `webhookUrl`: The URL where Digital Samba will send webhook events (required)
- `events`: Event types to subscribe to (optional, all events if not specified)

### delete-webhook

Deletes a webhook from the Digital Samba API.

**Parameters**:
- `webhookUrl`: The URL of the webhook to delete (required)

### list-webhooks

Lists all registered webhooks.

**Parameters**: None

### list-webhook-events

Lists all available webhook event types.

**Parameters**: None

### Moderation Tools

#### set-room-lock

Controls whether a room is locked. When a room is locked, new participants cannot join.

**Parameters**:
- `roomId`: The ID of the room to lock/unlock (required)
- `lock`: Whether to lock (true) or unlock (false) the room (required)

#### update-room-media-settings

Updates various media settings for a room.

**Parameters**:
- `roomId`: The ID of the room to update (required)
- `chat_enabled`: Enable/disable chat (optional)
- `private_chat_enabled`: Enable/disable private chat (optional)
- `screenshare_enabled`: Enable/disable screen sharing (optional)
- `recordings_enabled`: Enable/disable recording (optional)
- `audio_on_join_enabled`: Enable/disable microphone on join (optional)
- `video_on_join_enabled`: Enable/disable camera on join (optional)
- `participants_list_enabled`: Enable/disable participants list (optional)

#### remove-participant

Removes a participant from a room.

**Parameters**:
- `roomId`: The ID of the room (required)
- `participantId`: The ID of the participant to remove (required)

#### set-participant-mute

Controls the mute status of a participant's audio and/or video.

**Parameters**:
- `roomId`: The ID of the room (required)
- `participantId`: The ID of the participant (required)
- `mute`: Whether to mute (true) or unmute (false) the participant (required)
- `type`: The type of mute to apply - 'audio', 'video', or 'all' (default) (optional)

#### set-participant-role

Sets the role for a participant, which determines their permissions in the room.

**Parameters**:
- `roomId`: The ID of the room (required)
- `participantId`: The ID of the participant (required)
- `role`: The role to assign to the participant (required)

#### ban-participant

Bans a participant from the room, preventing them from rejoining.

**Parameters**:
- `roomId`: The ID of the room (required)
- `participantId`: The ID of the participant to ban (required)

#### unban-participant

Removes a ban for a participant, allowing them to rejoin the room.

**Parameters**:
- `roomId`: The ID of the room (required)
- `participantId`: The ID of the banned participant to unban (required)

#### list-banned-participants

Lists all participants that have been banned from a room.

**Parameters**:
- `roomId`: The ID of the room (required)

### Recording Tools

#### get-recordings

Retrieve a list of recordings with optional filtering.

**Parameters**:
- `roomId`: Filter by room ID (optional)
- `status`: Filter by status ('IN_PROGRESS', 'PENDING_CONVERSION', 'READY') (optional)
- `limit`: Maximum number of recordings to return (optional, max 100)
- `offset`: Offset for pagination (optional)
- `archived`: Whether to retrieve archived recordings (optional)

#### get-recording

Get detailed information about a specific recording.

**Parameters**:
- `recordingId`: The ID of the recording to retrieve (required)

#### start-recording

Start recording in a room.

**Parameters**:
- `roomId`: The ID of the room to start recording in (required)

#### stop-recording

Stop recording in a room.

**Parameters**:
- `roomId`: The ID of the room to stop recording in (required)

#### delete-recording

Delete a recording.

**Parameters**:
- `recordingId`: The ID of the recording to delete (required)

#### get-recording-download-link

Get a download link for a recording.

**Parameters**:
- `recordingId`: The ID of the recording (required)
- `validForMinutes`: How long the download link should be valid for in minutes (optional, max 1440)

#### archive-recording

Archive a recording.

**Parameters**:
- `recordingId`: The ID of the recording to archive (required)

#### unarchive-recording

Unarchive a recording.

**Parameters**:
- `recordingId`: The ID of the recording to unarchive (required)

### Breakout Rooms Tools

#### create-breakout-rooms

Creates breakout rooms for a parent room.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `numRooms`: Number of breakout rooms to create (required, min 1, max 50)
- `namePrefix`: Prefix for breakout room names (optional, default: "Breakout Room")
- `assignParticipants`: Whether to automatically assign participants (optional, default: true)
- `distributionMethod`: Method for distributing participants - "random" or "manual" (optional, default: "random")

#### delete-breakout-room

Deletes a specific breakout room.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `breakoutRoomId`: The ID of the breakout room to delete (required)

#### delete-all-breakout-rooms

Deletes all breakout rooms for a parent room.

**Parameters**:
- `roomId`: The ID of the parent room (required)

#### assign-participants-to-breakout-rooms

Assigns participants to specific breakout rooms.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `assignments`: Array of assignments, each containing `participantId` and `breakoutRoomId` (required)

#### reassign-participant

Reassigns a participant to a different breakout room.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `participantId`: The ID of the participant to reassign (required)
- `breakoutRoomId`: The ID of the target breakout room (required)

#### return-participant-to-main-room

Returns a participant from a breakout room back to the main room.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `participantId`: The ID of the participant to return (required)

#### return-all-participants-to-main-room

Returns all participants from all breakout rooms back to the main room.

**Parameters**:
- `roomId`: The ID of the parent room (required)

#### broadcast-to-breakout-rooms

Sends a broadcast message to all breakout rooms.

**Parameters**:
- `roomId`: The ID of the parent room (required)
- `message`: The message to broadcast (required)

#### open-breakout-rooms

Opens all breakout rooms for a parent room, starting the breakout sessions.

**Parameters**:
- `roomId`: The ID of the parent room (required)

#### close-breakout-rooms

Closes all breakout rooms for a parent room.

**Parameters**:
- `roomId`: The ID of the parent room (required)

## Webhooks and Real-time Events

The Digital Samba MCP Server supports webhooks for real-time event notification. When events occur in the Digital Samba platform (such as a participant joining or leaving a room), the webhook endpoint receives a notification and forwards it to connected MCP clients.

### Event Types

The server supports various event types, including:

- Room events: creation, updates, deletion
- Session events: start, end
- Participant events: join, leave
- Recording events: start, stop, ready
- Chat events: new messages
- Poll events: creation, updates, deletion
- Q&A events: questions, answers

### Setting Up Webhooks

1. Use the `register-webhook` tool to register your webhook URL with Digital Samba
2. Ensure your server is publicly accessible or use a tunneling service like ngrok for testing
3. Optionally set the `WEBHOOK_SECRET` environment variable for enhanced security
4. Events will be forwarded to connected MCP clients automatically

### Events Notification Format

When an event is received, it's forwarded to MCP clients with a notification in this format:

```json
{
  "type": "digitalsambaEvent",
  "params": {
    "event": "event.type",
    "timestamp": "2025-05-19T10:00:00Z",
    "data": {
      "eventSpecificData": "value"
    }
  }
}
```

## Using with Claude or Other MCP Clients

To use this server with an MCP client like Claude Desktop, add the following configuration:

```json
{
  "mcpServers": {
    "digitalsamba": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DIGITAL_SAMBA_API_KEY"
      }
    }
  }
}
```

### Example API Usage with Authorization Header

When making requests to the Digital Samba MCP Server:

1. Include the Authorization header in your HTTP request:
   ```
   Authorization: Bearer YOUR_DIGITAL_SAMBA_API_KEY
   ```

2. The API key will be used for all resources and tools in that session

## Testing with MCP Inspector

You can test the server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

1. Start the Digital Samba MCP Server
2. Connect to it using the MCP Inspector at `http://localhost:3000/mcp`
3. Add the Authorization header with your Digital Samba API key
4. Use the Inspector to explore resources and call tools

## Troubleshooting

If you encounter issues with running the server, see the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file for common problems and solutions.

## License

MIT