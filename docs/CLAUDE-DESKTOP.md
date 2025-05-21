# Claude Desktop Integration

This document describes how to use the Digital Samba MCP Server with Claude Desktop.

## Claude Desktop Integration

To work with Claude Desktop, this package uses the Model Context Protocol (MCP) over stdio with JSON-RPC. This enables direct communication between Claude Desktop and the Digital Samba MCP server.

### Testing Claude Desktop Integration

We provide several scripts to test the Claude Desktop integration:

1. **Basic Test**: `test-claude-desktop-direct.bat`
   - Tests the basic MCP server with stdio transport
   - Minimal setup, no HTTP server
   - Best for verifying basic compatibility

2. **Mock Client Test**: `test-claude-desktop-mock-only.bat`
   - Uses a mock Claude Desktop client to test the integration
   - Simulates the protocol messages
   - Good for testing protocol compatibility

3. **Comprehensive Test**: `test-claude-desktop-comprehensive.bat`
   - Rebuilds the project and runs all tests
   - Most thorough but requires more setup time

### Troubleshooting

If you encounter issues with the Claude Desktop integration:

1. Check the log files in the project directory:
   - `claude-desktop.log`: General log from the standard wrapper
   - `claude-desktop-simple-test.log`: Log from the simple test
   - `claude-desktop-mock.log`: Log from the mock client test
   - `claude-desktop-test-direct.log`: Log from the direct test

2. Verify that the SDK is properly installed:
   ```bash
   npm ls @modelcontextprotocol/sdk
   ```

3. Run the fix scripts manually if needed:
   ```bash
   node fix-sdk-paths.js
   ```

### Protocol Details

The Claude Desktop integration uses the following protocol elements:

- **Transport**: stdio (standard input/output)
- **Format**: JSON-RPC
- **Authentication**: API key passed as command-line argument
- **Tools**: All Digital Samba video conferencing tools

## Technical Implementation

Under the hood, the integration works as follows:

1. Claude Desktop launches the MCP server with the `--json-rpc-mode` flag
2. The server sets up a stdio transport for communication
3. Claude Desktop and the server exchange JSON-RPC messages over stdio
4. The MCP server processes Digital Samba API requests and returns results

### Important Files

- `claude-desktop-wrapper.js`: The main wrapper script for Claude Desktop integration
- `bin/cli.js`: The CLI entry point that handles command-line arguments and JSON-RPC mode
- `test-claude-desktop-direct.js`: A direct test of the stdio transport integration

### Compatibility Notes

- The integration was tested with MCP SDK version 1.11.4
- The integration supports Claude Desktop version 1.0.0 and above
- The MCP protocol version used is 2025-03-26

## Development Guidelines

When making changes that might affect Claude Desktop integration:

1. Always test with the direct stdio integration
2. Maintain compatibility with the existing JSON-RPC protocol
3. Don't add dependencies that aren't compatible with Node.js in stdio mode
4. Ensure all tools are registered properly for Claude Desktop to discover them
