@echo off
echo Starting Digital Samba MCP Server with webhook support...
echo.

rem Set environment variables for webhook configuration
set PUBLIC_URL=http://localhost:3000
set WEBHOOK_ENDPOINT=/webhooks/digitalsamba
set WEBHOOK_SECRET=
set PORT=3000
set LOG_LEVEL=debug

rem Start the server
npm run dev

echo.
echo Server stopped.