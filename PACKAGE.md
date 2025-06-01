# Digital Samba MCP Server

This package provides a Model Context Protocol (MCP) server for Digital Samba's video conferencing API.

## Installation

```bash
npm install digital-samba-mcp-server
```

## Usage

### As a CLI tool

```bash
npx digital-samba-mcp-server --api-key YOUR_API_KEY
```

### Programmatic usage

```javascript
import { startServer } from 'digital-samba-mcp-server';

startServer({
  apiKey: 'YOUR_API_KEY'
});
```

## Features

- Full Digital Samba API integration
- Room and session management
- Recording controls
- Analytics and reporting
- Webhook support
- Circuit breaker for resilience
- Rate limiting and caching

## Documentation

For full documentation, visit [GitHub](https://github.com/digital-samba/digital-samba-mcp-server).