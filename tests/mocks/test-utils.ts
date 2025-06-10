/**
 * Test Utilities
 * 
 * Helper functions and utilities for testing the Digital Samba MCP Server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { Server } from 'http';
import logger from '../../src/logger.js';
import path from 'path';

// Note: Jest transpiles to CommonJS, so we can't use import.meta.url
// We'll use process.cwd() and relative paths instead


/**
 * Start an MCP server process for testing
 * 
 * @param options - Server options
 * @returns Spawned process and client
 */
export async function startServerProcess(options: {
  apiKey?: string;
  apiUrl?: string;
  enableCache?: boolean;
  debugMode?: boolean;
}): Promise<{ process: ChildProcess; client: Client }> {
  const {
    apiKey = 'test-api-key',
    apiUrl = 'https://api.digitalsamba.com/api/v1',
    enableCache = false,
    debugMode = false,
  } = options;
  
  // Create client
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });
  
  // Set environment variables
  const env = {
    ...process.env,
    DIGITAL_SAMBA_API_KEY: apiKey,
    DIGITAL_SAMBA_API_URL: apiUrl,
    NODE_ENV: 'test',
  };
  
  if (debugMode) {
    env.DEBUG = 'mcp:*';
  }
  
  // Build command-line arguments
  const args = [path.join(process.cwd(), 'dist/src/index.js'), 'stdio'];
  
  if (enableCache) {
    args.push('--enable-cache');
  }
  
  // Create stdio transport
  const transport = new StdioClientTransport({
    command: 'node',
    args,
    env,
  });
  
  // Connect client to transport - this will spawn the server process
  await client.connect(transport);
  
  // Get the underlying process from the transport
  const serverProcess = (transport as any).process;
  
  // Log any errors from the server process
  if (serverProcess) {
    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error('Server stderr:', data.toString());
    });
    
    serverProcess.on('exit', (code: number) => {
      console.error('Server process exited with code:', code);
    });
  }
  
  return { process: serverProcess, client };
}

/**
 * Start a stdio server process using npx
 * 
 * @param options - Server options
 * @returns Spawned process
 */
export function startStdioServerProcess(options: {
  apiKey?: string;
  apiUrl?: string;
}): ChildProcess {
  const {
    apiKey = 'test-api-key',
    apiUrl = 'https://api.digitalsamba.com/api/v1',
  } = options;
  
  // Set environment variables
  const env = {
    ...process.env,
    DIGITAL_SAMBA_API_KEY: apiKey,
    DIGITAL_SAMBA_API_URL: apiUrl,
  };
  
  // Start server using npx command
  const serverProcess = spawn('npx', [
    '@digitalsamba/embedded-api-mcp-server',
  ], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  return serverProcess;
}

/**
 * Create a mock API server for integration testing
 * 
 * @param options - Setup options
 * @returns Mock API server
 */
export async function setupMockApiServer(options: {
  port?: number;
  delayMs?: number;
  failureRate?: number;
  notFoundRate?: number;
}): Promise<Server> {
  const { createMockApiServer } = await import('./mock-api-server.js');
  const mockServer = createMockApiServer(options);
  return mockServer.server;
}

/**
 * Setup integration test with mock API server
 * 
 * @param options - Setup options
 * @returns Mock API server, server process, and client
 */
export async function setupIntegrationTest(options: {
  mockApiPort?: number;
  apiKey?: string;
  mockApiOptions?: {
    delayMs?: number;
    failureRate?: number;
    notFoundRate?: number;
  };
}): Promise<{
  mockApiServer: Server;
  serverProcess: ChildProcess;
  client: Client;
}> {
  const {
    mockApiPort = 8080,
    apiKey = 'test-api-key',
    mockApiOptions = {},
  } = options;
  
  // Start mock API server
  const mockApiServer = await setupMockApiServer({
    port: mockApiPort,
    ...mockApiOptions,
  });
  
  // Start MCP server process pointing to mock API
  const { process: serverProcess, client } = await startServerProcess({
    apiKey,
    apiUrl: `http://localhost:${mockApiPort}`,
  });
  
  return {
    mockApiServer,
    serverProcess,
    client,
  };
}

/**
 * Wait for a condition to be true
 * 
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Check interval in milliseconds
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Clean up servers and resources used in tests
 * 
 * @param resources - Resources to clean up
 */
export async function cleanupResources(resources: {
  mockApiServer?: Server;
  serverProcess?: ChildProcess;
  client?: Client;
}): Promise<void> {
  const { mockApiServer, serverProcess, client } = resources;
  
  // Close client
  if (client) {
    try {
      await (client as any).close();
    } catch (err) {
      logger.debug('Error closing client:', { error: err });
    }
  }
  
  // Kill server process
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise<void>((resolve) => {
      serverProcess.on('exit', resolve);
      setTimeout(resolve, 1000); // Timeout after 1 second
    });
  }
  
  // Close mock API server
  if (mockApiServer) {
    await new Promise<void>((resolve) => {
      mockApiServer.close(() => resolve());
    });
  }
}

/**
 * Get output from a process
 * 
 * @param process - The process to get output from
 * @param timeout - Maximum time to wait for output
 * @returns Combined stdout and stderr output
 */
export async function getProcessOutput(
  process: ChildProcess,
  timeout = 2000
): Promise<string> {
  let output = '';
  
  // Collect output from stdout and stderr
  const collectOutput = (data: Buffer) => {
    output += data.toString();
  };
  
  process.stdout?.on('data', collectOutput);
  process.stderr?.on('data', collectOutput);
  
  // Wait for timeout
  await new Promise(resolve => setTimeout(resolve, timeout));
  
  // Remove listeners
  process.stdout?.removeListener('data', collectOutput);
  process.stderr?.removeListener('data', collectOutput);
  
  return output;
}