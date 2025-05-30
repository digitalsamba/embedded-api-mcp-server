import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function copyBinFiles() {
  try {
    // Create dist/bin directory if it doesn't exist
    const distBinDir = join(projectRoot, 'dist', 'bin');
    await fs.mkdir(distBinDir, { recursive: true });
    
    // Copy cli.js to the dist/bin directory
    const sourceFile = join(projectRoot, 'bin', 'cli.js');
    const destFile = join(distBinDir, 'cli.js');
    
    await fs.copyFile(sourceFile, destFile);
    
    // Set executable permission on Unix systems
    try {
      const stat = await fs.stat(destFile);
      // Add executable permission (stat.mode | 0o111)
      await fs.chmod(destFile, stat.mode | 0o111);
      console.log('Successfully set executable permissions on cli.js');
    } catch (permError) {
      // On Windows this might fail, which is OK
      console.log('Note: Could not set executable permissions (likely on Windows)');
    }
    
    console.log('Successfully copied bin files to dist/bin');
  } catch (error) {
    console.error('Error copying bin files:', error);
    process.exit(1);
  }
}

copyBinFiles();
