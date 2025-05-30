@echo off
echo Building with detailed TypeScript output...
call npm run build -- --listFiles --diagnostics > typescript-build-output.log 2>&1
echo Build complete. Check typescript-build-output.log for details.
