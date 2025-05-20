@echo off
echo Starting Digital Samba MCP Server...
echo.

REM Get the API key from the first argument
set API_KEY=%~1
if "%API_KEY%"=="" (
  echo No API key provided. You'll need to include an Authorization header in each request.
) else (
  echo Using API key: %API_KEY:~0,5%...
  set "AUTHORIZATION=Bearer %API_KEY%"
)

REM Set environment variables
set PORT=4001
set DIGITAL_SAMBA_API_URL=https://api.digitalsamba.com/api/v1
set LOG_LEVEL=debug

echo Server will run on port: %PORT%
echo API URL: %DIGITAL_SAMBA_API_URL%
echo Log level: %LOG_LEVEL%
echo.
echo Starting server...

REM Change to the directory containing this batch file
cd /d "%~dp0"

REM Check if the server is already running on this port
netstat -ano | findstr ":%PORT% " >nul
if %errorlevel% equ 0 (
  echo WARNING: Port %PORT% is already in use!
  echo Checking for existing server process...
  
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% "') do (
    echo Found process: %%p
    echo Trying to terminate process...
    taskkill /F /PID %%p
    if %errorlevel% equ 0 (
      echo Process terminated successfully.
      timeout /t 2 /nobreak >nul
    ) else (
      echo Failed to terminate process. Please close any application using port %PORT% manually.
      exit /b 1
    )
  )
)

REM Run the server with the appropriate method
if exist ".\node_modules\.bin\tsx.cmd" (
  echo Running TypeScript directly with tsx...
  start "" .\node_modules\.bin\tsx.cmd src\index.ts
  echo Server started in background.
) else if exist ".\dist\index.js" (
  echo Running compiled JavaScript...
  start "" node --no-warnings .\dist\index.js
  echo Server started in background.
) else (
  echo ERROR: Could not find either tsx or compiled JavaScript.
  echo Please run 'npm install' and either compile the code or ensure tsx is installed.
  exit /b 1
)

REM Wait for the server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Check if the server is running
curl -s http://localhost:%PORT%/health >nul
if %errorlevel% equ 0 (
  echo Server is running successfully at http://localhost:%PORT%/mcp
) else (
  echo WARNING: Could not verify if server is running. It may still be starting up.
  echo If Claude has issues connecting, check the logs at %cd%\combined.log
)

echo.
echo Server is running in the background. You can close this window.
echo To stop the server, close the spawned nodejs window or run taskkill commands manually.
