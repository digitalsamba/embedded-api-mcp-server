# Webhook Testing and Debugging Guide

This guide provides instructions for testing and debugging webhook functionality in the Digital Samba MCP Server.

## Prerequisites

- Digital Samba MCP Server up and running
- Digital Samba API key with webhook management permissions
- For local testing: ngrok or similar tunneling service

## Setting Up for Testing

### Local Environment Setup

When testing webhooks locally, you need to make your server publicly accessible since Digital Samba will need to send events to your webhook endpoint. The easiest way to do this is using ngrok:

1. Install ngrok from [https://ngrok.com/download](https://ngrok.com/download)

2. Start your MCP server:
   ```
   npm run dev
   ```
   or use the provided batch file:
   ```
   run-with-webhooks.bat
   ```

3. In a separate terminal, start ngrok to expose your local server:
   ```
   ngrok http 3000
   ```

4. Note the HTTPS URL provided by ngrok (e.g., `https://a1b2c3d4.ngrok.io`)

### Registering a Webhook

Once your server is accessible via ngrok, you can register a webhook:

1. Connect to your MCP server using the MCP Inspector or any MCP client

2. Make sure to include your Digital Samba API key in the Authorization header

3. Use the `register-webhook` tool with the following parameters:
   - `webhookUrl`: Your ngrok URL + webhook endpoint (e.g., `https://a1b2c3d4.ngrok.io/webhooks/digitalsamba`)
   - `events`: (Optional) Specific events to subscribe to

Example using MCP Inspector:
```json
{
  "name": "register-webhook",
  "arguments": {
    "webhookUrl": "https://a1b2c3d4.ngrok.io/webhooks/digitalsamba",
    "events": [
      "participant.joined",
      "participant.left",
      "room.created",
      "room.deleted"
    ]
  }
}
```

## Testing Webhooks

### Using the Webhook Test Script

The MCP server includes a webhook test script that can simulate webhook events for testing:

```
npm run test:webhook
```

By default, this sends a random event type to `http://localhost:3000/webhooks/digitalsamba`. You can customize this with additional arguments:

```
npm run test:webhook -- https://your-webhook-url.com/endpoint your-webhook-secret event.type
```

For example:
```
npm run test:webhook -- http://localhost:3000/webhooks/digitalsamba "" participant.joined
```

### Testing with Real Events

To test with real Digital Samba events:

1. Register a webhook using the `register-webhook` tool as described above

2. Perform actions in the Digital Samba platform that trigger events:
   - Create a room to trigger `room.created`
   - Join a room to trigger `participant.joined`
   - Leave a room to trigger `participant.left`
   - Start a recording to trigger `recording.started`

3. Monitor your server logs to see incoming webhook events

4. Connect an MCP client to observe notifications being sent to the client

## Monitoring and Debugging

### Server Logs

Set the `LOG_LEVEL` environment variable to `debug` to see detailed webhook handling information:

```
LOG_LEVEL=debug npm run dev
```

Look for log entries related to webhooks:
- "Received webhook request"
- "Processing webhook event"
- "Notifying MCP clients about event"

### Webhook HTTP Headers

When receiving webhook events from Digital Samba, the following headers are important:

- `Content-Type`: Should be `application/json`
- `X-DigitalSamba-Signature`: Webhook signature for verification (if using webhook secrets)

### Verifying Webhook Registration

Use the `list-webhooks` tool to verify that your webhook is properly registered:

```json
{
  "name": "list-webhooks",
  "arguments": {}
}
```

The response will show all registered webhooks, including their endpoints and subscribed events.

## Common Issues and Solutions

### Webhook Not Receiving Events

If your webhook is registered but not receiving events:

1. Verify the webhook is registered using `list-webhooks`
2. Check if your webhook URL is publicly accessible
3. Ensure your server is properly handling POST requests to the webhook endpoint
4. Confirm you're performing actions that should trigger webhook events
5. Check server logs for any errors in webhook processing

### Signature Verification Failures

If you're using webhook signatures and experiencing verification failures:

1. Make sure the webhook secret in your environment configuration matches the one used for signature generation
2. Verify that the request body isn't being modified by middleware before reaching the webhook handler
3. Check if the signature header is properly formatted

### MCP Clients Not Receiving Notifications

If webhook events are received by your server but not forwarded to MCP clients:

1. Check server logs for errors in the notification process
2. Verify that clients are still connected when events are processed
3. Ensure the client supports the notification format used

## Testing Webhook Security

To test webhook signature verification:

1. Set a webhook secret in your environment:
   ```
   WEBHOOK_SECRET=your-secret-key
   ```

2. Use the test script with the same secret:
   ```
   npm run test:webhook -- http://localhost:3000/webhooks/digitalsamba your-secret-key
   ```

3. Try with an incorrect secret to verify that the request is rejected

## Additional Resources

- Digital Samba API Documentation: Refer to the webhooks section
- MCP Protocol Documentation: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- Ngrok Documentation: [https://ngrok.com/docs](https://ngrok.com/docs)