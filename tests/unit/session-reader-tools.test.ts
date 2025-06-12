/**
 * Unit tests for Session Reader Tools
 * 
 * Tests the reader tools that mirror session resources for AI assistant compatibility
 * 
 * @group unit
 * @group session-reader-tools
 */

import { executeSessionTool } from '../../src/tools/session-management/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { getApiKeyFromRequest } from '../../src/auth';
import { handleSessionResource } from '../../src/resources/sessions/index';

// Mock dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/auth');
jest.mock('../../src/resources/sessions/index');
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock data
const mockSessionsList = {
  contents: [
    {
      uri: 'digitalsamba://sessions/session-1',
      text: JSON.stringify({
        id: 'session-1',
        room_id: 'room-1',
        room_name: 'Test Room 1',
        started_at: '2025-01-06T10:00:00Z',
        ended_at: '2025-01-06T11:00:00Z',
        duration: 3600
      }),
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://sessions/session-2',
      text: JSON.stringify({
        id: 'session-2',
        room_id: 'room-2',
        room_name: 'Test Room 2',
        started_at: '2025-01-06T12:00:00Z',
        ended_at: null,
        duration: null
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockSessionDetails = {
  contents: [
    {
      uri: 'digitalsamba://sessions/session-1',
      text: JSON.stringify({
        id: 'session-1',
        room_id: 'room-1',
        room_name: 'Test Room 1',
        started_at: '2025-01-06T10:00:00Z',
        ended_at: '2025-01-06T11:00:00Z',
        duration: 3600,
        max_participants: 10,
        unique_participants: 8,
        participation_minutes: 480
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockSessionParticipants = {
  contents: [
    {
      uri: 'digitalsamba://sessions/session-1/participants',
      text: JSON.stringify({
        session_id: 'session-1',
        participants: [
          {
            id: 'p1',
            name: 'John Doe',
            joined_at: '2025-01-06T10:00:00Z',
            left_at: '2025-01-06T10:30:00Z',
            duration: 1800
          },
          {
            id: 'p2',
            name: 'Jane Smith',
            joined_at: '2025-01-06T10:15:00Z',
            left_at: '2025-01-06T11:00:00Z',
            duration: 2700
          }
        ]
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockRoomSessions = {
  contents: [
    {
      uri: 'digitalsamba://rooms/room-1/sessions',
      text: JSON.stringify({
        room_id: 'room-1',
        sessions: [
          {
            id: 'session-1',
            started_at: '2025-01-06T10:00:00Z',
            ended_at: '2025-01-06T11:00:00Z',
            duration: 3600
          },
          {
            id: 'session-3',
            started_at: '2025-01-06T14:00:00Z',
            ended_at: '2025-01-06T15:00:00Z',
            duration: 3600
          }
        ]
      }),
      mimeType: 'application/json'
    }
  ]
};

describe('Session Reader Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listSessions: jest.fn(),
      getSessionSummary: jest.fn(),
      listSessionParticipants: jest.fn(),
      listRoomSessions: jest.fn()
    } as any;
    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    
    // Setup mock request
    mockRequest = {
      sessionId: 'test-session-id'
    };
    
    // Setup auth mock
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
    
    // Setup resource handler mock
    (handleSessionResource as jest.Mock).mockImplementation((uri) => {
      if (uri === 'digitalsamba://sessions') {
        return Promise.resolve(mockSessionsList);
      } else if (uri.includes('/participants')) {
        return Promise.resolve(mockSessionParticipants);
      } else if (uri.includes('rooms/') && uri.includes('/sessions')) {
        return Promise.resolve(mockRoomSessions);
      } else if (uri.includes('session-1')) {
        return Promise.resolve(mockSessionDetails);
      }
      return Promise.resolve({ contents: [] });
    });
  });

  describe('list-sessions', () => {
    it('should list all sessions', async () => {
      mockApiClient.listSessions.mockResolvedValue({
        data: [
          {
            id: 'session-1',
            room_id: 'room-1',
            room_name: 'Test Room 1',
            started_at: '2025-01-06T10:00:00Z',
            ended_at: '2025-01-06T11:00:00Z',
            duration: 3600
          },
          {
            id: 'session-2',
            room_id: 'room-2',
            room_name: 'Test Room 2',
            started_at: '2025-01-06T12:00:00Z',
            ended_at: null,
            duration: null
          }
        ]
      });

      const result = await executeSessionTool('list-sessions', {}, mockApiClient, mockRequest);

      expect(mockApiClient.listSessions).toHaveBeenCalled();
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('session-1');
      expect(responseText).toContain('Test Room 1');
      expect(responseText).toContain('Test Room 2');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty session list', async () => {
      mockApiClient.listSessions.mockResolvedValue({ data: [] });

      const result = await executeSessionTool('list-sessions', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });

    it('should handle errors', async () => {
      mockApiClient.listSessions.mockRejectedValue(new Error('API Error'));

      const result = await executeSessionTool('list-sessions', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('Error listing sessions: API Error');
      expect(result.isError).toBe(true);
    });
  });

  describe('get-session-details', () => {
    it('should get session details by ID', async () => {
      mockApiClient.getSessionSummary.mockResolvedValue({
        id: 'session-1',
        room_id: 'room-1',
        room_name: 'Test Room 1',
        started_at: '2025-01-06T10:00:00Z',
        ended_at: '2025-01-06T11:00:00Z',
        duration: 3600,
        max_participants: 10,
        unique_participants: 8,
        participation_minutes: 480
      });

      const result = await executeSessionTool('get-session-details', {
        sessionId: 'session-1'
      }, mockApiClient, mockRequest);

      expect(mockApiClient.getSessionSummary).toHaveBeenCalledWith('session-1');

      const responseText = result.content[0].text;
      expect(responseText).toContain('session-1');
      expect(responseText).toContain('participation_minutes');
      expect(result.isError).toBeUndefined();
    });

    it('should handle missing session ID', async () => {
      mockApiClient.getSessionSummary.mockRejectedValue(new Error('Session ID is required'));

      const result = await executeSessionTool('get-session-details', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('Error getting session details: Session ID is required');
      expect(result.isError).toBe(true);
    });

    it('should handle session not found', async () => {
      mockApiClient.getSessionSummary.mockRejectedValue(new Error('Session not found'));

      const result = await executeSessionTool('get-session-details', {
        sessionId: 'non-existent'
      }, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('Error getting session details: Session not found');
      expect(result.isError).toBe(true);
    });
  });

  describe('list-session-participants', () => {
    it('should list participants for a session', async () => {
      mockApiClient.listSessionParticipants.mockResolvedValue({
        data: [
          {
            id: 'p1',
            name: 'John Doe',
            joined_at: '2025-01-06T10:00:00Z',
            left_at: '2025-01-06T10:30:00Z',
            duration: 1800
          },
          {
            id: 'p2',
            name: 'Jane Smith',
            joined_at: '2025-01-06T10:15:00Z',
            left_at: '2025-01-06T11:00:00Z',
            duration: 2700
          }
        ]
      });

      const result = await executeSessionTool('list-session-participants', {
        sessionId: 'session-1'
      }, mockApiClient, mockRequest);

      expect(mockApiClient.listSessionParticipants).toHaveBeenCalledWith('session-1');

      const responseText = result.content[0].text;
      expect(responseText).toContain('John Doe');
      expect(responseText).toContain('Jane Smith');
      expect(result.isError).toBeUndefined();
    });

    it('should handle missing session ID', async () => {
      mockApiClient.listSessionParticipants.mockRejectedValue(new Error('Session ID is required'));

      const result = await executeSessionTool('list-session-participants', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('Error listing session participants: Session ID is required');
      expect(result.isError).toBe(true);
    });

    it('should handle no participants', async () => {
      mockApiClient.listSessionParticipants.mockResolvedValue({ data: [] });

      const result = await executeSessionTool('list-session-participants', {
        sessionId: 'session-1'
      }, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('list-room-sessions', () => {
    it('should list sessions for a specific room', async () => {
      mockApiClient.listRoomSessions.mockResolvedValue({
        data: [
          {
            id: 'session-1',
            started_at: '2025-01-06T10:00:00Z',
            ended_at: '2025-01-06T11:00:00Z',
            duration: 3600
          },
          {
            id: 'session-3',
            started_at: '2025-01-06T14:00:00Z',
            ended_at: '2025-01-06T15:00:00Z',
            duration: 3600
          }
        ]
      });

      const result = await executeSessionTool('list-room-sessions', {
        roomId: 'room-1'
      }, mockApiClient, mockRequest);

      expect(mockApiClient.listRoomSessions).toHaveBeenCalledWith('room-1', expect.any(Object));

      const responseText = result.content[0].text;
      expect(responseText).toContain('session-1');
      expect(responseText).toContain('session-3');
      expect(result.isError).toBeUndefined();
    });

    it('should handle missing room ID', async () => {
      mockApiClient.listRoomSessions.mockRejectedValue(new Error('Room ID is required'));

      const result = await executeSessionTool('list-room-sessions', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('Error listing room sessions: Room ID is required');
      expect(result.isError).toBe(true);
    });

    it('should handle no sessions for room', async () => {
      mockApiClient.listRoomSessions.mockResolvedValue({ data: [] });

      const result = await executeSessionTool('list-room-sessions', {
        roomId: 'room-1'
      }, mockApiClient, mockRequest);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key', async () => {
      (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = '';

      const result = await executeSessionTool('list-sessions', {}, mockApiClient, mockRequest);

      expect(result.content[0].text).toBe('No API key found. Please include an Authorization header with a Bearer token.');
      expect(result.isError).toBe(true);
    });

    it('should handle unknown tool name', async () => {
      await expect(
        executeSessionTool('unknown-session-tool', {}, mockApiClient, mockRequest)
      ).rejects.toThrow('Unknown session tool: unknown-session-tool');
    });
  });
});