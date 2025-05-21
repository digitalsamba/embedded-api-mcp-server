# Digital Samba MCP Server Package

This package provides a Model Context Protocol (MCP) server that integrates with Digital Samba's video conferencing API. The server can be used with Claude Desktop and other MCP clients.

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

## Usage

### Command Line Interface

Once installed, you can run the MCP server with the following command:

```bash
npx digital-samba-mcp --api-key YOUR_API_KEY
```

If installed globally:

```bash
digital-samba-mcp --api-key YOUR_API_KEY
```

#### Available Options

- `-p, --port <port>`: Port to run the server on (default: 4521)
- `-k, --api-key <key>`: Digital Samba API key
- `-u, --api-url <url>`: Digital Samba API URL (default: https://api.digitalsamba.com/api/v1)
- `-l, --log-level <level>`: Log level (default: info)
- `-w, --webhook-secret <secret>`: Secret for webhook verification
- `-e, --webhook-endpoint <path>`: Webhook endpoint path (default: /webhooks/digitalsamba)
- `--public-url <url>`: Public URL for the server (for webhook callbacks)
- `-h, --help`: Display help information

#### Environment Variables

Instead of command-line options, you can also use environment variables:

- `PORT`: Port to run the server on
- `DIGITAL_SAMBA_API_KEY`: Digital Samba API key
- `DIGITAL_SAMBA_API_URL`: Digital Samba API URL
- `LOG_LEVEL`: Log level
- `WEBHOOK_SECRET`: Secret for webhook verification
- `WEBHOOK_ENDPOINT`: Webhook endpoint path
- `PUBLIC_URL`: Public URL for the server

### Programmatic Usage

You can also use the MCP server programmatically in your own Node.js applications:

```javascript
import { startServer } from 'digital-samba-mcp';

// Start the server with options
const server = startServer({
  port: 4000,
  apiUrl: 'https://api.digitalsamba.com/api/v1',
  webhookSecret: 'your-webhook-secret',
  webhookEndpoint: '/webhooks/digitalsamba',
  publicUrl: 'https://your-public-url.com'
});
```

Or create the server without starting it:

```javascript
import { createServer } from 'digital-samba-mcp';
import express from 'express';

// Create an Express app
const app = express();
app.use(express.json());

// Create the MCP server
const { server } = createServer({
  apiUrl: 'https://api.digitalsamba.com/api/v1'
});

// Use the server in your own Express app
// ...
```

## Integration with Claude Desktop

To use the Digital Samba MCP Server with Claude Desktop:

1. Install the package:
   ```bash
   npm install digital-samba-mcp
   ```

2. Start the server with your Digital Samba API key:
   ```bash
   npx digital-samba-mcp --api-key YOUR_API_KEY
   ```

3. Configure Claude Desktop to use the MCP server:
   - Open Claude Desktop
   - Go to Settings > Advanced > MCP Servers
   - Add a new MCP server with the URL `http://localhost:4521/mcp` (or your custom port)
   - Make sure to set the Authorization header to `Bearer YOUR_API_KEY`

4. You should now be able to interact with Digital Samba resources and tools from Claude Desktop.

## Available Resources and Tools

### Resources

- `digitalsamba://rooms`: List all rooms
- `digitalsamba://rooms/{roomId}`: Get details for a specific room
- `digitalsamba://rooms/{roomId}/participants`: List participants in a room

### Tools

- `create-room`: Create a new room
- `update-room`: Update an existing room
- `delete-room`: Delete a room
- `generate-token`: Generate a token for room access
- `register-webhook`: Register a webhook for events
- `delete-webhook`: Delete a registered webhook
- `list-webhooks`: List all registered webhooks

## Troubleshooting

If you encounter issues, please check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file for common problems and solutions.

## License

MIT
