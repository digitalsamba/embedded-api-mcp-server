# Troubleshooting Server Connection Issues

This guide explains how to diagnose and fix common connection issues with the Digital Samba MCP Server.

## Using the Connection Diagnostic Tool

We've provided a diagnostic tool that can help identify and troubleshoot connection issues with your server:

1. Run the diagnostic tool from your project directory:
   ```
   debug-server-connection.bat
   ```
   or
   ```
   node debug-server-connection.js
   ```

2. The tool will perform the following checks:
   - Verify if the MCP server is running on the expected port
   - Check all server endpoints for accessibility
   - Identify potential server processes
   - Provide guidance on testing the MCP connection

3. Review the detailed log output for issues. The logs are saved to `server-debug.log` in your project directory.

## Common Issues and Solutions

### Connection Refused Errors

**Symptoms:**
- "net::ERR_CONNECTION_REFUSED" in browser console
- "Connection refused" errors in logs
- MCP client shows "Server disconnected" message

**Possible Solutions:**
- Ensure the server is running on the expected port (default: 4521)
- Check for port conflicts with other applications
- Verify firewall settings allow connections to the server port
- Try restarting the server with `run.bat` or `npm run dev`

### Timeout Errors

**Symptoms:**
- "Request timed out" errors
- MCP client disconnects after some time
- Circuit breaker opens repeatedly

**Possible Solutions:**
- Increase circuit breaker timeouts in your server configuration
- Check for network latency issues
- Verify the Digital Samba API is responsive
- Try implementing retry logic for critical operations

### Authentication Issues

**Symptoms:**
- "No API key found" errors in logs
- "Authorization failed" errors
- Resources or tools return authentication errors

**Possible Solutions:**
- Ensure your API key is properly included in requests
- Check if the API key is valid and not expired
- Verify the API key has the required permissions
- Test with a different API key to rule out key-specific issues

### Health Check Failures

**Symptoms:**
- Health check endpoints return errors
- Server appears to be running but is not accessible
- Proxy reports health check failures

**Possible Solutions:**
- Check server logs for errors during startup
- Verify the server is listening on the correct port
- Ensure the health check endpoint is properly configured
- Try accessing the server directly with a web browser (http://localhost:4521/health)

## Manual Connection Testing

If the diagnostic tool doesn't identify the issue, you can manually test the connection:

1. Test the health endpoint directly:
   ```
   curl http://localhost:4521/health
   ```

2. Test the MCP endpoint:
   ```
   curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' http://localhost:4521/mcp
   ```

3. Use the MCP Inspector:
   ```
   npx @modelcontextprotocol/inspector --url http://localhost:4521/mcp
   ```

4. Check server logs:
   - Review `combined.log` for general issues
   - Check `error.log` for specific error messages
   - Look at `actual-server.log` for errors from the server process

## Advanced Troubleshooting

For persistent issues, try these advanced troubleshooting steps:

1. Run the server with verbose logging:
   ```
   set LOG_LEVEL=debug
   npm run dev
   ```

2. Check for underlying API issues:
   ```
   node test-api-connection.js
   ```

3. Test with circuit breaker disabled:
   ```
   set ENABLE_CIRCUIT_BREAKER=false
   npm run dev
   ```

4. Verify your environment variables:
   ```
   node -e "console.log(require('dotenv').config())"
   ```

5. Check for npm package issues:
   ```
   npm rebuild
   npm install --force
   ```

## Getting Help

If you're still experiencing issues after trying these troubleshooting steps, please:

1. Gather the following information:
   - Server logs (`combined.log`, `error.log`)
   - Diagnostic tool output (`server-debug.log`)
   - Your server configuration (environment variables)
   - Steps to reproduce the issue

2. Open an issue on our GitHub repository with the collected information:
   https://github.com/digital-samba/digital-samba-mcp-server/issues/new
