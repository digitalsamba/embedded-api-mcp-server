#!/usr/bin/env node

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_API_KEY = process.argv[2] || process.env.DIGITAL_SAMBA_API_KEY || 'test-api-key';

console.log('🧪 Testing Digital Samba MCP Server npm package integration...\n');

// Test 1: Check if bin/cli.js exists and is executable
console.log('Test 1: Checking CLI binary...');
const cliPath = join(__dirname, 'bin', 'cli.js');

try {
  const fs = await import('fs');
  const stats = await fs.promises.stat(cliPath);
  if (stats.isFile()) {
    console.log('✅ CLI binary exists');
  } else {
    console.log('❌ CLI binary is not a file');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ CLI binary not found:', error.message);
  process.exit(1);
}

// Test 2: Test stdio mode (Claude Desktop mode)
console.log('\nTest 2: Testing stdio mode (Claude Desktop)...');

const stdioProcess = spawn('node', [cliPath, '--stdio'], {
  env: {
    ...process.env,
    DIGITAL_SAMBA_API_KEY: TEST_API_KEY,
    MCP_MODE: 'stdio'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdioOutput = '';
let stdioError = '';
let stdioConnected = false;

stdioProcess.stdout.on('data', (data) => {
  stdioOutput += data.toString();
  if (data.toString().includes('"jsonrpc":"2.0"')) {
    stdioConnected = true;
  }
});

stdioProcess.stderr.on('data', (data) => {
  stdioError += data.toString();
  if (data.toString().includes('MCP server connected to stdio transport successfully')) {
    stdioConnected = true;
  }
});

// Send a test JSON-RPC message
setTimeout(() => {
  const testMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {}
    }
  }) + '\n';
  
  stdioProcess.stdin.write(testMessage);
}, 1000);

// Check results after 3 seconds
setTimeout(() => {
  stdioProcess.kill();
  
  if (stdioConnected || stdioError.includes('stdio transport successfully')) {
    console.log('✅ Stdio mode connected successfully');
    console.log('   Stderr output:', stdioError.split('\\n')[0]);
  } else {
    console.log('❌ Stdio mode failed to connect');
    console.log('   Stdout:', stdioOutput.substring(0, 200));
    console.log('   Stderr:', stdioError.substring(0, 200));
  }
  
  // Test 3: Test HTTP mode
  console.log('\nTest 3: Testing HTTP mode...');
  
  const httpProcess = spawn('node', [cliPath, '--port', '5555'], {
    env: {
      ...process.env,
      DIGITAL_SAMBA_API_KEY: TEST_API_KEY
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let httpError = '';
  let httpStarted = false;
  
  httpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Starting Digital Samba MCP Server') || 
        output.includes('HTTP Server listening on port')) {
      httpStarted = true;
    }
  });
  
  httpProcess.stderr.on('data', (data) => {
    httpError += data.toString();
    if (data.includes('Server listening on port') || 
        data.includes('HTTP Server listening')) {
      httpStarted = true;
    }
  });
  
  // Check HTTP server after 2 seconds
  setTimeout(async () => {
    httpProcess.kill();
    
    if (httpStarted) {
      console.log('✅ HTTP mode started successfully');
    } else {
      console.log('❌ HTTP mode failed to start');
      console.log('   Error:', httpError.substring(0, 200));
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('   - CLI binary: ✅');
    console.log(`   - Stdio mode: ${stdioConnected || stdioError.includes('stdio transport successfully') ? '✅' : '❌'}`);
    console.log(`   - HTTP mode: ${httpStarted ? '✅' : '❌'}`);
    
    console.log('\n🎉 Testing complete!');
    
    // Test the npx command
    console.log('\n💡 To use with Claude Desktop, configure it with:');
    console.log('   Command: npx digital-samba-mcp-server');
    console.log(`   Arguments: ${TEST_API_KEY}`);
    console.log('\n   Or if installed globally:');
    console.log('   Command: digital-samba-mcp-server');
    console.log(`   Arguments: ${TEST_API_KEY}`);
    
    process.exit(0);
  }, 2000);
}, 3000);