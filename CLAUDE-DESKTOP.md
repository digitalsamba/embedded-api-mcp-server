# Using Digital Samba MCP with Claude Desktop

The Digital Samba MCP Server enables Claude Desktop to create and manage Digital Samba video conferencing rooms through the Model Context Protocol.

## Installation

### Local Installation

```bash
git clone https://github.com/digital-samba/mcp-server.git
cd mcp-server
npm install
npm run build:clean
npm link
```

This will install the package globally as `digital-samba-mcp`.

### Running the Server

Start the server with your Digital Samba API key:

```bash
digital-samba-mcp --api-key YOUR_DIGITAL_SAMBA_API_KEY
```

Or alternatively, run from source:

```bash
npm run dev
```

If you run from source, you'll need to set the API key in the Authorization header when connecting from Claude Desktop.

## Configuring Claude Desktop

1. Open Claude Desktop
2. Go to Settings > Advanced > MCP Servers
3. Add a new MCP server:
   - Name: Digital Samba
   - URL: `http://localhost:3000/mcp`
   - Headers: 
     - Name: `Authorization` 
     - Value: `Bearer YOUR_DIGITAL_SAMBA_API_KEY`
     - (Replace YOUR_DIGITAL_SAMBA_API_KEY with your actual API key)
     - Make sure to include the word "Bearer" followed by a space, then your API key

## Available Resources and Tools

The server provides access to Digital Samba's video conferencing API with the following features:

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
- `list-webhook-events`: List available webhook event types

## Authentication

The MCP server uses Bearer token authentication. Your Digital Samba API key must be provided in the Authorization header:

```
Authorization: Bearer YOUR_DIGITAL_SAMBA_API_KEY
```

Claude Desktop handles this automatically when you configure the MCP server with the Authorization header.

## Example Usage with Claude

Once your server is running and Claude Desktop is configured, you can interact with Digital Samba through Claude:

- "List all my Digital Samba rooms"
- "Create a new Digital Samba meeting room called 'Team Weekly'"
- "Generate a token for the Digital Samba room with ID XYZ"
- "Show me who's in my Digital Samba meeting right now"

## Troubleshooting

If you encounter issues, check the following:

1. Make sure the server is running and accessible
2. Verify you've included the correct API key in the Authorization header
3. Check the server logs for error messages
4. See the TROUBLESHOOTING.md file for common issues and solutions

## Upcoming Features

We're actively working on additional features, including:

- Room recording functionality
- Moderation tools and capabilities
- Breakout rooms functionality
- Meeting scheduling

Stay tuned for updates!
