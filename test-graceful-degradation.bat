@echo off
echo Testing Graceful Degradation Implementation...
echo.

node --loader tsx tests/test-graceful-degradation.js

echo.
echo Test completed.
pause
