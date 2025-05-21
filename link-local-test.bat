@echo off
echo Creating local npm link for digital-samba-mcp...

:: First, build the project
call npm run build:clean

:: Create the npm link
cd %~dp0
call npm link

echo.
echo Local npm link created successfully!
echo.
echo To test the package, you can now run:
echo npx digital-samba-mcp YOUR_API_KEY
echo.
echo Or with more options:
echo npx digital-samba-mcp --api-key YOUR_API_KEY --port 4000 --log-level debug
echo.
