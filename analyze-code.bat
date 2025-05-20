@echo off
echo Running Digital Samba MCP Server Code Analyzer...
echo This will help identify files that may need cleanup before making the repository public.
echo.
echo Results will be saved to cleanup-report.txt
echo.

node tools/file-analyzer.js > cleanup-report.txt

echo Analysis complete! Check cleanup-report.txt for results.
