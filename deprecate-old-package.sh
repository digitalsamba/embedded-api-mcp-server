#!/bin/bash

# Script to deprecate the old package after the new one is published

echo "This script will deprecate the old @digitalsamba/mcp-server package"
echo "Run this AFTER @digitalsamba/embedded-api-mcp-server is successfully published"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

npm deprecate @digitalsamba/mcp-server "Package renamed to @digitalsamba/embedded-api-mcp-server - please update your dependencies"

echo "Done! Old package has been deprecated."