#!/usr/bin/env node

/**
 * Debug Server Connection Utility for Digital Samba MCP Server
 * 
 * This utility helps troubleshoot connection issues with the Digital Samba MCP Server.
 * It checks various server endpoints and provides detailed diagnostics.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Constants
const PORT = process.env.PORT || 4521;
const LOG_FILE = path.join(process.cwd(), 'server-debug.log');
const CHECK_ENDPOINTS = [
  { path: '/health', method: 'GET', name: 'Health Endpoint' },
  { path: '/', method: 'GET', name: 'Root Endpoint' },
  { path: '/health/system', method: 'GET', name: 'System Health Endpoint' },
  { path: '/metrics', method: 'GET', name: 'Metrics Endpoint' }
];
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

// Setup logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
};

// Clear log file on startup
fs.writeFileSync(LOG_FILE, '');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function for HTTP requests
const httpRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
};

// Check if a port is in use
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
};

// Check server endpoints
const checkEndpoint = async (endpoint, retryCount = 0) => {
  try {
    log(`Checking ${endpoint.name} (${endpoint.method} ${endpoint.path})...`);
    
    const response = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: endpoint.path,
      method: endpoint.method
    });
    
    log(`${endpoint.name} responded with status ${response.statusCode}`);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`${colors.green}✓ ${endpoint.name} is accessible (${response.statusCode})${colors.reset}`);
      
      // Try to parse JSON response
      try {
        const jsonData = JSON.parse(response.data);
        log(`Response data: ${JSON.stringify(jsonData, null, 2)}`);
      } catch (parseError) {
        log(`Response is not JSON: ${response.data.substring(0, 200)}${response.data.length > 200 ? '...' : ''}`);
      }
      
      return true;
    } else {
      console.log(`${colors.yellow}⚠ ${endpoint.name} returned status ${response.statusCode}${colors.reset}`);
      log(`Response data: ${response.data}`);
      return false;
    }
  } catch (error) {
    log(`Error checking ${endpoint.name}: ${error.message}`);
    console.log(`${colors.red}✗ ${endpoint.name} is not accessible: ${error.message}${colors.reset}`);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`${colors.yellow}Retrying in ${RETRY_DELAY / 1000} seconds... (${retryCount + 1}/${MAX_RETRIES})${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return checkEndpoint(endpoint, retryCount + 1);
    }
    
    return false;
  }
};

// Check if server is running
const checkServerRunning = async () => {
  const portInUse = await isPortInUse(PORT);
  
  if (portInUse) {
    console.log(`${colors.green}✓ Port ${PORT} is in use. Server might be running.${colors.reset}`);
    log(`Port ${PORT} is in use.`);
    return true;
  } else {
    console.log(`${colors.red}✗ Port ${PORT} is not in use. Server is not running.${colors.reset}`);
    log(`Port ${PORT} is not in use.`);
    return false;
  }
};

// Get running processes
const getRunningProcesses = async () => {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'tasklist' : 'ps';
    const args = isWindows ? [] : ['aux'];
    
    log(`Getting running processes with command: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args);
    let output = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      log(`Error fetching processes: ${data.toString()}`);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
};

// Find node processes
const findServerProcesses = async () => {
  try {
    const processes = await getRunningProcesses();
    const nodeProcessLines = processes.split('\n').filter(line => 
      line.includes('node') || 
      line.includes('digital-samba-mcp') || 
      line.includes('mcp-server')
    );
    
    log(`Found ${nodeProcessLines.length} potential server processes`);
    
    if (nodeProcessLines.length > 0) {
      console.log(`\n${colors.cyan}Potential server processes:${colors.reset}`);
      nodeProcessLines.forEach(line => {
        console.log(`  ${line.trim()}`);
      });
    } else {
      console.log(`${colors.yellow}No node processes found that might be running the server.${colors.reset}`);
    }
    
    return nodeProcessLines;
  } catch (error) {
    log(`Error finding server processes: ${error.message}`);
    console.log(`${colors.red}Error finding server processes: ${error.message}${colors.reset}`);
    return [];
  }
};

// Main function
const main = async () => {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║  Digital Samba MCP Server Connection Diagnostics  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);
  
  log('Starting server connection diagnostics');
  log(`Server port: ${PORT}`);
  
  // Check if server is running
  console.log(`\n${colors.cyan}Checking if server is running...${colors.reset}`);
  const serverRunning = await checkServerRunning();
  
  // Check endpoints
  if (serverRunning) {
    console.log(`\n${colors.cyan}Checking server endpoints...${colors.reset}`);
    const results = await Promise.all(CHECK_ENDPOINTS.map(endpoint => checkEndpoint(endpoint)));
    const accessibleCount = results.filter(Boolean).length;
    
    if (accessibleCount === CHECK_ENDPOINTS.length) {
      console.log(`\n${colors.green}${colors.bright}All endpoints are accessible! The server appears to be running correctly.${colors.reset}`);
    } else if (accessibleCount > 0) {
      console.log(`\n${colors.yellow}${colors.bright}Some endpoints are accessible (${accessibleCount}/${CHECK_ENDPOINTS.length}). The server may be partially functional.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}${colors.bright}No endpoints are accessible. The server is not responding correctly.${colors.reset}`);
    }
  }
  
  // Find server processes
  console.log(`\n${colors.cyan}Looking for server processes...${colors.reset}`);
  await findServerProcesses();
  
  console.log(`\n${colors.cyan}Test MCP connection...${colors.reset}`);
  console.log(`To test the MCP connection, you can use the following command:`);
  console.log(`${colors.yellow}  npx @modelcontextprotocol/inspector --url http://localhost:${PORT}/mcp${colors.reset}`);
  
  console.log(`\n${colors.cyan}Diagnostics complete!${colors.reset}`);
  console.log(`Logs have been saved to: ${colors.bright}${LOG_FILE}${colors.reset}`);
}

// Run the main function
main().catch(error => {
  log(`Error running diagnostics: ${error.message}`);
  console.error(`${colors.red}Error running diagnostics: ${error.message}${colors.reset}`);
});
