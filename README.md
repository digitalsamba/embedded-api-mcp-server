# Digital Samba MCP Server

![Version](https://img.shields.io/npm/v/digital-samba-mcp)
![License](https://img.shields.io/npm/l/digital-samba-mcp)
![Node Version](https://img.shields.io/node/v/digital-samba-mcp)

A Model Context Protocol (MCP) server implementation for Digital Samba's video conferencing API, allowing AI agents like Claude to seamlessly interact with Digital Samba rooms, participants, and meetings.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [API Usage](#api-usage)
- [Features](#features)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Installation

```bash
npm install digital-samba-mcp
```

Or install globally to use the CLI:

```bash
npm install -g digital-samba-mcp
```

## Quick Start

### Using the CLI

The fastest way to get started is to use the command-line interface:

```bash
digital-samba-mcp --api-key YOUR_DIGITAL_SAMBA_API_KEY
```

This will start the MCP server on port 3000 and expose resources and tools for Digital Samba's video conferencing functionality.

### Using the API

```javascript
import { startServer } from 'digital-samba-mcp';

// Start the server with options
const server = startServer({
  port: 4000,
  apiUrl: 'https://api.digitalsamba.com/api/v1',
  webhookSecret: 'your_webhook_secret',
  publicUrl: 'https://your-server.example.com'
});
```

## CLI Usage

```
digital-samba-mcp [options]

Options:
  -p, --port <port>                 Port to run the server on (default: 3000)
  -k, --api-key <key>               Digital Samba API key
  -u, --api-url <url>               Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
  -l, --log-level <level>           Log level (default: info)
  -w, --webhook-secret <secret>     Secret for webhook verification
  -e, --webhook-endpoint <path>     Webhook endpoint path (default: /webhooks/digitalsamba)
  --public-url <url>                Public URL for the server (for webhook callbacks)
  -h, --help                        Display help message
```

### Environment Variables

All CLI options can also be specified as environment variables:

- `PORT` - Port to run the server on
- `DIGITAL_SAMBA_API_KEY` - Digital Samba API key
- `DIGITAL_SAMBA_API_URL` - Digital Samba API URL
- `LOG_LEVEL` - Log level (error, warn, info, http, verbose, debug, silly)
- `WEBHOOK_SECRET` - Secret for webhook verification
- `WEBHOOK_ENDPOINT` - Webhook endpoint path
- `PUBLIC_URL` - Public URL for the server

## API Usage

### Creating a Server

```javascript
import { createServer } from 'digital-samba-mcp';

const { server, port, apiUrl } = createServer({
  port: 4000,
  apiUrl: 'https://api.digitalsamba.com/api/v1',
  webhookSecret: 'your_webhook_secret',
  webhookEndpoint: '/webhooks/digitalsamba',
  publicUrl: 'https://your-server.example.com'
});
```

### Starting a Server

```javascript
import { startServer } from 'digital-samba-mcp';

const httpServer = startServer({
  port: 4000,
  apiUrl: 'https://api.digitalsamba.com/api/v1'
});

// Later, if needed:
httpServer.close();
```

### Using the Digital Samba API Client Directly

```javascript
import { DigitalSambaApiClient } from 'digital-samba-mcp/client';

const client = new DigitalSambaApiClient(
  'your_api_key',
  'https://api.digitalsamba.com/api/v1'
);

// List rooms
const { data: rooms } = await client.listRooms();

// Create a room
const room = await client.createRoom({
  name: 'My Meeting Room',
  privacy: 'private'
});

// Generate a room token
const token = await client.generateRoomToken(room.id, {
  u: 'User Name'
});

console.log('Join URL:', token.link);
```

## Features

The Digital Samba MCP Server provides the following functionality:

### Performance Optimization
- **Rate Limiting**: Configurable API request rate limiting to prevent abuse and ensure fair usage
- **Response Caching**: Memory-based caching of API responses for improved performance

### Room Management
- List, create, update, and delete rooms
- Generate room tokens for participant access
- Manage room settings and participant permissions

### Meeting Scheduling
- Schedule, update, and cancel meetings
- Manage meeting participants
- Find available meeting times
- Generate meeting join links

### Recording Functionality
- Start and stop room recordings
- List and access recordings
- Manage recording settings

### Moderation Tools
- Mute/unmute participants
- Ban/unban participants
- Lock/unlock rooms
- Manage media settings

### Breakout Rooms
- Create and manage breakout rooms
- Assign participants to breakout rooms
- Broadcast messages to breakout rooms

### Webhook Integration
- Register webhooks to receive event notifications
- Listen for room, participant, and recording events
- Secure webhook verification with signatures

## Configuration

### Server Options

The `createServer` and `startServer` functions accept the following options:

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `port` | number | Port to run the server on | 3000 |
| `apiUrl` | string | Digital Samba API URL | https://api.digitalsamba.com/api/v1 |
| `webhookSecret` | string | Secret for webhook verification | undefined |
| `webhookEndpoint` | string | Webhook endpoint path | /webhooks/digitalsamba |
| `publicUrl` | string | Public URL for the server | http://localhost:{port} |
| `enableRateLimiting` | boolean | Enable API request rate limiting | false |
| `rateLimitRequestsPerMinute` | number | Maximum requests per minute per API key | 60 |
| `enableCache` | boolean | Enable API response caching | false |
| `cacheTtl` | number | Cache Time-To-Live in milliseconds | 300000 (5 minutes) |

### API Client Options

The `DigitalSambaApiClient` constructor takes the following parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `apiKey` | string | Digital Samba API key | undefined |
| `apiUrl` | string | Digital Samba API URL | https://api.digitalsamba.com/api/v1 |

## Advanced Usage

### Custom Error Handling

The package includes standardized error types that can be used for consistent error handling:

```javascript
import { 
  DigitalSambaError, 
  AuthenticationError,
  ResourceNotFoundError
} from 'digital-samba-mcp/server';

try {
  // Some operation that might fail
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Authentication failed:', error.message);
  } else if (error instanceof ResourceNotFoundError) {
    console.log(`Resource not found: ${error.resourceType} with ID ${error.resourceId}`);
  } else if (error instanceof DigitalSambaError) {
    console.log('Digital Samba error:', error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### Webhook Handling

```javascript
import express from 'express';
import { WebhookService, setupWebhookTools } from 'digital-samba-mcp/server';

const app = express();
app.use(express.json());

const webhookService = new WebhookService(mcpServer, {
  secret: 'your_webhook_secret',
  endpoint: '/webhooks/digitalsamba'
});

// Register webhooks
webhookService.registerWebhookEndpoint(app);

// Register custom event handlers
webhookService.on('room.created', async (payload) => {
  console.log('Room created:', payload.data.id);
});

webhookService.on('participant.joined', async (payload) => {
  console.log('Participant joined:', payload.data.name);
});
```

### Advanced Configuration with Rate Limiting and Caching

```javascript
import { startServer } from 'digital-samba-mcp';

// Start the server with advanced configuration
const server = startServer({
  port: 4000,
  apiUrl: 'https://api.digitalsamba.com/api/v1',
  // Enable rate limiting
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 60, // 60 requests per minute per API key
  // Enable response caching
  enableCache: true,
  cacheTtl: 60000, // Cache responses for 1 minute
});
```

## Examples

### Creating a Room and Generating Join Links

```javascript
import { DigitalSambaApiClient } from 'digital-samba-mcp/client';

const client = new DigitalSambaApiClient('your_api_key');

async function createMeetingRoom() {
  // Create a room
  const room = await client.createRoom({
    name: 'Team Meeting',
    privacy: 'private',
    max_participants: 10
  });
  console.log(`Room created: ${room.id}`);
  
  // Generate join links for participants
  const hostToken = await client.generateRoomToken(room.id, {
    u: 'Meeting Host',
    role: 'host'
  });
  
  const participantToken = await client.generateRoomToken(room.id, {
    u: 'Team Member'
  });
  
  console.log(`Host link: ${hostToken.link}`);
  console.log(`Participant link: ${participantToken.link}`);
}

createMeetingRoom().catch(console.error);
```

### Scheduling a Meeting

```javascript
import { DigitalSambaApiClient } from 'digital-samba-mcp/client';

const client = new DigitalSambaApiClient('your_api_key');

async function scheduleMeeting() {
  const meeting = await client.createScheduledMeeting({
    title: 'Weekly Team Sync',
    description: 'Weekly sync meeting to discuss ongoing projects',
    start_time: '2025-06-01T14:00:00Z',
    end_time: '2025-06-01T15:00:00Z',
    timezone: 'UTC',
    host_name: 'Team Lead',
    host_email: 'team.lead@example.com',
    participants: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' }
    ],
    recurring: true,
    recurrence_pattern: 'FREQ=WEEKLY;BYDAY=MO',
    send_invitations: true
  });
  
  console.log(`Meeting scheduled: ${meeting.id}`);
  console.log(`Starts: ${new Date(meeting.start_time).toLocaleString()}`);
}

scheduleMeeting().catch(console.error);
```

## Troubleshooting

For common issues and solutions, please see the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
