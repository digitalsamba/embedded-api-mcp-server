@echo off
setlocal

echo Installing digital-samba-mcp-server globally...
npm install -g .

echo Testing CLI version...
digital-samba-mcp-server --help

echo Creating test directory...
mkdir test-install
cd test-install

echo Initializing test package...
npm init -y

echo Installing digital-samba-mcp-server as a dependency...
npm install --save ..\

echo Creating test script...
(
echo import { createServer } from 'digital-samba-mcp-server';
echo.
echo const { server, port, apiUrl } = createServer({
echo   port: 4321,
echo   apiUrl: 'https://api.digitalsamba.com/api/v1'
echo });
echo.
echo console.log(`Server configuration created successfully with port ${port}`^);
echo console.log(`API URL: ${apiUrl}`^);
echo console.log('Server object available:', !!server^);
) > test.mjs

echo Running test script...
node test.mjs

echo Cleaning up...
cd ..
rmdir /s /q test-install

echo Package test completed successfully!
