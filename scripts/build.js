import * as esbuild from 'esbuild';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');
const packageJson = JSON.parse(fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const dependencies = Object.keys(packageJson.dependencies || {});
const peerDependencies = Object.keys(packageJson.peerDependencies || {});
const external = [...dependencies, ...peerDependencies];

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy binary files
const binDir = resolve(__dirname, 'bin');
const distBinDir = resolve(distDir, 'bin');
if (!fs.existsSync(distBinDir)) {
  fs.mkdirSync(distBinDir, { recursive: true });
}

// Copy CLI file and set permissions
fs.copyFileSync(resolve(binDir, 'cli.js'), resolve(distBinDir, 'cli.js'));
fs.chmodSync(resolve(distBinDir, 'cli.js'), '755');

// Find all TypeScript files
const entryPoints = await glob(`${srcDir}/**/*.ts`);

// Bundle and minify
await esbuild.build({
  entryPoints,
  outdir: resolve(distDir, 'src'),
  bundle: false, // Don't bundle since we're processing each file separately
  minify: true,  // Minify for smaller file size
  platform: 'node',
  target: 'node16',
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
});

console.log('Build completed successfully!');
