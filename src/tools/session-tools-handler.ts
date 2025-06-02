/**
 * Session Tools Handler
 * Simple handler for session tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerSessionTools(): Tool[] {
  return [
    {
      name: 'end-session',
      description: 'End a live session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The ID of the session to end' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'get-session-summary',
      description: 'Get a summary of a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The ID of the session' }
        },
        required: ['sessionId']
      }
    }
  ];
}

export async function executeSessionTool(name: string, args: any, client: DigitalSambaApiClient) {
  switch (name) {
    case 'end-session':
      await client.endSession(args.sessionId);
      return {
        content: [{
          type: 'text',
          text: `Session ${args.sessionId} ended successfully`
        }]
      };
      
    case 'get-session-summary':
      const summary = await client.getSessionSummary(args.sessionId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
      
    default:
      throw new Error(`Unknown session tool: ${name}`);
  }
}