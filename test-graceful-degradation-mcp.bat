@echo off
echo Testing Graceful Degradation with MCP Server...
echo.

node --loader tsx tests/test-graceful-degradation-mcp.js

echo.
echo Test completed.
pause
