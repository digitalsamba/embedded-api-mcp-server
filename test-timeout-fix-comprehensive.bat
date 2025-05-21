@echo off
echo Running comprehensive timeout fix test...

if "%1"=="" (
  echo No API key provided, checking for environment variable...
  if "%DIGITAL_SAMBA_API_KEY%"=="" (
    echo Error: No API key provided. Please provide an API key as a parameter or set the DIGITAL_SAMBA_API_KEY environment variable.
    exit /b 1
  )
  echo Using API key from environment variable.
  node test-timeout-fix-comprehensive.js %DIGITAL_SAMBA_API_KEY%
) else (
  echo Using API key from command line.
  node test-timeout-fix-comprehensive.js %1
)
