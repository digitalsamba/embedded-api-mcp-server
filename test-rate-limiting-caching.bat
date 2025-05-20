@echo off
echo Testing rate limiting and caching functionality...

set SERVER_URL=http://localhost:3000/mcp

REM Check if API key is provided as an argument
if "%1"=="" (
  echo Digital Samba API key not provided. Please run with: test-rate-limiting-caching.bat YOUR_API_KEY
  goto :eof
)

set DIGITAL_SAMBA_API_KEY=%1

REM Start the server in the background
start "MCP Server" cmd /c node tools\test-server.js %DIGITAL_SAMBA_API_KEY%

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Run the test script
node tools\test-rate-limiting-caching.js

REM Clean up
taskkill /FI "WINDOWTITLE eq MCP Server" /T /F > nul 2>&1

echo Test completed.
