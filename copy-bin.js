import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function copyBinFiles() {
  try {
    // Create dist/bin directory if it doesn't exist
    const distBinDir = join(__dirname, 'dist', 'bin');
    await fs.mkdir(distBinDir, { recursive: true });
    
    // Copy cli.js to the dist/bin directory
    const sourceFile = join(__dirname, 'bin', 'cli.js');
    const destFile = join(distBinDir, 'cli.js');
    
    await fs.copyFile(sourceFile, destFile);
    console.log('Successfully copied bin files to dist/bin');
  } catch (error) {
    console.error('Error copying bin files:', error);
    process.exit(1);
  }
}

copyBinFiles();
