import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary package for size checking
console.log('Creating temporary package for size analysis...');
execSync('npm pack', { stdio: 'inherit' });

// Get the package name
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
// For scoped packages, npm pack replaces @ and / with -
const tarballName = packageJson.name.startsWith('@') 
  ? `${packageJson.name.substring(1).replace('/', '-')}-${packageJson.version}.tgz`
  : `${packageJson.name}-${packageJson.version}.tgz`;

// Get the file stats
const stats = fs.statSync(tarballName);

// Convert bytes to human-readable format
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Display the package size
console.log(`Package size: ${formatSize(stats.size)}`);

// Check if package size is reasonable (less than 5MB)
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
if (stats.size > MAX_SIZE) {
  console.warn(`\n⚠️ WARNING: Package size (${formatSize(stats.size)}) exceeds recommended limit of ${formatSize(MAX_SIZE)}`);
  console.log('Consider optimizing the package size by:');
  console.log('- Ensuring dev dependencies are not included');
  console.log('- Checking that test files are excluded');
  console.log('- Verifying .npmignore excludes unnecessary files');
  console.log('- Using smaller dependencies or moving some to peer dependencies');
} else {
  console.log(`✅ Package size is within acceptable limits (< ${formatSize(MAX_SIZE)})`);
}

// Display the package contents (top-level only)
console.log('\nPackage contents (top-level directories):');
const output = execSync(`tar -tf ${tarballName} | grep -v "/" | sort`).toString();
console.log(output);

// Count files by type
console.log('File type breakdown:');
const allFiles = execSync(`tar -tf ${tarballName}`).toString().split('\n').filter(Boolean);

const extensions = {};
allFiles.forEach(file => {
  const ext = path.extname(file);
  if (ext) {
    extensions[ext] = (extensions[ext] || 0) + 1;
  }
});

// Sort extensions by count
const sortedExtensions = Object.entries(extensions)
  .sort((a, b) => b[1] - a[1])
  .map(([ext, count]) => `${ext}: ${count} files`);

console.log(sortedExtensions.join('\n'));

// Clean up the temporary package
console.log('\nCleaning up...');
fs.unlinkSync(tarballName);
console.log('Done!');
