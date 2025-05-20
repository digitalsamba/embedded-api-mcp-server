/**
 * Digital Samba Resilient API Integration Test
 * 
 * This script tests the integration of the resilient API client with the Digital Samba API.
 * It demonstrates how the circuit breaker pattern and graceful degradation work together
 * to provide comprehensive resilience for API operations.
 * 
 * Features tested:
 * - Circuit breaker opening and closing
 * - Graceful degradation with fallbacks
 * - Caching of API responses
 * - Health monitoring and metrics
 */

// Import the Digital Samba resilient API client
import { ResilientApiClient } from '../src/digital-samba-api-resilient.js';
import { MemoryCache } from '../src/cache.js';
import { gracefulDegradation, ServiceHealthStatus } from '../src/graceful-degradation.js';
import logger from '../src/logger.js';

// Set up logging
logger.level = 'debug';
console.log = (...args) => {
  logger.info(...args);
  process.stdout.write(args.join(' ') + '\n');
};

// Mock API for testing
class MockDigitalSambaApi {
  private failNextRequests = false;
  private failureCount = 0;
  private maxFailures = 0;
  
  constructor() {
    console.log('MockDigitalSambaApi created');
  }
  
  // Set failure mode
  setFailMode(shouldFail: boolean, maxFailures = Infinity) {
    this.failNextRequests = shouldFail;
    this.failureCount = 0;
    this.maxFailures = maxFailures;
    console.log(`Failure mode set to: ${shouldFail}, max failures: ${maxFailures}`);
  }
  
  // Reset failure mode
  resetFailMode() {
    this.failNextRequests = false;
    this.failureCount = 0;
    console.log('Failure mode reset');
  }
  
  // Mock API methods
  async listRooms() {
    console.log('MockDigitalSambaApi.listRooms called');
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for listRooms (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - listRooms');
    }
    
    return {
      data: [
        { id: 'room1', name: 'Test Room 1' },
        { id: 'room2', name: 'Test Room 2' }
      ],
      total_count: 2,
      length: 2,
      map: function(callback) { return this.data.map(callback); }
    };
  }
  
  async getRoom(roomId) {
    console.log(`MockDigitalSambaApi.getRoom called with ID: ${roomId}`);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for getRoom (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - getRoom');
    }
    
    return {
      id: roomId,
      name: `Room ${roomId}`,
      description: 'Test room description',
      privacy: 'public',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  async createRoom(settings) {
    console.log(`MockDigitalSambaApi.createRoom called with settings:`, settings);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for createRoom (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - createRoom');
    }
    
    return {
      id: 'new-room-id',
      name: settings.name || 'New Room',
      description: settings.description || '',
      privacy: settings.privacy || 'public',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  async updateRoom(roomId, settings) {
    console.log(`MockDigitalSambaApi.updateRoom called with ID: ${roomId}`, settings);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for updateRoom (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - updateRoom');
    }
    
    return {
      id: roomId,
      name: settings.name || `Updated Room ${roomId}`,
      description: settings.description || '',
      privacy: settings.privacy || 'public',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  async deleteRoom(roomId) {
    console.log(`MockDigitalSambaApi.deleteRoom called with ID: ${roomId}`);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for deleteRoom (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - deleteRoom');
    }
    
    return {};
  }
  
  async generateRoomToken(roomId, options) {
    console.log(`MockDigitalSambaApi.generateRoomToken called with ID: ${roomId}`, options);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for generateRoomToken (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - generateRoomToken');
    }
    
    return {
      token: 'mock-token-123',
      link: `https://example.com/rooms/${roomId}?token=mock-token-123`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
  }
}

// Run test scenarios
async function runTests() {
  console.log('Starting Digital Samba resilient API integration test...');
  
  // Create a shared cache instance
  const cache = new MemoryCache({
    ttl: 300000, // 5 minutes
    maxItems: 100,
    useEtag: true
  });
  
  // Create a mock API client
  const mockApi = new MockDigitalSambaApi();
  
  // Create the resilient API client
  const resilientApi = new ResilientApiClient(
    mockApi as any, // Type cast for test
    {
      cache,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 5000, // Short for testing
        successThreshold: 2
      },
      gracefulDegradation: {
        maxRetryAttempts: 2,
        initialRetryDelay: 500, // Short for testing
        retryBackoffFactor: 2,
        maxRetryDelay: 5000
      },
      fallbacks: {
        // Custom fallback for getRoom
        getRoom: {
          fallbackFn: async () => ({
            id: 'fallback-room',
            name: 'Fallback Room',
            description: 'This is a fallback room when the API is down',
            privacy: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
          isCritical: true,
          cacheTTL: 300000 // 5 minutes
        }
      }
    }
  );
  
  // Add a separator for cleaner logs
  function separator(title) {
    console.log('\n' + '='.repeat(80));
    console.log(`TEST SCENARIO: ${title}`);
    console.log('='.repeat(80) + '\n');
  }
  
  try {
    // Scenario 1: Normal operation
    separator('Normal operation - all services healthy');
    console.log('Executing API operations in normal mode...');
    
    const normalListRoomsResult = await resilientApi.listRooms();
    console.log('ListRooms result:', normalListRoomsResult);
    console.assert(normalListRoomsResult.isDegraded === false, 'Expected non-degraded result');
    console.assert(normalListRoomsResult.source === 'primary', 'Expected primary source');
    
    const normalGetRoomResult = await resilientApi.getRoom('room1');
    console.log('GetRoom result:', normalGetRoomResult);
    console.assert(normalGetRoomResult.isDegraded === false, 'Expected non-degraded result');
    console.assert(normalGetRoomResult.source === 'primary', 'Expected primary source');
    
    // Scenario 2: Cached responses
    separator('Cached responses - operation should use cache the second time');
    console.log('Executing API operation to populate cache...');
    await resilientApi.getRoom('room2');
    
    console.log('Executing same operation again (should use cache)...');
    const cachedResult = await resilientApi.getRoom('room2');
    console.log('GetRoom result (should be from cache):', cachedResult);
    console.assert(cachedResult.source === 'cache', 'Expected source to be cache');
    
    // Scenario 3: Temporary failures with retry
    separator('Temporary failures with retry (single failure)');
    console.log('Setting API to fail once...');
    mockApi.setFailMode(true, 1);
    
    console.log('Executing API operation with temporary failure...');
    const retryResult = await resilientApi.listRooms();
    console.log('ListRooms result after retry:', retryResult);
    console.assert(retryResult.isDegraded === false, 'Expected non-degraded result after retry');
    
    mockApi.resetFailMode();
    
    // Scenario 4: Circuit breaker activation
    separator('Circuit breaker activation (repeated failures)');
    console.log('Setting API to fail repeatedly...');
    mockApi.setFailMode(true, 5);
    
    console.log('Executing operations until circuit breaker opens...');
    for (let i = 0; i < 4; i++) {
      try {
        console.log(`\nAttempt ${i + 1}:`);
        const result = await resilientApi.getRoom('test');
        console.log('Result:', result);
      } catch (error) {
        console.log('Error:', error.message);
      }
    }
    
    // Scenario 5: Fallback activation
    separator('Fallback activation (circuit open)');
    console.log('Executing API operation with open circuit...');
    try {
      const fallbackResult = await resilientApi.getRoom('test');
      console.log('GetRoom result with fallback:', fallbackResult);
      console.assert(fallbackResult.isDegraded === true, 'Expected degraded result');
      console.assert(fallbackResult.source === 'fallback', 'Expected fallback source');
    } catch (error) {
      console.log('Unexpected error with fallback:', error.message);
    }
    
    // Check system health
    separator('System health after failures');
    const healthStatus = resilientApi.getSystemHealth();
    console.log('Overall system health:', healthStatus.overall);
    console.log('Component health:');
    healthStatus.components.forEach(component => {
      console.log(`- ${component.name}: ${component.status}, errors: ${component.errorCount}`);
    });
    
    // Scenario 6: Recovery
    separator('Recovery from failures');
    console.log('Resetting API failure mode...');
    mockApi.resetFailMode();
    
    console.log('Waiting for circuit breaker reset timeout...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('Executing API operation after reset timeout...');
    const recoveryResult = await resilientApi.getRoom('recovered');
    console.log('GetRoom result after recovery:', recoveryResult);
    
    // Final health check
    separator('Final system health check');
    const finalHealth = resilientApi.getSystemHealth();
    console.log('Overall system health:', finalHealth.overall);
    console.log('Component health:');
    finalHealth.components.forEach(component => {
      console.log(`- ${component.name}: ${component.status}, errors: ${component.errorCount}`);
    });
    
    separator('All tests completed');
    console.log('Resilient API integration test completed successfully!');
  } catch (error) {
    console.error('Test failure:', error);
  } finally {
    // Clean up
    gracefulDegradation.dispose();
  }
}

// Start tests
runTests();
