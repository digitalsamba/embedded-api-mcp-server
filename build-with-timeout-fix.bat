@echo off
echo Building for improved timeout handling...

echo Cleaning dist directory...
call npx rimraf dist

echo Running TypeScript compiler...
call npx tsc --skipLibCheck

echo Fixing imports...
node fix-imports.js
node fix-imports-2.js
node fix-sdk-paths.js

echo Copying and setting up CLI files...
node copy-bin.js

echo Building the npm package...
npm pack

echo.
echo Build completed successfully!
echo Testing the timeout fix with debug-timeout.bat
echo.
