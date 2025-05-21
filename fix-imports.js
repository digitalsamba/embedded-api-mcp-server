#!/usr/bin/env node

/**
 * This script fixes the import paths in the TypeScript files to match
 * the structure of the @modelcontextprotocol/sdk package.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to scan for imports
const directories = ['src', 'bin'];

// RegExp for imports to replace
const importRegex = /@modelcontextprotocol\/sdk\/(server|client|types|shared)\.js/g;
const specificImportRegex = /@modelcontextprotocol\/sdk\/(server|client)\/([a-zA-Z0-9]+)\.js/g;

// Replacement function
function replaceImports(content) {
  // Replace imports like @modelcontextprotocol/sdk/server.js
  let newContent = content.replace(importRegex, (match, p1) => {
    console.log(`Replacing ${match} with @modelcontextprotocol/sdk/${p1}/index.js`);
    return `@modelcontextprotocol/sdk/${p1}/index.js`;
  });

  // Replace imports like @modelcontextprotocol/sdk/server/mcp.js
  newContent = newContent.replace(specificImportRegex, (match, p1, p2) => {
    console.log(`Keeping specific import: ${match}`);
    return match; // These paths are correct
  });

  return newContent;
}

// Process a directory recursively
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
      const content = fs.readFileSync(filePath, 'utf8');
      const newContent = replaceImports(content);
      
      if (content !== newContent) {
        console.log(`Fixed imports in: ${filePath}`);
        fs.writeFileSync(filePath, newContent);
      }
    }
  }
}

// Run the script
console.log('Starting import path fixes...');
for (const dir of directories) {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Processing directory: ${dirPath}`);
    processDirectory(dirPath);
  }
}
console.log('Import path fixes completed.');
