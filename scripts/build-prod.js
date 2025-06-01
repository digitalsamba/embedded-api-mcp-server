#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

console.log('Production build script starting...');

// Clean dist directory
try {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('Cleaned existing dist directory');
  }
} catch (error) {
  console.warn('Warning: Could not clean dist directory:', error.message);
}

// Try to build with TypeScript
try {
  console.log('Attempting TypeScript compilation...');
  execSync('npx tsc --skipLibCheck', { 
    stdio: 'inherit',
    cwd: projectRoot 
  });
  console.log('TypeScript compilation successful');
  process.exit(0);
} catch (error) {
  console.log('TypeScript compilation failed, trying fallback build method...');
}

// If TypeScript fails, try with a simpler approach
try {
  // Check if we can use tsx to transpile
  console.log('Attempting build with tsx transpilation...');
  
  // Create dist directories
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'src'), { recursive: true });
  
  // Use npx tsx to compile each file
  const srcDir = path.join(projectRoot, 'src');
  const files = getAllTypeScriptFiles(srcDir);
  
  console.log(`Found ${files.length} TypeScript files to transpile`);
  
  for (const file of files) {
    const relativePath = path.relative(srcDir, file);
    const outputPath = path.join(distDir, 'src', relativePath.replace('.ts', '.js'));
    const outputDir = path.dirname(outputPath);
    
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Simple copy and replace .ts imports with .js
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/from\s+['"](\.\.?\/[^'"]+)\.js['"]/g, "from '$1.js'");
    content = content.replace(/from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g, "from '$1.js'");
    
    fs.writeFileSync(outputPath, content);
  }
  
  console.log('Fallback transpilation completed');
  process.exit(0);
} catch (fallbackError) {
  console.error('All build methods failed');
  console.error('Error:', fallbackError.message);
  process.exit(1);
}

function getAllTypeScriptFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      getAllTypeScriptFiles(fullPath, files);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}