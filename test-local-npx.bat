@echo off
echo Testing local digital-samba-mcp package...

if "%1"=="" (
  echo Error: API key is required
  echo Usage: test-local-npx.bat YOUR_API_KEY
  exit /b 1
)

set API_KEY=%1
echo Using API key: %API_KEY:~0,5%...

:: Check if the package is linked
npx -p . digital-samba-mcp %API_KEY% --log-level debug

echo Test completed.
