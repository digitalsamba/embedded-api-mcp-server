/**
 * Test script for Digital Samba MCP Server with Graceful Degradation
 * 
 * This script tests the integration of the graceful degradation pattern
 * with the MCP server. It demonstrates how the system responds to API
 * failures and recovers gracefully.
 */

import { createServer, startServer } from '../src/index.js';
import logger from '../src/logger.js';
import fetch from 'node-fetch';
import { MemoryCache } from '../src/cache.js';
import { DigitalSambaApiClient } from '../src/digital-samba-api.js';
import gracefulDegradation from '../src/graceful-degradation.js';

// Mock API for testing
const mockAPI = {
  failMode: false,
  failureCount: 0,
  maxFailures: 0,
  
  setFailMode(shouldFail, maxFailures = Infinity) {
    this.failMode = shouldFail;
    this.failureCount = 0;
    this.maxFailures = maxFailures;
    console.log(`API failure mode set to: ${shouldFail}, max failures: ${maxFailures}`);
  },
  
  resetFailMode() {
    this.failMode = false;
    this.failureCount = 0;
    console.log('API failure mode reset');
  },
  
  shouldFail() {
    if (this.failMode && this.failureCount < this.maxFailures) {
      this.failureCount++;
      console.log(`Simulating API failure (${this.failureCount}/${this.maxFailures})`);
      return true;
    }
    return false;
  }
};

// Mock the Digital Samba API client
jest.mock('../src/digital-samba-api.js', () => {
  // Store original module
  const originalModule = jest.requireActual('../src/digital-samba-api.js');
  
  return {
    ...originalModule,
    DigitalSambaApiClient: jest.fn().mockImplementation(() => {
      return {
        listRooms: jest.fn().mockImplementation(() => {
          if (mockAPI.shouldFail()) {
            return Promise.reject(new Error('Simulated API failure - listRooms'));
          }
          
          return Promise.resolve({
            data: [
              { id: 'room1', name: 'Test Room 1' },
              { id: 'room2', name: 'Test Room 2' }
            ],
            total_count: 2,
            length: 2,
            map: function(callback) { return this.data.map(callback); }
          });
        }),
        
        getRoom: jest.fn().mockImplementation((roomId) => {
          if (mockAPI.shouldFail()) {
            return Promise.reject(new Error('Simulated API failure - getRoom'));
          }
          
          return Promise.resolve({
            id: roomId,
            name: `Room ${roomId}`,
            description: 'Test room description',
            privacy: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }),
        
        createRoom: jest.fn().mockImplementation((settings) => {
          if (mockAPI.shouldFail()) {
            return Promise.reject(new Error('Simulated API failure - createRoom'));
          }
          
          return Promise.resolve({
            id: 'new-room-id',
            name: settings.name || 'New Room',
            description: settings.description || '',
            privacy: settings.privacy || 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }),
        
        generateRoomToken: jest.fn().mockImplementation((roomId, options) => {
          if (mockAPI.shouldFail()) {
            return Promise.reject(new Error('Simulated API failure - generateRoomToken'));
          }
          
          return Promise.resolve({
            token: 'mock-token-123',
            link: `https://example.com/rooms/${roomId}?token=mock-token-123`,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          });
        })
      };
    })
  };
});

// Configure logger
logger.level = 'debug';

// Helper to create MCP client
async function createMcpClient(apiKey = 'test-api-key') {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  
  // Initialize session
  const initResponse = await fetch('http://localhost:3100/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        capabilities: {}
      },
      id: 1
    })
  });
  
  const initData = await initResponse.json();
  const sessionId = initResponse.headers.get('mcp-session-id');
  
  console.log(`Session initialized with ID: ${sessionId}`);
  
  // Function to make MCP requests
  async function request(method, params = {}) {
    const response = await fetch('http://localhost:3100/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 10000)
      })
    });
    
    return await response.json();
  }
  
  return {
    sessionId,
    request,
    async listRooms() {
      return request('readResource', {
        uri: 'digitalsamba://rooms'
      });
    },
    async getRoom(roomId) {
      return request('readResource', {
        uri: `digitalsamba://rooms/${roomId}`
      });
    },
    async createRoom(settings) {
      return request('callTool', {
        name: 'create-room',
        arguments: settings
      });
    },
    async generateToken(roomId, options) {
      return request('callTool', {
        name: 'generate-token',
        arguments: {
          roomId,
          ...options
        }
      });
    },
    async getSystemHealth() {
      const response = await fetch('http://localhost:3100/health/system');
      return await response.json();
    }
  };
}

// Run tests
async function runTests() {
  console.log('Starting Digital Samba MCP Server with Graceful Degradation test...');
  
  // Create and start server
  const server = startServer({
    port: 3100,
    apiUrl: 'https://api.digitalsamba.com/api/v1',
    enableCache: true,
    cacheTtl: 60000,
    enableCircuitBreaker: true,
    circuitBreakerFailureThreshold: 3,
    circuitBreakerResetTimeout: 5000,
    enableGracefulDegradation: true,
    gracefulDegradationMaxRetries: 2,
    gracefulDegradationInitialDelay: 500,
    enableMetrics: true
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Server started on port 3100');
  
  // Create MCP client
  const client = await createMcpClient('test-api-key');
  
  try {
    // Test 1: Normal operation
    console.log('\n--- Test 1: Normal operation ---');
    console.log('Listing rooms...');
    const roomsResult = await client.listRooms();
    console.log('Rooms result:', roomsResult.result.contents.length > 0 ? 'Success' : 'Failed');
    
    // Test 2: Check system health
    console.log('\n--- Test 2: Check system health ---');
    const healthResult = await client.getSystemHealth();
    console.log('System health:', healthResult.status);
    
    // Test 3: Simulate API failures
    console.log('\n--- Test 3: Simulate API failures ---');
    mockAPI.setFailMode(true, 5);
    
    // Test 3.1: First failure (should retry and succeed)
    console.log('\n- Test 3.1: First failure (should retry and succeed) -');
    mockAPI.setFailMode(true, 1);
    const failureResult1 = await client.listRooms();
    console.log('Result after retry:', failureResult1.result.contents.length > 0 ? 'Success' : 'Failed');
    
    // Test 3.2: Multiple failures (should trip circuit breaker)
    console.log('\n- Test 3.2: Multiple failures (should trip circuit breaker) -');
    mockAPI.setFailMode(true, 5);
    
    // Try multiple times to trip the circuit breaker
    for (let i = 0; i < 4; i++) {
      console.log(`\nAttempt ${i + 1}:`);
      try {
        const result = await client.getRoom('test');
        console.log('Result:', result.error ? 'Error' : 'Success');
      } catch (error) {
        console.log('Error:', error.message);
      }
    }
    
    // Test 3.3: Check system health after failures
    console.log('\n- Test 3.3: Check system health after failures -');
    const healthAfterFailures = await client.getSystemHealth();
    console.log('System health after failures:', healthAfterFailures.status);
    console.log('Degradation overall:', healthAfterFailures.degradation.overall);
    console.log('Component health:');
    healthAfterFailures.degradation.components.forEach(component => {
      console.log(`- ${component.name}: ${component.status}, errors: ${component.errorCount}`);
    });
    
    // Test 4: Recovery
    console.log('\n--- Test 4: Recovery ---');
    mockAPI.resetFailMode();
    
    console.log('Waiting for circuit breaker reset timeout...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('Trying operation after reset...');
    const recoveryResult = await client.listRooms();
    console.log('Recovery result:', recoveryResult.result.contents.length > 0 ? 'Success' : 'Failed');
    
    // Test 4.1: Check system health after recovery
    console.log('\n- Test 4.1: Check system health after recovery -');
    const healthAfterRecovery = await client.getSystemHealth();
    console.log('System health after recovery:', healthAfterRecovery.status);
    
    console.log('\nTests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    if (server) {
      server.close();
      console.log('Server closed');
    }
  }
}

// Start tests
runTests().catch(console.error);
