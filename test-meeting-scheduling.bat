@echo off
echo Running Digital Samba MCP Server Meeting Scheduling Test
echo =======================================================

REM Check if API key is set
if "%DIGITAL_SAMBA_API_KEY%"=="" (
  echo ERROR: DIGITAL_SAMBA_API_KEY environment variable is not set.
  echo Please set it by running:
  echo    set DIGITAL_SAMBA_API_KEY=your_api_key
  exit /b 1
)

REM Run the test
node tests/meeting-scheduling-test.js

if %ERRORLEVEL% NEQ 0 (
  echo Test failed with exit code %ERRORLEVEL%
  exit /b %ERRORLEVEL%
)

echo Test completed successfully!
exit /b 0
