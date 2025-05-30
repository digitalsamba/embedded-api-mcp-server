import { fileURLToPath } from 'url';

console.log('Current file:', import.meta.url);
console.log('Process.argv[1]:', process.argv[1]);
console.log('File URL:', `file://${process.argv[1]}`);
console.log('Condition:', import.meta.url === `file://${process.argv[1]}`);
