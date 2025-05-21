// Simple test script for the MCP server with the timeout fix
import { createServer, startServer } from './dist/src/index.js';
import { randomUUID } from 'crypto';
import { ApiRequestError } from './dist/src/errors.js';

// Configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY || '';
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';

if (!API_KEY) {
  console.error('Error: DIGITAL_SAMBA_API_KEY environment variable must be set');
  process.exit(1);
}

// Set up logging to file
const log = (message) => {
  if (typeof message === 'object') {
    message = JSON.stringify(message, null, 2);
  }
  console.log(`${new Date().toISOString()} - ${message}`);
};

// Create the server
log('Creating server with timeout fix...');
const serverConfig = createServer({
  port: 4001, // Use a different port for testing
  apiUrl: API_URL,
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 3,
  circuitBreakerResetTimeout: 30000,
  enableGracefulDegradation: true,
  gracefulDegradationMaxRetries: 3,
  gracefulDegradationInitialDelay: 1000
});

// Test API connection directly
const testApiConnection = async () => {
  try {
    log('Testing API connection directly...');
    const { server, port, apiUrl } = serverConfig;
    
    // Generate a unique room name for testing
    const testRoomName = `test-room-${randomUUID().substring(0, 8)}`;
    
    // Create API client with API key
    const createClient = async () => {
      const { DigitalSambaApiClient } = await import('./dist/src/digital-samba-api.js');
      return new DigitalSambaApiClient(API_KEY, apiUrl);
    };
    
    // Test creating a room
    log('Creating test room...');
    const client = await createClient();
    const start = Date.now();
    
    try {
      const room = await client.createRoom({
        name: testRoomName,
        privacy: 'public'
      });
      
      const duration = Date.now() - start;
      log(`Room created successfully in ${duration}ms: ${room.id}`);
      
      // Delete the test room
      log('Deleting test room...');
      await client.deleteRoom(room.id);
      log('Test room deleted');
      
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      log(`Error creating room after ${duration}ms: ${error.message}`);
      if (error instanceof ApiRequestError) {
        log('API Request Error:');
        log(error);
      } else {
        log('Error stack:');
        log(error.stack);
      }
      return false;
    }
  } catch (error) {
    log(`Error testing API connection: ${error.message}`);
    log(error.stack);
    return false;
  }
};

// Run tests
const runTests = async () => {
  log('Starting API connection test');
  
  // Test API connection
  const apiConnectionSuccessful = await testApiConnection();
  
  if (apiConnectionSuccessful) {
    log('SUCCESS: API connection test passed!');
  } else {
    log('FAILURE: API connection test failed');
    process.exit(1);
  }
  
  log('All tests complete');
  process.exit(0);
};

// Run tests after a short delay to allow server to initialize
setTimeout(runTests, 1000);
