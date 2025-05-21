@echo off
REM Claude Desktop MCP Wrapper Batch File
REM This script avoids the "Open with" dialog by using a .bat file
REM that Windows knows how to execute without prompting.

setlocal

REM Check if API key is provided
if "%~1"=="" (
  echo API key is required
  echo Usage: claude-desktop-wrapper.bat YOUR_API_KEY
  exit /b 1
)

REM Set environment variables for MCP server
set API_KEY=%~1
set MCP_JSON_RPC_MODE=true
set LOG_LEVEL=error
set NODE_ENV=production

REM Setup logging
set LOG_FILE=%~dp0claude-desktop.log
echo %DATE% %TIME% - Starting Digital Samba MCP server for Claude Desktop >> "%LOG_FILE%"
echo %DATE% %TIME% - API Key: %API_KEY:~0,5%... >> "%LOG_FILE%"

REM Get path to this script and determine CLI script location
set SCRIPT_DIR=%~dp0
set CLI_PATH=%SCRIPT_DIR%bin\cli.js

REM Log startup information
echo %DATE% %TIME% - CLI Path: %CLI_PATH% >> "%LOG_FILE%"

REM Run the CLI script with Node.js
node "%CLI_PATH%" "%API_KEY%" >> "%LOG_FILE%" 2>&1

REM If we reach here, something went wrong
echo %DATE% %TIME% - Server exited with code %ERRORLEVEL% >> "%LOG_FILE%"
exit /b %ERRORLEVEL%
