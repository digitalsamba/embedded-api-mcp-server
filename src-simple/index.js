import express from 'express';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { DigitalSambaApiClient } from './digital-samba-api.js';

// Create Express app
const app = express();
app.use(express.json());

// Configure environment
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const API_URL = process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/v1';

// Store active sessions
const sessions = {};

// -------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------

function createJsonRpcResponse(id, result) {
  return {
    jsonrpc: '2.0',
    result,
    id
  };
}

function createJsonRpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message
    },
    id
  };
}

// -------------------------------------------------------------------
// MCP endpoints
// -------------------------------------------------------------------

// Handle MCP initialize requests
app.post('/mcp', async (req, res) => {
  try {
    const body = req.body;
    
    // Check if this is an initialization request
    if (body.method === 'initialize') {
      const sessionId = randomUUID();
      
      // Store session data
      sessions[sessionId] = {
        id: sessionId,
        active: true,
        created: new Date().toISOString()
      };
      
      // Set session header
      res.setHeader('MCP-Session-ID', sessionId);
      
      // Return server capabilities
      return res.json(createJsonRpcResponse(body.id, {
        server: {
          name: 'Digital Samba MCP Server',
          version: '0.1.0'
        },
        capabilities: {
          resources: {},
          tools: {}
        }
      }));
    }
    
    // Check if this is a listResources request
    if (body.method === 'listResources') {
      return res.json(createJsonRpcResponse(body.id, {
        resources: [
          {
            uriTemplate: 'digitalsamba://rooms?apiKey={apiKey}',
            name: 'rooms',
            description: 'List all rooms'
          },
          {
            uriTemplate: 'digitalsamba://rooms/{roomId}?apiKey={apiKey}',
            name: 'room',
            description: 'Get details for a specific room'
          },
          {
            uriTemplate: 'digitalsamba://rooms/{roomId}/participants?apiKey={apiKey}',
            name: 'participants',
            description: 'List participants in a room'
          }
        ]
      }));
    }
    
    // Check if this is a listTools request
    if (body.method === 'listTools') {
      return res.json(createJsonRpcResponse(body.id, {
        tools: [
          {
            name: 'create-room',
            description: 'Create a new room',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Room name'
                },
                description: {
                  type: 'string',
                  description: 'Room description'
                },
                friendly_url: {
                  type: 'string',
                  description: 'Friendly URL for the room'
                },
                privacy: {
                  type: 'string',
                  enum: ['public', 'private'],
                  description: 'Room privacy'
                },
                max_participants: {
                  type: 'number',
                  description: 'Maximum number of participants'
                },
                apiKey: {
                  type: 'string',
                  description: 'Digital Samba API key'
                }
              },
              required: ['apiKey']
            }
          },
          {
            name: 'generate-token',
            description: 'Generate a token for joining a room',
            inputSchema: {
              type: 'object',
              properties: {
                roomId: {
                  type: 'string',
                  description: 'Room ID'
                },
                userName: {
                  type: 'string',
                  description: 'User name'
                },
                role: {
                  type: 'string',
                  description: 'User role'
                },
                externalId: {
                  type: 'string',
                  description: 'External user ID'
                },
                apiKey: {
                  type: 'string',
                  description: 'Digital Samba API key'
                }
              },
              required: ['roomId', 'apiKey']
            }
          }
        ]
      }));
    }
    
    // Check if this is a callTool request
    if (body.method === 'callTool') {
      const { name, arguments: args } = body.params;
      
      // Handle create-room tool
      if (name === 'create-room') {
        const { apiKey, name: roomName, description, friendly_url, privacy, max_participants } = args;
        
        if (!apiKey) {
          return res.json(createJsonRpcError(body.id, -32602, 'API key is required'));
        }
        
        try {
          // Create API client with the provided key
          const client = new DigitalSambaApiClient(apiKey, API_URL);
          
          // Create room settings object
          const roomSettings = {
            name: roomName,
            description,
            friendly_url,
            privacy,
            max_participants,
          };
          
          // Create room
          const room = await client.createRoom(roomSettings);
          
          return res.json(createJsonRpcResponse(body.id, {
            content: [
              {
                type: 'text',
                text: `Room created successfully!\n\n${JSON.stringify(room, null, 2)}`
              }
            ]
          }));
        } catch (error) {
          console.error(`Error creating room: ${error.message}`);
          
          return res.json(createJsonRpcError(body.id, -32000, `Error creating room: ${error.message}`));
        }
      }
      
      // Handle generate-token tool
      if (name === 'generate-token') {
        const { apiKey, roomId, userName, role, externalId } = args;
        
        if (!apiKey) {
          return res.json(createJsonRpcError(body.id, -32602, 'API key is required'));
        }
        
        if (!roomId) {
          return res.json(createJsonRpcError(body.id, -32602, 'Room ID is required'));
        }
        
        try {
          // Create API client with the provided key
          const client = new DigitalSambaApiClient(apiKey, API_URL);
          
          // Generate token options
          const tokenOptions = {
            u: userName,
            role,
            ud: externalId,
          };
          
          // Generate token
          const token = await client.generateRoomToken(roomId, tokenOptions);
          
          return res.json(createJsonRpcResponse(body.id, {
            content: [
              {
                type: 'text',
                text: `Token generated successfully!\n\n${JSON.stringify(token, null, 2)}`
              }
            ]
          }));
        } catch (error) {
          console.error(`Error generating token: ${error.message}`);
          
          return res.json(createJsonRpcError(body.id, -32000, `Error generating token: ${error.message}`));
        }
      }
      
      // Unknown tool
      return res.json(createJsonRpcError(body.id, -32601, `Unknown tool: ${name}`));
    }
    
    // Check if this is a readResource request
    if (body.method === 'readResource') {
      const { uri } = body.params;
      
      try {
        // Parse the URI
        const url = new URL(uri);
        
        // Extract the API key
        const apiKey = url.searchParams.get('apiKey');
        
        if (!apiKey) {
          return res.json(createJsonRpcError(body.id, -32602, 'API key is required'));
        }
        
        // Create API client with the provided key
        const client = new DigitalSambaApiClient(apiKey, API_URL);
        
        // Handle different resource types based on the URI path
        const pathParts = url.pathname.split('/').filter(part => part);
        
        // List rooms
        if (pathParts.length === 0) {
          const rooms = await client.listRooms();
          
          return res.json(createJsonRpcResponse(body.id, {
            contents: rooms.map(room => ({
              uri: `digitalsamba://rooms/${room.id}?apiKey=${apiKey}`,
              text: JSON.stringify(room, null, 2)
            }))
          }));
        }
        
        // Get room details
        if (pathParts.length === 1) {
          const roomId = pathParts[0];
          const room = await client.getRoom(roomId);
          
          return res.json(createJsonRpcResponse(body.id, {
            contents: [
              {
                uri: uri,
                text: JSON.stringify(room, null, 2)
              }
            ]
          }));
        }
        
        // List participants
        if (pathParts.length === 2 && pathParts[1] === 'participants') {
          const roomId = pathParts[0];
          const participants = await client.listParticipants(roomId);
          
          return res.json(createJsonRpcResponse(body.id, {
            contents: participants.map(participant => ({
              uri: `digitalsamba://rooms/${roomId}/participants/${participant.id}?apiKey=${apiKey}`,
              text: JSON.stringify(participant, null, 2)
            }))
          }));
        }
        
        // Unknown resource
        return res.json(createJsonRpcError(body.id, -32601, `Unknown resource: ${uri}`));
      } catch (error) {
        console.error(`Error reading resource: ${error.message}`);
        
        return res.json(createJsonRpcError(body.id, -32000, `Error reading resource: ${error.message}`));
      }
    }
    
    // Unknown method
    return res.json(createJsonRpcError(body.id, -32601, `Method not found: ${body.method}`));
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    if (!res.headersSent) {
      res.status(500).json(createJsonRpcError(null, -32603, 'Internal server error'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Digital Samba MCP Server is running'
  });
});

// Start the server
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Digital Samba MCP Server running on port ${PORT}`);
  console.log(`Digital Samba API URL: ${API_URL}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  process.exit(0);
});