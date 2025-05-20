/**
 * Test script for rate limiting and caching
 * 
 * This script tests the rate limiting and caching features of the Digital Samba MCP Server.
 * 
 * - Rate limiting: Tests that the server correctly limits the number of requests per minute
 * - Caching: Tests that the server correctly caches API responses
 */

// Load environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3333';
process.env.ENABLE_RATE_LIMITING = 'true';
process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '5'; // Low limit for testing
process.env.ENABLE_CACHE = 'true';
process.env.CACHE_TTL = '60000'; // 1 minute

// Import required modules
import http from 'http';
import express from 'express';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { createServer } from './dist/src/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import apiKeyContext, { extractApiKey } from './dist/src/auth.js';
import { createApiKeyRateLimiter } from './dist/src/rate-limiter.js';
import logger from './dist/src/logger.js';

// Configuration
const PORT = 3333;
const HOST = 'localhost';
const API_KEY = 'test-api-key';
const NUM_REQUESTS = 10;

// Create HTTP server
function createHttpServer() {
  // Create the MCP server
  const { server, apiUrl, webhookEndpoint, publicUrl, cache } = createServer({
    port: PORT,
    publicUrl: `http://localhost:${PORT}`,
    enableRateLimiting: true,
    rateLimitRequestsPerMinute: 5, // Set a low limit for testing
    enableCache: true,
    cacheTtl: 60000 // 1 minute
  });

  // Create Express app
  const app = express();
  app.use(express.json());

  // Map to store transports by session ID
  const transports = {};

  // Add rate limiting middleware
  app.use('/mcp', createApiKeyRateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests from this API key, please try again later.'
  }));

  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (req, res) => {
    try {
      // Extract API key from Authorization header
      const apiKey = extractApiKey(req);
      
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'];
      let transport;
      
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        
        // Update API key if provided
        if (apiKey) {
          apiKeyContext.setApiKey(sessionId, apiKey);
        }
      } else {
        // Create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
            
            // Store API key in the context if provided
            if (apiKey) {
              apiKeyContext.setApiKey(sessionId, apiKey);
            }
          },
        });
        
        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            apiKeyContext.removeApiKey(transport.sessionId);
            delete transports[transport.sessionId];
          }
        };
        
        // Connect to the MCP server
        await server.connect(transport);
      }
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      // Extract API key from Authorization header
      const apiKey = extractApiKey(req);
      if (apiKey) {
        apiKeyContext.setApiKey(sessionId, apiKey);
      }
      
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  };

  // Handle GET and DELETE requests
  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Start listening
  httpServer.listen(PORT, HOST);

  return httpServer;
}

// Helper function to send MCP requests
async function sendMcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    });

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 429) {
            // Rate limited
            resolve({ 
              rateLimited: true, 
              statusCode: 429 
            });
          } else {
            // Parse response
            const parsedData = JSON.parse(responseData);
            resolve({
              rateLimited: false,
              statusCode: res.statusCode,
              ...parsedData
            });
          }
        } catch (e) {
          reject(new Error(`Error parsing response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Initialize the MCP server
async function initialize() {
  return sendMcpRequest('initialize', {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    }
  });
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
      const response = await sendMcpRequest('listResources');
      
      if (response.rateLimited) {
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
    return true;
  } else {
    console.log('❌ Rate limiting doesn\'t seem to be active.');
    return false;
  }
}

// Test caching
async function testCaching() {
  console.log('\n=== Testing Caching ===');
  
  // First request - should be a cache miss
  console.log('Making first request (should be cache miss)...');
  const start1 = performance.now();
  
  await sendMcpRequest('listResources');
  
  const end1 = performance.now();
  const time1 = end1 - start1;
  
  console.log(`First request took ${time1.toFixed(2)}ms`);
  
  // Second request - should be a cache hit and faster
  console.log('Making second request (should be cache hit)...');
  const start2 = performance.now();
  
  await sendMcpRequest('listResources');
  
  const end2 = performance.now();
  const time2 = end2 - start2;
  
  console.log(`Second request took ${time2.toFixed(2)}ms`);
  
  // Compare times
  if (time2 < time1 * 0.8) { // 20% faster is considered a cache hit
    console.log(`✅ Caching is working! Second request was ${((1 - time2/time1) * 100).toFixed(2)}% faster.`);
    return true;
  } else {
    console.log('❓ Caching might not be active or effective.');
    return false;
  }
}

// Main test function
async function runTests() {
  let httpServer;
  
  try {
    console.log('Starting test server...');
    httpServer = createHttpServer();
    console.log(`Test server started on http://${HOST}:${PORT}/mcp`);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run rate limiting test
    const rateLimitingWorks = await testRateLimiting();
    
    // Wait for rate limiting to reset
    console.log('\nWaiting for rate limit to reset (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run caching test
    const cachingWorks = await testCaching();
    
    // Summarize results
    console.log('\n=== Test Results ===');
    console.log(`Rate Limiting: ${rateLimitingWorks ? '✅ Working' : '❌ Not Working'}`);
    console.log(`Caching: ${cachingWorks ? '✅ Working' : '❌ Not Working'}`);
    
    if (rateLimitingWorks && cachingWorks) {
      console.log('\n✅ All tests passed! Rate limiting and caching are working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    if (httpServer) {
      console.log('\nShutting down test server...');
      httpServer.close();
    }
  }
}

// Run the tests
runTests();
