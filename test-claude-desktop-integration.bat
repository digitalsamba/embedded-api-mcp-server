@echo off
echo Building the project...
call npm run build:prod

echo Testing Claude Desktop integration...
call npm run test:claude-desktop-verbose

echo Done!
pause
