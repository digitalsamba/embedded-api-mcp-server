/**
 * Enhanced API Features Test Script
 * 
 * This script tests the new features added to the Digital Samba MCP Server:
 * - Token refresh mechanism
 * - Connection keepalive and reconnection
 * - Resource optimization for high-traffic scenarios
 * 
 * Usage: npm run test:enhanced-features
 */

// Node.js built-in modules
import { setTimeout as sleep } from 'timers/promises';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import enhanced API client
import { EnhancedDigitalSambaApiClient } from '../src/digital-samba-api-enhanced.js';
import { MemoryCache } from '../src/cache.js';

// Test configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';

if (!API_KEY) {
  console.error('Error: DIGITAL_SAMBA_API_KEY is required. Please set it in the .env file.');
  process.exit(1);
}

// Create memory cache
const cache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxItems: 100
});

// Create enhanced API client
const client = new EnhancedDigitalSambaApiClient(
  API_KEY,
  API_URL,
  cache,
  {
    enableConnectionManagement: true,
    enableTokenManagement: true,
    enableResourceOptimization: true,
    connectionPoolSize: 3
  }
);

/**
 * Test token refresh mechanism
 */
async function testTokenRefresh() {
  console.log('\n--- Testing Token Refresh Mechanism ---');
  
  // Create a test room
  console.log('\nCreating test room...');
  const roomResponse = await client.createRoom({
    name: `Test Room ${new Date().toISOString()}`,
    privacy: 'private'
  });
  
  const roomId = roomResponse.id;
  console.log(`Created room with ID: ${roomId}`);
  
  // Create token manager
  const sessionId = 'test-session-1';
  const tokenManager = client.createTokenManager(roomId, sessionId, {
    u: 'Test User',
    exp: '5' // Short expiration (5 minutes) for testing
  });
  
  // Generate token with auto-refresh
  console.log('\nGenerating room token with auto-refresh...');
  const tokenResponse = await client.generateRoomTokenWithRefresh(roomId, {
    u: 'Test User',
    exp: '5' // 5 minutes
  }, sessionId);
  
  console.log(`Generated token with expiration: ${tokenResponse.expiresAt}`);
  
  // Display token manager stats
  const stats = client.getStats();
  console.log('\nToken Manager Stats:');
  console.log(JSON.stringify(stats.tokenManagers, null, 2));
  
  // Log token events
  tokenManager.on('token:refreshing', (data) => {
    console.log(`\nToken refresh started: ${JSON.stringify(data)}`);
  });
  
  tokenManager.on('token:refreshed', (data) => {
    console.log(`Token refreshed: ${JSON.stringify(data)}`);
  });
  
  // Clean up
  console.log('\nCleaning up test room...');
  await client.deleteRoom(roomId);
  console.log(`Deleted room: ${roomId}`);
  
  console.log('\n--- Token Refresh Test Completed ---');
}

/**
 * Test connection management
 */
async function testConnectionManagement() {
  console.log('\n--- Testing Connection Management ---');
  
  // Get connection stats
  const statsInitial = client.getStats();
  console.log('\nInitial Connection Stats:');
  console.log(JSON.stringify(statsInitial.connectionManager, null, 2));
  
  // Make parallel requests to test connection pooling
  console.log('\nMaking parallel requests to test connection pooling...');
  const promises = Array.from({ length: 10 }).map((_, i) =>
    client.listRooms({ limit: 5 }).then(result => {
      console.log(`Request ${i + 1} completed, found ${result.data.length} rooms`);
      return result;
    })
  );
  
  await Promise.all(promises);
  
  // Check connection stats after requests
  const statsAfter = client.getStats();
  console.log('\nConnection Stats After Requests:');
  console.log(JSON.stringify(statsAfter.connectionManager, null, 2));
  
  // Check connection health
  const isHealthy = client.isHealthy();
  console.log(`\nConnection Health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
  
  console.log('\n--- Connection Management Test Completed ---');
}

/**
 * Test resource optimization
 */
async function testResourceOptimization() {
  console.log('\n--- Testing Resource Optimization ---');
  
  // Test incremental loading
  console.log('\nTesting incremental data loading...');
  
  // Create a data loader function that simulates pagination
  const dataLoader = async (page: number, pageSize: number) => {
    console.log(`Loading page ${page} with size ${pageSize}...`);
    
    // List rooms with pagination
    const response = await client.listRooms({
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    
    return {
      data: response.data,
      total: Number(response.total_count) || response.data.length
    };
  };
  
  try {
    // Load data incrementally
    const rooms = await client.loadIncrementally(dataLoader, 5, 3);
    console.log(`\nLoaded ${rooms.length} rooms incrementally`);
  } catch (error) {
    console.error('Error during incremental loading:', error);
  }
  
  // Check resource optimizer stats
  const stats = client.getStats();
  console.log('\nResource Optimizer Stats:');
  console.log(JSON.stringify(stats.resourceOptimizer, null, 2));
  
  console.log('\n--- Resource Optimization Test Completed ---');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('=== Starting Enhanced Features Tests ===\n');
    
    // Run token refresh test
    await testTokenRefresh();
    
    // Wait a moment between tests
    await sleep(1000);
    
    // Run connection management test
    await testConnectionManagement();
    
    // Wait a moment between tests
    await sleep(1000);
    
    // Run resource optimization test
    await testResourceOptimization();
    
    console.log('\n=== All Tests Completed ===');
  } catch (error) {
    console.error('Error during tests:', error);
  } finally {
    // Clean up resources
    client.destroy();
    process.exit(0);
  }
}

// Run tests
runTests();
