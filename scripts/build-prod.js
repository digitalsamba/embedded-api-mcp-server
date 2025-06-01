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

// Check if dist directory exists
if (fs.existsSync(distDir) && fs.readdirSync(distDir).length > 0) {
  console.log('Using existing dist directory for production build');
  process.exit(0);
}

console.log('No dist directory found. Attempting simple JavaScript copy...');

// If no dist, try to copy source files as-is (for JavaScript projects)
// or fail gracefully
try {
  // Create dist directory
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'src'), { recursive: true });
  
  // Copy package.json to know the structure
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  
  // Since this is a TypeScript project, we need the compiled output
  // In CI/CD without devDependencies, we can't compile TypeScript
  console.error('ERROR: Cannot build TypeScript without development dependencies.');
  console.error('Please ensure the dist directory is built before publishing.');
  console.error('You may need to:');
  console.error('1. Build locally and commit the dist directory temporarily');
  console.error('2. Or use a CI/CD environment with devDependencies installed');
  process.exit(1);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}