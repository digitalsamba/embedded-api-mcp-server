@echo off
echo Digital Samba MCP Server - Recording Test

echo.
echo This script will test recording functionality in the Digital Samba MCP Server.
echo.

set /p API_KEY=Enter your Digital Samba API key: 

set DIGITAL_SAMBA_API_KEY=%API_KEY%

echo.
echo Starting the recording test...
echo.

node tests/recording-test.js

echo.
echo Test completed. Press any key to exit.
pause > nul
