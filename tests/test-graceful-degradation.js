/**
 * Test script for the graceful degradation functionality
 * 
 * This script tests the graceful degradation implementation by:
 * 1. Creating a mocked Digital Samba API client
 * 2. Registering fallbacks for critical operations
 * 3. Simulating partial API outages
 * 4. Verifying that fallbacks are used correctly
 * 5. Checking metrics for proper recording of events
 * 
 * The test creates different scenarios including:
 * - Component health status changes
 * - Fallback activations and deactivations
 * - Retries with exponential backoff
 * - Cache usage during degraded service
 */

// Import required modules
import { MemoryCache } from '../src/cache.js';
import { gracefulDegradation, ServiceHealthStatus } from '../src/graceful-degradation.js';
import circuitBreakerRegistry, { CircuitBreaker } from '../src/circuit-breaker.js';
import logger from '../src/logger.js';
import metricsRegistry from '../src/metrics.js';

// Configure logger for testing
logger.level = 'debug';

// Create a cache instance
const cache = new MemoryCache();

// Create test API client mock
class MockApiClient {
  private failNextRequests = false;
  private failureCount = 0;
  private maxFailures = 0;
  
  constructor() {
    console.log('MockApiClient created');
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
  
  // Mock list rooms API method
  async listRooms() {
    console.log('MockApiClient.listRooms called');
    
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
  
  // Mock get room API method
  async getRoom(roomId: string) {
    console.log(`MockApiClient.getRoom called with ID: ${roomId}`);
    
    if (this.failNextRequests && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating failure for getRoom (${this.failureCount}/${this.maxFailures})`);
      throw new Error('Simulated API failure - getRoom');
    }
    
    return {
      id: roomId,
      name: `Room ${roomId}`,
      description: 'Test room description',
      privacy: 'public' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  // Mock create room API method
  async createRoom(settings: any) {
    console.log(`MockApiClient.createRoom called with settings:`, settings);
    
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
}

// Create circuit breakers for operations
function setupCircuitBreakers() {
  console.log('Setting up circuit breakers...');
  
  const listRoomsCircuit = circuitBreakerRegistry.create({
    name: 'listRooms',
    failureThreshold: 3,
    resetTimeout: 5000, // Short timeout for testing
    successThreshold: 2
  });
  
  const getRoomCircuit = circuitBreakerRegistry.create({
    name: 'getRoom',
    failureThreshold: 3,
    resetTimeout: 5000, // Short timeout for testing
    successThreshold: 2
  });
  
  const createRoomCircuit = circuitBreakerRegistry.create({
    name: 'createRoom',
    failureThreshold: 3,
    resetTimeout: 5000, // Short timeout for testing
    successThreshold: 2
  });
  
  console.log('Circuit breakers created');
  return { listRoomsCircuit, getRoomCircuit, createRoomCircuit };
}

// Register fallbacks for operations
function registerFallbacks() {
  console.log('Registering fallbacks...');
  
  // Register a fallback for listRooms (critical operation)
  gracefulDegradation.registerFallback('listRooms', {
    fallbackFn: async () => ({
      data: [{ id: 'fallback-room', name: 'Fallback Room' }],
      total_count: 1,
      length: 1,
      map: function(callback) { return this.data.map(callback); }
    }),
    isCritical: true,
    cacheTTL: 30000 // 30 seconds
  });
  
  // Register a fallback for getRoom (non-critical operation)
  gracefulDegradation.registerFallback('getRoom', {
    fallbackFn: async () => ({
      id: 'fallback-room',
      name: 'Fallback Room',
      description: 'Fallback room description',
      privacy: 'public' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    isCritical: false,
    cacheTTL: 30000 // 30 seconds
  });
  
  // No fallback for createRoom (will fail hard)
  
  console.log('Fallbacks registered');
}

// Run test scenarios
async function runTests() {
  console.log('Starting graceful degradation tests...');
  
  // Initialize metrics
  metricsRegistry.initialize();
  
  // Create the mock API client
  const apiClient = new MockApiClient();
  
  // Set up circuit breakers
  const { listRoomsCircuit, getRoomCircuit, createRoomCircuit } = setupCircuitBreakers();
  
  // Register fallbacks
  registerFallbacks();
  
  // Helper function to execute operations with graceful degradation
  async function executeListRooms() {
    return gracefulDegradation.executeWithFallback(
      'listRooms',
      () => listRoomsCircuit.exec(() => apiClient.listRooms()),
      { cacheKey: 'listRooms', cacheTTL: 30000 }
    );
  }
  
  async function executeGetRoom(roomId: string) {
    return gracefulDegradation.executeWithFallback(
      'getRoom',
      () => getRoomCircuit.exec(() => apiClient.getRoom(roomId)),
      { cacheKey: `getRoom-${roomId}`, cacheTTL: 30000 }
    );
  }
  
  async function executeCreateRoom(settings: any) {
    return gracefulDegradation.executeWithFallback(
      'createRoom',
      () => createRoomCircuit.exec(() => apiClient.createRoom(settings)),
      { skipCache: true } // Skip cache for write operations
    );
  }
  
  // Add a separator for cleaner logs
  function separator(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`TEST SCENARIO: ${title}`);
    console.log('='.repeat(80) + '\n');
  }
  
  try {
    // Scenario 1: Normal operation
    separator('Normal operation - all services healthy');
    console.log('Executing operations in normal mode...');
    
    const normalListRoomsResult = await executeListRooms();
    console.log('ListRooms result:', normalListRoomsResult);
    console.assert(normalListRoomsResult.isDegraded === false, 'Expected non-degraded result');
    console.assert(normalListRoomsResult.source === 'primary', 'Expected primary source');
    
    const normalGetRoomResult = await executeGetRoom('room1');
    console.log('GetRoom result:', normalGetRoomResult);
    console.assert(normalGetRoomResult.isDegraded === false, 'Expected non-degraded result');
    console.assert(normalGetRoomResult.source === 'primary', 'Expected primary source');
    
    const normalCreateRoomResult = await executeCreateRoom({ name: 'Test Room' });
    console.log('CreateRoom result:', normalCreateRoomResult);
    console.assert(normalCreateRoomResult.isDegraded === false, 'Expected non-degraded result');
    console.assert(normalCreateRoomResult.source === 'primary', 'Expected primary source');
    
    // Scenario 2: Temporary failure with retry
    separator('Temporary failure with retry (single failure)');
    console.log('Setting API to fail once...');
    apiClient.setFailMode(true, 1);
    
    const retryListRoomsResult = await executeListRooms();
    console.log('ListRooms result after retry:', retryListRoomsResult);
    console.assert(retryListRoomsResult.isDegraded === false, 'Expected non-degraded result after retry');
    console.assert(retryListRoomsResult.source === 'primary', 'Expected primary source after retry');
    
    apiClient.resetFailMode();
    
    // Scenario 3: Cache fallback
    separator('Cache fallback (service is slow but cache is available)');
    console.log('Executing operation to prime the cache...');
    await executeGetRoom('room2');
    
    console.log('Setting API to fail with delay...');
    const originalExec = getRoomCircuit.exec;
    getRoomCircuit.exec = async function<T>(fn: () => Promise<T>): Promise<T> {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay
      return originalExec.call(this, fn);
    };
    
    console.log('Executing with delay but available cache...');
    const cachedGetRoomResult = await executeGetRoom('room2');
    console.log('GetRoom result from cache:', cachedGetRoomResult);
    console.assert(cachedGetRoomResult.source === 'cache', 'Expected cache source');
    
    // Restore original execution
    getRoomCircuit.exec = originalExec;
    
    // Scenario 4: Circuit breaker opens, fallback activated
    separator('Circuit breaker opens, fallback activated');
    console.log('Setting API to fail repeatedly...');
    apiClient.setFailMode(true, 5);
    
    console.log('Executing operations until circuit opens...');
    try {
      for (let i = 0; i < 5; i++) {
        console.log(`\nAttempt ${i + 1}:`);
        try {
          const result = await executeListRooms();
          console.log('Result:', result);
        } catch (error) {
          console.log('Error:', error.message);
        }
      }
    } catch (error) {
      console.log('Expected error occurred:', error.message);
    }
    
    // Check circuit state
    console.log('\nCircuit breaker state:', listRoomsCircuit.getState());
    console.assert(listRoomsCircuit.getState() === 'OPEN', 'Expected circuit to be OPEN');
    
    // Try again - should use fallback
    console.log('\nExecuting with open circuit - should use fallback...');
    const fallbackListRoomsResult = await executeListRooms();
    console.log('ListRooms result with fallback:', fallbackListRoomsResult);
    console.assert(fallbackListRoomsResult.isDegraded === true, 'Expected degraded result');
    console.assert(fallbackListRoomsResult.source === 'fallback', 'Expected fallback source');
    
    // Scenario 5: Operation without fallback fails
    separator('Operation without fallback fails');
    console.log('Executing create room operation with open circuit...');
    try {
      const failedCreateRoomResult = await executeCreateRoom({ name: 'Test Room' });
      console.log('Result (should not reach here):', failedCreateRoomResult);
    } catch (error) {
      console.log('Expected error occurred:', error.message);
    }
    
    // Reset API client and circuit breakers
    apiClient.resetFailMode();
    console.log('\nResetting circuit breakers...');
    listRoomsCircuit.reset();
    getRoomCircuit.reset();
    createRoomCircuit.reset();
    
    // Scenario 6: Circuit recovery
    separator('Circuit recovery (half-open to closed)');
    apiClient.resetFailMode();
    
    console.log('Manually tripping circuit...');
    listRoomsCircuit.trip(new Error('Manual trip'));
    
    console.log('Circuit state after trip:', listRoomsCircuit.getState());
    
    console.log('Waiting for reset timeout...');
    await new Promise(resolve => setTimeout(resolve, 5500)); // Wait longer than resetTimeout
    
    console.log('Executing operations to test recovery...');
    for (let i = 0; i < 3; i++) {
      console.log(`\nRecovery attempt ${i + 1}:`);
      try {
        const result = await executeListRooms();
        console.log('Result:', result);
        console.log('Circuit state:', listRoomsCircuit.getState());
      } catch (error) {
        console.log('Error:', error.message);
        console.log('Circuit state:', listRoomsCircuit.getState());
      }
    }
    
    // Check overall health
    separator('Overall system health');
    const overallHealth = gracefulDegradation.getOverallHealth();
    console.log('Overall system health:', overallHealth);
    
    const componentHealth = gracefulDegradation.getComponentHealth();
    console.log('Component health status:');
    componentHealth.forEach(health => {
      console.log(`- ${health.name}: ${health.status}`);
    });
    
    // Print metrics
    separator('Metrics');
    const metrics = await metricsRegistry.getMetricsAsString();
    console.log('Graceful degradation metrics (partial):');
    const degradationMetrics = metrics.split('\n')
      .filter(line => line.includes('degradation_') && !line.startsWith('#'))
      .join('\n');
    console.log(degradationMetrics);
    
    // Success
    separator('All tests completed');
    console.log('Graceful degradation tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    gracefulDegradation.dispose();
  }
}

// Start tests
runTests();
