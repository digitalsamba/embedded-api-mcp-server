# Webhook Architecture

This document describes the architecture and design of the webhook system in the Digital Samba MCP Server.

## Overview

The webhook system enables real-time event notifications from the Digital Samba platform to be received by the MCP server and forwarded to connected MCP clients. This allows AI assistants and other clients to receive updates about room activities, participant status changes, and other events without needing to poll the API.

## Architecture Components

### Webhook Service

The core of the webhook system is the `WebhookService` class, which:

1. Registers an HTTP endpoint to receive webhook events from Digital Samba
2. Processes incoming webhook payloads
3. Verifies webhook signatures (if configured)
4. Forwards events to connected MCP clients using server notifications
5. Provides tools for managing webhook registrations

### Event Flow

The flow of events through the system is as follows:

```
Digital Samba Platform
       │
       ▼
 Webhook Endpoint (/webhooks/digitalsamba)
       │
       ▼
  Signature Verification (if configured)
       │
       ▼
  Event Processing
       │
       ▼
  Event Handlers
       │
       ▼
  MCP Client Notification
```

### Integration with MCP Server

The webhook system integrates with the MCP server in several ways:

1. **Server Notifications**: Uses the server's `notify` method to send events to connected clients
2. **Tools**: Provides MCP tools for managing webhook registrations
3. **Shared State**: Uses the API key context for authentication with Digital Samba API

## Webhook Management

### Registration Process

The webhook registration process:

1. MCP client calls the `register-webhook` tool with a webhook URL and optional event types
2. The MCP server uses the client's API key to authenticate with Digital Samba
3. The server checks if a webhook already exists for the URL
4. If it exists, the server updates it; otherwise, it creates a new webhook
5. The Digital Samba platform starts sending events to the specified URL

### Webhook Event Format

When Digital Samba sends a webhook event, it follows this format:

```json
{
  "event": "event.type",
  "timestamp": "2025-05-19T10:00:00Z",
  "data": {
    /* Event-specific data */
  }
}
```

### MCP Client Notification Format

When forwarding events to MCP clients, the following notification format is used:

```json
{
  "type": "digitalsambaEvent",
  "params": {
    "event": "event.type",
    "timestamp": "2025-05-19T10:00:00Z",
    "data": {
      /* Processed event data */
    }
  }
}
```

## Security

### Webhook Signature Verification

For security, the webhook system supports signature verification:

1. The webhook secret is configured using the `WEBHOOK_SECRET` environment variable
2. Digital Samba signs the webhook payload using this secret
3. The signature is sent in the `X-DigitalSamba-Signature` header
4. The server verifies the signature by calculating the HMAC-SHA256 of the request body

### API Key Security

API keys used for webhook management:

1. Are never stored permanently on the server
2. Are provided by clients with each request
3. Are associated with MCP sessions
4. Are used only for Digital Samba API calls

## Supported Event Types

The system supports all event types provided by the Digital Samba API, including:

- **Room Events**: `room.created`, `room.updated`, `room.deleted`
- **Session Events**: `session.started`, `session.ended`
- **Participant Events**: `participant.joined`, `participant.left`
- **Recording Events**: `recording.started`, `recording.stopped`, `recording.ready`
- **Chat Events**: `chat.message`
- **Poll Events**: `poll.created`, `poll.updated`, `poll.deleted`
- **Q&A Events**: `qa.question`, `qa.answer`

## Error Handling

The webhook system implements several error handling strategies:

1. **Request Validation**: Validates incoming webhook payloads before processing
2. **Signature Verification**: Rejects webhooks with invalid signatures
3. **Event Processing**: Isolates errors in individual event handlers
4. **Client Notification**: Handles client disconnections gracefully

## Testing and Debugging

The system includes several tools for testing and debugging:

1. **Webhook Test Script**: Simulates webhook events for testing
2. **List Webhooks Tool**: Displays registered webhooks
3. **List Webhook Events Tool**: Shows available event types
4. **Detailed Logging**: Logs webhook handling with configurable verbosity

## Configuration Options

The webhook system can be configured using environment variables:

- `WEBHOOK_SECRET`: Secret for verifying webhook signatures
- `WEBHOOK_ENDPOINT`: Endpoint path for receiving webhooks (default: `/webhooks/digitalsamba`)
- `PUBLIC_URL`: Public URL of the server (used for webhook registration)

## Future Enhancements

Planned enhancements for the webhook system:

1. **Event Filtering**: Allow clients to subscribe to specific event types
2. **Event Persistence**: Store events for retrieval by reconnecting clients
3. **Rate Limiting**: Protect against webhook event flooding
4. **Enhanced Validation**: More comprehensive validation of webhook payloads
5. **Event Transformation**: Allow customization of event data format for clients