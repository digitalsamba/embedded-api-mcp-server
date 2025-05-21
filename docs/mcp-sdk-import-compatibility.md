# MCP SDK Import Path Compatibility

## Issue Overview

When integrating with Claude Desktop, we encountered issues with the import paths for the Model Context Protocol SDK. The issue stemmed from how Node.js ESM imports interact with package exports.

### The Problem

In our codebase, we use imports like:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
```

But the actual file is located at:

```
node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js
```

The MCP SDK uses the Node.js package exports field to map these paths:

```json
"exports": {
  "./*": {
    "import": "./dist/esm/*",
    "require": "./dist/cjs/*"
  }
}
```

This works fine in most environments, but Claude Desktop's Node.js process was having trouble resolving these paths correctly.

## Solution

We implemented three key components to address the issue:

1. **fix-imports.js**: This script updates import paths to match the SDK's module structure.
2. **fix-imports-2.js**: This script corrects any overzealous replacements from the first script.
3. **fix-sdk-paths.js**: This script copies files from the SDK's internal structure to the expected import paths.

These scripts run during the build process, ensuring compatibility without requiring code changes.

## Rationale for This Approach

Why didn't we just update all import paths to match the SDK's internal structure?

1. **Avoiding Breaking Changes**: Updating all imports across the codebase would be a significant change.
2. **Compatibility with Future SDK Versions**: The SDK's internal structure might change in future versions.
3. **Package Exports System**: Node.js's package exports is the preferred way to handle module resolution.
4. **TypeScript Integration**: TypeScript needs to find both JavaScript and type declaration files.

## The Future Approach

For future versions, a better approach would be:

1. **Use Package Exports**: Adjust the build system to better handle package exports.
2. **Create a Compatibility Layer**: Implement a wrapper module that handles SDK imports.
3. **Dynamic Loading**: Use dynamic imports based on installed SDK versions.

Until then, the current solution provides backwards compatibility while addressing the immediate issues.

## Testing Claude Desktop Integration

We've created two test scripts to validate the integration:

1. **test-claude-desktop-verbose.js**: Tests the MCP server with verbose logging.
2. **test-claude-desktop-mock.js**: Creates a mock Claude Desktop client to test MCP protocol messages.

Run the `test-claude-desktop-comprehensive.bat` script to build the project and run both tests.
