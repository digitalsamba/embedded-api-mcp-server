/**
 * Connection Manager Test File
 * Tests the ConnectionManager class methods for proper functionality
 */

import { ConnectionManager, ConnectionState } from '../dist/src/connection-manager.js';

// Create a test connection manager
const testConnectionManager = new ConnectionManager({
  apiUrl: 'https://api.example.com',
  poolSize: 5 // Testing with specific pool size
});

// Create a test connection manager with default poolSize
const defaultConnectionManager = new ConnectionManager({
  apiUrl: 'https://api.example.com'
});

console.log('\nTesting Connection Manager Methods:');
console.log('----------------------------------');

// Test isHealthy method
console.log('1. Testing isHealthy() method:');
const healthStatus = testConnectionManager.isHealthy();
console.log(` - Health Status: ${healthStatus}`);
console.log(` - Type: ${typeof healthStatus}`);
console.log(` - Test Result: ${typeof healthStatus === 'boolean' ? 'PASS' : 'FAIL'}`);

// Test getStats method
console.log('\n2. Testing getStats() method:');
const stats = testConnectionManager.getStats();
console.log(` - Stats returned: ${JSON.stringify(stats, null, 2)}`);
console.log(` - Type: ${typeof stats}`);
console.log(` - Has connections property: ${stats.hasOwnProperty('connections') ? 'PASS' : 'FAIL'}`);
console.log(` - Pool size is 5: ${stats.connections.poolSize === 5 ? 'PASS' : 'FAIL'}`);

// Test default poolSize
console.log('\n3. Testing default poolSize:');
const defaultStats = defaultConnectionManager.getStats();
console.log(` - Default stats: ${JSON.stringify(defaultStats, null, 2)}`);
console.log(` - Default pool size is 1: ${defaultStats.connections.poolSize === 1 ? 'PASS' : 'FAIL'}`);

// Test reset method
console.log('\n4. Testing reset() method:');
let resetEventReceived = false;
testConnectionManager.on('reset', () => {
  resetEventReceived = true;
  console.log(' - Reset event received successfully');
});
testConnectionManager.reset();
console.log(` - Reset event triggered: ${resetEventReceived ? 'PASS' : 'FAIL'}`);

// Test fetch method
console.log('\n5. Testing fetch() method (mock):');
// We'll just check the method exists - actual implementation would need mocking
console.log(` - fetch method exists: ${typeof testConnectionManager.fetch === 'function' ? 'PASS' : 'FAIL'}`);

// Test destroy method
console.log('\n6. Testing destroy() method:');
testConnectionManager.destroy();
console.log(' - destroy method called without errors');

console.log('\nConnection Manager Test Complete!');
