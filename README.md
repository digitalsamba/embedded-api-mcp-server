# Digital Samba MCP Server

![Version](https://img.shields.io/npm/v/digital-samba-mcp)
![License](https://img.shields.io/npm/l/digital-samba-mcp)
![Node Version](https://img.shields.io/node/v/digital-samba-mcp)

A Model Context Protocol (MCP) server implementation for Digital Samba's video conferencing API, allowing AI agents like Claude to seamlessly interact with Digital Samba rooms, participants, and meetings.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Claude Desktop Integration](#claude-desktop-integration)
- [CLI Usage](#cli-usage)
- [API Usage](#api-usage)
- [Features](#features)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
  - [Metrics Collection with Prometheus](#metrics-collection-with-prometheus)
  - [Custom Error Handling](#custom-error-handling)
  - [Webhook Handling](#webhook-handling)
  - [Advanced Configuration](#advanced-configuration-with-rate-limiting-and-caching)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Installation

### Local Installation (Recommended)

```bash
npm install digital-samba-mcp
```

Then use with npx:

```bash
npx digital-samba-mcp --api-key YOUR_API_KEY
```

### Global Installation

While global installation is supported, we recommend local installation for better version management and dependency control.

```bash
npm install -g digital-samba-mcp
digital-samba-mcp --api-key YOUR_API_KEY
```

## Quick Start

### Using the CLI

The fastest way to get started is to use the command-line interface with npx:

```bash
npx digital-samba-mcp --api-key YOUR_DIGITAL_SAMBA_API_KEY
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

## Claude Desktop Integration

The Digital Samba MCP Server is designed to work seamlessly with Claude Desktop, enabling Claude to create and manage Digital Samba video conferencing sessions.

### Configure Claude Desktop

1. Start the Digital Samba MCP Server locally:
   ```bash
   npx digital-samba-mcp --api-key YOUR_DIGITAL_SAMBA_API_KEY
   ```

2. Open Claude Desktop and navigate to Settings > Advanced > MCP Servers:
   - Click "Add Server"
   - Enter the following information:
     - Name: `Digital Samba`
     - URL: `http://localhost:3000/mcp`
     - Add the following header:
       - Name: `Authorization`
       - Value: `Bearer YOUR_DIGITAL_SAMBA_API_KEY`
   - Click "Save"

3. Select "Digital Samba" from the MCP server dropdown in Claude Desktop.

4. You can now ask Claude to interact with Digital Samba:
   - "List my Digital Samba rooms"
   - "Create a new Digital Samba meeting called 'Team Weekly'"
   - "Generate a join link for room XYZ"
   - "Show me participants in my active meetings"

### Example Claude Prompts

Here are examples of requests you can make to Claude once the Digital Samba MCP server is connected:

**List Rooms**
```
Show me all my Digital Samba meeting rooms.
```

**Create Room**
```
Create a new Digital Samba meeting room called "Weekly Team Sync" with a maximum of 20 participants.
```

**Generate Join Link**
```
Generate a join link for my "Weekly Team Sync" room with the name "Meeting Host".
```

**View Participants**
```
Show me who's currently in my Digital Samba meetings.
```

**Schedule Meeting**
```
Schedule a Digital Samba meeting called "Quarterly Review" for next Monday at 10 AM Eastern Time with the following participants: [email list].
```

## CLI Usage

```
npx digital-samba-mcp [options]

Options:
  -p, --port <port>                 Port to run the server on (default: 3000)
  -k, --api-key <key>               Digital Samba API key
  -u, --api-url <url>               Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
  -l, --log-level <level>           Log level (default: info)
  -w, --webhook-secret <secret>     Secret for webhook verification
  -e, --webhook-endpoint <path>     Webhook endpoint path (default: /webhooks/digitalsamba)
  --public-url <url>                Public URL for the server (for webhook callbacks)
  --enable-rate-limiting            Enable rate limiting for API requests
  --rate-limit-requests-per-minute  Maximum requests per minute per API key (default: 60)
  --enable-cache                    Enable caching of API responses
  --cache-ttl                       Cache Time-To-Live in milliseconds (default: 300000)
  --enable-metrics                  Enable Prometheus metrics collection
  --metrics-endpoint <path>         Path for metrics endpoint (default: /metrics)
  --metrics-prefix <prefix>         Prefix for metrics names (default: digital_samba_mcp_)
  --collect-default-metrics         Collect default Node.js metrics (default: true)
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
- `ENABLE_RATE_LIMITING` - Enable rate limiting (true/false)
- `RATE_LIMIT_REQUESTS_PER_MINUTE` - Maximum requests per minute
- `ENABLE_CACHE` - Enable caching (true/false)
- `CACHE_TTL` - Cache TTL in milliseconds
- `ENABLE_METRICS` - Enable Prometheus metrics collection (true/false)
- `METRICS_ENDPOINT` - Endpoint path for metrics (default: /metrics)
- `METRICS_PREFIX` - Prefix for metrics names (default: digital_samba_mcp_)
- `COLLECT_DEFAULT_METRICS` - Collect default Node.js metrics (true/false)

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
- **Metrics Collection**: Prometheus-compatible metrics for monitoring server performance and usage

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
| `enableMetrics` | boolean | Enable Prometheus metrics collection | false |
| `metricsEndpoint` | string | Endpoint for exposing metrics | /metrics |
| `metricsPrefix` | string | Prefix for metrics names | digital_samba_mcp_ |
| `collectDefaultMetrics` | boolean | Collect default Node.js metrics | true |

### API Client Options

The `DigitalSambaApiClient` constructor takes the following parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `apiKey` | string | Digital Samba API key | undefined |
| `apiUrl` | string | Digital Samba API URL | https://api.digitalsamba.com/api/v1 |

## Available MCP Resources and Tools

The Digital Samba MCP Server exposes the following resources and tools to MCP clients like Claude Desktop:

### Resources

| Resource URI | Description |
|--------------|-------------|
| `digitalsamba://rooms` | List all rooms |
| `digitalsamba://rooms/{roomId}` | Get details for a specific room |
| `digitalsamba://rooms/{roomId}/participants` | List participants in a room |
| `digitalsamba://recordings` | List all recordings |
| `digitalsamba://recordings/{recordingId}` | Get details for a specific recording |
| `digitalsamba://webhooks` | List all registered webhooks |
| `digitalsamba://meetings` | List all scheduled meetings |
| `digitalsamba://meetings/{meetingId}` | Get details for a specific meeting |

### Tools

| Tool Name | Description |
|-----------|-------------|
| `create-room` | Create a new room |
| `update-room` | Update an existing room |
| `delete-room` | Delete a room |
| `generate-token` | Generate a token for room access |
| `register-webhook` | Register a webhook for events |
| `delete-webhook` | Delete a registered webhook |
| `list-webhooks` | List all registered webhooks |
| `list-webhook-events` | List available webhook event types |
| `start-recording` | Start recording in a room |
| `stop-recording` | Stop recording in a room |
| `delete-recording` | Delete a recording |
| `ban-participant` | Ban a participant from a room |
| `unban-participant` | Unban a participant from a room |
| `mute-participant` | Mute a participant |
| `create-breakout-rooms` | Create breakout rooms for a parent room |
| `assign-participants` | Assign participants to breakout rooms |
| `broadcast-message` | Broadcast a message to all breakout rooms |
| `create-meeting` | Schedule a new meeting |
| `update-meeting` | Update a scheduled meeting |
| `cancel-meeting` | Cancel a scheduled meeting |
| `add-participants` | Add participants to a meeting |

## Advanced Usage

### Metrics Collection with Prometheus

The Digital Samba MCP Server includes built-in support for Prometheus metrics, which allows you to monitor server performance, API calls, caching, and more.

#### Enabling Metrics

Metrics can be enabled via CLI arguments:

```bash
npx digital-samba-mcp --enable-metrics --metrics-endpoint /metrics --metrics-prefix digital_samba_mcp_
```

Or via environment variables:

```bash
ENABLE_METRICS=true METRICS_ENDPOINT=/metrics METRICS_PREFIX=digital_samba_mcp_ npx digital-samba-mcp
```

Or when using the API:

```javascript
import { startServer } from 'digital-samba-mcp';

const server = startServer({
  enableMetrics: true,
  metricsEndpoint: '/metrics',
  metricsPrefix: 'digital_samba_mcp_',
  collectDefaultMetrics: true
});
```

#### Available Metrics

The server exposes the following metrics:

- HTTP metrics (request counts, duration, response sizes)
- API client metrics (requests, errors, latency)
- Cache metrics (hits, misses, size)
- Rate limiting metrics
- Connection metrics (active sessions, connections)
- Default Node.js metrics (memory, CPU, etc.)

#### Setting Up Prometheus

For detailed instructions on setting up Prometheus to scrape metrics from the Digital Samba MCP Server, see the [Prometheus Setup Guide](docs/prometheus-setup.md).

A sample Grafana dashboard is also available in the [docs/grafana-dashboard.json](docs/grafana-dashboard.json) file.

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

## Testing with MCP Inspector

You can test the Digital Samba MCP Server using the MCP Inspector tool:

1. Install the MCP Inspector:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. Start the Digital Samba MCP Server:
   ```bash
   npx digital-samba-mcp --api-key YOUR_DIGITAL_SAMBA_API_KEY
   ```

3. Run the MCP Inspector:
   ```bash
   mcp-inspector --url http://localhost:3000/mcp --header "Authorization: Bearer YOUR_DIGITAL_SAMBA_API_KEY"
   ```

4. The MCP Inspector will allow you to:
   - Browse available resources and tools
   - Try out tool calls
   - Explore resource URIs
   - Verify MCP protocol compliance

## Local Development Testing

If you're developing the Digital Samba MCP package locally and want to test it without publishing to npm, you can use the following methods:

### Method 1: Using npm link

This method creates a global link to your local package:

```bash
# In the digital-samba-mcp directory
npm run build:clean  # Build the package first
npm link

# Now you can use it from anywhere
npx digital-samba-mcp YOUR_API_KEY
```

For Windows users, you can use the included script:
```bash
link-local-test.bat
```

### Method 2: Using Local Test Scripts

The package includes scripts for testing locally:

```bash
# In the digital-samba-mcp directory
test-local-npm.bat YOUR_API_KEY
```

Or with additional options:
```bash
test-local-npm.bat YOUR_API_KEY --port 4000 --log-level debug
```

### Method 3: Direct Integration with Claude Desktop

For optimal Claude Desktop integration, use the dedicated Windows batch file wrapper:

```json
"Digital_Samba": {
  "command": "C:\\path\\to\\digital-samba-mcp\\claude-desktop-wrapper.bat",
  "args": ["YOUR_API_KEY"]
}
```

Using a .bat file avoids Windows "Open with" prompts since Windows knows how to execute batch files natively.

The batch file wrapper:
- Redirects log output to a file for debugging (claude-desktop.log)
- Sets up proper environment variables for JSON-RPC communication
- Logs startup information for troubleshooting

Add this configuration to Claude Desktop's MCP Server setup.

## Troubleshooting

For common issues and solutions, please see the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file.

### Common Issues

1. **Authentication Errors**
   - Make sure you're using a valid Digital Samba API key
   - Ensure the Authorization header is formatted correctly: `Bearer YOUR_API_KEY`

2. **Connection Issues**
   - Verify the server is running on the expected port
   - Check firewall settings if connecting remotely
   - Ensure the MCP client is using the correct URL

3. **Rate Limiting**
   - If you encounter 429 Too Many Requests errors, you may be exceeding the rate limit
   - Enable rate limiting with a higher threshold or add caching to reduce API calls

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
