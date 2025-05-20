@echo off
echo Setting up for MCP Inspector Test

echo Building project...
call npm run build:clean

echo Starting MCP Server on port 3000...
start /B cmd /c node dist/src/index.js --log-level="debug" --port=3000 > mcp-inspector-test.log 2>&1

echo.
echo MCP Server started on port 3000
echo.
echo To test with MCP Inspector:
echo 1. Install MCP Inspector: npm install -g @modelcontextprotocol/inspector
echo 2. Run: mcp-inspector --url http://localhost:3000/mcp --header "Authorization: Bearer YOUR_API_KEY"
echo.
echo Press any key to stop the server when done testing...
pause > nul

echo Shutting down test server...
taskkill /f /im node.exe > nul 2>&1

echo MCP Inspector test completed. Check mcp-inspector-test.log for details.
