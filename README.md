# Digital Samba Embedded API MCP Server

<div align="center">
  <img src="https://www.digitalsamba.com/hs-fs/hubfs/Digital%20Samba%20-%20video%20conferencing%20software%2c%20webinar%20software%2c%20virtual%20classroom%2c%20video%20api.png" alt="Digital Samba Logo" width="200"/>
  
  **Use your AI assistant to interact with the Digital Samba Embedded API**

  [![npm version](https://img.shields.io/npm/v/@digitalsamba/embedded-api-mcp-server.svg)](https://www.npmjs.com/package/@digitalsamba/embedded-api-mcp-server)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/@digitalsamba/embedded-api-mcp-server.svg)](https://nodejs.org)
  [![Coverage](https://img.shields.io/badge/dynamic/json?color=brightgreen&label=coverage&query=%24.coverage&suffix=%25&url=https%3A%2F%2Fgist.githubusercontent.com%2FConalMullan%2F5a01cdacdacf18806bf019c71896621a%2Fraw%2Fcoverage.json)](https://github.com/digitalsamba/embedded-api-mcp-server/actions)

  [Installation](#installation) • [Quick Start](#quick-start) • [Features](#features) • [API Reference](#api-reference)
</div>

---

## Overview

The Digital Samba Embedded API MCP Server is a comprehensive Model Context Protocol server that enables AI assistants like Claude to interact with Digital Samba's Embedded API. With support for 100+ endpoints, it provides complete control over rooms, sessions, recordings, analytics, and more.

## Features

### 🏠 **Room Management**
- Create, update, and delete rooms
- Generate secure access tokens
- Manage default room settings

### 📊 **Analytics & Reporting**
- Team-wide usage statistics
- Room and session analytics
- Participant analytics and tracking
- Custom period reporting

### 🎥 **Recording Management**
- List and manage recordings
- Archive and unarchive recordings
- Download recording links
- Bulk recording operations

### 👥 **Live Session Control**
- Monitor rooms with active participants
- View real-time participant lists
- Check participant counts and session duration
- Start/stop recording sessions
- Start/stop transcription
- End active sessions
- Real-time session monitoring
- Phone participant integration

### 💬 **Communication Tools**
- Poll creation and management
- Session data deletion (chat, Q&A, transcripts, summaries)

### 📚 **Content Library**
- Create and manage libraries
- Upload files and documents
- Organize with folders
- Create webapps and whiteboards
- Bulk file operations
- Move and copy operations

### 🔐 **Role & Permission Management**
- Create custom roles
- Update role permissions
- Delete roles
- List available permissions

### 🔔 **Webhook Management**
- List available webhook events
- Create and configure webhooks
- Update webhook settings
- Delete webhooks
- View webhook details

### 📤 **Export Capabilities**
- Export chat history
- Export Q&A sessions
- Export transcripts
- Export poll results

## Installation

```bash
# Install globally
npm install -g @digitalsamba/embedded-api-mcp-server

# Or use directly with npx
npx @digitalsamba/embedded-api-mcp-server --developer-key YOUR_DEVELOPER_KEY
```

## Quick Start

### 1. Get Your Developer Key

Sign up at [Digital Samba](https://dashboard.digitalsamba.com) and get your developer key from the dashboard.

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "digital-samba": {
      "command": "npx",
      "args": ["@digitalsamba/embedded-api-mcp-server", "--developer-key", "YOUR_DEVELOPER_KEY"]
    }
  }
}
```

### 3. Start Using

Restart Claude Desktop and you can now:

```
"Create a meeting room for our team standup"
"Show me analytics for yesterday's meetings"  
"List all recordings from last week"
"Generate a join link for john@example.com"
"Create a poll asking about meeting preferences"
"Export the chat transcript from today's session"
"Upload our presentation to the content library"
```

## Available MCP Resources & Tools

The MCP server exposes Digital Samba API functionality through two types of interfaces: Resources provide read-only access to data (like listing rooms or viewing analytics), while Tools enable actions that modify data (like creating rooms or starting recordings). These are accessed via MCP URIs, not direct API endpoints.

> **Note on AI Assistant Compatibility**: While the MCP protocol supports both resources and tools, current AI assistants (like Claude Desktop) can only access tools, not resources. To work around this limitation, we've implemented a hybrid approach: all read-only resources also have equivalent tool versions. For example, the `digitalsamba://rooms` resource can also be accessed via the `list-rooms` tool. This ensures full functionality while maintaining compatibility with future MCP client improvements.

### Resources (Read-Only) - 32 Available

#### Room Resources
- `digitalsamba://rooms` - List all rooms
- `digitalsamba://rooms/{id}` - Get room details
- `digitalsamba://rooms/live` - List rooms with active participants
- `digitalsamba://rooms/live/participants` - List rooms with participant details
- `digitalsamba://rooms/{id}/live` - Get live session info for a room
- `digitalsamba://rooms/{id}/live/participants` - Get participant list for a room

#### Session Resources
- `digitalsamba://sessions` - List all sessions
- `digitalsamba://sessions/{id}` - Get session summary
- `digitalsamba://sessions/{id}/participants` - List session participants
- `digitalsamba://sessions/{id}/statistics` - Get session statistics
- `digitalsamba://rooms/{id}/sessions` - List sessions for a room

#### Recording Resources
- `digitalsamba://recordings` - List all recordings
- `digitalsamba://recordings/{id}` - Get recording details
- `digitalsamba://recordings/archived` - List archived recordings
- `digitalsamba://rooms/{id}/recordings` - List recordings for a room

#### Analytics Resources
- `digitalsamba://analytics/team` - Team-wide statistics
- `digitalsamba://analytics/rooms` - Room analytics
- `digitalsamba://analytics/sessions/{id}` - Session analytics
- `digitalsamba://analytics/participants` - Participant analytics
- `digitalsamba://analytics/participants/{id}` - Specific participant stats
- `digitalsamba://analytics/usage` - Usage statistics
- `digitalsamba://analytics/live` - Live session analytics
- `digitalsamba://analytics/live/{roomId}` - Live analytics for specific room

#### Content Library Resources
- `digitalsamba://libraries` - List all libraries
- `digitalsamba://libraries/{id}` - Library details
- `digitalsamba://libraries/{id}/hierarchy` - Library folder structure
- `digitalsamba://libraries/{id}/folders` - List folders
- `digitalsamba://libraries/{id}/folders/{folderId}` - Folder details
- `digitalsamba://libraries/{id}/files` - List files
- `digitalsamba://libraries/{id}/files/{fileId}` - File details

#### Export Resources
- `digitalsamba://exports/communications/{roomId}/chat` - Export chat
- `digitalsamba://exports/communications/{roomId}/qa` - Export Q&A
- `digitalsamba://exports/communications/{sessionId}/transcripts` - Export transcripts
- `digitalsamba://exports/polls/{roomId}` - Export polls
- `digitalsamba://exports/recordings/{recordingId}` - Export recording metadata
- `digitalsamba://exports/sessions/{sessionId}/summary` - Export session summary
- `digitalsamba://exports/sessions/{sessionId}/metadata` - Export session metadata

### Tools (Actions) - 83 Available

#### Room Management
- `create-room` - Create a new room
- `update-room` - Update room settings
- `delete-room` - Delete a room
- `generate-token` - Generate access token
- `get-default-room-settings` - Get default settings for new rooms
- `update-default-room-settings` - Update default settings for new rooms
- `list-rooms` - List all rooms (mirrors digitalsamba://rooms)
- `get-room-details` - Get specific room details (mirrors digitalsamba://rooms/{id})
- `list-live-rooms` - List rooms with active participants
- `list-live-participants` - List all live participants across rooms

#### Session Management  
- `end-session` - End a live session
- `get-session-summary` - Get session details
- `get-all-room-sessions` - List all sessions for a room
- `hard-delete-session-resources` - Permanently delete session data
- `bulk-delete-session-data` - Delete multiple session data types
- `get-session-statistics` - Get detailed session statistics
- `list-sessions` - List all sessions (mirrors digitalsamba://sessions)
- `get-session-details` - Get specific session details (mirrors digitalsamba://sessions/{id})
- `list-session-participants` - List participants for a session
- `list-room-sessions` - List sessions for a specific room

#### Recording Management
- `get-recordings` - List recordings with filters
- `delete-recording` - Delete a recording
- `get-recording` - Get recording details
- `get-recording-download-link` - Get download URL
- `archive-recording` - Archive a recording
- `unarchive-recording` - Unarchive a recording

#### Live Session Controls
- `start-recording` - Start recording a session
- `stop-recording` - Stop recording
- `start-transcription` - Start live transcription
- `stop-transcription` - Stop transcription
- `phone-participants-joined` - Register phone participants joining
- `phone-participants-left` - Register phone participants leaving

#### Analytics Tools
- `get-participant-statistics` - Participant analytics
- `get-room-analytics` - Room usage analytics
- `get-usage-statistics` - Overall usage metrics
- `get-usage-analytics` - Usage analytics (mirrors digitalsamba://analytics/usage)
- `get-live-analytics` - Live session analytics (mirrors digitalsamba://analytics/live)
- `get-live-room-analytics` - Live analytics for specific room
- `get-session-analytics` - Session analytics (mirrors digitalsamba://analytics/sessions/{id})
- `get-participant-analytics` - Specific participant analytics

#### Communication Management
- `delete-session-chats` - Delete chat messages for a session
- `delete-room-chats` - Delete all chats for a room
- `delete-session-qa` - Delete Q&A for a session
- `delete-room-qa` - Delete all Q&A for a room
- `delete-session-transcripts` - Delete transcripts
- `delete-room-transcripts` - Delete all transcripts for a room
- `delete-session-summaries` - Delete AI summaries
- `delete-room-summaries` - Delete all summaries for a room

#### Poll Management
- `create-poll` - Create a new poll
- `update-poll` - Update poll settings
- `delete-poll` - Delete a poll
- `delete-session-polls` - Delete all polls for a session
- `delete-room-polls` - Delete all polls for a room
- `publish-poll-results` - Publish results to participants

#### Content Library Management
- `create-library` - Create content library
- `update-library` - Update library details
- `delete-library` - Delete a library
- `create-library-folder` - Create folder
- `update-library-folder` - Update folder
- `delete-library-folder` - Delete folder
- `create-library-file` - Upload file
- `update-library-file` - Update file details
- `delete-library-file` - Delete file
- `get-file-links` - Get file viewing links
- `create-webapp` - Create webapp
- `create-whiteboard` - Create whiteboard
- `move-library-file` - Move file between folders
- `move-library-folder` - Move folder
- `bulk-delete-library-files` - Delete multiple files
- `bulk-upload-library-files` - Upload multiple files
- `copy-library-content` - Copy files/folders
- `list-libraries` - List all libraries (mirrors digitalsamba://libraries)
- `get-library-details` - Get library details (mirrors digitalsamba://libraries/{id})
- `get-library-hierarchy` - Get folder structure (mirrors digitalsamba://libraries/{id}/hierarchy)
- `list-library-folders` - List all folders (mirrors digitalsamba://libraries/{id}/folders)
- `get-library-folder-details` - Get folder details
- `list-library-files` - List all files (mirrors digitalsamba://libraries/{id}/files)
- `get-library-file-details` - Get file details

#### Role & Permission Management
- `create-role` - Create custom role
- `update-role` - Update role settings
- `delete-role` - Delete a role
- `get-roles` - List all roles
- `get-role` - Get role details
- `get-permissions` - List available permissions

#### Webhook Management
- `list-webhook-events` - List available events to subscribe to
- `list-webhooks` - List all configured webhooks
- `create-webhook` - Create a new webhook
- `get-webhook` - Get webhook details
- `update-webhook` - Update webhook configuration
- `delete-webhook` - Delete a webhook

## Environment Variables

- `DIGITAL_SAMBA_DEVELOPER_KEY` - Your Digital Samba developer key (optional if using -k flag)
- `DIGITAL_SAMBA_API_URL` - API base URL (optional, defaults to production)
- `DS_LOG_LEVEL` - Logging level (error, warn, info, debug)

## Examples

### Basic Room Creation

```text
"Create a private room called 'Executive Meeting' with space for 10 people"
```

### Generate Access Token

```text
"Generate a moderator token for sarah@company.com to join the executive meeting"
```

### Manage Content Library

```text
"Create a library for our training materials and upload the onboarding presentation"
```

### Analytics and Reporting

```text
"Show me participant statistics for last month's sessions"
```

## Development

```bash
# Clone the repository
git clone https://github.com/digitalsamba/embedded-api-mcp-server.git
cd embedded-api-mcp-server

# Install dependencies
npm install

# Run in development mode
npm run dev -- --developer-key YOUR_DEVELOPER_KEY  # or -k YOUR_DEVELOPER_KEY

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Architecture

The server follows a modular architecture:

```
src/
├── index.ts              # Main MCP server entry
├── digital-samba-api.ts  # API client wrapper
├── resources/            # Read-only MCP resources
│   ├── rooms/           # Room listings
│   ├── sessions/        # Session data
│   ├── analytics/       # Analytics data
│   ├── recordings/      # Recording listings
│   ├── content/         # Content libraries
│   └── exports/         # Export functionality
└── tools/               # MCP tools (actions)
    ├── room-management/
    ├── session-management/
    ├── recording-management/
    ├── analytics-tools/
    ├── live-session-controls/
    ├── communication-management/
    ├── poll-management/
    ├── library-management/
    └── role-management/
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@digitalsamba.com
- 📚 [API Documentation](https://docs.digitalsamba.com)
- 🐛 [Issue Tracker](https://github.com/digitalsamba/digital-samba-mcp-server/issues)

---

Built with ❤️ by the Digital Samba team