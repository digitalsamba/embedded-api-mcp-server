@echo off
echo Starting Digital Samba MCP Server directly...
echo Logs will be displayed in the console
echo Press Ctrl+C to stop the server

:: Set environment variables for development
set NODE_ENV=development
set LOG_LEVEL=debug

:: Start the server directly using npx 
npx tsx src/index.ts

pause
