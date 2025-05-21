@echo off
REM Generate Claude Desktop Configuration
REM This script generates the proper configuration for Claude Desktop

setlocal

REM Check if API key is provided
if "%~1"=="" (
  echo API key is required
  echo Usage: generate-claude-desktop-config.bat YOUR_API_KEY
  exit /b 1
)

set API_KEY=%~1
echo Using API key: %API_KEY:~0,5%...

REM Run the configuration helper
node claude-desktop-config-helper.js %API_KEY%
