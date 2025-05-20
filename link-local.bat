@echo off
echo Linking the Digital Samba MCP package locally...

npm run build:clean
npm link

echo.
echo Package has been linked! You can now use the 'digital-samba-mcp' command.
echo.
echo Test by running: digital-samba-mcp --help
echo.
pause