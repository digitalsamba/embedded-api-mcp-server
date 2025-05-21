#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Only output to stderr, never stdout
console.log = (...args) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.info = (...args) => process.stderr.write(`[INFO] ${args.join(' ')}\n`);
console.warn = (...args) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
console.debug = (...args) => process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);

// Get API key from environment or argument
const apiKey = process.env.DIGITAL_SAMBA_API_KEY || process.argv[2];
const apiUrl = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1';

if (!apiKey) {
  console.error('No API key provided. Please provide an API key as an argument or set DIGITAL_SAMBA_API_KEY environment variable.');
  process.exit(1);
}

// Create MCP server
const server = new McpServer({
  name: "Digital Samba MCP Server",
  version: "1.0.0-beta"
});

// Basic room listing resource
server.resource(
  'rooms',
  'digitalsamba://rooms',
  async (uri) => {
    console.info('Listing rooms');
    try {
      // Simple mock response for now
      const mockRooms = [
        { id: 'room-1', name: 'Meeting Room 1', status: 'active' },
        { id: 'room-2', name: 'Conference Room', status: 'inactive' }
      ];
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(mockRooms, null, 2)
        }]
      };
    } catch (error) {
      console.error('Error fetching rooms', error);
      throw error;
    }
  }
);

// Create room tool
server.tool(
  'create-room',
  {
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    privacy: z.enum(['public', 'private']).default('public'),
  },
  async (params) => {
    const { name, description, privacy } = params;
    
    console.info('Creating room', { 
      roomName: name, 
      privacy
    });
    
    try {
      // Mock room creation
      const roomId = `room-${Math.floor(Math.random() * 1000)}`;
      const room = {
        id: roomId,
        name: name || 'New Room',
        description: description || '',
        privacy: privacy || 'public',
        created_at: new Date().toISOString()
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error creating room', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error creating room: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server with stdio transport
console.info('Starting Digital Samba MCP Server...');
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.info('Server connected to transport');
}).catch(error => {
  console.error('Error connecting server to transport:', error);
});
