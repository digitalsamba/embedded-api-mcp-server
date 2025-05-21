/**
 * Simple MCP Connection Test Script
 * 
 * This script tests the connection to the API directly using fetch,
 * bypassing MCP and circuit breaker to diagnose connectivity issues.
 */

// Import required modules
import fetch from 'node-fetch';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

// Get API key from command line or environment
const apiKey = process.argv[2] || process.env.DIGITAL_SAMBA_API_KEY;
if (!apiKey) {
  console.error('Error: API key required. Please provide it as an argument or set DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

// API URL 
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';

// Test function to make API request
async function testApiConnection() {
  console.log(`Testing API connection to ${API_URL}`);
  console.log(`Using API key: ${apiKey.substring(0, 4)}...`);
  
  try {
    console.log('Attempting HEAD request...');
    const startTime = Date.now();
    
    // First try a HEAD request to check if the API is reachable
    const headResponse = await fetch(API_URL, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const headDuration = Date.now() - startTime;
    console.log(`HEAD request successful in ${headDuration}ms`);
    console.log(`Status: ${headResponse.status} ${headResponse.statusText}`);
    
    // Now try a simple GET request to list rooms
    console.log('\nAttempting GET /rooms request...');
    const getStartTime = Date.now();
    
    const getRoomsResponse = await fetch(`${API_URL}/rooms`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const getDuration = Date.now() - getStartTime;
    console.log(`GET request successful in ${getDuration}ms`);
    console.log(`Status: ${getRoomsResponse.status} ${getRoomsResponse.statusText}`);
    
    if (getRoomsResponse.ok) {
      const data = await getRoomsResponse.json();
      console.log(`Received ${data.data ? data.data.length : 0} rooms`);
    }
    
    console.log('\nAPI Connection Test: PASSED');
    console.log(`Total test duration: ${Date.now() - startTime}ms`);
    
    return true;
  } catch (error) {
    console.error(`\nAPI Connection Test: FAILED`);
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.error('Could not resolve hostname. Check your internet connection and DNS settings.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The server might be down or not accepting connections.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. The server might be slow or unresponsive.');
    }
    
    return false;
  }
}

// Run the test
console.log('Starting API connection test...');
testApiConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
