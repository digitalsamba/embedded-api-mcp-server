# Timeout Fix for MCP Server

## Issue

When trying to run the Digital Samba MCP Server from npm, we encountered a timeout error in the MCP client's logs:

```
2025-05-21T15:40:44.201Z [digitalSamba] [info] Message from client: {"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":0,"reason":"Error: MCP error -32001: Request timed out"}}
```

## Root Cause Analysis

After investigating the code, we identified several issues that could cause this timeout:

1. **Circuit Breaker Configuration**: The default request timeout was set to 10 seconds, which was too short for the initial API connection, especially when the server is first starting up.

2. **Transport Connection**: The StreamableHTTPServerTransport didn't have an explicit timeout setting.

3. **Initial Request Handling**: There was no special handling for initial requests, which typically take longer than subsequent requests.

## Fix Implementation

We implemented the following changes:

1. **Added Initial Request Timeout**: Created a separate timeout value for the first request to a service.
   - Added an `initialRequestTimeout` parameter to the CircuitBreaker class (default: 30 seconds)
   - Modified the execution logic to use the longer timeout for the first request
   - Updated the interface in `digital-samba-api-resilient.ts` to include the new parameter

2. **Increased Default Timeouts**:
   - Updated default request timeout from 10 seconds to 15 seconds
   - Set initial request timeout to 60 seconds

3. **URL Handling Improvement**: Added a check to handle cases where an endpoint is already a full URL.

## Files Changed

1. `src/circuit-breaker.ts`: Added `initialRequestTimeout` parameter and logic to use it for the first request.
2. `src/digital-samba-api-circuit-breaker.ts`: Updated default circuit breaker options.
3. `src/index.ts`: Updated circuit breaker timeout settings.
4. `src/digital-samba-api.ts`: Added handling for full URLs in the `request` method.
5. `src/digital-samba-api-resilient.ts`: Updated the interface to include `initialRequestTimeout` parameter.

## Testing

To verify the fix:

1. Build the project: `npm run build:prod`
2. Create a package: `npm pack`
3. Install the package in a test project: `npm install ../path/to/digital-samba-mcp-server-1.0.0.tgz`
4. Run the server with your API key: `npx digital-samba-mcp-server YOUR_API_KEY`
5. Test with Claude Desktop or the MCP Inspector

## Additional Notes

- These changes increase timeout values but don't affect normal operation performance.
- The longer initial timeouts only apply to the first request to a service.
- Consider monitoring performance to see if these timeout values need further adjustment.
