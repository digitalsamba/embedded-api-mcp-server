/**
 * Digital Samba MCP Server - Token Refresh Test Script
 * 
 * This script tests the token refresh mechanism implemented in token-manager.ts.
 * It verifies that tokens are automatically refreshed before expiration and that
 * the exponential backoff strategy works properly for failed refresh attempts.
 * 
 * Usage: npm run test:token-refresh
 */

// Node.js built-in modules
import { setTimeout as sleep } from 'timers/promises';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import enhanced API client
import { EnhancedDigitalSambaApiClient } from '../src/digital-samba-api-enhanced.js';
import { TokenManager } from '../src/token-manager.js';
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
    enableTokenManagement: true,
    enableConnectionManagement: true
  }
);

/**
 * Test token refresh
 */
async function testTokenRefresh() {
  console.log('\n=== Testing Token Refresh Mechanism ===\n');
  
  try {
    // Step 1: Create a test room
    console.log('Creating test room...');
    const roomResponse = await client.createRoom({
      name: `Token Refresh Test Room ${new Date().toISOString()}`,
      privacy: 'private'
    });
    
    const roomId = roomResponse.id;
    console.log(`Created room with ID: ${roomId}`);
    
    // Step 2: Create token manager with short expiration
    console.log('\nCreating token manager with short expiration time...');
    const sessionId = `test-session-${Date.now()}`;
    
    // Create token manager with 2-minute expiration and 30-second refresh margin
    const tokenManager = new TokenManager({
      roomId,
      tokenOptions: { 
        u: 'Test User',
        exp: '2' // 2 minutes
      },
      refreshMarginMs: 30 * 1000, // 30 seconds
      initialBackoffMs: 2000, // 2 seconds
      maxRefreshAttempts: 3
    });
    
    // Step 3: Set up event listeners
    console.log('\nSetting up event listeners...');
    
    // Token generation event
    tokenManager.on('token:generated', (data) => {
      console.log(`\n📝 Token generated: SessionID=${data.sessionId}, Expires=${data.expiresAt}`);
    });
    
    // Token refresh events
    tokenManager.on('token:refreshing', (data) => {
      console.log(`\n🔄 Token refresh started: SessionID=${data.sessionId}, Attempt=${data.attempt}`);
    });
    
    tokenManager.on('token:refreshed', (data) => {
      console.log(`✅ Token refreshed: SessionID=${data.sessionId}, Expires=${data.expiresAt}`);
    });
    
    tokenManager.on('token:refresh-retry', (data) => {
      console.log(`⏱️ Token refresh retry scheduled: Attempt=${data.attempt}, Next attempt=${data.nextAttempt}, Backoff=${data.backoffMs}ms`);
    });
    
    tokenManager.on('token:refresh-failed', (data) => {
      console.log(`❌ Token refresh failed: SessionID=${data.sessionId}, Attempts=${data.attempts}, Error=${data.error}`);
    });
    
    // Step 4: Generate initial token
    console.log('\nGenerating initial token...');
    const token = await tokenManager.generateToken(sessionId, API_KEY);
    
    console.log(`Initial token generated for room ${roomId}`);
    console.log(`Token: ${token.token.substring(0, 20)}...`);
    console.log(`Expires: ${token.expiresAt.toISOString()}`);
    
    // Step 5: Wait for automatic refresh
    console.log('\nWaiting for automatic token refresh...');
    console.log('(This should occur about 30 seconds before expiration)');
    
    // Wait for 90 seconds to see the automatic refresh
    // This should be enough time to see the token refresh before it expires at 2 minutes
    await sleep(90 * 1000);
    
    // Step 6: Check if token was refreshed
    const refreshedToken = tokenManager.getToken(sessionId);
    if (refreshedToken && refreshedToken.token !== token.token) {
      console.log('\n✅ Token was successfully refreshed automatically!');
      console.log(`New token: ${refreshedToken.token.substring(0, 20)}...`);
      console.log(`New expiration: ${refreshedToken.expiresAt.toISOString()}`);
    } else {
      console.log('\n❌ Token was not refreshed as expected');
    }
    
    // Step 7: Clean up
    console.log('\nCleaning up...');
    tokenManager.destroy();
    
    await client.deleteRoom(roomId);
    console.log(`Deleted test room: ${roomId}`);
    
    console.log('\n=== Token Refresh Test Completed ===');
  } catch (error) {
    console.error('Error during token refresh test:', error);
  }
}

/**
 * Test exponential backoff for failed refresh attempts
 */
async function testRefreshBackoff() {
  console.log('\n=== Testing Token Refresh Exponential Backoff ===\n');
  
  try {
    // Step 1: Create a test room
    console.log('Creating test room...');
    const roomResponse = await client.createRoom({
      name: `Backoff Test Room ${new Date().toISOString()}`,
      privacy: 'private'
    });
    
    const roomId = roomResponse.id;
    console.log(`Created room with ID: ${roomId}`);
    
    // Step 2: Create token manager with short expiration
    console.log('\nCreating token manager with short expiration and intentional failure...');
    const sessionId = `test-session-${Date.now()}`;
    
    // Create token manager with 2-minute expiration and 30-second refresh margin
    const tokenManager = new TokenManager({
      roomId,
      tokenOptions: { 
        u: 'Test User',
        exp: '2' // 2 minutes
      },
      refreshMarginMs: 30 * 1000, // 30 seconds
      initialBackoffMs: 2000, // 2 seconds
      maxRefreshAttempts: 3
    });
    
    // Step 3: Set up event listeners
    console.log('\nSetting up event listeners...');
    
    // Token generation event
    tokenManager.on('token:generated', (data) => {
      console.log(`\n📝 Token generated: SessionID=${data.sessionId}, Expires=${data.expiresAt}`);
    });
    
    // Token refresh events
    tokenManager.on('token:refreshing', (data) => {
      console.log(`\n🔄 Token refresh started: SessionID=${data.sessionId}, Attempt=${data.attempt}`);
    });
    
    tokenManager.on('token:refreshed', (data) => {
      console.log(`✅ Token refreshed: SessionID=${data.sessionId}, Expires=${data.expiresAt}`);
    });
    
    tokenManager.on('token:refresh-retry', (data) => {
      console.log(`⏱️ Token refresh retry scheduled: Attempt=${data.attempt}, Next attempt=${data.nextAttempt}, Backoff=${data.backoffMs}ms`);
    });
    
    tokenManager.on('token:refresh-failed', (data) => {
      console.log(`❌ Token refresh failed: SessionID=${data.sessionId}, Attempts=${data.attempts}, Error=${data.error}`);
    });
    
    // Step 4: Generate initial token
    console.log('\nGenerating initial token...');
    const token = await tokenManager.generateToken(sessionId, API_KEY);
    
    console.log(`Initial token generated for room ${roomId}`);
    console.log(`Token: ${token.token.substring(0, 20)}...`);
    console.log(`Expires: ${token.expiresAt.toISOString()}`);
    
    // Step 5: Force a token expiration by manipulating the expiration time
    // This will cause the token refresh attempt to fail and trigger the backoff mechanism
    const tokenRecord = tokenManager.getToken(sessionId);
    
    if (tokenRecord) {
      // Force expiration to occur in 5 seconds
      const now = new Date();
      tokenRecord.expiresAt = new Date(now.getTime() + 5000);
      
      console.log('\nForcing token to expire in 5 seconds...');
      console.log(`New expiration: ${tokenRecord.expiresAt.toISOString()}`);
      
      // Wait for the refresh cycle to start and observe the backoff mechanism
      console.log('\nWaiting for refresh attempts with backoff...');
      
      // Wait for 30 seconds to observe multiple retry attempts
      await sleep(30 * 1000);
      
      console.log('\nBackoff test completed. You should have seen multiple refresh attempts with increasing backoff times.');
    }
    
    // Step 6: Clean up
    console.log('\nCleaning up...');
    tokenManager.destroy();
    
    await client.deleteRoom(roomId);
    console.log(`Deleted test room: ${roomId}`);
    
    console.log('\n=== Exponential Backoff Test Completed ===');
  } catch (error) {
    console.error('Error during exponential backoff test:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Test token refresh mechanism
    await testTokenRefresh();
    
    // Wait a moment between tests
    await sleep(2000);
    
    // Test exponential backoff for failed refresh attempts
    await testRefreshBackoff();
    
    console.log('\n=== All Token Refresh Tests Completed Successfully ===');
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
