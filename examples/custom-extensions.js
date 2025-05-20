/**
 * Custom Tools and Resources for Digital Samba MCP Server
 * 
 * This example demonstrates how to extend the Digital Samba MCP server
 * with custom tools and resources.
 */

// Import required modules
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { DigitalSambaApiClient } from 'digital-samba-mcp/client';

// Initialize Express app
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Initialize Digital Samba API client
const apiClient = new DigitalSambaApiClient({
  apiKey: process.env.DIGITAL_SAMBA_API_KEY,
  baseUrl: process.env.DIGITAL_SAMBA_API_URL
});

// Create a custom MCP server
const server = new McpServer({
  name: 'Extended Digital Samba MCP Server',
  version: '1.0.0'
});

// Store transports for session management
const transports = {};

// Example 1: Custom Resource - Meeting Analytics
server.resource(
  'meeting-analytics',
  new ResourceTemplate('analytics://{roomId}', { list: undefined }),
  async (uri, { roomId }) => {
    try {
      // Fetch room details
      const room = await apiClient.getRoom(roomId);
      
      // Fetch participants
      const participants = await apiClient.listParticipants(roomId);
      
      // Fetch recordings (if any)
      const recordings = await apiClient.listRecordings(roomId);
      
      // Generate analytics
      const analytics = {
        roomName: room.name,
        participantCount: participants.length,
        recordingCount: recordings.length,
        activeTime: room.activeTime || 0,
        timestamp: new Date().toISOString()
      };
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(analytics, null, 2)
        }]
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: 'Failed to fetch analytics' }, null, 2)
        }]
      };
    }
  }
);

// Example 2: Custom Tool - Breakout Room Assignment Optimizations
server.tool(
  'optimize-breakout-rooms',
  {
    roomId: z.string(),
    groupCount: z.number().min(2).max(10),
    strategy: z.enum(['random', 'balanced', 'skill-based'])
  },
  async ({ roomId, groupCount, strategy }) => {
    try {
      // Fetch current participants
      const participants = await apiClient.listParticipants(roomId);
      
      if (participants.length === 0) {
        return {
          content: [{ type: 'text', text: 'No participants to assign to breakout rooms.' }]
        };
      }
      
      // Implement optimization strategies
      let groups = [];
      
      switch (strategy) {
        case 'random':
          // Random assignment
          groups = assignRandomGroups(participants, groupCount);
          break;
        case 'balanced':
          // Balanced group sizes
          groups = assignBalancedGroups(participants, groupCount);
          break;
        case 'skill-based':
          // This would require additional participant metadata
          // For this example, we'll simulate skill-based grouping
          groups = assignSkillBasedGroups(participants, groupCount);
          break;
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            strategy,
            groups,
            summary: `Created ${groups.length} groups with ${participants.length} total participants`
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Error optimizing breakout rooms:', error);
      return {
        content: [{
          type: 'text',
          text: `Error optimizing breakout rooms: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Example 3: Custom Resource - Meeting Templates
server.resource(
  'meeting-templates',
  new ResourceTemplate('templates://{templateId?}', { list: true }),
  async (uri, { templateId }) => {
    try {
      // If templateId is provided, return specific template
      if (templateId) {
        const template = getMeetingTemplate(templateId);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(template, null, 2)
          }]
        };
      }
      
      // Otherwise list all templates
      const templates = listMeetingTemplates();
      return {
        contents: templates.map(template => ({
          uri: `templates://${template.id}`,
          text: JSON.stringify(template, null, 2)
        }))
      };
    } catch (error) {
      console.error('Error accessing meeting templates:', error);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: 'Failed to access meeting templates' }, null, 2)
        }]
      };
    }
  }
);

// Example 4: Custom Tool - Create Meeting from Template
server.tool(
  'create-from-template',
  {
    templateId: z.string(),
    name: z.string().optional(),
    scheduledTime: z.string().optional(), // ISO date string
    duration: z.number().optional(), // minutes
    participantEmails: z.array(z.string()).optional()
  },
  async ({ templateId, name, scheduledTime, duration, participantEmails }) => {
    try {
      // Get template
      const template = getMeetingTemplate(templateId);
      
      if (!template) {
        return {
          content: [{ type: 'text', text: `Template not found: ${templateId}` }],
          isError: true
        };
      }
      
      // Create meeting based on template
      const meetingDetails = {
        name: name || template.name,
        description: template.description,
        settings: template.settings,
        scheduledTime: scheduledTime || new Date().toISOString(),
        duration: duration || template.defaultDuration || 60,
        participants: participantEmails ? participantEmails.map(email => ({ email })) : []
      };
      
      // Call API to create meeting
      const meeting = await apiClient.createMeeting(meetingDetails);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `Meeting created from template: ${template.name}`,
            meetingId: meeting.id,
            meetingDetails: meeting
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Error creating meeting from template:', error);
      return {
        content: [{
          type: 'text',
          text: `Error creating meeting from template: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Handle MCP routes
app.all('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (req.method === 'POST' && req.body?.method === 'initialize') {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };
      }
    });
    await server.connect(transport);
  } else {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Invalid session or request'
      },
      id: null
    });
  }

  await transport.handleRequest(req, res, req.method === 'POST' ? req.body : undefined);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Extended MCP Server is running on http://localhost:${PORT}/mcp`);
});

// Helper functions for the examples
function assignRandomGroups(participants, groupCount) {
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  const groups = Array.from({ length: groupCount }, () => []);
  
  shuffled.forEach((participant, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].push({
      id: participant.id,
      name: participant.name
    });
  });
  
  return groups;
}

function assignBalancedGroups(participants, groupCount) {
  const groups = Array.from({ length: groupCount }, () => []);
  const participantsPerGroup = Math.floor(participants.length / groupCount);
  const remainder = participants.length % groupCount;
  
  let participantIndex = 0;
  
  for (let i = 0; i < groupCount; i++) {
    const groupSize = i < remainder ? participantsPerGroup + 1 : participantsPerGroup;
    
    for (let j = 0; j < groupSize; j++) {
      if (participantIndex < participants.length) {
        groups[i].push({
          id: participants[participantIndex].id,
          name: participants[participantIndex].name
        });
        participantIndex++;
      }
    }
  }
  
  return groups;
}

function assignSkillBasedGroups(participants, groupCount) {
  // Simulate skill levels (in a real application, this would come from user data)
  const participantsWithSkills = participants.map(p => ({
    id: p.id,
    name: p.name,
    skillLevel: Math.floor(Math.random() * 5) + 1 // Random skill 1-5
  }));
  
  // Sort by skill level
  const sorted = [...participantsWithSkills].sort((a, b) => b.skillLevel - a.skillLevel);
  
  // Create groups with distributed skill levels
  const groups = Array.from({ length: groupCount }, () => []);
  
  sorted.forEach((participant, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].push({
      id: participant.id,
      name: participant.name,
      skillLevel: participant.skillLevel
    });
  });
  
  return groups;
}

// Mock meeting templates (in a real app, this would be stored in a database)
const meetingTemplates = [
  {
    id: 'template-1',
    name: 'Standard Meeting',
    description: 'Regular team meeting with standard settings',
    defaultDuration: 60,
    settings: {
      waitingRoom: true,
      allowRecording: true,
      muteParticipantsOnEntry: true
    }
  },
  {
    id: 'template-2',
    name: 'Webinar',
    description: 'One-to-many presentation format',
    defaultDuration: 90,
    settings: {
      waitingRoom: true,
      allowRecording: true,
      muteParticipantsOnEntry: true,
      allowScreenSharing: false,
      participantsCanUnmute: false
    }
  },
  {
    id: 'template-3',
    name: 'Workshop',
    description: 'Interactive workshop with breakout rooms',
    defaultDuration: 120,
    settings: {
      waitingRoom: false,
      allowRecording: true,
      muteParticipantsOnEntry: false,
      allowBreakoutRooms: true,
      allowWhiteboard: true
    }
  }
];

function getMeetingTemplate(templateId) {
  return meetingTemplates.find(t => t.id === templateId);
}

function listMeetingTemplates() {
  return meetingTemplates;
}
