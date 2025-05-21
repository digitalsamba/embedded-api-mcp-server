@echo off
echo Testing Digital Samba MCP CLI...
echo.

:: Check if the CLI is installed
where digital-samba-mcp-server > nul 2>&1
if %errorlevel% neq 0 (
  echo The digital-samba-mcp-server CLI is not found.
  echo Please run link-package.bat first to create and link the package.
  exit /b 1
)

:: Test the CLI with --help
echo Testing CLI help...
digital-samba-mcp-server --help

echo.
echo If you see the help information above, the CLI is working correctly!
echo.
