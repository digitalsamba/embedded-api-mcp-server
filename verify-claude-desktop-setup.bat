@echo off
REM Claude Desktop Integration Verification Script
REM This script checks your Digital Samba MCP Server setup for Claude Desktop integration

setlocal EnableDelayedExpansion

echo ===================================================
echo Digital Samba MCP Server - Claude Desktop Setup Check
echo ===================================================
echo.

REM Check if API key is provided or use environment variable
set API_KEY=%1
if "%API_KEY%"=="" (
  if defined DIGITAL_SAMBA_API_KEY (
    set API_KEY=%DIGITAL_SAMBA_API_KEY%
    echo Using API key from environment variable
  ) else (
    echo ERROR: No API key provided. 
    echo Usage: verify-claude-desktop-setup.bat YOUR_API_KEY
    echo.
    goto :END
  )
)

echo Checking setup for Claude Desktop integration...
echo.

REM Check if Node.js is available
where node > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js is not found in PATH
  echo Please ensure Node.js is installed and in your system PATH
  goto :END
)
echo [✓] Node.js is installed

REM Check for critical directories and files
if exist "dist" (
  echo [✓] dist directory exists
) else (
  echo [✗] dist directory does not exist - please run 'npm run build:clean'
  goto :END
)

if exist "dist\src\index.js" (
  echo [✓] dist\src\index.js exists
) else (
  echo [✗] dist\src\index.js does not exist - please run 'npm run build:clean'
  goto :END
)

if exist "bin\cli.js" (
  echo [✓] bin\cli.js exists
) else (
  echo [✗] bin\cli.js does not exist - check your project structure
  goto :END
)

if exist "claude-desktop-wrapper.bat" (
  echo [✓] claude-desktop-wrapper.bat exists
) else (
  echo [✗] claude-desktop-wrapper.bat does not exist - check your project structure
  goto :END
)

echo.
echo All required files exist. Now testing communication...
echo.

REM Create a temporary directory to test the MCP functionality
set TEMP_LOG=%TEMP%\mcp-test-%RANDOM%.log
echo Running a simple test with your API key (first 5 chars: %API_KEY:~0,5%...)
echo Test output will be logged to %TEMP_LOG%

REM Try running the simple test
node test-claude-desktop-simple.js > %TEMP_LOG% 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [✗] Test failed with error code %ERRORLEVEL%
  echo.
  echo Last 10 lines of log:
  echo -------------------
  powershell -Command "Get-Content '%TEMP_LOG%' | Select-Object -Last 10"
  echo -------------------
  echo.
  echo Check claude-desktop-simple-test.log for full details
) else (
  echo [✓] Test completed successfully
  
  REM Check if we got an initialize response
  findstr /C:"Successfully received initialize response" claude-desktop-simple-test.log > nul
  if %ERRORLEVEL% EQU 0 (
    echo [✓] MCP communication is working correctly
  ) else (
    echo [✗] MCP communication test didn't receive initialization response
    echo Check claude-desktop-simple-test.log for details
  )
)

echo.
echo ===================================================
echo Claude Desktop Configuration Instructions
echo ===================================================
echo.
echo To configure Claude Desktop:
echo.
echo 1. Open Claude Desktop
echo 2. Go to Settings ^> Advanced ^> MCP Servers
echo 3. Add a new server with this configuration:
echo.
echo {
echo   "mcpServers": {
echo     "Digital_Samba": {
echo       "command": "%CD%\claude-desktop-wrapper.bat",
echo       "args": ["%API_KEY%"]
echo     }
echo   }
echo }
echo.
echo Note: Make sure to copy the full path above with escaped backslashes if needed
echo.
echo ===================================================
echo Troubleshooting
echo ===================================================
echo.
echo If you encounter issues:
echo.
echo 1. Check claude-desktop.log for error messages
echo 2. Verify your API key is correct
echo 3. Make sure all paths in your configuration are correct
echo 4. Try running 'npm run test:claude-desktop-verbose' for more detailed logs
echo.

:END
echo.
echo Setup verification completed

endlocal
