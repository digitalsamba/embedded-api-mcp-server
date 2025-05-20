@echo off
echo Testing the MCP Server with metrics enabled...

:: Kill any instances of the server that might be running
taskkill /F /IM node.exe 2>nul

:: Start the server with metrics enabled
echo Starting server with metrics enabled...
start "Digital Samba MCP Server" node dist/src/index.js --enable-metrics --metrics-prefix=test_ --port=4567

:: Wait for server to start
timeout /t 3 /nobreak

:: Make a request to the metrics endpoint
echo Checking metrics endpoint...
curl -s http://localhost:4567/metrics

:: Stop the server when done
echo.
echo Test complete. Press any key to terminate the server...
pause > nul
taskkill /F /FI "WINDOWTITLE eq Digital Samba MCP Server"
