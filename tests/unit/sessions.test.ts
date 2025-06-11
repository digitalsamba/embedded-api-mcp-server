/**
 * Unit tests for Session functionality
 * 
 * This file tests session resources and tools, including listing sessions,
 * retrieving session details, managing participants, and session analytics.
 * 
 * @group unit
 * @group sessions
 */

import { registerSessionResources, handleSessionResource } from '../../src/resources/sessions/index';
import { registerSessionTools, executeSessionTool } from '../../src/tools/session-management/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { getApiKeyFromRequest } from '../../src/auth';
import logger from '../../src/logger';

// Mock dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/auth');
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock session data
const mockSessions = [
  {
    id: 'session-1',
    room_id: 'room-1',
    started_at: '2024-01-15T10:00:00Z',
    ended_at: '2024-01-15T11:30:00Z',
    participant_count: 5,
    status: 'ended'
  },
  {
    id: 'session-2',
    room_id: 'room-2',
    started_at: '2024-01-15T14:00:00Z',
    ended_at: null,
    participant_count: 3,
    status: 'active'
  }
];

const mockSessionDetails = {
  id: 'session-1',
  room_id: 'room-1',
  room_name: 'Test Room 1',
  started_at: '2024-01-15T10:00:00Z',
  ended_at: '2024-01-15T11:30:00Z',
  duration: 5400,
  participant_count: 5,
  max_participants: 8,
  status: 'ended',
  recording_available: true
};

const mockParticipants = [
  {
    id: 'participant-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'host',
    joined_at: '2024-01-15T10:00:00Z',
    left_at: '2024-01-15T11:30:00Z',
    duration: 5400
  },
  {
    id: 'participant-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'participant',
    joined_at: '2024-01-15T10:05:00Z',
    left_at: '2024-01-15T11:25:00Z',
    duration: 4800
  }
];

const mockSessionStats = {
  session_id: 'session-1',
  total_participants: 5,
  max_concurrent_participants: 4,
  average_duration: 4560,
  total_duration: 22800,
  chat_messages: 45,
  qa_messages: 12,
  polls_created: 2,
  recordings: 1
};

const mockSessionSummary = {
  session_id: 'session-1',
  summary: 'The session covered project updates, Q4 goals, and team responsibilities.',
  key_points: [
    'Project timeline moved up by 2 weeks',
    'New team member joining next month',
    'Budget approved for additional resources'
  ],
  action_items: [
    'Update project timeline by Friday',
    'Schedule onboarding for new team member',
    'Review resource allocation'
  ]
};

describe('Session Resources', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listSessions: jest.fn(),
      listRoomSessions: jest.fn(),
      getSessionSummary: jest.fn(),
      listSessionParticipants: jest.fn(),
      getSessionStatistics: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });

  describe('registerSessionResources', () => {
    it('should register all session resources', () => {
      const resources = registerSessionResources();
      
      expect(resources).toHaveLength(5);
      expect(resources.map(r => r.name)).toEqual([
        'sessions',
        'session',
        'session-participants',
        'session-statistics',
        'room-sessions'
      ]);
      
      resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType', 'application/json');
      });
    });
  });

  describe('handleSessionResource', () => {
    const mockRequest = { 
      transport: { sessionId: 'test-session' },
      headers: { authorization: 'Bearer test-api-key' }
    };
    const options = { apiUrl: 'https://api.test.com', apiCache: undefined };

    describe('List all sessions', () => {
      it('should list all sessions successfully', async () => {
        mockApiClient.listSessions.mockResolvedValue({
          data: mockSessions,
          total_count: 2
        });

        const result = await handleSessionResource(
          'digitalsamba://sessions',
          {},
          mockRequest,
          options
        );

        expect(mockApiClient.listSessions).toHaveBeenCalled();
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://sessions/session-1');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockSessions[0]);
      });

      it('should handle empty session list', async () => {
        mockApiClient.listSessions.mockResolvedValue({
          data: [],
          total_count: 0
        });

        const result = await handleSessionResource(
          'digitalsamba://sessions',
          {},
          mockRequest,
          options
        );

        expect(result.contents).toHaveLength(0);
      });
    });

    describe('Get specific session', () => {
      it('should get session details successfully', async () => {
        mockApiClient.getSessionSummary.mockResolvedValue(mockSessionDetails);

        const result = await handleSessionResource(
          'digitalsamba://sessions/session-1',
          { sessionId: 'session-1' },
          mockRequest,
          options
        );

        expect(mockApiClient.getSessionSummary).toHaveBeenCalledWith('session-1');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].uri).toBe('digitalsamba://sessions/session-1');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockSessionDetails);
      });

      it('should handle missing session ID', async () => {
        // When the URI ends with a slash, it's treated as a list request
        mockApiClient.listSessions.mockResolvedValue({
          data: [],
          total_count: 0
        });

        const result = await handleSessionResource(
          'digitalsamba://sessions/',
          {},
          mockRequest,
          options
        );

        // Should return empty list rather than error
        expect(result.contents).toHaveLength(0);
      });
    });

    describe('List session participants', () => {
      it('should list participants successfully', async () => {
        mockApiClient.listSessionParticipants.mockResolvedValue({
          data: mockParticipants,
          total_count: 2
        });

        const result = await handleSessionResource(
          'digitalsamba://sessions/session-1/participants',
          { sessionId: 'session-1' },
          mockRequest,
          options
        );

        expect(mockApiClient.listSessionParticipants).toHaveBeenCalledWith('session-1');
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://participants/participant-1');
      });
    });

    describe('Get session statistics', () => {
      it('should get statistics successfully', async () => {
        mockApiClient.getSessionStatistics.mockResolvedValue(mockSessionStats);

        const result = await handleSessionResource(
          'digitalsamba://sessions/session-1/statistics',
          { sessionId: 'session-1' },
          mockRequest,
          options
        );

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith('session-1');
        expect(result.contents).toHaveLength(1);
        expect(JSON.parse(result.contents[0].text)).toEqual(mockSessionStats);
      });
    });

    describe('List room sessions', () => {
      it('should list sessions for a specific room', async () => {
        mockApiClient.listRoomSessions.mockResolvedValue({
          data: [mockSessions[0]],
          total_count: 1
        });

        const result = await handleSessionResource(
          'digitalsamba://rooms/room-1/sessions',
          { roomId: 'room-1' },
          mockRequest,
          options
        );

        expect(mockApiClient.listRoomSessions).toHaveBeenCalledWith('room-1');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].uri).toBe('digitalsamba://sessions/session-1');
      });
    });

    describe('Error handling', () => {
      it('should handle missing API key', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);

        await expect(handleSessionResource(
          'digitalsamba://sessions',
          {},
          mockRequest,
          options
        )).rejects.toThrow('No API key found');
      });

      it('should handle API errors', async () => {
        mockApiClient.listSessions.mockRejectedValue(new Error('API Error'));

        await expect(handleSessionResource(
          'digitalsamba://sessions',
          {},
          mockRequest,
          options
        )).rejects.toThrow('API Error');

        expect(logger.error).toHaveBeenCalledWith(
          'Error handling session resource',
          expect.objectContaining({
            uri: 'digitalsamba://sessions',
            error: 'API Error'
          })
        );
      });
    });
  });
});

describe('Session Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listRoomSessions: jest.fn(),
      deleteSessionData: jest.fn(),
      getSessionSummary: jest.fn(),
      endSession: jest.fn(),
      getSessionStatistics: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });

  describe('registerSessionTools', () => {
    it('should register all session tools', () => {
      const tools = registerSessionTools();
      
      expect(tools).toHaveLength(11);
      expect(tools.map(t => t.name)).toEqual([
        'get-all-room-sessions',
        'hard-delete-session-resources',
        'bulk-delete-session-data',
        'get-session-summary',
        'end-session',
        'get-session-statistics',
        'list-sessions',
        'get-session-details',
        'list-session-participants',
        'get-session-statistics-details',
        'list-room-sessions'
      ]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('executeSessionTool', () => {
    const mockRequest = { 
      transport: { sessionId: 'test-session' },
      headers: { authorization: 'Bearer test-api-key' }
    };

    describe('get-all-room-sessions tool', () => {
      it('should get room sessions successfully', async () => {
        mockApiClient.listRoomSessions.mockResolvedValue({
          data: mockSessions,
          total_count: 2
        });

        const result = await executeSessionTool(
          'get-all-room-sessions',
          { roomId: 'room-1', limit: 10, offset: 0 },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.listRoomSessions).toHaveBeenCalledWith('room-1', {
          limit: 10,
          offset: 0,
          order: undefined,
          date_start: undefined,
          date_end: undefined,
          live: undefined
        });
        expect(result.content[0].type).toBe('text');
        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.sessions).toEqual(mockSessions);
        expect(parsedResult.total_count).toBe(2);
      });

      it('should handle date filters', async () => {
        mockApiClient.listRoomSessions.mockResolvedValue({
          data: [mockSessions[0]],
          total_count: 1
        });

        const result = await executeSessionTool(
          'get-all-room-sessions',
          { 
            roomId: 'room-1', 
            dateStart: '2024-01-15',
            dateEnd: '2024-01-16',
            live: false
          },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.listRoomSessions).toHaveBeenCalledWith('room-1', {
          limit: undefined,
          offset: undefined,
          order: undefined,
          date_start: '2024-01-15',
          date_end: '2024-01-16',
          live: false
        });
      });
    });

    describe('hard-delete-session-resources tool', () => {
      it('should delete session resources successfully', async () => {
        mockApiClient.deleteSessionData.mockResolvedValue({});

        const result = await executeSessionTool(
          'hard-delete-session-resources',
          { sessionId: 'session-1' },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.deleteSessionData).toHaveBeenCalledWith('session-1', 'resources');
        expect(result.content[0].text).toContain('Successfully hard deleted');
        expect(result.content[0].text).toContain('session-1');
      });
    });

    describe('bulk-delete-session-data tool', () => {
      it('should delete multiple data types successfully', async () => {
        mockApiClient.deleteSessionData.mockResolvedValue({});

        const result = await executeSessionTool(
          'bulk-delete-session-data',
          { 
            sessionId: 'session-1',
            dataTypes: ['chat', 'polls', 'transcripts']
          },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.deleteSessionData).toHaveBeenCalledTimes(3);
        expect(mockApiClient.deleteSessionData).toHaveBeenCalledWith('session-1', 'chat');
        expect(mockApiClient.deleteSessionData).toHaveBeenCalledWith('session-1', 'polls');
        expect(mockApiClient.deleteSessionData).toHaveBeenCalledWith('session-1', 'transcripts');
        
        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(3);
      });

      it('should handle partial failures', async () => {
        mockApiClient.deleteSessionData
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('Failed to delete polls'))
          .mockResolvedValueOnce({});

        const result = await executeSessionTool(
          'bulk-delete-session-data',
          { 
            sessionId: 'session-1',
            dataTypes: ['chat', 'polls', 'transcripts']
          },
          mockApiClient,
          mockRequest
        );

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.success).toBe(false);
        expect(parsedResult.results).toHaveLength(2);
        expect(parsedResult.errors).toHaveLength(1);
        expect(result.isError).toBe(true);
      });
    });

    describe('end-session tool', () => {
      it('should end session successfully', async () => {
        mockApiClient.endSession.mockResolvedValue({});

        const result = await executeSessionTool(
          'end-session',
          { sessionId: 'session-2' },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.endSession).toHaveBeenCalledWith('session-2');
        expect(result.content[0].text).toContain('Successfully ended session');
        expect(result.content[0].text).toContain('session-2');
      });
    });

    describe('get-session-summary tool', () => {
      it('should get session summary successfully', async () => {
        mockApiClient.getSessionSummary.mockResolvedValue(mockSessionSummary);

        const result = await executeSessionTool(
          'get-session-summary',
          { sessionId: 'session-1' },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.getSessionSummary).toHaveBeenCalledWith('session-1');
        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult).toEqual(mockSessionSummary);
      });
    });

    describe('get-session-statistics tool', () => {
      it('should get session statistics successfully', async () => {
        mockApiClient.getSessionStatistics.mockResolvedValue(mockSessionStats);

        const result = await executeSessionTool(
          'get-session-statistics',
          { sessionId: 'session-1' },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith('session-1', undefined);
        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult).toEqual(mockSessionStats);
      });

      it('should pass metrics parameter', async () => {
        mockApiClient.getSessionStatistics.mockResolvedValue(mockSessionStats);

        await executeSessionTool(
          'get-session-statistics',
          { sessionId: 'session-1', metrics: 'participants,duration' },
          mockApiClient,
          mockRequest
        );

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith('session-1', 'participants,duration');
      });
    });

    describe('Error handling', () => {
      it('should handle unknown tool name', async () => {
        await expect(executeSessionTool(
          'unknown-tool',
          {},
          mockApiClient,
          mockRequest
        )).rejects.toThrow('Unknown session tool: unknown-tool');
      });

      it('should handle missing API key', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);

        const result = await executeSessionTool(
          'end-session',
          { sessionId: 'session-1' },
          mockApiClient,
          mockRequest
        );

        expect(result.content[0].text).toContain('No API key found');
        expect(result.isError).toBe(true);
      });

      it('should handle API errors gracefully', async () => {
        mockApiClient.endSession.mockRejectedValue(new Error('Session not found'));

        const result = await executeSessionTool(
          'end-session',
          { sessionId: 'invalid-session' },
          mockApiClient,
          mockRequest
        );

        expect(result.content[0].text).toContain('Error ending session');
        expect(result.content[0].text).toContain('Session not found');
        expect(result.isError).toBe(true);
      });
    });
  });
});