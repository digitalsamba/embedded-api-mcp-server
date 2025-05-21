@echo off
echo Building only digital-samba-api-circuit-breaker.ts...
call npx tsc --skipLibCheck src/digital-samba-api-circuit-breaker.ts --outDir dist/src
echo Build complete.
