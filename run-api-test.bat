@echo off
echo API Connection Test

echo This script will test the direct connection to the Digital Samba API
echo to help diagnose connectivity issues.

set /p API_KEY=Enter your Digital Samba API key: 

echo Starting connection test...
node test-api-connection.js %API_KEY%

pause
