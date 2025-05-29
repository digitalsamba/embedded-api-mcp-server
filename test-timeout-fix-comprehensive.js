/**
 * Comprehensive Timeout Test for Digital Samba MCP Server
 * 
 * This script performs a full test of the initialization process
 * with the enhanced timeout handling.
 */

import { createServer, startServer } from './dist/src/index.js';
import fetch from 'node-fetch';

// Configuration
const PORT = 5672; // Use specified port 5672
const API_KEY = process.argv[2] || process.env.DIGITAL_SAMBA_API_KEY;
const TIMEOUT = 120000; // 2 minutes timeout for the entire test
const RETRY_INTERVAL = 2000; // 2 seconds between health check attempts
const MAX_RETRIES = 30; // Maximum number of health check retries

// Validation
if (!API_KEY) {
  console.error('API key is required. Please provide it as a command-line argument or set the DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

console.log('Starting comprehensive timeout test...');
console.log(`Using port: ${PORT}`);
console.log(`API key length: ${API_KEY.length}`);
console.log(`Test timeout: ${TIMEOUT / 1000} seconds`);

// Set up test timeout
const testTimeout = setTimeout(() => {
  console.error('Test timed out after', TIMEOUT / 1000, 'seconds');
  process.exit(1);
}, TIMEOUT);

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check server health
async function checkServerHealth(retryCount = 0) {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('Server health check successful:', data);
      return true;
    } else {
      console.warn(`Health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Health check attempt ${retryCount + 1}/${MAX_RETRIES} failed, retrying in ${RETRY_INTERVAL / 1000} seconds...`);
      await delay(RETRY_INTERVAL);
      return checkServerHealth(retryCount + 1);
    } else {
      console.error('Maximum health check retries reached, server might not be running properly');
      return false;
    }
  }
}

// Main test function
async function runTest() {
  console.log('Starting server with enhanced timeout settings...');
  
  try {
    // Start the server with enhanced debugging
    const server = startServer({
      port: PORT,
      enableCircuitBreaker: true,
      circuitBreakerFailureThreshold: 3,
      circuitBreakerResetTimeout: 30000,
      initialRequestTimeout: 90000, // 90 seconds
      debugTimeouts: true,
      debugInitialization: true,
      logLevel: 'debug', // Set logging level to debug
      apiKey: API_KEY
    });
    
    console.log('Server started, waiting for it to be fully initialized...');
    
    // Wait for the server to be fully initialized
    await delay(5000);
    
    // Check server health
    console.log('Performing health check...');
    const isHealthy = await checkServerHealth();
    
    if (isHealthy) {
      console.log('✅ TEST PASSED: Server initialized successfully within the timeout period');
      
      // Test basic API functionality
      console.log('Testing API functionality...');
      try {
        const response = await fetch(`http://localhost:${PORT}/health/system`);
        if (response.ok) {
          const data = await response.json();
          console.log('System health check successful:');
          console.log('Status:', data.status);
          console.log('Degradation:', data.degradation.overall);
          console.log('Features:', JSON.stringify(data.features, null, 2));
          console.log('✅ API functionality test passed');
        } else {
          console.warn('⚠️ API functionality test returned non-OK status:', response.status);
        }
      } catch (error) {
        console.error('❌ API functionality test failed:', error.message);
      }
    } else {
      console.error('❌ TEST FAILED: Server did not initialize properly within the timeout period');
      process.exit(1);
    }
    
    // Clean up and exit
    console.log('Test completed successfully.');
    clearTimeout(testTimeout);
    
    // Keep the server running for manual testing
    console.log('Server is running on port', PORT);
    console.log('Press Ctrl+C to exit');
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error);
    clearTimeout(testTimeout);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error in test:', error);
  clearTimeout(testTimeout);
  process.exit(1);
});
