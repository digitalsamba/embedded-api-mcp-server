# Digital Samba MCP Server

[![npm version](https://img.shields.io/npm/v/digital-samba-mcp-server.svg)](https://www.npmjs.com/package/digital-samba-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/digital-samba-mcp-server.svg)](https://nodejs.org)

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Digital Samba's video conferencing API. Create rooms, manage sessions, analyze usage, and control every aspect of your video conferences through natural language.

## Features

- 🏠 **Room Management** - Create, update, delete rooms and generate access tokens
- 📅 **Session Control** - Manage live sessions, participants, and session data
- 📊 **Analytics & Insights** - Comprehensive usage statistics and participant analytics
- 🎥 **Recording Management** - Control recordings and access recording data
- 🗳️ **Polls & Q&A** - Create polls, manage Q&A sessions, and collect feedback
- 📚 **Content Library** - Upload and manage whiteboards, documents, and media
- 🔔 **Webhook Management** - Register and configure webhooks in Digital Samba
- ⚡ **Performance Optimized** - Built-in caching, rate limiting, and circuit breakers

## Installation

```bash
npm install digital-samba-mcp-server
```

## Quick Start

### 1. Get Your API Key

Sign up at [Digital Samba](https://www.digitalsamba.com) and obtain your API key from the dashboard.

### 2. Start the Server

```bash
npx digital-samba-mcp-server --api-key YOUR_API_KEY
```

The server will start on `http://localhost:3000` by default.

### 3. Connect to Claude Desktop

1. Open Claude Desktop settings
2. Navigate to MCP Servers
3. Add a new server:
   - Name: `Digital Samba`
   - URL: `http://localhost:3000/mcp`
   - Header: `Authorization: Bearer YOUR_API_KEY`

## Usage Examples

Once connected, you can ask Claude to perform various tasks:

### Room Management
```
"Create a meeting room called 'Team Standup' with 10 participant limit"
"List all my Digital Samba rooms"
"Generate a join link for the Team Standup room"
```

### Session Analytics
```
"Show me participant statistics for yesterday's meeting"
"What's my team's usage pattern this month?"
"Get detailed analytics for room abc-123"
```

### Live Session Control
```
"End all active sessions in the Training room"
"Who's currently in my meetings?"
"Mute all participants in room xyz"
```

### Content Management
```
"Upload whiteboard.pdf to my resource library"
"Show all documents in the Training room"
"Delete old recordings from last month"
```

## CLI Options

```bash
npx digital-samba-mcp-server [options]

Options:
  -p, --port <port>                 Server port (default: 3000)
  -k, --api-key <key>               Digital Samba API key (required)
  -u, --api-url <url>               API base URL
  --enable-cache                    Enable response caching
  --enable-rate-limiting            Enable rate limiting
  --enable-metrics                  Enable Prometheus metrics
  -h, --help                        Display help
```

## Programmatic Usage

### As an MCP Server

```javascript
import { startServer } from 'digital-samba-mcp-server';

const server = startServer({
  port: 4000,
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  enableCache: true,
  enableRateLimiting: true
});
```

### Direct API Client

```javascript
import { DigitalSambaApiClient } from 'digital-samba-mcp-server/client';

const client = new DigitalSambaApiClient(apiKey);

// Create a room
const room = await client.createRoom({
  name: 'Engineering Sync',
  privacy: 'private',
  max_participants: 20
});

// Generate access token
const token = await client.generateRoomToken(room.id, {
  role: 'moderator',
  username: 'John Doe'
});

console.log('Join URL:', token.link);
```

## Available Resources & Tools

### Resources (Read Operations)
- `digitalsamba://rooms` - List all rooms
- `digitalsamba://rooms/{id}/participants` - View room participants
- `digitalsamba://sessions` - List sessions
- `digitalsamba://analytics/usage` - Usage statistics
- `digitalsamba://analytics/team` - Team analytics
- `digitalsamba://recordings` - List recordings
- `digitalsamba://content/library` - Content library

### Tools (Actions)
- **Room Tools**: create-room, update-room, delete-room, generate-room-token
- **Session Tools**: end-session, get-session-statistics, bulk-delete-session-data
- **Analytics Tools**: get-participant-stats, get-room-analytics, get-usage-report
- **Recording Tools**: start-recording, stop-recording, delete-recording
- **Content Tools**: upload-document, create-whiteboard, delete-content
- **Communication Tools**: delete-session-chats, delete-session-qa
- **Poll Tools**: create-poll, publish-poll-results, delete-poll

## Environment Variables

```bash
DIGITAL_SAMBA_API_KEY=your_api_key
PORT=3000
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
CACHE_TTL=300000
RATE_LIMIT_REQUESTS_PER_MINUTE=60
LOG_LEVEL=info
```

## Advanced Configuration

### Performance Features

```javascript
const server = startServer({
  // Caching
  enableCache: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  
  // Rate Limiting
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 60,
  
  // Circuit Breaker
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  
  // Metrics
  enableMetrics: true,
  metricsEndpoint: '/metrics'
});
```

### Webhook Management

```javascript
// Using the API client to manage webhooks
const client = new DigitalSambaApiClient(apiKey);

// Register a webhook
const webhook = await client.createWebhook({
  url: 'https://your-server.com/webhook-handler',
  events: ['room.created', 'participant.joined']
});

// List webhooks
const webhooks = await client.listWebhooks();

// Delete a webhook
await client.deleteWebhook(webhook.id);
```

## Requirements

- Node.js 16.0.0 or higher
- Digital Samba API key
- 50MB disk space

## Support

- 📖 [Documentation](https://github.com/digital-samba/digital-samba-mcp-server#readme)
- 🐛 [Issue Tracker](https://github.com/digital-samba/digital-samba-mcp-server/issues)
- 💬 [Discussions](https://github.com/digital-samba/digital-samba-mcp-server/discussions)

## License

MIT © Digital Samba

---

Built with ❤️ for the MCP ecosystem