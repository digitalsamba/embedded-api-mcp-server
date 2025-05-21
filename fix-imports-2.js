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

// RegExp for imports to fix
const typesImportRegex = /@modelcontextprotocol\/sdk\/types\/index\.js/g;

// Replacement function
function fixImports(content) {
  // Fix incorrect paths created by previous script
  let newContent = content.replace(typesImportRegex, '@modelcontextprotocol/sdk/types.js');
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
      const newContent = fixImports(content);
      
      if (content !== newContent) {
        console.log(`Fixed imports in: ${filePath}`);
        fs.writeFileSync(filePath, newContent);
      }
    }
  }
}

// Run the script
console.log('Starting import path fix-up...');
for (const dir of directories) {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Processing directory: ${dirPath}`);
    processDirectory(dirPath);
  }
}
console.log('Import path fix-up completed.');
