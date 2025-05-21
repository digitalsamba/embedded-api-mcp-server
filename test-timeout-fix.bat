@echo off
echo Running timeout fix test...

set /p API_KEY=Enter your Digital Samba API key: 
set DIGITAL_SAMBA_API_KEY=%API_KEY%

echo Using API key: %API_KEY:~0,5%...

echo Building project...
call npm run build

echo Running test...
node test-timeout-fix.js

if %ERRORLEVEL% EQU 0 (
  echo Test passed!
) else (
  echo Test failed!
)

pause
