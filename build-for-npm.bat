@echo off
echo Building for npx/npm package deployment...

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

echo.
echo Build completed successfully!
echo Note: Test the package with 'npm run package-test' before publishing
echo.
