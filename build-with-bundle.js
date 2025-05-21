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

// Build individual files without bundling
console.log("Building TypeScript files without bundling...");
const entryPoints = await glob(`${srcDir}/**/*.ts`);

// Build non-bundled version (just compiled TypeScript)
await esbuild.build({
  entryPoints,
  outdir: resolve(distDir, 'src'),
  bundle: false,
  minify: true,
  platform: 'node',
  target: 'node16',
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
});

// Build also a bundled version as an additional option
console.log("Building bundled version of index...");
await esbuild.build({
  entryPoints: [resolve(srcDir, 'index.ts')],
  outfile: resolve(distDir, 'bundle.js'),
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node16',
  format: 'esm',
  sourcemap: true,
  external, // Use external here since we're bundling
  logLevel: 'info',
});

console.log('Build completed successfully!');
