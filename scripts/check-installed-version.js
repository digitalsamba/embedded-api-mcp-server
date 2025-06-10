#!/usr/bin/env node

/**
 * Script to check the installed version of the package
 * This helps identify the exact version when running via npx
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  // When running via npx, the package.json will be in the npm cache
  // Try multiple possible locations
  const possiblePaths = [
    join(__dirname, '..', 'package.json'),
    join(__dirname, '..', '..', 'package.json'),
    join(process.cwd(), 'node_modules', '@digitalsamba', 'embedded-api-mcp-server', 'package.json'),
  ];

  let packageData;
  let foundPath;
  
  for (const path of possiblePaths) {
    try {
      const data = readFileSync(path, 'utf8');
      packageData = JSON.parse(data);
      if (packageData.name === '@digitalsamba/embedded-api-mcp-server') {
        foundPath = path;
        break;
      }
    } catch {
      // Continue to next path
    }
  }

  if (packageData) {
    console.log('Installed package information:');
    console.log(`Name: ${packageData.name}`);
    console.log(`Version: ${packageData.version}`);
    console.log(`Location: ${foundPath}`);
    
    // Check if running from npm cache (npx)
    if (foundPath.includes('.npm') || foundPath.includes('_npx')) {
      console.log('Running via: npx');
    } else if (foundPath.includes('node_modules')) {
      console.log('Running via: local installation');
    } else {
      console.log('Running via: development mode');
    }
  } else {
    console.log('Could not determine installed version');
  }
} catch (error) {
  console.error('Error checking version:', error.message);
}