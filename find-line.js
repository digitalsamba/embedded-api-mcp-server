import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const filePath = path.join(__dirname, 'src', 'index.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = fileContent.split('\n');

// Print the specific lines
console.log('Line 113:', lines[112]);
console.log('Line 161:', lines[160]);
