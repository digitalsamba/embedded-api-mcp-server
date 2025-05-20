@echo off
echo Digital Samba MCP Server for Claude Desktop
echo --------------------------------------------
echo.
echo This script will start the Digital Samba MCP Server for use with Claude Desktop.
echo.

set /p API_KEY=Enter your Digital Samba API Key: 

echo.
echo Starting server with the provided API key...
echo.
echo IMPORTANT: In Claude Desktop, configure the MCP server with:
echo - URL: http://localhost:3000/mcp
echo - Header: Authorization: Bearer %API_KEY%
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

set DIGITAL_SAMBA_API_KEY=%API_KEY%
node dist/index.js
