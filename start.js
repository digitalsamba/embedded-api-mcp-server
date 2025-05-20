/**
 * Digital Samba MCP Server Setup Script
 * 
 * This script helps with the initial setup of the Digital Samba MCP Server.
 * It checks for dependencies and provides guidance on getting started.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║        Digital Samba MCP Server Setup             ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

// Check Node.js version
console.log(`${colors.cyan}Checking Node.js version...${colors.reset}`);
try {
  const nodeVersion = process.version;
  const versionNum = Number(nodeVersion.replace('v', '').split('.')[0]);
  
  if (versionNum < 18) {
    console.log(`${colors.red}Error: Node.js version ${nodeVersion} is not supported.${colors.reset}`);
    console.log(`This project requires Node.js 18 or higher. Please upgrade your Node.js installation.`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ Node.js ${nodeVersion} is supported.${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}Error checking Node.js version: ${error}${colors.reset}`);
  process.exit(1);
}

// Check if package.json exists
console.log(`${colors.cyan}Checking project files...${colors.reset}`);
try {
  if (fs.existsSync('./package.json')) {
    console.log(`${colors.green}✓ package.json found.${colors.reset}`);
  } else {
    console.log(`${colors.red}Error: package.json not found.${colors.reset}`);
    console.log(`Make sure you're running this script from the project root directory.`);
    process.exit(1);
  }
} catch (error) {
  console.log(`${colors.red}Error checking project files: ${error}${colors.reset}`);
  process.exit(1);
}

// Check if node_modules exists, install if not
console.log(`${colors.cyan}Checking dependencies...${colors.reset}`);
try {
  if (!fs.existsSync('./node_modules')) {
    console.log(`${colors.yellow}node_modules not found. Installing dependencies...${colors.reset}`);
    execSync('npm install', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Dependencies installed successfully.${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ node_modules found.${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}Error installing dependencies: ${error}${colors.reset}`);
  process.exit(1);
}

// Check TypeScript installation
console.log(`${colors.cyan}Checking TypeScript...${colors.reset}`);
try {
  execSync('npx tsc --version', { stdio: 'pipe' });
  console.log(`${colors.green}✓ TypeScript is installed.${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}Error: TypeScript is not properly installed.${colors.reset}`);
  console.log(`Trying to install TypeScript...`);
  try {
    execSync('npm install typescript --save-dev', { stdio: 'inherit' });
    console.log(`${colors.green}✓ TypeScript installed successfully.${colors.reset}`);
  } catch (installError) {
    console.log(`${colors.red}Error installing TypeScript: ${installError}${colors.reset}`);
    process.exit(1);
  }
}

// Create dist directory if it doesn't exist
console.log(`${colors.cyan}Setting up build directory...${colors.reset}`);
try {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist');
    console.log(`${colors.green}✓ Created dist directory.${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ dist directory exists.${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}Error setting up build directory: ${error}${colors.reset}`);
}

// Print success message and instructions
console.log(`${colors.bright}${colors.green}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║           Setup completed successfully!           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.bright}Next steps:${colors.reset}`);
console.log(`
1. Build the project:
   ${colors.yellow}npm run build${colors.reset}

2. Start the server in development mode:
   ${colors.yellow}npm run dev${colors.reset}
   or use the run.bat script

3. Test your server with the MCP Inspector or an MCP client

For more information, see the README.md file.

${colors.dim}Digital Samba MCP Server is now ready for use.${colors.reset}
`);
