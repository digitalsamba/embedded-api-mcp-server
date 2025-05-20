/**
 * Unit tests for the meetings.ts module
 * 
 * These tests verify the functionality of the meeting scheduling implementation,
 * focusing on error handling, parameter validation, and API interaction patterns.
 * 
 * @module meetings.test
 * @author Digital Samba Team
 * @version 0.1.0
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupMeetingSchedulingFunctionality, MeetingCreateSettings, MeetingUpdateSettings } from '../src/meetings';
import { DigitalSambaApiClient } from '../src/digital-samba-api';
import { getApiKeyFromRequest } from '../src/auth';
import { 
  AuthenticationError, 
  ResourceNotFoundError, 
  ValidationError,
  ApiResponseError
} from '../src/errors';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  // Create a resource mock function that tracks calls
  const mockResource = jest.fn();
  
  // Create a tool mock function that returns an object with utility methods
  const mockTool = jest.fn().mockReturnValue({
    disable: jest.fn(),
    enable: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  });
  
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      resource: mockResource,
      tool: mockTool
    })),
    ResourceTemplate: jest.fn().mockImplementation((template) => ({
      template
    }))
  };
});

jest.mock('../src/digital-samba-api.js');
jest.mock('../src/auth.js');
jest.mock('../src/logger.js', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Meeting Scheduling Functionality', () => {
  let server: McpServer;
  let mockRequest: any;
  const API_URL = 'https://api.digitalsamba.com/v1';
  const API_KEY = 'test-api-key';
  
  // Setup handlers for resources and tools
  let scheduledMeetingsResourceHandler: any;
  let scheduledMeetingResourceHandler: any;
  let createScheduledMeetingToolHandler: any;
  let updateScheduledMeetingToolHandler: any;
  let cancelScheduledMeetingToolHandler: any;
  let findAvailableMeetingTimesToolHandler: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up test server
    server = new McpServer({
      name: 'Test Server',
      version: '1.0.0'
    });
    
    // Create mock request object
    mockRequest = {
      headers: {
        authorization: `Bearer ${API_KEY}`
      },
      sessionId: 'test-session-id'
    };
    
    // Mock API key retrieval
    (getApiKeyFromRequest as jest.Mock).mockReturnValue(API_KEY);
    
    // Set up the meeting scheduling functionality
    setupMeetingSchedulingFunctionality(server, API_URL);
    
    // Capture resource handlers (we need multiple for different resources)
    scheduledMeetingsResourceHandler = (server.resource as jest.Mock).mock.calls[0][2]; // digitalsamba://meetings
    scheduledMeetingResourceHandler = (server.resource as jest.Mock).mock.calls[1][2];  // digitalsamba://meetings/{meetingId}
    
    // Capture tool handlers
    createScheduledMeetingToolHandler = (server.tool as jest.Mock).mock.calls[0][2];  // create-scheduled-meeting
    updateScheduledMeetingToolHandler = (server.tool as jest.Mock).mock.calls[1][2];  // update-scheduled-meeting
    cancelScheduledMeetingToolHandler = (server.tool as jest.Mock).mock.calls[2][2];  // cancel-scheduled-meeting
    findAvailableMeetingTimesToolHandler = (server.tool as jest.Mock).mock.calls[6][2]; // find-available-meeting-times
  });
  
  describe('Resources', () => {
    describe('scheduledMeetingsResource', () => {
      test('should throw AuthenticationError when API key is missing', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings' };
        const params = {};
        
        // Mock API key retrieval to return undefined
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        // Act & Assert
        await expect(scheduledMeetingsResourceHandler(uri, params, mockRequest))
          .rejects
          .toThrow(AuthenticationError);
      });
      
      test('should return all scheduled meetings when API call is successful', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings' };
        const params = {};
        
        const mockMeetings = [
          { id: 'm1', title: 'Meeting 1', room_id: 'r1', start_time: '2025-05-25T14:00:00Z' },
          { id: 'm2', title: 'Meeting 2', room_id: 'r2', start_time: '2025-05-26T15:00:00Z' }
        ];
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          listScheduledMeetings: jest.fn().mockResolvedValue({
            data: mockMeetings
          })
        }));
        
        // Act
        const result = await scheduledMeetingsResourceHandler(uri, params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://meetings/m1');
        expect(result.contents[1].uri).toBe('digitalsamba://meetings/m2');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockMeetings[0]);
        expect(JSON.parse(result.contents[1].text)).toEqual(mockMeetings[1]);
      });
      
      test('should handle API errors correctly', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings' };
        const params = {};
        
        // Mock API client to throw an error
        const mockError = new Error('API error');
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          listScheduledMeetings: jest.fn().mockRejectedValue(mockError)
        }));
        
        // Act & Assert
        await expect(scheduledMeetingsResourceHandler(uri, params, mockRequest))
          .rejects
          .toThrow('API error');
      });
    });
    
    describe('scheduledMeetingResource', () => {
      test('should throw ValidationError when meetingId is missing', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings/undefined' };
        const params = { meetingId: undefined };
        
        // Act & Assert
        await expect(scheduledMeetingResourceHandler(uri, params, mockRequest))
          .rejects
          .toThrow(ValidationError);
      });
      
      test('should throw AuthenticationError when API key is missing', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings/m1' };
        const params = { meetingId: 'm1' };
        
        // Mock API key retrieval to return undefined
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        // Act & Assert
        await expect(scheduledMeetingResourceHandler(uri, params, mockRequest))
          .rejects
          .toThrow(AuthenticationError);
      });
      
      test('should throw ResourceNotFoundError when meeting is not found', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings/not-found' };
        const params = { meetingId: 'not-found' };
        
        // Mock API client to throw 404 error
        const mockError = new Error('Meeting not found');
        (mockError as any).statusCode = 404;
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          getScheduledMeeting: jest.fn().mockRejectedValue(mockError)
        }));
        
        // Act & Assert
        await expect(scheduledMeetingResourceHandler(uri, params, mockRequest))
          .rejects
          .toThrow(ResourceNotFoundError);
      });
      
      test('should return meeting details when API call is successful', async () => {
        // Arrange
        const uri = { href: 'digitalsamba://meetings/m1' };
        const params = { meetingId: 'm1' };
        
        const mockMeeting = {
          id: 'm1',
          title: 'Test Meeting',
          room_id: 'r1',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          participants: [
            { name: 'User 1', email: 'user1@example.com' }
          ]
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          getScheduledMeeting: jest.fn().mockResolvedValue(mockMeeting)
        }));
        
        // Act
        const result = await scheduledMeetingResourceHandler(uri, params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].uri).toBe('digitalsamba://meetings/m1');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockMeeting);
      });
    });
  });
  
  describe('Tools', () => {
    describe('createScheduledMeetingTool', () => {
      test('should return error response when API key is missing', async () => {
        // Arrange
        const params = {
          title: 'Test Meeting',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host'
        };
        
        // Mock API key retrieval to return null
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        // Act
        const result = await createScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('No API key found');
      });
      
      test('should return error response when neither room_id nor room_settings is provided', async () => {
        // Arrange
        const params = {
          title: 'Test Meeting',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host'
        };
        
        // Act
        const result = await createScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Either room_id or room_settings must be provided');
      });
      
      test('should create a new room when room_id is not provided but room_settings is', async () => {
        // Arrange
        const params = {
          title: 'Test Meeting',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host',
          room_settings: {
            name: 'Test Room',
            privacy: 'private'
          }
        };
        
        const mockCreatedRoom = {
          id: 'new-room-id',
          name: 'Test Room'
        };
        
        const mockCreatedMeeting = {
          id: 'new-meeting-id',
          title: 'Test Meeting',
          room_id: 'new-room-id',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          status: 'scheduled',
          host_name: 'Test Host',
          participants: []
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          createRoom: jest.fn().mockResolvedValue(mockCreatedRoom),
          createScheduledMeeting: jest.fn().mockResolvedValue(mockCreatedMeeting)
        }));
        
        // Act
        const result = await createScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('Successfully scheduled meeting');
        expect(result.content[0].text).toContain('new-meeting-id');
        expect(result.content[0].text).toContain('new-room-id');
      });
      
      test('should use existing room when room_id is provided', async () => {
        // Arrange
        const params = {
          title: 'Test Meeting',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host',
          room_id: 'existing-room-id'
        };
        
        const mockCreatedMeeting = {
          id: 'new-meeting-id',
          title: 'Test Meeting',
          room_id: 'existing-room-id',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          status: 'scheduled',
          host_name: 'Test Host',
          participants: []
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          createScheduledMeeting: jest.fn().mockResolvedValue(mockCreatedMeeting)
        }));
        
        // Act
        const result = await createScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('Successfully scheduled meeting');
        expect(result.content[0].text).toContain('new-meeting-id');
        expect(result.content[0].text).toContain('existing-room-id');
      });
      
      test('should handle API errors gracefully', async () => {
        // Arrange
        const params = {
          title: 'Test Meeting',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host',
          room_id: 'existing-room-id'
        };
        
        // Mock API client to throw an error
        const mockError = new Error('API error during meeting creation');
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          createScheduledMeeting: jest.fn().mockRejectedValue(mockError)
        }));
        
        // Act
        const result = await createScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Error creating scheduled meeting');
        expect(result.content[0].text).toContain('API error during meeting creation');
      });
    });
    
    describe('updateScheduledMeetingTool', () => {
      test('should return error response when meeting_id is missing', async () => {
        // Arrange
        const params = {
          title: 'Updated Meeting'
        };
        
        // Act
        const result = await updateScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Meeting ID is required');
      });
      
      test('should return error response when API key is missing', async () => {
        // Arrange
        const params = {
          meeting_id: 'm1',
          title: 'Updated Meeting'
        };
        
        // Mock API key retrieval to return null
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        // Act
        const result = await updateScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('No API key found');
      });
      
      test('should update meeting details when API call is successful', async () => {
        // Arrange
        const params = {
          meeting_id: 'm1',
          title: 'Updated Meeting',
          description: 'Updated description',
          send_updates: true
        };
        
        const mockUpdatedMeeting = {
          id: 'm1',
          title: 'Updated Meeting',
          description: 'Updated description',
          room_id: 'r1',
          start_time: '2025-05-25T14:00:00Z',
          end_time: '2025-05-25T15:00:00Z',
          timezone: 'UTC',
          status: 'scheduled',
          host_name: 'Test Host',
          participants: []
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          updateScheduledMeeting: jest.fn().mockResolvedValue(mockUpdatedMeeting)
        }));
        
        // Act
        const result = await updateScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('Successfully updated meeting');
        expect(result.content[0].text).toContain('Update notifications have been sent');
      });
      
      test('should handle not found errors correctly', async () => {
        // Arrange
        const params = {
          meeting_id: 'not-found',
          title: 'Updated Meeting'
        };
        
        // Mock API client to throw 404 error
        const mockError = new Error('Meeting not found');
        (mockError as any).statusCode = 404;
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          updateScheduledMeeting: jest.fn().mockRejectedValue(mockError)
        }));
        
        // Act
        const result = await updateScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Error updating scheduled meeting');
        expect(result.content[0].text).toContain('Meeting not found');
      });
    });
    
    describe('cancelScheduledMeetingTool', () => {
      test('should return error response when meeting_id is missing', async () => {
        // Arrange
        const params = {
          notify_participants: true
        };
        
        // Act
        const result = await cancelScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Meeting ID is required');
      });
      
      test('should cancel meeting when API call is successful', async () => {
        // Arrange
        const params = {
          meeting_id: 'm1',
          notify_participants: true
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          cancelScheduledMeeting: jest.fn().mockResolvedValue({ success: true })
        }));
        
        // Act
        const result = await cancelScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('has been cancelled successfully');
        expect(result.content[0].text).toContain('Participants have been notified');
      });
      
      test('should not mention participant notification when notify_participants is false', async () => {
        // Arrange
        const params = {
          meeting_id: 'm1',
          notify_participants: false
        };
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          cancelScheduledMeeting: jest.fn().mockResolvedValue({ success: true })
        }));
        
        // Act
        const result = await cancelScheduledMeetingToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('has been cancelled successfully');
        expect(result.content[0].text).not.toContain('Participants have been notified');
      });
    });
    
    describe('findAvailableMeetingTimesTool', () => {
      test('should return error response when participants array is empty', async () => {
        // Arrange
        const params = {
          participants: [],
          duration_minutes: 60,
          start_date: '2025-05-25',
          end_date: '2025-05-30',
          timezone: 'UTC'
        };
        
        // Act
        const result = await findAvailableMeetingTimesToolHandler(params, mockRequest);
        
        // Assert
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('At least one participant email is required');
      });
      
      test('should find available meeting times when API call is successful', async () => {
        // Arrange
        const params = {
          participants: ['user1@example.com', 'user2@example.com'],
          duration_minutes: 60,
          start_date: '2025-05-25',
          end_date: '2025-05-30',
          timezone: 'UTC',
          working_hours_start: 9,
          working_hours_end: 17,
          min_options: 3
        };
        
        const mockAvailableTimes = [
          { start_time: '2025-05-25T10:00:00Z', end_time: '2025-05-25T11:00:00Z' },
          { start_time: '2025-05-26T14:00:00Z', end_time: '2025-05-26T15:00:00Z' },
          { start_time: '2025-05-27T09:00:00Z', end_time: '2025-05-27T10:00:00Z' }
        ];
        
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          findAvailableMeetingTimes: jest.fn().mockResolvedValue(mockAvailableTimes)
        }));
        
        // Act
        const result = await findAvailableMeetingTimesToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('Found 3 available meeting time slots');
        expect(result.content[0].text).toContain('2025-05-25');
        expect(result.content[0].text).toContain('2025-05-26');
        expect(result.content[0].text).toContain('2025-05-27');
      });
      
      test('should handle no available times correctly', async () => {
        // Arrange
        const params = {
          participants: ['user1@example.com', 'user2@example.com'],
          duration_minutes: 60,
          start_date: '2025-05-25',
          end_date: '2025-05-30',
          timezone: 'UTC'
        };
        
        // Mock empty available times
        (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
          findAvailableMeetingTimes: jest.fn().mockResolvedValue([])
        }));
        
        // Act
        const result = await findAvailableMeetingTimesToolHandler(params, mockRequest);
        
        // Assert
        expect(result).not.toHaveProperty('isError');
        expect(result.content[0].text).toContain('No available meeting times found');
      });
    });
  });
});
