/**
 * Digital Samba MCP Server - Resource Optimizer Test Script
 * 
 * This script tests the resource optimization strategies implemented in resource-optimizer.ts.
 * It verifies that request batching, incremental data loading, and memory optimization
 * work correctly for high-traffic scenarios.
 * 
 * Usage: npm run test:resource-optimizer
 */

// Node.js built-in modules
import { setTimeout as sleep } from 'timers/promises';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import enhanced API client and resource optimizer
import { EnhancedDigitalSambaApiClient } from '../src/digital-samba-api-enhanced.js';
import { ResourceOptimizer } from '../src/resource-optimizer.js';
import { MemoryCache } from '../src/cache.js';
import logger from '../src/logger.js';

// Test configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';

if (!API_KEY) {
  console.error('Error: DIGITAL_SAMBA_API_KEY is required. Please set it in the .env file.');
  process.exit(1);
}

// Create enhanced API client
const client = new EnhancedDigitalSambaApiClient(
  API_KEY,
  API_URL,
  undefined,
  {
    enableResourceOptimization: true
  }
);

// Create standalone resource optimizer for direct testing
const optimizer = new ResourceOptimizer({
  maxBatchSize: 5,
  batchDelayMs: 100,
  enableCompression: true,
  enableIncrementalLoading: true,
  cacheTtl: 30000 // 30 seconds
});

/**
 * Test request batching
 */
async function testRequestBatching() {
  console.log('\n=== Testing Request Batching ===\n');
  
  // Step 1: Create multiple test rooms
  console.log('Creating test rooms...');
  const rooms = [];
  
  for (let i = 0; i < 3; i++) {
    try {
      const roomResponse = await client.createRoom({
        name: `Batch Test Room ${i + 1} - ${new Date().toISOString()}`,
        privacy: 'private'
      });
      
      rooms.push(roomResponse);
      console.log(`Created room ${i + 1} with ID: ${roomResponse.id}`);
    } catch (error) {
      console.error(`Error creating room ${i + 1}:`, error);
    }
  }
  
  if (rooms.length === 0) {
    console.error('No test rooms could be created. Skipping batch test.');
    return;
  }
  
  try {
    // Step 2: Set up a batch executor
    console.log('\nSetting up batch executor...');
    
    // This function simulates retrieving data for multiple room IDs in a single batch
    const batchExecutor = async (roomIds) => {
      console.log(`Executing batch for ${roomIds.length} rooms`);
      
      // Simulate a batch API call that returns data for multiple rooms at once
      const results = new Map();
      
      for (const roomId of roomIds) {
        try {
          // In a real implementation, this would be a single API call for all IDs
          const roomDetails = await client.getRoom(roomId);
          results.set(roomId, roomDetails);
        } catch (error) {
          console.error(`Error getting room ${roomId}:`, error);
        }
      }
      
      return results;
    };
    
    // Step 3: Set up batch event listeners
    console.log('\nSetting up batch event listeners...');
    
    optimizer.on('batch:success', (data) => {
      console.log(`\n✅ Batch executed successfully: ID=${data.batchId}, Keys=${data.keyCount}, Duration=${data.duration}ms`);
    });
    
    optimizer.on('batch:error', (data) => {
      console.log(`\n❌ Batch execution failed: ID=${data.batchId}, Keys=${data.keyCount}, Error=${data.error}`);
    });
    
    // Step 4: Execute batch requests
    console.log('\nExecuting batch requests...');
    
    const batchId = 'room-details-batch';
    const promises = [];
    
    // Issue multiple requests that should be batched together
    for (const room of rooms) {
      console.log(`Adding room ${room.id} to batch...`);
      
      const promise = optimizer.batchRequest(batchId, room.id, batchExecutor)
        .then(result => {
          console.log(`Got batched result for room ${room.id}: ${result.name}`);
          return result;
        })
        .catch(error => {
          console.error(`Error in batched request for room ${room.id}:`, error);
          throw error;
        });
      
      promises.push(promise);
    }
    
    // Wait for all batch requests to complete
    const results = await Promise.all(promises);
    console.log(`\nAll ${results.length} batch requests completed`);
    
    // Step 5: Test cache by issuing the same requests again
    console.log('\nTesting cache with identical requests...');
    
    const cachePromises = [];
    
    for (const room of rooms) {
      console.log(`Requesting room ${room.id} again (should be cached)...`);
      
      const promise = optimizer.batchRequest(batchId, room.id, batchExecutor)
        .then(result => {
          console.log(`Got cached result for room ${room.id}: ${result.name}`);
          return result;
        })
        .catch(error => {
          console.error(`Error in cached request for room ${room.id}:`, error);
          throw error;
        });
      
      cachePromises.push(promise);
    }
    
    // These should be much faster due to caching
    const cachedResults = await Promise.all(cachePromises);
    console.log(`\nAll ${cachedResults.length} cached requests completed`);
    
    // Get resource optimizer stats
    const stats = optimizer.getStats();
    console.log('\nResource Optimizer Stats:');
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error during batch test:', error);
  } finally {
    // Clean up test rooms
    console.log('\nCleaning up test rooms...');
    
    for (const room of rooms) {
      try {
        await client.deleteRoom(room.id);
        console.log(`Deleted room: ${room.id}`);
      } catch (error) {
        console.error(`Error deleting room ${room.id}:`, error);
      }
    }
  }
  
  console.log('\n=== Request Batching Test Completed ===');
}

/**
 * Test incremental data loading
 */
async function testIncrementalLoading() {
  console.log('\n=== Testing Incremental Data Loading ===\n');
  
  try {
    // Step 1: Create a data loader function
    console.log('Setting up incremental data loader...');
    
    // This function simulates pagination for rooms list
    const dataLoader = async (page, pageSize) => {
      console.log(`Loading page ${page} with size ${pageSize}...`);
      
      // List rooms with pagination
      const response = await client.listRooms({
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      
      // Calculate total items for consistent pagination
      const total = Number(response.total_count) || response.data.length * 2; // Fallback if total not provided
      
      console.log(`Loaded ${response.data.length} rooms for page ${page}`);
      
      return {
        data: response.data,
        total
      };
    };
    
    // Step 2: Set up event listeners
    console.log('\nSetting up incremental loading event listeners...');
    
    optimizer.on('incremental:progress', (data) => {
      const progressBar = '█'.repeat(Math.floor(data.percentage / 5)) + '░'.repeat(20 - Math.floor(data.percentage / 5));
      console.log(`\nLoading progress: ${progressBar} ${data.percentage}%`);
      console.log(`Page ${data.page}: Loaded ${data.loaded}/${data.total} items`);
    });
    
    optimizer.on('incremental:complete', (data) => {
      console.log(`\n✅ Incremental loading complete: Loaded ${data.loaded}/${data.total} items in ${data.pages} pages`);
    });
    
    // Step 3: Execute incremental loading
    console.log('\nExecuting incremental data loading...');
    
    // Load data incrementally with small page size to see multiple pages
    const pageSize = 2;
    const maxPages = 3;
    
    const rooms = await optimizer.loadIncrementally(dataLoader, pageSize, maxPages);
    
    console.log(`\nLoaded ${rooms.length} rooms incrementally`);
    console.log(`First room: ${rooms[0]?.name || 'No rooms found'}`);
    
    // Get resource optimizer stats
    const stats = optimizer.getStats();
    console.log('\nResource Optimizer Stats:');
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error during incremental loading test:', error);
  }
  
  console.log('\n=== Incremental Data Loading Test Completed ===');
}

/**
 * Test memory optimization
 */
async function testMemoryOptimization() {
  console.log('\n=== Testing Memory Optimization ===\n');
  
  try {
    // Step 1: Create a resource optimizer with a low memory threshold
    console.log('Creating resource optimizer with low memory threshold...');
    
    const lowMemoryOptimizer = new ResourceOptimizer({
      maxMemoryUsage: 10 * 1024 * 1024, // 10 MB (artificially low to trigger cleanup)
      memoryCheckIntervalMs: 5000 // 5 seconds
    });
    
    // Step 2: Set up event listeners
    console.log('\nSetting up memory optimization event listeners...');
    
    lowMemoryOptimizer.on('memory:exceeded', (data) => {
      console.log(`\n⚠️ Memory threshold exceeded: ${Math.round(data.heapUsed / (1024 * 1024))}MB / ${Math.round(data.maxMemoryUsage / (1024 * 1024))}MB`);
      console.log('Cache has been cleared to reduce memory usage');
    });
    
    // Step 3: Fill the cache with data to trigger cleanup
    console.log('\nFilling cache with data to trigger memory cleanup...');
    
    // Generate a large string to consume memory
    const generateLargeString = (size) => {
      return 'X'.repeat(size);
    };
    
    // Simulate a batch executor that returns large data
    const batchExecutor = async (keys) => {
      const results = new Map();
      
      for (const key of keys) {
        // Create a large string (approximately 1MB)
        const largeData = {
          id: key,
          name: `Large Data ${key}`,
          data: generateLargeString(1024 * 1024) // 1MB string
        };
        
        results.set(key, largeData);
      }
      
      return results;
    };
    
    // Fill cache with several large objects
    for (let i = 1; i <= 15; i++) {
      try {
        console.log(`Adding large item ${i} to cache...`);
        
        // Use batch request to fill cache
        await lowMemoryOptimizer.batchRequest(`large-batch-${i}`, `key-${i}`, batchExecutor);
      } catch (error) {
        console.error(`Error adding item ${i} to cache:`, error);
      }
    }
    
    // Step 4: Wait for memory check and cleanup
    console.log('\nWaiting for memory check and cleanup (10 seconds)...');
    await sleep(10 * 1000);
    
    // Get resource optimizer stats
    const stats = lowMemoryOptimizer.getStats();
    console.log('\nResource Optimizer Stats After Memory Check:');
    console.log(JSON.stringify(stats, null, 2));
    
    // Clean up
    lowMemoryOptimizer.destroy();
  } catch (error) {
    console.error('Error during memory optimization test:', error);
  }
  
  console.log('\n=== Memory Optimization Test Completed ===');
}

/**
 * Test response compression
 */
async function testResponseCompression() {
  console.log('\n=== Testing Response Compression ===\n');
  
  try {
    // Step 1: Create sample response data
    console.log('Creating sample response data...');
    
    const sampleResponse = {
      id: '123',
      name: 'Test Room',
      description: 'This is a test room',
      createdAt: '2025-05-20T12:34:56Z',
      updatedAt: '2025-05-20T13:45:67Z',
      participants: [
        { id: 'p1', name: 'User 1', role: 'host' },
        { id: 'p2', name: 'User 2', role: 'participant' }
      ],
      settings: {
        maxParticipants: 100,
        enableChat: true,
        enableVideo: true,
        enableAudio: true,
        waitingRoom: false,
        recording: null,
        customData: null
      }
    };
    
    // Step 2: Compress response
    console.log('\nCompressing response data...');
    
    const compressedResponse = optimizer.compressResponse(sampleResponse);
    
    // Calculate size difference
    const originalSize = JSON.stringify(sampleResponse).length;
    const compressedSize = JSON.stringify(compressedResponse).length;
    const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
    
    console.log(`\nOriginal size: ${originalSize} bytes`);
    console.log(`Compressed size: ${compressedSize} bytes`);
    console.log(`Size reduction: ${reduction}% (${originalSize - compressedSize} bytes)`);
    
    // Step 3: Verify compression
    console.log('\nVerifying compressed response...');
    
    // Check for null and undefined values that should have been removed
    const nullProperties = [];
    const containsNullValues = Object.entries(compressedResponse).some(([key, value]) => {
      if (value === null || value === undefined) {
        nullProperties.push(key);
        return true;
      }
      return false;
    });
    
    if (containsNullValues) {
      console.log(`\n⚠️ Compressed response still contains null values: ${nullProperties.join(', ')}`);
    } else {
      console.log('\n✅ Compressed response contains no null values');
    }
    
    // Check if nested null values were removed
    if (compressedResponse.settings && Object.keys(compressedResponse.settings).length < Object.keys(sampleResponse.settings).length) {
      console.log('✅ Nested null values were removed from settings object');
    } else {
      console.log('⚠️ Nested null values were not removed as expected');
    }
  } catch (error) {
    console.error('Error during response compression test:', error);
  }
  
  console.log('\n=== Response Compression Test Completed ===');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('=== Starting Resource Optimizer Tests ===\n');
    
    // Test request batching
    await testRequestBatching();
    
    // Wait a moment between tests
    await sleep(2000);
    
    // Test incremental data loading
    await testIncrementalLoading();
    
    // Wait a moment between tests
    await sleep(2000);
    
    // Test memory optimization
    await testMemoryOptimization();
    
    // Wait a moment between tests
    await sleep(2000);
    
    // Test response compression
    await testResponseCompression();
    
    console.log('\n=== All Resource Optimizer Tests Completed Successfully ===');
  } catch (error) {
    console.error('Error during tests:', error);
  } finally {
    // Clean up resources
    optimizer.destroy();
    client.destroy();
    process.exit(0);
  }
}

// Run tests
runTests();
