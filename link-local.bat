@echo off
echo Linking the Digital Samba MCP Server package locally...

npm run build:clean
npm link

echo.
echo Package has been linked! You can now use the 'digital-samba-mcp-server' command.
echo.
echo Test by running: digital-samba-mcp-server --help
echo.
pause