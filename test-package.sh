#!/bin/bash

# Install globally
echo "Installing digital-samba-mcp globally..."
npm install -g .

# Test CLI version
echo "Testing CLI version..."
digital-samba-mcp --help

# Create a test directory
echo "Creating test directory..."
mkdir -p ./test-install
cd ./test-install

# Initialize test package
echo "Initializing test package..."
npm init -y

# Install locally
echo "Installing digital-samba-mcp as a dependency..."
npm install --save ../

# Create a test script
echo "Creating test script..."
cat > test.js << 'EOF'
import { createServer } from 'digital-samba-mcp';

const { server, port, apiUrl } = createServer({
  port: 4321,
  apiUrl: 'https://api.digitalsamba.com/api/v1'
});

console.log(`Server configuration created successfully with port ${port}`);
console.log(`API URL: ${apiUrl}`);
console.log('Server object available:', !!server);
EOF

# Run the test script
echo "Running test script..."
node test.js

# Clean up
echo "Cleaning up..."
cd ..
rm -rf ./test-install

echo "Package test completed successfully!"
