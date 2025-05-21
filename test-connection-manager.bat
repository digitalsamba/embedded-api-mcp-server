@echo off
echo Testing Connection Manager implementation...
node tests/test-connection-manager.js
echo.
if %ERRORLEVEL% NEQ 0 echo Test failed with error level %ERRORLEVEL%
pause