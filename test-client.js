// Simple test client for rate limiting and caching
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const SERVER_URL = 'http://localhost:3333/mcp';
const NUM_REQUESTS = 10;

// Initialize the MCP server
async function initialize() {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-api-key'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'initialize',
      params: {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    })
  });

  return response.json();
}

// Test rate limiting
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
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now().toString(),
          method: 'listResources',
          params: {}
        })
      });
      
      const data = await response.json();
      
      if (response.status === 429 || (data.error && data.error.code === 429)) {
        limitedCount++;
        console.log(`Request ${i + 1} rate limited`);
      } else {
        successCount++;
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

// Test caching
async function testCaching() {
  console.log('\n=== Testing Caching ===');
  
  // First request - should be a cache miss
  console.log('Making first request (should be cache miss)...');
  const start1 = performance.now();
  
  const response1 = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-api-key'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'listResources',
      params: {}
    })
  });
  
  await response1.json();
  const end1 = performance.now();
  const time1 = end1 - start1;
  
  console.log(`First request took ${time1.toFixed(2)}ms`);
  
  // Second request - should be a cache hit and faster
  console.log('Making second request (should be cache hit)...');
  const start2 = performance.now();
  
  const response2 = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-api-key'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'listResources',
      params: {}
    })
  });
  
  await response2.json();
  const end2 = performance.now();
  const time2 = end2 - start2;
  
  console.log(`Second request took ${time2.toFixed(2)}ms`);
  
  // Compare times
  if (time2 < time1 * 0.8) { // 20% faster is considered a cache hit
    console.log(`✅ Caching is working! Second request was ${((1 - time2/time1) * 100).toFixed(2)}% faster.`);
  } else {
    console.log('❓ Caching might not be active or effective.');
  }
}

// Run tests
async function runTests() {
  try {
    await testRateLimiting();
    await testCaching();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
