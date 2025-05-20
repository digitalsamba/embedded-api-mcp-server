@echo off
echo Starting Digital Samba MCP Server cleanup...

echo Removing temporary files and logs...
del /F /Q actual-server.log 2>nul
del /F /Q direct-mcp.log 2>nul
del /F /Q combined.log 2>nul
del /F /Q error.log 2>nul
del /F /Q launcher.log 2>nul
del /F /Q mcp-launcher.log 2>nul
del /F /Q mcp-proxy.log 2>nul

echo Removing unnecessary test and debug files...
del /F /Q direct-mcp-server.js 2>nul
del /F /Q mcp-bridge.js 2>nul
del /F /Q mcp-proxy.js 2>nul
del /F /Q test-client.js 2>nul
del /F /Q test-server-simple.js 2>nul
del /F /Q test-standalone-server.js 2>nul
del /F /Q disable-auto-start.js 2>nul
del /F /Q find-line.js 2>nul
del /F /Q digital-samba-wrapper.js 2>nul

echo Removing old source files...
del /F /Q src\meetings.ts.old 2>nul

echo Cleaning up dist directory...
if exist "dist" (
    rmdir /S /Q dist
)

echo Rebuilding project...
call npm run build:clean

echo Creating .gitignore entries for logs...
echo *.log >> .gitignore
echo combined.log >> .gitignore
echo error.log >> .gitignore
echo actual-server.log >> .gitignore
echo direct-mcp.log >> .gitignore
echo launcher.log >> .gitignore
echo mcp-launcher.log >> .gitignore
echo mcp-proxy.log >> .gitignore

echo Cleanup complete!
