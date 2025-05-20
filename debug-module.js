import { fileURLToPath } from 'url';
import path from 'path';

// Print debug information about the current module
console.log('Debug information for module initialization:');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('File URL of process.argv[1]:', process.argv[1] ? `file://${process.argv[1]}` : 'N/A');
console.log('__filename:', fileURLToPath(import.meta.url));
console.log('Condition check:', import.meta.url === `file://${process.argv[1]}`);

// Print environment details
console.log('\nEnvironment information:');
console.log('Node.js version:', process.version);
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('PORT:', process.env.PORT);
console.log('DIGITAL_SAMBA_API_URL:', process.env.DIGITAL_SAMBA_API_URL);

console.log('\nArgs and execution context:');
console.log('process.argv:', process.argv);
