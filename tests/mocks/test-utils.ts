/**
 * Test Utilities
 * 
 * Helper functions and utilities for testing the Digital Samba MCP Server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer, startServer } from '../../src/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { createMockApiServer } from './mock-api-server';
import { spawn } from 'child_process';
import { Server } from 'http';
import { AddressInfo } from 'net';
import logger from '../../src/logger';
import path from 'path';

/**
 * Create a test MCP client for connecting to the server
 * 
 * @param serverUrl - URL of the MCP server
 * @param apiKey - API key to use for authentication
 * @returns MCP client instance
 */
export async function createTestClient(serverUrl: string, apiKey: string): Promise<Client> {
  // Create client and transport
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });
  
  // Create Streamable HTTP transport
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  
  // Add authentication header
  transport.extraHeaders = {
    'Authorization': `Bearer ${apiKey}`,
  };
  
  // Connect client to transport
  await client.connect(transport);
  
  return client;
}

/**
 * Create a server with mock API client for testing
 * 
 * @param options - Server options
 * @returns MCP server and HTTP server
 */
export function createTestServer(options: {
  port?: number;
  apiUrl?: string;
  mockResponses?: any;
}) {
  const {
    port = 3000,
    apiUrl = 'https://mock-api.example.com/api/v1',
    mockResponses,
  } = options;
  
  // Mock the API client if mockResponses are provided
  if (mockResponses) {
    jest.mock('../../src/digital-samba-api', () => {
      return {
        DigitalSambaApiClient: jest.fn().mockImplementation(() => mockResponses),
      };
    });
  }
  
  // Create the server
  const serverConfig = createServer({
    port,
    apiUrl,
  });
  
  // Start the server
  const httpServer = startServer({
    port,
    apiUrl,
  });
  
  return { 
    server: serverConfig.server, 
    httpServer 
  };
}

/**
 * Start a mock API server and real MCP server for integration testing
 * 
 * @param options - Setup options
 * @returns Mock API server, MCP server, and test client
 */
export async function setupIntegrationTest(options: {
  mockApiPort?: number;
  mcpServerPort?: number;
  apiKey?: string;
  mockApiOptions?: {
    delayMs?: number;
    failureRate?: number;
    notFoundRate?: number;
  };
}) {
  const {
    mockApiPort = 8080,
    mcpServerPort = 3000,
    apiKey = 'test-api-key',
    mockApiOptions = {},
  } = options;
  
  // Start mock API server
  const mockApiServer = createMockApiServer({
    port: mockApiPort,
    ...mockApiOptions,
  });
  
  // Create MCP server pointing to mock API
  const { httpServer: mcpHttpServer } = createTestServer({
    port: mcpServerPort,
    apiUrl: `http://localhost:${mockApiPort}`,
  });
  
  // Create test client
  const client = await createTestClient(
    `http://localhost:${mcpServerPort}/mcp`,
    apiKey
  );
  
  return {
    mockApiServer: mockApiServer.server,
    mcpServer: mcpHttpServer,
    client,
  };
}

/**
 * Start an MCP server process for end-to-end testing
 * 
 * @param options - Server options
 * @returns Spawned process and server port
 */
export function startServerProcess(options: {
  port?: number;
  apiKey?: string;
  apiUrl?: string;
  enableCache?: boolean;
  enableRateLimiting?: boolean;
}) {
  const {
    port = 0, // Use 0 to get a random available port
    apiKey = 'test-api-key',
    apiUrl = 'https://api.digitalsamba.com/api/v1',
    enableCache = false,
    enableRateLimiting = false,
  } = options;
  
  // Build command-line arguments
  const args = [
    '--port', port.toString(),
    '--api-key', apiKey,
    '--api-url', apiUrl,
    '--log-level', 'info',
  ];
  
  if (enableCache) {
    args.push('--enable-cache');
  }
  
  if (enableRateLimiting) {
    args.push('--enable-rate-limiting');
  }
  
  // Start the server process
  const serverProcess = spawn('node', [
    path.join(__dirname, '../../dist/bin/cli.js'),
    ...args,
  ]);
  
  // Log output from the server process
  serverProcess.stdout.on('data', (data) => {
    logger.debug(`Server process stdout: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    logger.error(`Server process stderr: ${data}`);
  });
  
  // Wait for the server to start
  return new Promise<{ process: any; port: number }>((resolve, reject) => {
    let serverPort: number | null = null;
    let outputBuffer = '';
    
    // Parse output to find the port
    serverProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      
      // Look for the port in the output
      const match = outputBuffer.match(/running on port (\d+)/);
      if (match && match[1]) {
        serverPort = parseInt(match[1], 10);
        
        // Wait a bit more to ensure server is fully ready
        setTimeout(() => {
          resolve({
            process: serverProcess,
            port: serverPort!,
          });
        }, 1000);
      }
    });
    
    // Handle errors
    serverProcess.on('error', (err) => {
      reject(err);
    });
    
    // Handle timeout
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for server to start'));
    }, 10000);
    
    // Clear timeout when resolved
    serverProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Get a random available port
 * 
 * @returns Free port number
 */
export function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = require('http').createServer();
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => {
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

/**
 * Close servers and resources used in tests
 * 
 * @param servers - Servers to close
 */
export async function cleanupServers(servers: {
  mockApiServer?: Server;
  mcpServer?: Server;
  client?: Client;
  process?: any;
}) {
  const {
    mockApiServer,
    mcpServer,
    client,
    process,
  } = servers;
  
  // Close client
  if (client) {
    try {
      await (client as any).close();
    } catch (err) {
      logger.error('Error closing client:', { error: err });
    }
  }
  
  // Close MCP HTTP server
  if (mcpServer) {
    await new Promise<void>((resolve) => {
      mcpServer.close(() => resolve());
    });
  }
  
  // Close mock API server
  if (mockApiServer) {
    await new Promise<void>((resolve) => {
      mockApiServer.close(() => resolve());
    });
  }
  
  // Kill server process if it was spawned
  if (process) {
    process.kill();
  }
}
