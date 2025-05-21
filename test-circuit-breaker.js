/**
 * Circuit Breaker Pattern Test Script
 * 
 * This script tests the circuit breaker pattern implementation for the Digital Samba API client.
 * It simulates API failures and tests the circuit breaker's response.
 */

// Node.js modules
import { setTimeout } from 'timers/promises';

// External dependencies
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Local modules - use compiled versions from dist
import { DigitalSambaApiClient } from './dist/src/digital-samba-api.js';
import { CircuitBreakerApiClient } from './dist/src/digital-samba-api-circuit-breaker.js';
import { circuitBreakerRegistry, CircuitState } from './dist/src/circuit-breaker.js';
import logger from './dist/src/logger.js';
import metricsRegistry, { initializeMetrics } from './dist/src/metrics.js';
import express from 'express';

// Initialize metrics
initializeMetrics();

// API key from environment variable
const API_KEY = process.env.DIGITAL_SAMBA_API_KEY;

if (!API_KEY) {
  console.error('Error: DIGITAL_SAMBA_API_KEY environment variable is not set');
  process.exit(1);
}

// Create a fake API base URL to simulate failures
const FAKE_API_URL = 'https://nonexistent-api.digitalsamba.example.com/api/v1';

// Create a circuit breaker API client with a fake API URL to force failures
const apiClient = new DigitalSambaApiClient(API_KEY, FAKE_API_URL);
const circuitClient = CircuitBreakerApiClient.withCircuitBreaker(apiClient, {
  defaultOptions: {
    failureThreshold: 2, // Lower threshold for faster testing
    resetTimeout: 5000,  // 5 seconds timeout for faster testing
    requestTimeout: 3000  // 3 seconds timeout for faster testing
  }
});

// Create an Express app to expose metrics
const app = express();
metricsRegistry.registerMetricsEndpoint(app);

// Start Express server
const PORT = 3010;
app.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
  console.log(`View metrics at http://localhost:${PORT}/metrics`);
});

/**
 * Run the test suite
 */
async function runTests() {
  try {
    console.log('\n=== Circuit Breaker Pattern Tests ===\n');
    
    // Test 1: Initial state check
    console.log('Test 1: Checking initial circuit state...');
    const listRoomsCircuit = circuitBreakerRegistry.get('api.listRooms');
    
    if (!listRoomsCircuit) {
      console.log('  ✓ No circuit exists yet for listRooms (will be created on first call)');
    } else {
      const state = listRoomsCircuit.getState();
      console.log(`  ${state === CircuitState.CLOSED ? '✓' : '✗'} Initial state is ${state} (expected: ${CircuitState.CLOSED})`);
    }
    
    // Test 2: Making API calls that will fail
    console.log('\nTest 2: Making API calls that will fail...');
    try {
      console.log('  Making first API call (should fail but circuit stays CLOSED)...');
      await circuitClient.listRooms();
      console.log('  ✗ API call succeeded (unexpected)');
    } catch (err) {
      console.log('  ✓ API call failed as expected');
      
      // Get the circuit and check its state
      const circuit = circuitBreakerRegistry.get('api.listRooms');
      if (circuit) {
        const state = circuit.getState();
        console.log(`  ${state === CircuitState.CLOSED ? '✓' : '✗'} Circuit state is ${state} (expected: ${CircuitState.CLOSED})`);
      } else {
        console.log('  ✗ Circuit was not created');
      }
    }
    
    // Make a second failed call to trip the circuit
    try {
      console.log('\n  Making second API call (should fail and trip the circuit)...');
      await circuitClient.listRooms();
      console.log('  ✗ API call succeeded (unexpected)');
    } catch (err) {
      console.log('  ✓ API call failed as expected');
      
      // Get the circuit and check its state
      const circuit = circuitBreakerRegistry.get('api.listRooms');
      if (circuit) {
        const state = circuit.getState();
        console.log(`  ${state === CircuitState.OPEN ? '✓' : '✗'} Circuit state is ${state} (expected: ${CircuitState.OPEN})`);
      } else {
        console.log('  ✗ Circuit was not created');
      }
    }
    
    // Test 3: Making a call with an open circuit
    console.log('\nTest 3: Making a call with an open circuit...');
    try {
      const result = await circuitClient.listRooms();
      console.log('  ℹ API call with open circuit succeeded - this is expected if fallback is working');
      console.log('  ℹ Result:', JSON.stringify(result, null, 2));
      
      // Check if the result looks like our fallback response
      if (result && Array.isArray(result.data) && result.data.length === 0 
          && result.total_count === 0 && result.length === 0) {
        console.log('  ✓ Fallback function returned empty data as expected');
      } else {
        console.log('  ✗ Unexpected result from fallback function');
      }
    } catch (err) {
      console.log('  ✗ Call was rejected by circuit breaker (unexpected if fallback is implemented)');
      console.log(`  ✗ Error message: ${err.message}`);
    }
    
    // Test 4: Wait for the circuit to transition to half-open
    console.log('\nTest 4: Waiting for circuit to transition to HALF_OPEN state...');
    console.log('  Waiting for reset timeout (5 seconds)...');
    await setTimeout(6000); // Wait a bit longer than the reset timeout
    
    const halfOpenCircuit = circuitBreakerRegistry.get('api.listRooms');
    if (halfOpenCircuit) {
      const state = halfOpenCircuit.getState();
      console.log(`  ${state === CircuitState.HALF_OPEN ? '✓' : '✗'} Circuit state is ${state} after waiting (expected: ${CircuitState.HALF_OPEN})`);
    } else {
      console.log('  ✗ Circuit was not found');
    }
    
    // Test 5: Test with a different circuit (to demonstrate isolation)
    console.log('\nTest 5: Testing with a different circuit (getRoom) to demonstrate isolation...');
    try {
      await circuitClient.getRoom('nonexistent-room-id');
      console.log('  ✗ API call succeeded (unexpected)');
    } catch (err) {
      console.log('  ✓ API call failed as expected');
      
      // Get the circuit and check its state
      const getRoomCircuit = circuitBreakerRegistry.get('api.getRoom');
      const listRoomsCircuit = circuitBreakerRegistry.get('api.listRooms');
      
      if (getRoomCircuit && listRoomsCircuit) {
        const getRoomState = getRoomCircuit.getState();
        const listRoomsState = listRoomsCircuit.getState();
        
        console.log(`  ${getRoomState === CircuitState.CLOSED ? '✓' : '✗'} getRoom circuit state is ${getRoomState} (expected: ${CircuitState.CLOSED})`);
        console.log(`  ${listRoomsState === CircuitState.HALF_OPEN ? '✓' : '✗'} listRooms circuit state is ${listRoomsState} (expected: ${CircuitState.HALF_OPEN})`);
        
        if (getRoomState !== listRoomsState) {
          console.log('  ✓ Circuits are properly isolated - failure in one endpoint does not affect others');
        } else {
          console.log('  ✗ Circuit isolation not working properly');
        }
      } else {
        console.log('  ✗ One or both circuits were not created');
      }
    }
    
    // Test 6: Manually tripping and resetting a circuit
    console.log('\nTest 6: Testing manual circuit control...');
    
    const manualTestCircuit = circuitBreakerRegistry.getOrCreate({
      name: 'manual.test',
      failureThreshold: 3,
      resetTimeout: 5000
    });
    
    console.log('  Initial state:', manualTestCircuit.getState());
    console.log('  Manually tripping the circuit...');
    manualTestCircuit.trip(new Error('Manual trip test'));
    console.log('  Circuit state after trip:', manualTestCircuit.getState());
    console.log(`  ${manualTestCircuit.getState() === CircuitState.OPEN ? '✓' : '✗'} Circuit was tripped properly`);
    
    console.log('  Manually resetting the circuit...');
    manualTestCircuit.reset();
    console.log('  Circuit state after reset:', manualTestCircuit.getState());
    console.log(`  ${manualTestCircuit.getState() === CircuitState.CLOSED ? '✓' : '✗'} Circuit was reset properly`);
    
    // Test 7: Check metrics
    console.log('\nTest 7: Checking metrics registration...');
    try {
      const metricsString = await metricsRegistry.getMetricsAsString();
      const hasCircuitMetrics = metricsString.includes('circuit_breaker');
      console.log(`  ${hasCircuitMetrics ? '✓' : '✗'} Circuit breaker metrics are being collected`);
      
      if (hasCircuitMetrics) {
        const lines = metricsString.split('\n').filter(line => line.includes('circuit_breaker'));
        console.log('  Sample circuit breaker metrics:');
        lines.slice(0, 5).forEach(line => console.log(`    ${line}`));
        if (lines.length > 5) {
          console.log(`    ... and ${lines.length - 5} more metrics`);
        }
      }
    } catch (err) {
      console.log('  ✗ Error getting metrics:', err.message);
    }
    
    console.log('\n=== Circuit Breaker Tests Complete ===');
    console.log('\nCircuit breaker registry status:');
    const allCircuits = circuitBreakerRegistry.getAll();
    console.log(`  Total circuits: ${allCircuits.length}`);
    allCircuits.forEach(circuit => {
      console.log(`  - ${circuit.getName()}: ${circuit.getState()}`);
    });
    
    console.log('\nYou can view the Prometheus metrics at http://localhost:3001/metrics');
    console.log('Press Ctrl+C to exit.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests
runTests();
