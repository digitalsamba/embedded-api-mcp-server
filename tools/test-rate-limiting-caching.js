#!/usr/bin/env node

/**
 * Test script for rate limiting and caching functionality
 */
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Configuration
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY || 'your-api-key-here';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/mcp';
const NUM_REQUESTS = 10;

/**
 * Send a request to the MCP server
 * @param {string} method - Request method
 * @param {object} params - Request parameters
 * @returns {Promise<object>} Response data
 */
async function sendRequest(method, params = {}) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    })
  });

  return response.json();
}

/**
 * Initialize the MCP server connection
 */
async function initialize() {
  return sendRequest('initialize', {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    }
  });
}

/**
 * Test rate limiting functionality
 */
async function testRateLimiting() {
  console.log('\n=== Testing Rate Limiting ===');
  
  // First, make sure we're initialized
  const initResult = await initialize();
  console.log('Initialized server:', initResult.result ? 'Success' : 'Failed');
  
  // Send a burst of requests to trigger rate limiting
  console.log(`Sending ${NUM_REQUESTS} requests in rapid succession...`);
  
  let successCount = 0;
  let limitedCount = 0;
  
  for (let i = 0; i < NUM_REQUESTS; i++) {
    try {
      const response = await sendRequest('listResources');
      if (response.result) {
        successCount++;
      } else if (response.error && response.error.code === 429) {
        limitedCount++;
        console.log(`Request ${i + 1} rate limited: ${response.error.message}`);
      }
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
    }
  }
  
  console.log(`Results: ${successCount} successful, ${limitedCount} rate limited`);
  
  if (limitedCount > 0) {
    console.log('✅ Rate limiting is working!');
  } else {
    console.log('❌ Rate limiting doesn\'t seem to be active.');
  }
}

/**
 * Test caching functionality
 */
async function testCaching() {
  console.log('\n=== Testing Caching ===');
  
  // First request - should be a cache miss
  console.log('Making first request (should be cache miss)...');
  const start1 = performance.now();
  const response1 = await sendRequest('listResources');
  const end1 = performance.now();
  const time1 = end1 - start1;
  
  console.log(`First request took ${time1.toFixed(2)}ms`);
  
  // Second request - should be a cache hit and faster
  console.log('Making second request (should be cache hit)...');
  const start2 = performance.now();
  const response2 = await sendRequest('listResources');
  const end2 = performance.now();
  const time2 = end2 - start2;
  
  console.log(`Second request took ${time2.toFixed(2)}ms`);
  
  // Compare times
  if (time2 < time1 * 0.8) { // 20% faster is considered a cache hit
    console.log(`✅ Caching is working! Second request was ${((1 - time2/time1) * 100).toFixed(2)}% faster.`);
  } else {
    console.log('❓ Caching might not be active or effective.');
  }
  
  // Test cache invalidation with a DELETE operation
  console.log('\nTesting cache invalidation...');
  
  // Create a room to delete
  console.log('Creating a room...');
  const createResponse = await sendRequest('callTool', {
    name: 'create-room',
    arguments: {
      name: `Test Room ${Date.now()}`
    }
  });
  
  if (createResponse.error) {
    console.error('Failed to create room:', createResponse.error);
    return;
  }
  
  const roomData = JSON.parse(createResponse.result.content[0].text);
  const roomId = roomData.id;
  console.log(`Created room with ID: ${roomId}`);
  
  // Get room details (should be cached)
  console.log('Getting room details (first request)...');
  const start3 = performance.now();
  await sendRequest('readResource', {
    uri: `digitalsamba://rooms/${roomId}`
  });
  const end3 = performance.now();
  const time3 = end3 - start3;
  
  console.log('Getting room details again (should be cache hit)...');
  const start4 = performance.now();
  await sendRequest('readResource', {
    uri: `digitalsamba://rooms/${roomId}`
  });
  const end4 = performance.now();
  const time4 = end4 - start4;
  
  console.log(`First fetch: ${time3.toFixed(2)}ms, Second fetch: ${time4.toFixed(2)}ms`);
  
  // Delete the room (should invalidate cache)
  console.log('Deleting the room (should invalidate cache)...');
  await sendRequest('callTool', {
    name: 'delete-room',
    arguments: {
      roomId
    }
  });
  
  // Try to get room details again
  try {
    console.log('Getting room details after deletion...');
    const response = await sendRequest('readResource', {
      uri: `digitalsamba://rooms/${roomId}`
    });
    
    if (response.error) {
      console.log(`✅ Cache invalidation working! Room not found as expected: ${response.error.message}`);
    } else {
      console.log('❌ Cache invalidation not working correctly. Room still accessible after deletion.');
    }
  } catch (error) {
    console.log('✅ Cache invalidation working! Room not accessible after deletion.');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('===== Digital Samba MCP Server Rate Limiting and Caching Test =====');
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 4) + '...' : 'Not provided'}`);
  
  try {
    await testRateLimiting();
    await testCaching();
    
    console.log('\n===== Test Complete =====');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
