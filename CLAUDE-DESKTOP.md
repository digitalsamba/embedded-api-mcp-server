# Claude Desktop Integration Instructions

## Overview

This document explains how to integrate the Digital Samba MCP Server with Claude Desktop for seamless interaction with Digital Samba's video conferencing platform.

## Prerequisites

1. An API key from Digital Samba
2. Node.js installed on your system
3. The Digital Samba MCP Server project cloned and built

## Setup Steps

1. **Build the Digital Samba MCP Server**

   ```bash
   cd C:\path\to\digital-samba-mcp
   npm install
   npm run build:clean
   ```

2. **Test the integration**

   ```bash
   test-claude-desktop.bat YOUR_API_KEY
   ```

3. **Configure Claude Desktop**

   Open Claude Desktop and navigate to Settings > Advanced > MCP Servers:
   
   - Click "Add Server"
   - Enter the following configuration:
   
   ```json
   {
     "mcpServers": {
       "Digital_Samba": {
         "command": "C:\\Users\\ffxxr\\Documents\\DS\\projects\\digital-samba-mcp\\claude-desktop-wrapper.bat",
         "args": ["YOUR_API_KEY"]
       }
     }
   }
   ```
   
   Make sure to replace:
   - `C:\\Users\\ffxxr\\Documents\\DS\\projects\\digital-samba-mcp` with your actual project path
   - `YOUR_API_KEY` with your Digital Samba API key

4. **Select Digital Samba MCP Server**

   After adding the server configuration, select "Digital Samba" from the MCP server dropdown in Claude Desktop.

## Troubleshooting

If you encounter issues:

1. **Check the log file**

   The Claude Desktop wrapper creates a `claude-desktop.log` file in the project directory. Check this file for error messages.

2. **Common Issues**

   - **API key errors**: Ensure your API key is valid and correctly formatted
   - **Path errors**: Verify the path to the batch file in the Claude Desktop configuration
   - **Build errors**: Make sure you've run `npm run build:clean` to compile the TypeScript files

3. **For debugging purposes**, you can run the wrapper manually:

   ```bash
   claude-desktop-wrapper.bat YOUR_API_KEY
   ```

## Example Claude Prompts

Once the Digital Samba MCP server is connected, you can ask Claude things like:

- "Show me my video conferencing rooms"
- "Create a new Digital Samba meeting called 'Weekly Team Sync'"
- "Generate a join link for my meeting"
- "Who's currently in my active meetings?"
- "Schedule a meeting for tomorrow at 2pm with the team"

## Additional Resources

- For more detailed information, refer to the [README.md](README.md)
- For troubleshooting guidance, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
