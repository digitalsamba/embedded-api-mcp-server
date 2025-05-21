/**
 * Debug Timeout Issues in Digital Samba MCP Server
 * 
 * This script helps debug timeout issues during initialization.
 * It increases logging and focuses on the initialization process.
 */

// Force environment setup
process.env.NODE_ENV = 'development';
process.env.ENABLE_CIRCUIT_BREAKER = 'true';
process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '3';
process.env.CIRCUIT_BREAKER_RESET_TIMEOUT = '30000';
process.env.INITIAL_REQUEST_TIMEOUT = '90000'; // Try with even longer timeout (90 seconds)
process.env.DEBUG_TIMEOUTS = 'true';
process.env.DEBUG_INITIALIZATION = 'true';

// Import the server (using ESM syntax)
import { createServer, startServer } from './dist/src/index.js';

// The API key can be provided as a command-line argument
const apiKey = process.argv[2] || process.env.DIGITAL_SAMBA_API_KEY;

if (!apiKey) {
  console.error('API key is required. Please provide it as a command-line argument or set DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

console.log('Starting debug server with API key:', apiKey);

// Start the server with extra options for timeout debugging
const server = startServer({
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 3,
  circuitBreakerResetTimeout: 30000,
  // Increase the initial request timeout to give more time for startup
  initialRequestTimeout: 90000, // 90 seconds
  // Add additional debug options
  debugTimeouts: true,
  debugInitialization: true,
  // Provide the API key directly
  apiKey: apiKey
});

console.log('Debug server started successfully. Press Ctrl+C to stop.');
