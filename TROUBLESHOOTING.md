# Troubleshooting Guide

This document provides solutions for common issues you might encounter when setting up or using the Digital Samba MCP Server.

## Installation Issues

### "Cannot find module '@modelcontextprotocol/sdk'"

**Problem**: After installation, you're seeing errors related to missing modules.

**Solution**:
1. Make sure you've installed dependencies:
   ```
   npm install
   ```
2. If the issue persists, try forcing a reinstall:
   ```
   rm -rf node_modules
   npm install
   ```
3. Verify your Node.js version is 18+:
   ```
   node --version
   ```

## Connection Issues

### "Connection refused" errors when trying to access the server

**Problem**: The client can't connect to the MCP server.

**Solution**:
1. Verify the server is running:
   ```
   npm run dev
   ```
2. Check if the port is in use by another application
3. Ensure your firewall allows connections to the port
4. Confirm the client is using the correct URL (default: http://localhost:3000/mcp)

### "Invalid or missing session ID" errors

**Problem**: When using GET or DELETE requests, you're getting session ID errors.

**Solution**:
1. Make sure you're including the MCP-Session-ID header in your request
2. Verify the session was properly initialized with a POST request first
3. Sessions might expire – try initializing a new session

### "Cannot read properties of undefined (reading 'sessionId')" error

**Problem**: When using the API, you're getting an error about `sessionId` being undefined.

**Solution**:
1. Make sure you're connecting properly to the MCP server
2. Ensure the Authorization header is included in your first request that establishes the session
3. Check that you're using a compatible MCP client version
4. If you're developing your own MCP client, ensure it properly initializes the session before making requests
5. If the issue persists, restart the server and establish a new session

## Authentication Issues

### "No API key found in the request" errors

**Problem**: You're calling a resource or tool without providing an API key in the Authorization header.

**Solution**:
1. Include the Authorization header with a Bearer token:
   ```
   Authorization: Bearer YOUR_DIGITAL_SAMBA_API_KEY
   ```
2. Ensure the header is properly formatted - it should begin with "Bearer " followed by your API key (with a space between "Bearer" and the key)
3. Make sure the header is included in every request to the MCP server
4. When using Claude Desktop, add the header in the MCP server configuration screen
5. For CLI usage, use the --api-key option: `digital-samba-mcp --api-key YOUR_API_KEY`

### "Digital Samba API error (401): Unauthorized" errors

**Problem**: The provided API key is invalid or has expired.

**Solution**:
1. Check that you're using a valid Digital Samba API key
2. Verify the API key has the necessary permissions
3. Request a new API key if needed
4. Ensure there are no extra spaces or characters in your Authorization header

## Validation Errors

### "Error: Zod validation error" or similar errors

**Problem**: The parameters you're providing don't meet the validation requirements.

**Solution**:
1. Check the README.md for parameter requirements
2. Ensure values meet the minimum/maximum length requirements
3. Make sure enum values (like privacy) use the correct options ("public" or "private")

## Digital Samba API Issues

### "Digital Samba API error" with various status codes

**Problem**: The Digital Samba API is returning an error.

**Solution**:
- **400 (Bad Request)**: Check your input parameters
- **401 (Unauthorized)**: Verify your API key
- **403 (Forbidden)**: Check if your API key has the necessary permissions
- **404 (Not Found)**: Verify resources exist (e.g., room IDs)
- **429 (Too Many Requests)**: You might be hitting rate limits – slow down requests
- **5xx (Server errors)**: The Digital Samba API might be experiencing issues – try again later

## Debugging

If you're still having issues, try enabling debug-level logging:

```
LOG_LEVEL=debug npm run dev
```

This will provide more detailed logs that can help identify the problem.

## MCP Inspector Issues

### Can't connect to server from MCP Inspector

**Problem**: The MCP Inspector can't connect to your server.

**Solution**:
1. Make sure the server is running
2. Verify the URL is correct (http://localhost:3000/mcp)
3. Check for CORS issues if running on different domains
4. Try using a different browser
5. Make sure to include the Authorization header in your request with a valid Digital Samba API key

### Authorization header not being sent with MCP Inspector

**Problem**: The MCP Inspector is connecting but API calls are failing due to missing API key.

**Solution**:
1. In the MCP Inspector, locate the "Headers" section in the connection panel
2. Add a header with the name "Authorization" and value "Bearer YOUR_API_KEY"
3. Make sure there are no extra spaces or special characters in the API key

## Common Runtime Errors

### "Error: listen EADDRINUSE: address already in use :::3000"

**Problem**: Port 3000 is already in use by another application.

**Solution**:
1. Change the port using the PORT environment variable:
   ```
   PORT=3001 npm run dev
   ```
2. Alternatively, find and stop the process using port 3000

### Memory issues

**Problem**: The server is using too much memory or crashing.

**Solution**:
1. Check for memory leaks in your custom code
2. Increase Node.js memory limit if needed:
   ```
   node --max-old-space-size=4096 dist/index.js
   ```

## Getting More Help

If you're still experiencing issues:

1. Check the logs in `error.log` and `combined.log`
2. Search for similar issues in the repository
3. Reach out to the Digital Samba team for API-specific questions
4. Consult the MCP documentation for protocol-related questions

## Webhook Issues

### "Webhook registration failed" errors

**Problem**: You're unable to register webhooks with the Digital Samba API.

**Solution**:
1. Make sure your server is publicly accessible (webhooks require a public URL)
2. For local testing, use a tunneling service like ngrok to expose your local server
3. Verify that the webhook URL is properly formatted and accessible from the internet
4. Check if you have reached the maximum number of allowed webhooks

### Webhook events not being received

**Problem**: You've registered a webhook, but are not receiving events.

**Solution**:
1. Verify the webhook is registered correctly using the `list-webhooks` tool
2. Check your server logs for incoming webhook requests
3. Make sure the webhook endpoint is publicly accessible
4. Verify your server's IP isn't blocked by any firewall
5. Use the webhook test script to confirm your endpoint is working correctly:
   ```
   npm run test:webhook
   ```

### "Invalid webhook signature" errors

**Problem**: You're receiving webhooks, but they're failing signature validation.

**Solution**:
1. Make sure you've set the correct `WEBHOOK_SECRET` environment variable
2. Verify that the webhook was registered with the same secret
3. Check if the request body is being modified by any middleware before it reaches the webhook handler

### Testing webhooks locally

**Problem**: You want to test webhooks in a local development environment.

**Solution**:
1. Use a tunneling service like ngrok to expose your local server publicly:
   ```
   ngrok http 3000
   ```
2. Use the ngrok URL as your webhook URL when registering with Digital Samba
3. You can also use the included webhook test script to simulate webhook events:
   ```
   npm run test:webhook
   ```

## Claude Desktop Specific Issues

### Authentication with Claude Desktop

**Problem**: Claude Desktop can't authenticate with the MCP server.

**Solution**:
1. Make sure you've added the Authorization header in Claude Desktop's MCP server configuration
2. The header should be formatted exactly as: `Authorization: Bearer YOUR_API_KEY`
3. Verify the API key is valid by testing with the test script: `npm run test:server`
4. If running the server with CLI, ensure you've provided the API key: `digital-samba-mcp --api-key YOUR_API_KEY`
5. Make sure the server is running and accessible at the URL configured in Claude Desktop

### "Connection failed" errors in Claude Desktop

**Problem**: Claude Desktop shows "Connection failed" when trying to connect to the MCP server.

**Solution**:
1. Check if the server is running (`digital-samba-mcp --api-key YOUR_API_KEY`)
2. Verify the URL is correct (http://localhost:3000/mcp by default)
3. Test the server with the test script: `npm run test:server`
4. Make sure you don't have any network issues or firewalls blocking the connection
5. Try restarting both the server and Claude Desktop

## Known Issues

### Reconnection delays after server restart

**Description**: After restarting the server, clients might take up to 30 seconds to reconnect.

**Workaround**: Manually restart client connections after server restart.

### Session expiration

**Description**: Sessions might expire after a period of inactivity.

**Workaround**: Initialize a new session if you receive connection errors after a period of inactivity.

### API key context not persisting between requests

**Description**: In some cases, the API key might not persist between requests in the same session.

**Workaround**: Include the Authorization header with your API key in every request to ensure it's always available.

### Webhook notifications may be delayed

**Description**: There might be a slight delay between a webhook event occurring and clients receiving the notification.

**Workaround**: Design your client applications to handle asynchronous event updates and not rely on immediate state changes.