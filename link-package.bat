@echo off
echo Creating local npm package for testing...
echo.

:: Install rimraf if needed
echo Installing dependencies...
call npm install rimraf --save-dev

:: Build the project
echo.
echo Building the project...
call npm run build:clean || (
  echo Build failed!
  exit /b 1
)

:: Copy CLI file to dist directory
echo.
echo Copying CLI file to dist directory...
copy /Y bin\cli.js dist\bin\cli.js || (
  echo Failed to copy CLI file!
  exit /b 1
)

:: Link the package locally
echo.
echo Linking the package locally...
call npm link || (
  echo Linking failed!
  exit /b 1
)

:: Done
echo.
echo Package linked successfully!
echo You can now run 'digital-samba-mcp-server --help' to test the CLI.
echo.
