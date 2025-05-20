@echo off
echo Building and running the test script...

npm run build:clean
npm run test:server

echo Done.
pause