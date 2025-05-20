/**
 * Digital Samba MCP Server - Metrics Test
 * 
 * This script tests the metrics functionality of the Digital Samba MCP Server.
 * It starts a server instance with metrics enabled, sends various requests,
 * and then fetches the metrics endpoint to verify that metrics are being collected.
 */

// Node.js built-in modules
const http = require('http');
const { env } = require('process');

// Set environment variables for testing
env.MCP_FORCE_START = 'false';
env.ENABLE_METRICS = 'true';
env.METRICS_PREFIX = 'digital_samba_test_';
env.PORT = '3001';

// Import server creator from library
const { startServer } = require('../dist/src/index.js');

// Create a test Digital Samba API server
console.log('Starting MCP Server with metrics enabled...');

// Start the server
const server = startServer({
  port: 3001,
  enableMetrics: true,
  metricsPrefix: 'digital_samba_test_',
  collectDefaultMetrics: true,
  enableRateLimiting: true,
  enableCache: true
});

// Allow server to start
setTimeout(() => {
  console.log('\n--- Sending test requests ---');
  
  // Function to make a GET request
  const makeRequest = (path, callback) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-api-key'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        callback(res.statusCode, data);
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error making request to ${path}:`, error.message);
    });
    
    req.end();
  };
  
  // Make a request to the health endpoint
  makeRequest('/health', (statusCode, data) => {
    console.log(`Health endpoint returned status: ${statusCode}`);
    console.log('Health data:', data);
    
    // Now make an MCP request to generate metrics
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key'
      }
    };
    
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        capabilities: {
          resources: {},
          tools: {}
        }
      },
      id: 1
    });
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`MCP initialize request returned status: ${res.statusCode}`);
        console.log('MCP initialize response:', data.length > 100 ? data.substring(0, 100) + '...' : data);
        
        // After some requests, check the metrics endpoint
        setTimeout(() => {
          console.log('\n--- Checking metrics endpoint ---');
          
          makeRequest('/metrics', (statusCode, data) => {
            console.log(`Metrics endpoint returned status: ${statusCode}`);
            
            // Show a summary of metrics
            if (statusCode === 200) {
              const metricLines = data.split('\n').filter(line => 
                !line.startsWith('#') && line.trim() !== ''
              );
              
              console.log(`\nFound ${metricLines.length} metrics. Samples:`);
              
              // Show a few metrics as examples
              const sampleMetrics = metricLines.filter(line => 
                line.includes('http_requests_total') || 
                line.includes('active_sessions') || 
                line.includes('app_info')
              );
              
              sampleMetrics.forEach(metric => {
                console.log(metric);
              });
              
              console.log(`\nMetrics test ${sampleMetrics.length > 0 ? 'PASSED' : 'FAILED'}`);
            } else {
              console.log('Failed to retrieve metrics');
            }
            
            // Shutdown after tests complete
            console.log('\nTests completed, shutting down server...');
            server.close(() => {
              console.log('Server closed');
              process.exit(0);
            });
          });
        }, 1000);
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making MCP request:', error.message);
      process.exit(1);
    });
    
    req.write(postData);
    req.end();
  });
}, 2000);

// Set a timeout to ensure the test doesn't hang
setTimeout(() => {
  console.error('Test timeout reached, exiting...');
  process.exit(1);
}, 15000);
