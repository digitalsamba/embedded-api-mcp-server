@echo off
echo Testing Digital Samba MCP using local script...

if "%1"=="" (
  echo Error: API key is required
  echo Usage: test-local-npm.bat YOUR_API_KEY
  exit /b 1
)

node test-local-npx.js %*
