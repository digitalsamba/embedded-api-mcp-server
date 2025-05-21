@echo off
REM Test Claude Desktop Integration
REM This script tests the integration with Claude Desktop

setlocal

REM Check if API key is provided
if "%~1"=="" (
  echo API key is required
  echo Usage: test-claude-desktop.bat YOUR_API_KEY
  exit /b 1
)

set API_KEY=%~1
echo Using API key: %API_KEY:~0,5%...

REM Build the project first
echo Building project...
call npm run build:clean
if %ERRORLEVEL% NEQ 0 (
  echo Error building project
  exit /b %ERRORLEVEL%
)

REM Set up log file
set LOG_FILE=%~dp0claude-desktop-test.log
echo %DATE% %TIME% - Starting Claude Desktop integration test > "%LOG_FILE%"

REM Run direct test with API key
echo Testing Claude Desktop integration...
node claude-desktop-wrapper.bat %API_KEY%

echo Test completed. Check %LOG_FILE% for details.
