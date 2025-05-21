@echo off
echo Running Minimal MCP Server

set /p API_KEY=Enter your Digital Samba API key: 
set DIGITAL_SAMBA_API_KEY=%API_KEY%
set PORT=4521

echo Starting minimal server with API key: %API_KEY:~0,4%...
node minimal-server.js
