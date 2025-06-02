#!/usr/bin/env node

/**
 * Digital Samba MCP Server
 * 
 * A Model Context Protocol server that provides AI assistants with tools
 * to interact with Digital Samba's video conferencing API.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ErrorCode, 
  ListResourcesRequestSchema, 
  ListToolsRequestSchema, 
  McpError, 
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

// Local imports
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';

// Import resources and tools
import { registerRoomResources, handleRoomResource } from './resources/rooms/index.js';
import { registerSessionResources, handleSessionResource } from './resources/sessions/index.js';
import { registerAnalyticsResources, handleAnalyticsResource } from './resources/analytics/index.js';
import { registerRecordingResources, handleRecordingResource } from './resources/recordings-adapter.js';
import { ExportResources, registerExportResources } from './resources/exports/index.js';
import { registerContentResources, handleContentResource } from './resources/content/index.js';

import { registerRoomTools, executeRoomTool } from './tools/room-management/index.js';
import { registerSessionTools, executeSessionTool } from './tools/session-management/index.js';
import { registerRecordingTools, executeRecordingTool } from './tools/recording-tools-adapter.js';
import { registerAnalyticsTools, executeAnalyticsTool } from './tools/analytics-tools/index.js';
import { registerLiveSessionTools, executeLiveSessionTool } from './tools/live-session-controls/index.js';
import { registerCommunicationTools, executeCommunicationTool } from './tools/communication-management/index.js';
import { registerPollTools, executePollTool } from './tools/poll-management/index.js';
import { registerLibraryTools, executeLibraryTool } from './tools/library-management/index.js';
import { registerRoleTools, executeRoleTool } from './tools/role-management/index.js';

// Create MCP server
const server = new Server({
  name: 'digital-samba',
  version: '1.0.0'
}, {
  capabilities: {
    resources: {},
    tools: {}
  }
});

// API client instance (created per request with API key)
let apiClient: DigitalSambaApiClient | null = null;

/**
 * Get or create API client with the provided API key
 */
function getApiClient(apiKey: string): DigitalSambaApiClient {
  if (!apiClient) {
    const baseUrl = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';
    apiClient = new DigitalSambaApiClient(apiKey, baseUrl);
  }
  return apiClient;
}

// Register handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // For listing resources, we don't need an API key - just return the schema
  // API key will be checked when actually reading resources
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  
  // Create a dummy client if needed for analytics registration
  let client = null;
  if (apiKey) {
    client = getApiClient(apiKey);
  }
  
  return {
    resources: [
      ...registerRoomResources(),
      ...registerSessionResources(),
      ...registerRecordingResources(),
      ...(client ? registerAnalyticsResources(client) : []),
      ...registerExportResources(),
      ...registerContentResources()
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  if (!apiKey) {
    throw new McpError(ErrorCode.InvalidRequest, 'DIGITAL_SAMBA_API_KEY not configured');
  }

  const client = getApiClient(apiKey);
  const { uri } = request.params;
  
  logger.debug(`Reading resource: ${uri}`);
  
  // Route to appropriate handler based on URI prefix
  if (uri.startsWith('digitalsamba://rooms')) {
    return handleRoomResource(uri, {}, request, { apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1' });
  } else if (uri.startsWith('digitalsamba://sessions')) {
    return handleSessionResource(uri, {}, request, { apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1' });
  } else if (uri.startsWith('digitalsamba://recordings')) {
    return handleRecordingResource(uri, client);
  } else if (uri.startsWith('digitalsamba://analytics')) {
    return handleAnalyticsResource(uri, client);
  } else if (uri.startsWith('digitalsamba://exports')) {
    const exportResources = new ExportResources(client);
    return exportResources.handleResourceRequest(uri);
  } else if (uri.startsWith('digitalsamba://content')) {
    return handleContentResource(uri, client);
  }
  
  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // For listing tools, we don't need an API key - just return the schema
  // API key will be checked when actually executing tools
  return {
    tools: [
      ...registerRoomTools(),
      ...registerSessionTools(),
      ...registerRecordingTools(),
      ...registerAnalyticsTools(),
      ...registerLiveSessionTools(),
      ...registerCommunicationTools(),
      ...registerPollTools(),
      ...registerLibraryTools(),
      ...registerRoleTools()
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const apiKey = process.env.DIGITAL_SAMBA_API_KEY;
  if (!apiKey) {
    throw new McpError(ErrorCode.InvalidRequest, 'DIGITAL_SAMBA_API_KEY not configured');
  }

  const client = getApiClient(apiKey);
  const { name, arguments: args } = request.params;
  
  logger.debug(`Executing tool: ${name}`);
  
  try {
    // Route to appropriate tool handler based on name
    // Room management tools
    if (name === 'create-room' || name === 'update-room' || 
        name === 'delete-room' || name === 'generate-token') {
      return await executeRoomTool(name, args || {}, request, {
        apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1'
      });
    } 
    // Analytics tools
    else if (name === 'get-participant-statistics' || name === 'get-room-analytics' || 
             name === 'get-usage-statistics') {
      return await executeAnalyticsTool(name, args || {}, client);
    } 
    // Session management tools
    else if (name === 'end-session' || name === 'get-session-summary' ||
             name === 'get-all-room-sessions' || name === 'hard-delete-session-resources' ||
             name === 'bulk-delete-session-data' || name === 'get-session-statistics') {
      return await executeSessionTool(name, args || {}, client, request);
    } 
    // Recording management tools
    else if (name.includes('recording') || name === 'get-recordings' || 
             name === 'archive-recording' || name === 'unarchive-recording') {
      return await executeRecordingTool(name, args || {}, client);
    } 
    // Live session control tools
    else if (name === 'start-transcription' || name === 'stop-transcription' ||
             name === 'phone-participants-joined' || name === 'phone-participants-left') {
      return await executeLiveSessionTool(name, args || {}, client);
    } 
    // Communication management tools
    else if (name.includes('-chats') || name.includes('-qa') || 
             name.includes('-transcripts') || name.includes('-summaries')) {
      return await executeCommunicationTool(name, args || {}, client);
    } 
    // Poll management tools
    else if (name.includes('poll')) {
      return await executePollTool(name, args || {}, client);
    } 
    // Library management tools
    else if (name.includes('library') || name.includes('webapp') || 
             name.includes('whiteboard') || name === 'get-file-links') {
      return await executeLibraryTool(name, args || {}, client);
    }
    // Role management tools
    else if (name.includes('role') || name === 'get-permissions') {
      return await executeRoleTool(name, args || {}, client);
    }
    
    throw new McpError(ErrorCode.InvalidRequest, `Unknown tool: ${name}`);
  } catch (error: any) {
    logger.error(`Tool execution error: ${error.message}`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute tool ${name}: ${error.message}`
    );
  }
});

/**
 * Start the MCP server
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Check for API key in command line args
  const apiKeyArgIndex = args.findIndex(arg => arg === '--api-key' || arg === '-k');
  if (apiKeyArgIndex !== -1 && args[apiKeyArgIndex + 1]) {
    process.env.DIGITAL_SAMBA_API_KEY = args[apiKeyArgIndex + 1];
  }
  
  // Log API key status (don't exit if not found - it will be checked when needed)
  if (!process.env.DIGITAL_SAMBA_API_KEY) {
    logger.warn('DIGITAL_SAMBA_API_KEY not set. API key will be required for operations.');
  } else {
    logger.info('API key configured');
  }
  
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  logger.info('Digital Samba MCP Server started');
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down Digital Samba MCP Server...');
    await server.close();
    process.exit(0);
  });
}

// Export main for programmatic use
export { main };

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}