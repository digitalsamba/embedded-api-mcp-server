@echo off
echo MCP Server Debug Wrapper

echo This script will run the Digital Samba MCP Server with additional
echo debug logging to help diagnose timeout issues.

set /p API_KEY=Enter your Digital Samba API key: 

echo Starting debug wrapper with your API key...
echo Debug logs will be written to mcp-debug-log.txt

node debug-wrapper.js %API_KEY%
