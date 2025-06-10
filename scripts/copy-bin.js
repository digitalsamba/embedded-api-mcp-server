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
    
    // List of bin files to copy
    const binFiles = ['cli.js'];
    
    for (const file of binFiles) {
      const sourceFile = join(projectRoot, 'bin', file);
      const destFile = join(distBinDir, file);
      
      // Check if source file exists
      try {
        await fs.access(sourceFile);
      } catch {
        console.log(`Skipping ${file} - file does not exist`);
        continue;
      }
      
      await fs.copyFile(sourceFile, destFile);
      
      // Set executable permission on Unix systems
      try {
        const stat = await fs.stat(destFile);
        // Add executable permission (stat.mode | 0o111)
        await fs.chmod(destFile, stat.mode | 0o111);
        console.log(`Successfully set executable permissions on ${file}`);
      } catch (permError) {
        // On Windows this might fail, which is OK
        console.log(`Note: Could not set executable permissions on ${file} (likely on Windows)`);
      }
    }
    
    console.log('Successfully copied bin files to dist/bin');
  } catch (error) {
    console.error('Error copying bin files:', error);
    process.exit(1);
  }
}

copyBinFiles();
