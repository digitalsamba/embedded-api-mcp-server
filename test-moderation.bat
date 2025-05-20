@echo off
echo Digital Samba MCP Server - Moderation Functionality Test

set /p DIGITAL_SAMBA_API_KEY=Enter your Digital Samba API key: 

echo Running moderation test...
node tests/moderation-test.js

pause