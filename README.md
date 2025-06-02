# Digital Samba MCP Server

<div align="center">
  <img src="https://digitalsamba.com/logo.png" alt="Digital Samba Logo" width="200"/>
  
  **Empower AI assistants to control video conferencing with natural language**

  [![npm version](https://img.shields.io/npm/v/@digitalsamba/mcp-server.svg)](https://www.npmjs.com/package/@digitalsamba/mcp-server)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/@digitalsamba/mcp-server.svg)](https://nodejs.org)
  [![Build Status](https://img.shields.io/github/actions/workflow/status/digitalsamba/digital-samba-mcp-server/npm-deploy.yml?branch=main)](https://github.com/digitalsamba/digital-samba-mcp-server/actions)
  [![Documentation](https://img.shields.io/badge/docs-comprehensive-blue)](https://github.com/digitalsamba/digital-samba-mcp-server/tree/main/docs)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

  [Installation](#installation) • [Quick Start](#quick-start) • [Features](#features) • [Documentation](docs/) • [Examples](examples/) • [Contributing](CONTRIBUTING.md)
</div>

---

## 🚀 Overview

The Digital Samba MCP Server bridges the gap between AI assistants and video conferencing, enabling natural language control of Digital Samba's powerful video conferencing platform through the Model Context Protocol (MCP). 

> **🚧 Beta Notice**: We're actively simplifying the architecture for better performance and easier maintenance. The core functionality remains stable while we optimize the codebase.

Perfect for:
- 🤖 **AI-Powered Meeting Management** - Let Claude schedule, control, and analyze meetings
- 📊 **Automated Analytics** - Generate usage reports and insights with simple prompts
- 🔧 **DevOps Integration** - Automate video infrastructure through conversational AI
- 🎯 **Customer Support** - Enable support agents to manage sessions via natural language

## ✨ Features

<table>
<tr>
<td width="50%">

### 🏗️ Core Capabilities
- **Room Management** - Full CRUD operations
- **Session Control** - Live meeting management
- **Analytics Engine** - Deep usage insights
- **Recording System** - Complete recording control
- **Content Library** - Document & media management
- **Webhook Integration** - Real-time event handling

</td>
<td width="50%">

### 🛡️ Enterprise Ready
- **Circuit Breakers** - Fault tolerance built-in
- **Rate Limiting** - API protection included
- **Response Caching** - Performance optimized
- **Connection Pooling** - Efficient resource usage
- **Graceful Degradation** - High availability
- **Comprehensive Logging** - Full observability

</td>
</tr>
</table>

## 📦 Installation

```bash
# Install globally
npm install -g @digitalsamba/mcp-server

# Or use directly with npx
npx @digitalsamba/mcp-server --api-key YOUR_API_KEY
```

## 🚀 Quick Start

### 1️⃣ Get Your API Key

Sign up for free at [Digital Samba](https://www.digitalsamba.com) and obtain your API key from the dashboard.

### 2️⃣ Configure Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "digital-samba": {
      "command": "npx",
      "args": ["@digitalsamba/mcp-server", "--api-key", "YOUR_API_KEY"],
      "env": {}
    }
  }
}
```

### 3️⃣ Start Using Natural Language

```
You: "Create a team meeting room for 20 people"
Claude: ✅ Created room "Team Meeting" with capacity for 20 participants

You: "Who joined yesterday's engineering standup?"
Claude: 📊 15 participants joined yesterday's standup...

You: "Start recording the current product demo"
Claude: 🎥 Recording started for "Product Demo" session
```

## 🎯 Real-World Use Cases

### 🏢 Meeting Automation
```javascript
// Natural language meeting management
"Schedule a weekly standup room with 15 participant limit"
"Generate moderator links for the leadership team"
"End all sessions older than 2 hours"
```

### 📊 Analytics & Reporting
```javascript
// Instant insights with simple queries
"Show participation trends for this quarter"
"Which rooms had the most engagement last week?"
"Export attendance data for the training sessions"
```

### 🎥 Recording Management
```javascript
// Complete recording control
"Start recording the product demo"
"Download all recordings from yesterday"
"Delete recordings older than 30 days"
```

## 🛠️ Advanced Configuration

### Programmatic Usage

```javascript
import { startServer } from '@digitalsamba/mcp-server';

const server = startServer({
  // Core Configuration
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  port: 4521,
  
  // Performance Features
  enableCache: true,
  cacheTtl: 300000, // 5 minutes
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 60,
  
  // Resilience Features
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
  
  // Monitoring
  enableMetrics: true,
  metricsEndpoint: '/metrics'
});
```

### Direct API Client

```javascript
import { DigitalSambaApiClient } from '@digitalsamba/mcp-server/client';

const client = new DigitalSambaApiClient(apiKey);

// Create a room
const room = await client.createRoom({
  name: 'Engineering Sync',
  privacy: 'private',
  max_participants: 50
});

// Generate access token
const token = await client.generateRoomToken(room.id, {
  role: 'moderator',
  username: 'John Doe'
});

console.log('Join URL:', token.link);
```

## 📚 API Reference

### Resources (Read Operations)
| Resource | Description |
|----------|-------------|
| `digitalsamba://rooms` | List all rooms |
| `digitalsamba://sessions` | Active sessions |
| `digitalsamba://analytics/usage` | Usage statistics |
| `digitalsamba://recordings` | Recording library |

### Tools (Write Operations)
| Category | Available Tools |
|----------|----------------|
| **Rooms** | create-room, update-room, delete-room, generate-token |
| **Sessions** | end-session, bulk-delete, get-statistics |
| **Analytics** | usage-report, participant-stats, room-analytics |
| **Recordings** | start/stop-recording, download, delete |

[View Full API Documentation →](docs/api-reference.md)

## 🏗️ Architecture

Built with modern JavaScript and TypeScript, featuring:

- **MCP SDK Integration** - Native Model Context Protocol support
- **Modular Design** - Clean separation of resources and tools
- **Resilience Patterns** - Circuit breakers, retries, and fallbacks
- **Performance Optimized** - Caching, connection pooling, and lazy loading
- **Type Safety** - Full TypeScript coverage with strict mode
- **Test Coverage** - Comprehensive unit and integration tests

[Architecture Overview →](docs/architecture-overview.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone the repository
git clone https://github.com/digitalsamba/digital-samba-mcp-server.git

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## 📖 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Usage Examples](docs/usage-examples.md)
- [API Reference](docs/api-reference.md)
- [Architecture Overview](docs/architecture-overview.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## 🔧 Support

- 📧 Email: support@digitalsamba.com
- 💬 [Discussions](https://github.com/digitalsamba/digital-samba-mcp-server/discussions)
- 🐛 [Issue Tracker](https://github.com/digitalsamba/digital-samba-mcp-server/issues)
- 📚 [Digital Samba Docs](https://docs.digitalsamba.com)

## 📄 License

MIT © [Digital Samba](https://digitalsamba.com)

See [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built with ❤️ by Digital Samba</strong>
  <br>
  <sub>Empowering developers to build the future of video conferencing</sub>
</div>