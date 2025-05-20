@echo off
echo Digital Samba MCP Server - Installation and Setup

echo.
echo 1. Cleaning the project...
call cleanup.bat

echo.
echo 2. Installing dependencies...
call npm install

echo.
echo 3. Building the project...
call npm run build:clean

echo.
echo 4. Creating a global symlink...
call npm link

echo.
echo 5. Running tests...
call test-server.bat

echo.
echo ====================================================
echo Digital Samba MCP Server is now installed and ready!
echo ====================================================
echo.
echo You can start the server with:
echo   digital-samba-mcp --api-key YOUR_API_KEY
echo.
echo Configure Claude Desktop:
echo   1. Open Claude Desktop
echo   2. Go to Settings > Advanced > MCP Servers
echo   3. Add server with URL: http://localhost:3000/mcp
echo   4. Add header: Authorization: Bearer YOUR_API_KEY
echo.
echo Useful commands:
echo   * Run with MCP Inspector: test-with-mcp-inspector.bat
echo   * Test rate limiting: test-rate-limiting-caching.bat
echo   * Test webhook functionality: npm run test:webhook
echo   * Test recording functionality: npm run test:recording
echo   * Test moderation functionality: npm run test:moderation
echo   * Test breakout rooms: npm run test:breakout
echo   * Test meeting scheduling: npm run test:meetings
echo.
echo For troubleshooting, see TROUBLESHOOTING.md
echo.
echo Press any key to continue...
pause > nul
