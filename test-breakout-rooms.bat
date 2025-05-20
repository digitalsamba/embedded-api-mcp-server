@echo off
echo Digital Samba MCP Server - Breakout Rooms Test

:: Ask for API key if not provided
if "%DIGITAL_SAMBA_API_KEY%"=="" (
  set /p DIGITAL_SAMBA_API_KEY="Enter your Digital Samba API key: "
  if "!DIGITAL_SAMBA_API_KEY!"=="" (
    echo No API key provided. Exiting.
    exit /b 1
  )
)

:: Run the test
echo Running breakout rooms test...
node --experimental-modules tests/test-breakout-rooms.js

echo.
echo Test completed.
pause
