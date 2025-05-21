@echo off
echo Running timeout debug test...

if "%1"=="" (
  echo No API key provided, checking for environment variable...
  if "%DIGITAL_SAMBA_API_KEY%"=="" (
    echo Error: No API key provided. Please provide an API key as a parameter or set the DIGITAL_SAMBA_API_KEY environment variable.
    exit /b 1
  )
  echo Using API key from environment variable.
  node debug-timeout.js %DIGITAL_SAMBA_API_KEY%
) else (
  echo Using API key from command line.
  node debug-timeout.js %1
)
