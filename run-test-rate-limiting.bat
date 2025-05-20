@echo off
echo Testing rate limiting and caching functionality...

REM Kill any existing node processes using port 3333
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3333') do (
  echo Killing process %%a...
  taskkill /F /PID %%a 2>nul
)

REM Run the test script
node test-rate-limiting-caching.js

echo Test completed.
