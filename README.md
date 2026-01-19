# Digital Samba Embedded API MCP Server

<div align="center">
  <img src="https://dashboard.digitalsamba.com/logo.svg" alt="Digital Samba Logo" width="200"/>

  **Control your Digital Samba video platform with AI assistants**

  [![Server Status](https://img.shields.io/badge/server-operational-brightgreen)](https://mcp.digitalsamba.com)
  [![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

  [Quick Start](#quick-start) • [Features](#features) • [Setup Guides](#setup-guides) • [Tools Reference](#available-tools)
</div>

---

## Overview

The Digital Samba Embedded MCP Server lets you manage your video conferencing platform using natural language through AI assistants like Claude and ChatGPT. Create rooms, manage recordings, view analytics, and control live sessions—just by asking.

**Server URL:** `https://mcp.digitalsamba.com`

### What You Can Do

```
"Create a meeting room for our team standup"
"Show me analytics for yesterday's meetings"
"List all recordings from last week"
"Generate a join link for john@example.com"
"Create a poll asking about meeting preferences"
"Export the chat transcript from today's session"
```

---

## Quick Start

### 1. Have a Digital Samba Account

Sign up at [Digital Samba](https://digitalsamba.com) if you don't have an account. You'll need **Admin** access to your team.

### 2. Connect Your AI Assistant

Add our MCP server to your AI assistant:

| Assistant | Server URL |
|-----------|------------|
| Claude Desktop | `https://mcp.digitalsamba.com` |
| ChatGPT | `https://mcp.digitalsamba.com` |
| Other MCP Clients | `https://mcp.digitalsamba.com` |

### 3. Authenticate

When you first connect, you'll be redirected to Digital Samba to log in. Once authenticated, you can start using natural language to manage your account.

---

## Setup Guides

### Claude Code

```bash
claude mcp add --transport http digitalsamba https://mcp.digitalsamba.com/mcp
```

Then use the `/mcp` command in Claude Code to authenticate.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digitalsamba": {
      "url": "https://mcp.digitalsamba.com/mcp"
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop and authenticate when prompted.

### Other MCP Clients

Use the server URL `https://mcp.digitalsamba.com/mcp` with any MCP-compatible client.

---

## Features

### Room Management
- Create, update, and delete rooms
- Generate secure access tokens for participants
- Manage default room settings
- Configure room features (chat, Q&A, recordings, etc.)

### Analytics & Reporting
- Team-wide usage statistics
- Room and session analytics
- Participant tracking and engagement metrics
- Custom date range reporting

### Recording Management
- List and search recordings
- Archive and unarchive recordings
- Get download links
- Bulk recording operations
- Recording bookmarks

### Live Session Control
- Monitor active rooms and participants
- Start/stop recordings on demand
- Start/stop live transcription
- End sessions remotely
- Raise/lower participant hands
- Phone participant integration

### Communication Tools
- Create and manage polls
- Export chat history, Q&A, and transcripts
- Delete session data (GDPR compliance)
- AI-generated session summaries

### Content Library
- Create and organize libraries
- Upload files and documents
- Manage folders and hierarchy
- Create webapps and whiteboards
- Bulk file operations

### Webhooks & Integrations
- Subscribe to platform events
- Configure webhook endpoints
- Manage webhook lifecycle

### Role & Permission Management
- Create custom roles
- Assign granular permissions
- Manage team access levels

---

## Available Tools

The MCP server provides **113 tools** covering the complete Digital Samba API.

### Room Management (11 tools)
| Tool | Description |
|------|-------------|
| `create-room` | Create a new room |
| `update-room` | Update room settings |
| `delete-room` | Delete a room |
| `generate-token` | Generate participant access token |
| `get-default-room-settings` | Get default settings |
| `update-default-room-settings` | Update default settings |
| `list-rooms` | List all rooms |
| `get-room-details` | Get room details |
| `list-live-rooms` | List rooms with active sessions |
| `list-live-participants` | List all live participants |
| `get-room-live-info` | Get live session info for a room |

### Session Management (12 tools)
| Tool | Description |
|------|-------------|
| `list-sessions` | List all sessions |
| `get-session-summary` | Get session details |
| `list-session-participants` | List session participants |
| `get-session-statistics-details` | Detailed session stats |
| `list-room-sessions` | Sessions for a specific room |
| `end-session` | End a live session |
| `delete-session-recordings` | Delete session recordings |
| `delete-session-resources` | Delete session resources |
| `hard-delete-session-resources` | Permanently delete data |
| `bulk-delete-session-data` | Bulk delete operations |
| `list-room-transcripts` | List room transcripts |
| `list-session-transcripts` | List session transcripts |

### Recording Management (10 tools)
| Tool | Description |
|------|-------------|
| `get-recordings` | List recordings with filters |
| `get-recording` | Get recording details |
| `delete-recording` | Delete a recording |
| `get-recording-download-link` | Get download URL |
| `archive-recording` | Archive a recording |
| `unarchive-recording` | Restore archived recording |
| `get-archived-recordings` | List archived recordings |
| `get-room-recordings` | Recordings for a room |
| `get-recording-bookmarks` | Get recording bookmarks |
| `bulk-delete-recordings` | Delete multiple recordings |

### Live Session Controls (8 tools)
| Tool | Description |
|------|-------------|
| `start-recording` | Start recording a session |
| `stop-recording` | Stop recording |
| `start-transcription` | Start live transcription |
| `stop-transcription` | Stop transcription |
| `raise-participant-hand` | Raise a participant's hand |
| `lower-participant-hand` | Lower a participant's hand |
| `raise-phone-participant-hand` | Raise phone participant hand |
| `lower-phone-participant-hand` | Lower phone participant hand |

### Analytics Tools (8 tools)
| Tool | Description |
|------|-------------|
| `get-team-statistics` | Team-wide metrics |
| `get-room-analytics` | Room usage analytics |
| `get-usage-statistics` | Overall usage stats |
| `get-participant-statistics` | Participant analytics |
| `get-session-analytics` | Session analytics |
| `get-live-analytics` | Live session metrics |
| `get-live-room-analytics` | Live metrics for a room |
| `get-participant-analytics` | Specific participant stats |

### Communication Management (13 tools)
| Tool | Description |
|------|-------------|
| `delete-session-chats` | Delete session chat |
| `delete-room-chats` | Delete all room chats |
| `delete-session-qa` | Delete session Q&A |
| `delete-room-qa` | Delete all room Q&A |
| `delete-session-transcripts` | Delete session transcripts |
| `delete-room-transcripts` | Delete all room transcripts |
| `delete-session-summaries` | Delete AI summaries |
| `delete-room-summaries` | Delete all room summaries |
| `export-room-transcripts` | Export room transcripts |
| `export-chat-messages` | Export chat history |
| `export-qa-data` | Export Q&A data |
| `export-session-transcripts` | Export transcripts |
| `export-poll-results` | Export poll results |

### Poll Management (6 tools)
| Tool | Description |
|------|-------------|
| `create-poll` | Create a new poll |
| `update-poll` | Update poll settings |
| `delete-poll` | Delete a poll |
| `delete-session-polls` | Delete session polls |
| `delete-room-polls` | Delete all room polls |
| `publish-poll-results` | Publish results |

### Content Library (26 tools)
| Tool | Description |
|------|-------------|
| `list-libraries` | List all libraries |
| `get-library-details` | Get library details |
| `create-library` | Create a library |
| `update-library` | Update library |
| `delete-library` | Delete a library |
| `get-library-hierarchy` | Get folder structure |
| `list-library-folders` | List folders |
| `get-library-folder-details` | Folder details |
| `create-library-folder` | Create folder |
| `update-library-folder` | Update folder |
| `delete-library-folder` | Delete folder |
| `list-library-files` | List files |
| `get-library-file-details` | File details |
| `create-library-file` | Upload file |
| `update-library-file` | Update file |
| `delete-library-file` | Delete file |
| `get-file-links` | Get viewing links |
| `create-webapp` | Create webapp |
| `create-whiteboard` | Create whiteboard |
| `move-library-file` | Move file |
| `move-library-folder` | Move folder |
| `copy-library-content` | Copy content |
| `bulk-delete-library-files` | Bulk delete |
| `bulk-upload-library-files` | Bulk upload |

### Role & Permission Management (6 tools)
| Tool | Description |
|------|-------------|
| `get-roles` | List all roles |
| `get-role` | Get role details |
| `create-role` | Create custom role |
| `update-role` | Update role |
| `delete-role` | Delete role |
| `get-permissions` | List permissions |

### Webhook Management (6 tools)
| Tool | Description |
|------|-------------|
| `list-webhook-events` | Available events |
| `list-webhooks` | List webhooks |
| `get-webhook` | Webhook details |
| `create-webhook` | Create webhook |
| `update-webhook` | Update webhook |
| `delete-webhook` | Delete webhook |

### Export Tools (7 tools)
| Tool | Description |
|------|-------------|
| `export-chat-messages` | Export chat |
| `export-qa-data` | Export Q&A |
| `export-session-transcripts` | Export transcripts |
| `export-poll-results` | Export polls |
| `export-recording-metadata` | Export recording data |
| `export-session-summary` | Export summary |
| `export-session-metadata` | Export metadata |

---

## Troubleshooting

### Authentication Issues
- **"Not authorized" error**: Ensure you have Admin role on your Digital Samba team
- **OAuth redirect fails**: Check your browser allows popups from claude.ai
- **Token expired**: Reconnect - tokens auto-refresh but may require re-authentication after 24 hours

### Common Issues
- **"Room not found"**: Verify the room ID is correct and hasn't been deleted
- **"Rate limit exceeded"**: Wait a few minutes and try again
- **Tools not appearing**: Restart your AI assistant after adding the server

### Getting Help
- Check our [API documentation](https://developer.digitalsamba.com)
- Open an issue on [GitHub](https://github.com/digitalsamba/embedded-api-mcp-server/issues)
- Contact support@digitalsamba.com

---

## Authentication

The MCP server uses **OAuth 2.0** with Digital Samba as the identity provider. When you connect:

1. Your AI assistant redirects you to Digital Samba login
2. You authenticate with your Digital Samba credentials
3. The MCP server receives authorization to act on your behalf
4. All API calls use your account's permissions

**Requirements:**
- You must have **Admin** role on your Digital Samba team
- OAuth tokens are valid for 24 hours and auto-refresh

---

## For Developers

### Local Development

If you want to run a local instance for development:

```bash
git clone https://github.com/digitalsamba/embedded-api-mcp-server.git
cd embedded-api-mcp-server
npm install
npm run dev -- --developer-key YOUR_DEVELOPER_KEY
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### API Reference

- [Digital Samba REST API Documentation](https://developer.digitalsamba.com)
- [OpenAPI Specification](https://developer.digitalsamba.com/rest-api/openapi.yaml)

---

## npm Package (Deprecated)

> **Note:** The npm package `@digitalsamba/embedded-api-mcp-server` is deprecated. Please use the hosted MCP server at `https://mcp.digitalsamba.com` instead. The hosted version provides a better experience with OAuth authentication—no API keys to manage, no installation required.

If you have the npm package installed, it will continue to work but will not receive updates.

---

## Support

- **Documentation:** [developer.digitalsamba.com](https://developer.digitalsamba.com)
- **Issues:** [GitHub Issues](https://github.com/digitalsamba/embedded-api-mcp-server/issues)
- **Email:** support@digitalsamba.com

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <br>
  <a href="https://digitalsamba.com">
    <img src="https://dashboard.digitalsamba.com/logo.svg" alt="Digital Samba" width="120"/>
  </a>
  <br><br>
  Built with care by the Digital Samba team
</div>
