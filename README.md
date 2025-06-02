# Digital Samba MCP Server

<div align="center">
  <img src="https://digitalsamba.com/logo.png" alt="Digital Samba Logo" width="200"/>
  
  **Connect AI assistants to Digital Samba video conferencing**

  [![npm version](https://img.shields.io/npm/v/@digitalsamba/mcp-server.svg)](https://www.npmjs.com/package/@digitalsamba/mcp-server)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/@digitalsamba/mcp-server.svg)](https://nodejs.org)

  [Installation](#installation) • [Quick Start](#quick-start) • [Features](#features) • [API Reference](#api-reference)
</div>

---

## Overview

The Digital Samba MCP Server is a lightweight Model Context Protocol server that enables AI assistants like Claude to interact with Digital Samba's video conferencing API.

## Features

- **Room Management** - Create, update, delete rooms and generate access tokens
- **Session Control** - End sessions and retrieve session summaries  
- **Analytics** - Access team, room, and session analytics
- **Recordings** - List and manage meeting recordings
- **Live Controls** - Manage participants, chat, polls, and transcripts
- **Content Library** - Upload and manage documents

## Installation

```bash
# Install globally
npm install -g @digitalsamba/mcp-server

# Or use directly with npx
npx @digitalsamba/mcp-server --api-key YOUR_API_KEY
```

## Quick Start

### 1. Get Your API Key

Sign up at [Digital Samba](https://www.digitalsamba.com) and get your API key from the dashboard.

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "digital-samba": {
      "command": "npx",
      "args": ["@digitalsamba/mcp-server", "--api-key", "YOUR_API_KEY"]
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
```

## API Reference

### Resources (Read-Only)

- `digitalsamba://rooms` - List all rooms
- `digitalsamba://rooms/{id}` - Get room details
- `digitalsamba://sessions` - List sessions
- `digitalsamba://recordings` - List recordings
- `digitalsamba://analytics/team` - Team analytics
- `digitalsamba://analytics/rooms` - Room analytics
- `digitalsamba://analytics/sessions` - Session analytics

### Tools (Actions)

#### Room Management
- `create-room` - Create a new room
- `update-room` - Update room settings
- `delete-room` - Delete a room
- `generate-room-token` - Generate access token

#### Session Management  
- `end-session` - End a live session
- `get-session-summary` - Get session details

#### Live Session Controls
- `remove-participant` - Remove a participant
- `mute-all-participants` - Mute all participants
- `set-room-lock` - Lock/unlock room
- `send-chat-message` - Send chat message
- `create-poll` - Create a poll
- `manage-transcription` - Control transcription

#### Analytics Tools
- `get-team-analytics` - Team usage statistics
- `get-room-analytics` - Room-specific analytics
- `get-session-analytics` - Session analytics

## Environment Variables

- `DIGITAL_SAMBA_API_KEY` - Your Digital Samba API key
- `DIGITAL_SAMBA_API_URL` - API base URL (optional, defaults to production)
- `DS_LOG_LEVEL` - Logging level (error, warn, info, debug)

## Examples

### Basic Room Creation

```javascript
// Via Claude Desktop
"Create a private room called 'Executive Meeting' with space for 10 people"

// Direct API usage
const room = await client.createRoom({
  friendly_url: 'executive-meeting',
  description: 'Executive team weekly sync',
  privacy: 'private'
});
```

### Generate Access Token

```javascript
// Via Claude Desktop  
"Generate a moderator token for sarah@company.com to join the executive meeting"

// Direct API usage
const token = await client.generateRoomToken(roomId, {
  userName: 'Sarah Johnson',
  role: 'moderator'
});
```

## Development

```bash
# Clone the repository
git clone https://github.com/digitalsamba/digital-samba-mcp-server.git
cd digital-samba-mcp-server

# Install dependencies
npm install

# Run in development mode
npm run dev -- --api-key YOUR_API_KEY

# Build for production
npm run build
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@digitalsamba.com
- 💬 [Community Forum](https://community.digitalsamba.com)
- 📚 [API Documentation](https://docs.digitalsamba.com)
- 🐛 [Issue Tracker](https://github.com/digitalsamba/digital-samba-mcp-server/issues)

---

Built with ❤️ by the Digital Samba team