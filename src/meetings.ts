/**
 * Digital Samba MCP Server - Meeting Scheduling Functionality
 * 
 * This module implements resources and tools for Digital Samba meeting scheduling.
 * It provides capabilities for creating, managing, and scheduling meetings, as well as
 * handling participant management and finding available meeting times.
 * 
 * Features include:
 * - Creating, updating, and cancelling scheduled meetings
 * - Managing meeting participants (adding, removing, sending reminders)
 * - Finding available meeting times based on participant availability
 * - Generating meeting join links
 * - Accessing details about scheduled, upcoming, and room-specific meetings
 * 
 * @module meetings
 * @author Digital Samba Team
 * @version 0.1.0
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import { getApiKeyFromRequest } from './auth.js';
import {
  AuthenticationError,
  ApiRequestError,
  ApiResponseError,
  ResourceNotFoundError,
  ValidationError
} from './errors.js';

/**
 * Represents a scheduled meeting in the Digital Samba system
 * 
 * @interface ScheduledMeeting
 * @property {string} id - Unique identifier for the meeting
 * @property {string} title - Title of the meeting
 * @property {string} [description] - Optional description of the meeting
 * @property {string} room_id - ID of the room where the meeting will take place
 * @property {string} start_time - Start time in ISO 8601 format
 * @property {string} end_time - End time in ISO 8601 format
 * @property {string} timezone - Timezone identifier (e.g., 'UTC', 'America/New_York')
 * @property {string} host_name - Name of the meeting host
 * @property {string} [host_email] - Optional email of the meeting host
 * @property {Array<{name: string, email: string, role?: string}>} participants - Array of meeting participants
 * @property {boolean} [recurring] - Whether the meeting is recurring
 * @property {string} [recurrence_pattern] - iCal recurrence rule format for recurring meetings
 * @property {'scheduled' | 'started' | 'ended' | 'cancelled'} status - Current status of the meeting
 * @property {string} created_at - Creation timestamp in ISO 8601 format
 * @property {string} updated_at - Last update timestamp in ISO 8601 format
 */
export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  room_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  host_name: string;
  host_email?: string;
  participants: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;
  status: 'scheduled' | 'started' | 'ended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

/**
 * Settings for creating a new scheduled meeting
 * 
 * @interface MeetingCreateSettings
 * @property {string} title - Title of the meeting
 * @property {string} [description] - Optional description of the meeting
 * @property {string} [room_id] - ID of an existing room to use (optional, can create new room if not provided)
 * @property {Object} [room_settings] - Settings for creating a new room if room_id is not provided
 * @property {string} [room_settings.name] - Name for the new room
 * @property {'public'|'private'} [room_settings.privacy] - Privacy setting for the new room
 * @property {number} [room_settings.max_participants] - Maximum participants allowed in the new room
 * @property {string} start_time - Start time in ISO 8601 format
 * @property {string} end_time - End time in ISO 8601 format
 * @property {string} timezone - Timezone identifier (e.g., 'UTC', 'America/New_York')
 * @property {string} host_name - Name of the meeting host
 * @property {string} [host_email] - Optional email of the meeting host
 * @property {Array<{name: string, email: string, role?: string}>} [participants] - Array of meeting participants
 * @property {boolean} [recurring] - Whether the meeting is recurring
 * @property {string} [recurrence_pattern] - iCal recurrence rule format for recurring meetings
 * @property {boolean} [send_invitations] - Whether to send invitations to participants
 */
export interface MeetingCreateSettings {
  title: string;
  description?: string;
  room_id?: string;  // Optional, can create new room if not provided
  room_settings?: {
    name?: string;
    privacy?: 'public' | 'private';
    max_participants?: number;
  };
  start_time: string;  // ISO 8601 format
  end_time: string;    // ISO 8601 format
  timezone: string;
  host_name: string;
  host_email?: string;
  participants?: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;  // iCal recurrence rule format
  send_invitations?: boolean;
}

/**
 * Settings for updating an existing scheduled meeting
 * 
 * @interface MeetingUpdateSettings
 * @property {string} [title] - Updated title of the meeting
 * @property {string} [description] - Updated description of the meeting
 * @property {string} [start_time] - Updated start time in ISO 8601 format
 * @property {string} [end_time] - Updated end time in ISO 8601 format
 * @property {string} [timezone] - Updated timezone identifier
 * @property {string} [host_name] - Updated name of the meeting host
 * @property {string} [host_email] - Updated email of the meeting host
 * @property {Array<{name: string, email: string, role?: string}>} [participants] - Updated array of meeting participants
 * @property {boolean} [recurring] - Updated recurring status
 * @property {string} [recurrence_pattern] - Updated iCal recurrence rule format
 * @property {'scheduled'|'cancelled'} [status] - Updated status of the meeting
 * @property {boolean} [send_updates] - Whether to send updates to participants
 */
export interface MeetingUpdateSettings {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  host_name?: string;
  host_email?: string;
  participants?: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;
  status?: 'scheduled' | 'cancelled';
  send_updates?: boolean;
}

/**
 * Set up meeting scheduling resources and tools for the MCP server
 * 
 * This function registers all meeting scheduling-related resources and tools with the MCP server.
 * It creates resources for listing and retrieving scheduled meetings and their participants,
 * as well as tools for creating, updating, cancelling, and managing scheduled meetings.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} apiUrl - Base URL for the Digital Samba API
 * @returns {void}
 * 
 * @example
 * // Register meeting scheduling functionality with the MCP server
 * setupMeetingSchedulingFunctionality(mcpServer, 'https://api.digitalsamba.com/api/v1');
 */
export function setupMeetingSchedulingFunctionality(server: McpServer, apiUrl: string) {
  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------

  // Resource for listing scheduled meetings
  server.resource(
    'scheduled-meetings',
    new ResourceTemplate('digitalsamba://meetings', { list: undefined }),
    async (uri, _, request) => {
      logger.info('Listing scheduled meetings');
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get scheduled meetings from the Digital Samba API
        const response = await client.listScheduledMeetings();
        const meetings = response.data || [];
        
        logger.debug(`Found ${meetings.length} scheduled meetings`);
        
        // Format as resource content
        const contents = meetings.map(meeting => ({
          uri: `digitalsamba://meetings/${meeting.id}`,
          text: JSON.stringify(meeting, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching scheduled meetings', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 401/403 errors
          if ('statusCode' in error) {
            const statusCode = (error as any).statusCode;
            
            if (statusCode === 401 || statusCode === 403) {
              throw new AuthenticationError(`Authentication failed when listing meetings: ${error.message}`, {
                cause: error
              });
            }
            
            // Handle API response errors with other status codes
            throw new ApiResponseError(`API error when listing meetings`, {
              statusCode: statusCode,
              apiErrorMessage: error.message,
              cause: error
            });
          }
        }
        
        // Default: wrap in ApiRequestError
        throw new ApiRequestError(`Error fetching meetings: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    }
  );

  // Resource for getting a specific scheduled meeting
  server.resource(
    'scheduled-meeting',
    new ResourceTemplate('digitalsamba://meetings/{meetingId}', { list: undefined }),
    async (uri, params, request) => {
      const { meetingId } = params;
      
      if (!meetingId) {
        throw new ValidationError('Meeting ID is required', {
          validationErrors: { meetingId: 'Meeting ID cannot be empty' }
        });
      }
      
      logger.info('Getting scheduled meeting details', { meetingId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get meeting details
        const meeting = await client.getScheduledMeeting(meetingId as string);
        
        // Format as resource content
        const content = {
          uri: uri.href,
          text: JSON.stringify(meeting, null, 2),
        };
        
        return { contents: [content] };
      } catch (error) {
        logger.error('Error fetching scheduled meeting details', { 
          meetingId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 404 errors
          if ('statusCode' in error && (error as any).statusCode === 404) {
            throw new ResourceNotFoundError(`Meeting with ID ${meetingId} not found`, {
              resourceId: meetingId as string,
              resourceType: 'meeting',
              cause: error
            });
          }
          
          // Handle 403 errors
          if ('statusCode' in error && (error as any).statusCode === 403) {
            throw new AuthenticationError(`Insufficient permissions to access meeting ${meetingId}`, {
              cause: error
            });
          }
          
          // Handle API response errors
          if ('statusCode' in error) {
            throw new ApiResponseError(`API error when fetching meeting ${meetingId}`, {
              statusCode: (error as any).statusCode,
              apiErrorMessage: error.message,
              cause: error
            });
          }
        }
        
        // Default: wrap in ApiRequestError
        throw new ApiRequestError(`Error fetching meeting data: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    }
  );

  // Resource for listing participant details for a scheduled meeting
  server.resource(
    'scheduled-meeting-participants',
    new ResourceTemplate('digitalsamba://meetings/{meetingId}/participants', { list: undefined }),
    async (uri, params, request) => {
      const { meetingId } = params;
      
      if (!meetingId) {
        throw new ValidationError('Meeting ID is required', {
          validationErrors: { meetingId: 'Meeting ID cannot be empty' }
        });
      }
      
      logger.info('Getting scheduled meeting participants', { meetingId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get meeting details
        const meeting = await client.getScheduledMeeting(meetingId as string);
        
        // Format participants as resource content
        const contents = (meeting.participants || []).map((participant, index) => ({
          uri: `digitalsamba://meetings/${meetingId}/participants/${index}`,
          text: JSON.stringify(participant, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching scheduled meeting participants', { 
          meetingId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 404 errors
          if ('statusCode' in error && (error as any).statusCode === 404) {
            throw new ResourceNotFoundError(`Meeting with ID ${meetingId} not found`, {
              resourceId: meetingId as string,
              resourceType: 'meeting',
              cause: error
            });
          }
          
          // Handle 403 errors
          if ('statusCode' in error && (error as any).statusCode === 403) {
            throw new AuthenticationError(`Insufficient permissions to access meeting ${meetingId}`, {
              cause: error
            });
          }
          
          // Handle API response errors
          if ('statusCode' in error) {
            throw new ApiResponseError(`API error when fetching meeting participants for ${meetingId}`, {
              statusCode: (error as any).statusCode,
              apiErrorMessage: error.message,
              cause: error
            });
          }
        }
        
        // Default: wrap in ApiRequestError
        throw new ApiRequestError(`Error fetching meeting participant data: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    }
  );

  // Resource for listing upcoming meetings
  server.resource(
    'upcoming-meetings',
    new ResourceTemplate('digitalsamba://meetings/upcoming', { list: undefined }),
    async (uri, _, request) => {
      logger.info('Listing upcoming scheduled meetings');
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get upcoming meetings from the Digital Samba API
        const response = await client.listUpcomingMeetings();
        const meetings = response.data || [];
        
        logger.debug(`Found ${meetings.length} upcoming meetings`);
        
        // Format as resource content
        const contents = meetings.map(meeting => ({
          uri: `digitalsamba://meetings/${meeting.id}`,
          text: JSON.stringify(meeting, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching upcoming meetings', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 401/403 errors
          if ('statusCode' in error) {
            const statusCode = (error as any).statusCode;
            
            if (statusCode === 401 || statusCode === 403) {
              throw new AuthenticationError(`Authentication failed when listing upcoming meetings: ${error.message}`, {
                cause: error
              });
            }
            
            // Handle API response errors with other status codes
            throw new ApiResponseError(`API error when listing upcoming meetings`, {
              statusCode: statusCode,
              apiErrorMessage: error.message,
              cause: error
            });
          }
        }
        
        // Default: wrap in ApiRequestError
        throw new ApiRequestError(`Error fetching upcoming meetings: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    }
  );

  // Resource for getting meetings for a specific room
  server.resource(
    'room-meetings',
    new ResourceTemplate('digitalsamba://rooms/{roomId}/meetings', { list: undefined }),
    async (uri, params, request) => {
      const { roomId } = params;
      
      if (!roomId) {
        throw new ValidationError('Room ID is required', {
          validationErrors: { roomId: 'Room ID cannot be empty' }
        });
      }
      
      logger.info('Getting scheduled meetings for room', { roomId });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        throw new AuthenticationError('No API key found. Please include an Authorization header with a Bearer token.');
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get meetings for the room
        const response = await client.listRoomMeetings(roomId as string);
        const meetings = response.data || [];
        
        logger.debug(`Found ${meetings.length} scheduled meetings for room ${roomId}`);
        
        // Format as resource content
        const contents = meetings.map(meeting => ({
          uri: `digitalsamba://meetings/${meeting.id}`,
          text: JSON.stringify(meeting, null, 2),
        }));
        
        return { contents };
      } catch (error) {
        logger.error('Error fetching scheduled meetings for room', { 
          roomId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Handle specific error types
        if (error instanceof Error) {
          // Handle 404 errors
          if ('statusCode' in error && (error as any).statusCode === 404) {
            throw new ResourceNotFoundError(`Room with ID ${roomId} not found`, {
              resourceId: roomId as string,
              resourceType: 'room',
              cause: error
            });
          }
          
          // Handle 403 errors
          if ('statusCode' in error && (error as any).statusCode === 403) {
            throw new AuthenticationError(`Insufficient permissions to access room ${roomId}`, {
              cause: error
            });
          }
          
          // Handle API response errors
          if ('statusCode' in error) {
            throw new ApiResponseError(`API error when fetching meetings for room ${roomId}`, {
              statusCode: (error as any).statusCode,
              apiErrorMessage: error.message,
              cause: error
            });
          }
        }
        
        // Default: wrap in ApiRequestError
        throw new ApiRequestError(`Error fetching room meetings data: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error instanceof Error ? error : undefined
        });
      }
    }
  );

  // -------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------

  // Tool for creating a scheduled meeting
  server.tool(
    'create-scheduled-meeting',
    {
      title: z.string(),
      description: z.string().optional(),
      room_id: z.string().optional(),
      room_settings: z.object({
        name: z.string().optional(),
        privacy: z.enum(['public', 'private']).optional(),
        max_participants: z.number().optional()
      }).optional(),
      start_time: z.string(),
      end_time: z.string(),
      timezone: z.string(),
      host_name: z.string(),
      host_email: z.string().email().optional(),
      participants: z.array(
        z.object({
          name: z.string(),
          email: z.string().email(),
          role: z.string().optional()
        })
      ).optional(),
      recurring: z.boolean().optional(),
      recurrence_pattern: z.string().optional(),
      send_invitations: z.boolean().optional()
    },
    async (params, request) => {
      logger.info('Creating scheduled meeting', { title: params.title });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Authentication Error: No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // If no room_id is provided, create a new room
        let roomId = params.room_id;
        if (!roomId && params.room_settings) {
          logger.debug('No room ID provided, creating a new room');
          
          const roomSettings = {
            name: params.room_settings.name || params.title,
            privacy: params.room_settings.privacy || 'private',
            max_participants: params.room_settings.max_participants
          };
          
          const room = await client.createRoom(roomSettings);
          roomId = room.id;
          logger.debug(`Created new room with ID: ${roomId}`);
        } else if (!roomId) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Validation Error: Either room_id or room_settings must be provided to create a meeting.'
            }],
            isError: true,
          };
        }
        
        // Create the meeting
        const meetingSettings: MeetingCreateSettings = {
          title: params.title,
          description: params.description,
          room_id: roomId,
          start_time: params.start_time,
          end_time: params.end_time,
          timezone: params.timezone,
          host_name: params.host_name,
          host_email: params.host_email,
          participants: params.participants?.map(p => ({
            name: p.name || '',
            email: p.email || '',
            role: p.role
          })),
          recurring: params.recurring,
          recurrence_pattern: params.recurrence_pattern,
          send_invitations: params.send_invitations
        };
        
        const meeting = await client.createScheduledMeeting(meetingSettings);
        
        // Format the response
        let responseText = `Successfully scheduled meeting "${meeting.title}"\n\n`;
        responseText += `Meeting ID: ${meeting.id}\n`;
        responseText += `Room ID: ${meeting.room_id}\n`;
        responseText += `Start: ${new Date(meeting.start_time).toLocaleString()} (${meeting.timezone})\n`;
        responseText += `End: ${new Date(meeting.end_time).toLocaleString()} (${meeting.timezone})\n`;
        
        if (meeting.recurring) {
          responseText += `Recurring: Yes (${meeting.recurrence_pattern || 'custom pattern'})\n`;
        }
        
        if (meeting.participants && meeting.participants.length > 0) {
          responseText += `\nParticipants:\n`;
          meeting.participants.forEach(p => {
            responseText += `- ${p.name} (${p.email})${p.role ? ` [${p.role}]` : ''}\n`;
          });
        }
        
        if (params.send_invitations) {
          responseText += `\nInvitations have been sent to all participants.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error creating scheduled meeting', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        let errorMessage = 'Error creating scheduled meeting';
        
        // Provide more specific error messages based on error type
        if (error instanceof Error) {
          if ('statusCode' in error) {
            const statusCode = (error as any).statusCode;
            
            // Handle specific status codes with user-friendly messages
            if (statusCode === 404) {
              errorMessage = `Resource not found: ${error.message}`;
            } else if (statusCode === 403) {
              errorMessage = `Authentication error: Insufficient permissions to create meeting`;
            } else if (statusCode === 400) {
              errorMessage = `Validation error: ${error.message}`;
            } else {
              errorMessage = `API error (${statusCode}): ${error.message}`;
            }
          } else {
            errorMessage = `Error creating scheduled meeting: ${error.message}`;
          }
        } else {
          errorMessage = `Error creating scheduled meeting: ${String(error)}`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorMessage,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for updating a scheduled meeting
  server.tool(
    'update-scheduled-meeting',
    {
      meeting_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      timezone: z.string().optional(),
      host_name: z.string().optional(),
      host_email: z.string().email().optional(),
      participants: z.array(
        z.object({
          name: z.string(),
          email: z.string().email(),
          role: z.string().optional()
        })
      ).optional(),
      recurring: z.boolean().optional(),
      recurrence_pattern: z.string().optional(),
      status: z.enum(['scheduled', 'cancelled']).optional(),
      send_updates: z.boolean().optional()
    },
    async (params, request) => {
      const { meeting_id, ...updateParams } = params;
      
      if (!meeting_id) {
        return {
          content: [{ type: 'text', text: 'Meeting ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Updating scheduled meeting', { meeting_id });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Update the meeting
        // Ensure participants have required properties
        const normalizedParams = {
          ...updateParams,
          participants: updateParams.participants?.map(p => ({
            name: p.name || '',
            email: p.email || '',
            role: p.role
          }))
        };
        
        const meeting = await client.updateScheduledMeeting(meeting_id, normalizedParams);
        
        // Format the response
        let responseText = `Successfully updated meeting "${meeting.title}"\n\n`;
        responseText += `Meeting ID: ${meeting.id}\n`;
        responseText += `Room ID: ${meeting.room_id}\n`;
        responseText += `Start: ${new Date(meeting.start_time).toLocaleString()} (${meeting.timezone})\n`;
        responseText += `End: ${new Date(meeting.end_time).toLocaleString()} (${meeting.timezone})\n`;
        responseText += `Status: ${meeting.status}\n`;
        
        if (meeting.recurring) {
          responseText += `Recurring: Yes (${meeting.recurrence_pattern || 'custom pattern'})\n`;
        }
        
        if (params.send_updates) {
          responseText += `\nUpdate notifications have been sent to all participants.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error updating scheduled meeting', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error updating scheduled meeting: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for cancelling a scheduled meeting
  server.tool(
    'cancel-scheduled-meeting',
    {
      meeting_id: z.string(),
      notify_participants: z.boolean().optional().default(true)
    },
    async (params, request) => {
      const { meeting_id, notify_participants } = params;
      
      if (!meeting_id) {
        return {
          content: [{ type: 'text', text: 'Meeting ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Cancelling scheduled meeting', { meeting_id });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Cancel the meeting
        await client.cancelScheduledMeeting(meeting_id, { notify_participants });
        
        const responseText = `The meeting with ID ${meeting_id} has been cancelled successfully.${
          notify_participants ? ' Participants have been notified of the cancellation.' : ''
        }`;
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error cancelling scheduled meeting', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error cancelling scheduled meeting: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for deleting a scheduled meeting
  server.tool(
    'delete-scheduled-meeting',
    {
      meeting_id: z.string()
    },
    async (params, request) => {
      const { meeting_id } = params;
      
      if (!meeting_id) {
        return {
          content: [{ type: 'text', text: 'Meeting ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Deleting scheduled meeting', { meeting_id });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Delete the meeting
        await client.deleteScheduledMeeting(meeting_id);
        
        return {
          content: [
            {
              type: 'text',
              text: `The meeting with ID ${meeting_id} has been permanently deleted.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting scheduled meeting', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting scheduled meeting: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for adding participants to a scheduled meeting
  server.tool(
    'add-meeting-participants',
    {
      meeting_id: z.string(),
      participants: z.array(
        z.object({
          name: z.string(),
          email: z.string().email(),
          role: z.string().optional()
        })
      ),
      send_invitations: z.boolean().optional().default(true)
    },
    async (params, request) => {
      const { meeting_id, participants, send_invitations } = params;
      
      if (!meeting_id || !participants || participants.length === 0) {
        return {
          content: [{ type: 'text', text: 'Meeting ID and at least one participant are required.' }],
          isError: true,
        };
      }
      
      logger.info('Adding participants to scheduled meeting', { 
        meeting_id, 
        participantCount: participants.length 
      });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Add participants to the meeting
        // Ensure participants have required properties
        const normalizedParticipants = participants.map(p => ({
          name: p.name || '',
          email: p.email || '',
          role: p.role
        }));
        
        await client.addMeetingParticipants(meeting_id, {
          participants: normalizedParticipants,
          send_invitations
        });
        
        let responseText = `Successfully added ${participants.length} participant(s) to the meeting:\n\n`;
        participants.forEach(p => {
          responseText += `- ${p.name} (${p.email})${p.role ? ` [${p.role}]` : ''}\n`;
        });
        
        if (send_invitations) {
          responseText += `\nInvitations have been sent to the new participants.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error adding participants to scheduled meeting', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error adding participants to scheduled meeting: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for removing participants from a scheduled meeting
  server.tool(
    'remove-meeting-participants',
    {
      meeting_id: z.string(),
      participant_emails: z.array(z.string().email()),
      notify_participants: z.boolean().optional().default(true)
    },
    async (params, request) => {
      const { meeting_id, participant_emails, notify_participants } = params;
      
      if (!meeting_id || !participant_emails || participant_emails.length === 0) {
        return {
          content: [{ type: 'text', text: 'Meeting ID and at least one participant email are required.' }],
          isError: true,
        };
      }
      
      logger.info('Removing participants from scheduled meeting', { 
        meeting_id, 
        participantCount: participant_emails.length 
      });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Remove participants from the meeting
        await client.removeMeetingParticipants(meeting_id, {
          participant_emails,
          notify_participants
        });
        
        let responseText = `Successfully removed ${participant_emails.length} participant(s) from the meeting:\n\n`;
        participant_emails.forEach(email => {
          responseText += `- ${email}\n`;
        });
        
        if (notify_participants) {
          responseText += `\nNotifications have been sent to the removed participants.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error removing participants from scheduled meeting', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error removing participants from scheduled meeting: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for sending meeting reminders
  server.tool(
    'send-meeting-reminders',
    {
      meeting_id: z.string(),
      message: z.string().optional()
    },
    async (params, request) => {
      const { meeting_id, message } = params;
      
      if (!meeting_id) {
        return {
          content: [{ type: 'text', text: 'Meeting ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Sending meeting reminders', { meeting_id });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Send reminders
        await client.sendMeetingReminders(meeting_id, { message });
        
        return {
          content: [
            {
              type: 'text',
              text: `Meeting reminders have been sent to all participants of meeting ${meeting_id}.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error sending meeting reminders', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error sending meeting reminders: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for finding available meeting times
  server.tool(
    'find-available-meeting-times',
    {
      participants: z.array(z.string().email()),
      duration_minutes: z.number().min(15).max(480).default(60),
      start_date: z.string(),  // ISO 8601 format date
      end_date: z.string(),    // ISO 8601 format date
      timezone: z.string(),
      working_hours_start: z.number().min(0).max(23).default(9),
      working_hours_end: z.number().min(0).max(23).default(17),
      min_options: z.number().min(1).max(10).default(3)
    },
    async (params, request) => {
      const { 
        participants, 
        duration_minutes, 
        start_date, 
        end_date, 
        timezone,
        working_hours_start,
        working_hours_end,
        min_options
      } = params;
      
      if (!participants || participants.length === 0) {
        return {
          content: [{ type: 'text', text: 'At least one participant email is required.' }],
          isError: true,
        };
      }
      
      logger.info('Finding available meeting times', { 
        participantCount: participants.length,
        duration_minutes
      });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Find available times
        const availableTimes = await client.findAvailableMeetingTimes({
          participants,
          duration_minutes,
          start_date,
          end_date,
          timezone,
          working_hours_start,
          working_hours_end,
          min_options
        });
        
        if (!availableTimes || availableTimes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No available meeting times found for all participants in the given date range.`,
              },
            ],
          };
        }
        
        let responseText = `Found ${availableTimes.length} available meeting time slots:\n\n`;
        
        availableTimes.forEach((slot, index) => {
          const startTime = new Date(slot.start_time);
          const endTime = new Date(slot.end_time);
          
          responseText += `${index + 1}. ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()} (${timezone})\n`;
        });
        
        responseText += `\nTo schedule a meeting at one of these times, use the 'create-scheduled-meeting' tool.`;
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error finding available meeting times', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error finding available meeting times: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for generating a meeting join link
  server.tool(
    'generate-meeting-join-link',
    {
      meeting_id: z.string(),
      participant_name: z.string(),
      participant_email: z.string().email().optional(),
      role: z.string().optional()
    },
    async (params, request) => {
      const { meeting_id, participant_name, participant_email, role } = params;
      
      if (!meeting_id) {
        return {
          content: [{ type: 'text', text: 'Meeting ID is required.' }],
          isError: true,
        };
      }
      
      logger.info('Generating meeting join link', { meeting_id, participant_name });
      
      // Get API key from session context
      const apiKey = getApiKeyFromRequest(request);
      if (!apiKey) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No API key found. Please include an Authorization header with a Bearer token.'
          }],
          isError: true,
        };
      }
      
      // Create API client
      logger.debug('Creating API client using context API key');
      
      const client = new DigitalSambaApiClient(undefined, apiUrl);
      
      try {
        // Get the meeting details to find the room_id
        const meeting = await client.getScheduledMeeting(meeting_id);
        
        // Generate token for the meeting's room
        const tokenOptions = {
          u: participant_name,
          ud: participant_email,
          role: role
        };
        
        const tokenResponse = await client.generateRoomToken(meeting.room_id, tokenOptions);
        
        return {
          content: [
            {
              type: 'text',
              text: `Meeting join link for ${participant_name}:\n\n${tokenResponse.link}\n\nThis link will allow the participant to join the meeting "${meeting.title}" scheduled for ${new Date(meeting.start_time).toLocaleString()} (${meeting.timezone}).`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating meeting join link', { 
          meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error generating meeting join link: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Meeting scheduling functionality set up successfully');
}
