@echo off
echo Digital Samba MCP Server - Debug Launcher
echo =======================================
echo.

set LOG_FILE=%TEMP%\digital-samba-mcp-debug.log
echo Logging debug information to: %LOG_FILE%
echo.

echo System Information:
echo -----------------
echo Time: %DATE% %TIME%
echo Computer Name: %COMPUTERNAME%
echo User: %USERNAME%
echo.

echo Environment Variables:
echo --------------------
set | findstr /B /C:"PORT" /C:"DIGITAL" /C:"AUTH" /C:"LOG"
echo.

echo Current Directory:
echo ----------------
cd
echo.

echo Files in Project Directory:
echo -------------------------
dir
echo.

echo Node.js Version:
echo --------------
node --version
echo.

echo NPM Version:
echo ----------
call npm --version
echo.

echo Testing Port Availability:
echo -----------------------
netstat -an | findstr ":4001"
echo.

echo Launching Server:
echo --------------
echo Command: run-mcp-server.bat 31xgx1NiAwMxgFhggyvnEux8jelYR10IJEnljNWRDbshH20NW4WlorLGF4XSUgvr
echo.

call run-mcp-server.bat 31xgx1NiAwMxgFhggyvnEux8jelYR10IJEnljNWRDbshH20NW4WlorLGF4XSUgvr

echo.
echo Server Launch Complete
echo --------------------
echo.

echo Checking Server Availability:
echo --------------------------
timeout /t 10 /nobreak
curl -v http://localhost:4001/health
echo.

echo Debug Complete - Press any key to exit
pause > nul
