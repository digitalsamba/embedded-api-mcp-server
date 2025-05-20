@echo off
echo Starting Digital Samba MCP Server Test...

echo Building project...
call npm run build:clean

echo Starting server in test mode...
start /B cmd /c node dist/src/index.js --log-level="debug" --port=3000 > test-server.log 2>&1

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Testing health endpoint...
curl -s http://localhost:3000/health

echo.
echo Testing MCP endpoint (without API key)...
curl -s -X POST -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"params\":{\"capabilities\":{\"resources\":{}},\"info\":{\"name\":\"test-client\",\"version\":\"1.0.0\"}},\"id\":1}" http://localhost:3000/mcp

echo.
echo.
echo Shutting down test server...
taskkill /f /im node.exe > nul 2>&1

echo Test complete! Check test-server.log for details.
