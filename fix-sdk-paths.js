#!/usr/bin/env node

/**
 * This script helps diagnose import path issues with the @modelcontextprotocol/sdk package.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to check
const sdkPath = path.join(__dirname, 'node_modules', '@modelcontextprotocol', 'sdk');
const importedPath = path.join(sdkPath, 'server', 'mcp.js');
const esmPath = path.join(sdkPath, 'dist', 'esm', 'server', 'mcp.js');

console.log('Checking MCP SDK paths...');
console.log('SDK Path exists:', fs.existsSync(sdkPath));
console.log('Direct import path exists:', fs.existsSync(importedPath));
console.log('ESM path exists:', fs.existsSync(esmPath));

console.log('\nExploring available paths:');
if (fs.existsSync(sdkPath)) {
  console.log('\nContents of SDK directory:');
  console.log(fs.readdirSync(sdkPath));
  
  const sdkPackageJson = path.join(sdkPath, 'package.json');
  if (fs.existsSync(sdkPackageJson)) {
    const packageData = JSON.parse(fs.readFileSync(sdkPackageJson, 'utf8'));
    console.log('\nExports from package.json:');
    console.log(JSON.stringify(packageData.exports, null, 2));
  }
  
  if (fs.existsSync(path.join(sdkPath, 'dist'))) {
    console.log('\nContents of dist directory:');
    console.log(fs.readdirSync(path.join(sdkPath, 'dist')));
    
    if (fs.existsSync(path.join(sdkPath, 'dist', 'esm'))) {
      console.log('\nContents of esm directory:');
      console.log(fs.readdirSync(path.join(sdkPath, 'dist', 'esm')));
      
      if (fs.existsSync(path.join(sdkPath, 'dist', 'esm', 'server'))) {
        console.log('\nContents of server directory:');
        console.log(fs.readdirSync(path.join(sdkPath, 'dist', 'esm', 'server')));
      }
    }
  }
}

// Create symbolic links to help resolve the imports
console.log('\nCreating symbolic links to help with imports...');
try {
  if (!fs.existsSync(path.join(sdkPath, 'server'))) {
    fs.mkdirSync(path.join(sdkPath, 'server'), { recursive: true });
    console.log('Created server directory');
  }
  
  const serverDir = path.join(sdkPath, 'server');
  const sourceDir = path.join(sdkPath, 'dist', 'esm', 'server');
  
  if (fs.existsSync(sourceDir)) {
    // Copy files instead of creating symlinks (more compatible)
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.js.map') || file.endsWith('.d.ts')) {
        const source = path.join(sourceDir, file);
        const dest = path.join(serverDir, file);
        fs.copyFileSync(source, dest);
        console.log(`Copied ${file} to ${dest}`);
      }
    }
  }
  
  console.log('Symbolic links created successfully');
} catch (error) {
  console.error('Error creating symbolic links:', error);
}

console.log('\nDiagnostic complete.');
