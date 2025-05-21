@echo off
echo Building the project...
call npm run build:prod

echo Testing Claude Desktop integration with verbose logging...
call npm run test:claude-desktop-verbose

echo Testing Claude Desktop integration with mock client...
call npm run test:claude-desktop-mock

echo Done!
pause
