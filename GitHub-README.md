# Digital Samba MCP Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js CI](https://github.com/digital-samba/digital-samba-mcp-server/workflows/Node.js%20CI/badge.svg)
![npm version](https://img.shields.io/npm/v/digital-samba-mcp.svg)

An implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for Digital Samba's video conferencing API. This server enables AI assistants (like Anthropic's Claude) to create and manage video conferencing rooms through a standardized interface.

![Digital Samba MCP Server](docs/assets/digital-samba-mcp-banner.png)

## Features

- **Video Conferencing Management**: Create, update, and delete meeting rooms
- **Participant Management**: Generate tokens, view participants, and moderate meetings
- **Recording Management**: Start, stop, and manage recordings
- **Breakout Rooms**: Create and manage breakout rooms for collaborative sessions
- **Moderation Tools**: Ban/unban participants, mute/unmute, and control room settings
- **Webhook Support**: Real-time event notifications
- **MCP Compliance**: Follows the Model Context Protocol standard
- **Claude Desktop Integration**: Ready to use with Claude Desktop

## Quick Start

### NPM Package Installation

```bash
# Install globally
npm install -g digital-samba-mcp

# Run with your API key
digital-samba-mcp --api-key YOUR_API_KEY
```

### Using with Claude Desktop

1. Install the Digital Samba MCP Server as shown above
2. Run the server with your Digital Samba API key
3. Configure Claude Desktop to connect to the server at `http://localhost:3000/mcp`
4. Add the Authorization header: `Bearer YOUR_API_KEY`

## Running from Source

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server in development mode:
   ```
   npm run dev
   ```

## Documentation

- [Full Digital Samba API Documentation](docs/digital-samba-api.md)
- [Webhook Architecture](docs/webhook-architecture.md)
- [Moderation Tools](docs/MODERATION.md)
- [Installation and Usage Guide](PACKAGE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Claude Desktop Integration](CLAUDE-DESKTOP.md)

## Resources and Tools

The Digital Samba MCP Server exposes various resources and tools for managing video conferences:

### Resources

- Lists of rooms and participants
- Room details and settings
- Recording information
- Breakout room details
- Moderation status and banned participants

### Tools

- Room management (create, update, delete)
- Token generation
- Recording controls
- Moderation actions
- Breakout room management
- Webhook management

For a complete list of resources and tools, see the [full documentation](README.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.