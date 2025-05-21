@echo off
REM Claude Desktop MCP Wrapper Batch File
REM This script avoids the "Open with" dialog by using a .bat file
REM that Windows knows how to execute without prompting.

setlocal EnableDelayedExpansion

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

REM Completely suppress console output to prevent JSON-RPC interference
set NO_CONSOLE_OUTPUT=true

REM Setup logging
set LOG_FILE=%~dp0claude-desktop.log
echo %DATE% %TIME% - Starting Digital Samba MCP server for Claude Desktop > "%LOG_FILE%"
echo %DATE% %TIME% - API Key: %API_KEY:~0,5%... >> "%LOG_FILE%"

REM Get path to this script and determine CLI script location
set SCRIPT_DIR=%~dp0
set CLI_PATH=%SCRIPT_DIR%bin\cli.js

REM Log startup information
echo %DATE% %TIME% - CLI Path: %CLI_PATH% >> "%LOG_FILE%"

REM Check if node is available
where node > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo %DATE% %TIME% - ERROR: Node.js is not found in PATH >> "%LOG_FILE%"
  echo %DATE% %TIME% - Please ensure Node.js is installed and in your system PATH >> "%LOG_FILE%"
  exit /b 1
)

REM Check if the CLI script exists
if not exist "%CLI_PATH%" (
  echo %DATE% %TIME% - ERROR: CLI script not found at %CLI_PATH% >> "%LOG_FILE%"
  echo %DATE% %TIME% - Current directory: %CD% >> "%LOG_FILE%"
  echo %DATE% %TIME% - Checking for bin directory... >> "%LOG_FILE%"
  if exist "%SCRIPT_DIR%bin" (
    echo %DATE% %TIME% - bin directory exists >> "%LOG_FILE%"
    dir "%SCRIPT_DIR%bin" >> "%LOG_FILE%"
  ) else (
    echo %DATE% %TIME% - bin directory does not exist >> "%LOG_FILE%"
  )
  exit /b 1
)

REM Check if dist directory exists with built files
if not exist "%SCRIPT_DIR%dist\src\index.js" (
  echo %DATE% %TIME% - ERROR: Built files not found in dist directory >> "%LOG_FILE%"
  echo %DATE% %TIME% - Please run 'npm run build' before using this wrapper >> "%LOG_FILE%"
  exit /b 1
)

REM Create a temporary batch file for running the actual command and capturing output
set TEMP_BAT=%TEMP%\mcp-runner-%RANDOM%.bat

echo @echo off > "%TEMP_BAT%"
echo setlocal >> "%TEMP_BAT%"
echo cd /d "%SCRIPT_DIR%" >> "%TEMP_BAT%"
echo set MCP_JSON_RPC_MODE=true >> "%TEMP_BAT%"
echo set LOG_LEVEL=error >> "%TEMP_BAT%"
echo set NODE_ENV=production >> "%TEMP_BAT%"
echo set NO_CONSOLE_OUTPUT=true >> "%TEMP_BAT%"
echo set DIGITAL_SAMBA_API_KEY=%API_KEY% >> "%TEMP_BAT%"
echo node "%CLI_PATH%" 2^>^>"%LOG_FILE%" 1^>^>"%LOG_FILE%" >> "%TEMP_BAT%"
echo exit /b %%ERRORLEVEL%% >> "%TEMP_BAT%"

echo %DATE% %TIME% - Executing MCP server with node >> "%LOG_FILE%"
echo %DATE% %TIME% - Command: node "%CLI_PATH%" >> "%LOG_FILE%"

REM Run the temporary batch file but REDIRECT ALL STDIO
call "%TEMP_BAT%" > nul 2> nul

set EXIT_CODE=%ERRORLEVEL%

REM Clean up the temporary batch file
del "%TEMP_BAT%" > nul 2>&1

if %EXIT_CODE% NEQ 0 (
  echo %DATE% %TIME% - Server exited with code %EXIT_CODE% >> "%LOG_FILE%"
  echo %DATE% %TIME% - This may indicate a problem with the MCP server. Check the log for details. >> "%LOG_FILE%"
  
  REM Attempt to get more debug information
  echo %DATE% %TIME% - DEBUG: Checking environment >> "%LOG_FILE%"
  echo %DATE% %TIME% - Node version: >> "%LOG_FILE%"
  node --version >> "%LOG_FILE%" 2>&1
  
  echo %DATE% %TIME% - DEBUG: Checking package.json >> "%LOG_FILE%"
  if exist "%SCRIPT_DIR%package.json" (
    echo %DATE% %TIME% - package.json exists >> "%LOG_FILE%"
    type "%SCRIPT_DIR%package.json" | findstr "version" >> "%LOG_FILE%"
  ) else (
    echo %DATE% %TIME% - package.json not found >> "%LOG_FILE%"
  )
)

echo %DATE% %TIME% - Claude Desktop wrapper completed execution >> "%LOG_FILE%"
exit /b %EXIT_CODE%

exit /b %EXIT_CODE%

