/**
 * Unit tests for Room Reader Tools
 * 
 * Tests the reader tools that mirror room resources for AI assistant compatibility
 * 
 * @group unit
 * @group room-reader-tools
 */

import { executeRoomTool } from '../../src/tools/room-management/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { getApiKeyFromRequest } from '../../src/auth';
import { handleRoomResource } from '../../src/resources/rooms/index';

// Mock dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/auth');
jest.mock('../../src/resources/rooms/index');
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
const mockRoomsList = {
  contents: [
    {
      uri: 'digitalsamba://rooms/room-1',
      text: JSON.stringify({
        id: 'room-1',
        name: 'Test Room 1',
        privacy: 'public',
        max_participants: 100
      }),
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://rooms/room-2',
      text: JSON.stringify({
        id: 'room-2',
        name: 'Test Room 2',
        privacy: 'private',
        max_participants: 50
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockRoomDetails = {
  contents: [
    {
      uri: 'digitalsamba://rooms/room-1',
      text: JSON.stringify({
        id: 'room-1',
        name: 'Test Room 1',
        privacy: 'public',
        max_participants: 100,
        created_at: '2025-01-06T10:00:00Z',
        join_url: 'https://demo.digitalsamba.com/room-1'
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockLiveRooms = {
  contents: [
    {
      uri: 'digitalsamba://rooms/room-1/live',
      text: JSON.stringify({
        id: 'room-1',
        name: 'Test Room 1',
        participant_count: 5,
        session_duration: 1800
      }),
      mimeType: 'application/json'
    }
  ]
};

const mockLiveParticipants = {
  contents: [
    {
      uri: 'digitalsamba://rooms/room-1/live',
      text: JSON.stringify({
        id: 'room-1',
        name: 'Test Room 1',
        participants: [
          { id: 'p1', name: 'John Doe', joined_at: '2025-01-06T10:00:00Z' },
          { id: 'p2', name: 'Jane Smith', joined_at: '2025-01-06T10:05:00Z' }
        ]
      }),
      mimeType: 'application/json'
    }
  ]
};

describe('Room Reader Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockRequest: any;
  const options = {
    apiUrl: 'https://api.digitalsamba.com/api/v1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listRooms: jest.fn(),
      getRoom: jest.fn(),
      getLiveRooms: jest.fn(),
      getLiveRoomsWithParticipants: jest.fn()
    } as any;
    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    
    // Setup mock request
    mockRequest = {
      sessionId: 'test-session-id'
    };
    
    // Setup auth mock
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
    
    // Setup resource handler mock
    (handleRoomResource as jest.Mock).mockImplementation((uri) => {
      if (uri === 'digitalsamba://rooms') {
        return Promise.resolve(mockRoomsList);
      } else if (uri.includes('/live/participants')) {
        return Promise.resolve(mockLiveParticipants);
      } else if (uri.includes('/live')) {
        return Promise.resolve(mockLiveRooms);
      } else if (uri.includes('room-1')) {
        return Promise.resolve(mockRoomDetails);
      }
      return Promise.resolve({ contents: [] });
    });
  });

  describe('list-rooms', () => {
    it('should list all rooms', async () => {
      mockApiClient.listRooms.mockResolvedValue({
        data: [
          {
            id: 'room-1',
            name: 'Test Room 1',
            privacy: 'public',
            max_participants: 100
          },
          {
            id: 'room-2',
            name: 'Test Room 2',
            privacy: 'private',
            max_participants: 50
          }
        ]
      });

      const result = await executeRoomTool('list-rooms', {}, mockRequest, options);

      expect(mockApiClient.listRooms).toHaveBeenCalled();
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('room-1');
      expect(responseText).toContain('Test Room 1');
      expect(responseText).toContain('Test Room 2');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty room list', async () => {
      mockApiClient.listRooms.mockResolvedValue({ data: [] });

      const result = await executeRoomTool('list-rooms', {}, mockRequest, options);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });

    it('should handle errors', async () => {
      mockApiClient.listRooms.mockRejectedValue(new Error('API Error'));

      const result = await executeRoomTool('list-rooms', {}, mockRequest, options);

      expect(result.content[0].text).toContain('Error listing rooms: API Error');
      expect(result.isError).toBe(true);
    });
  });

  describe('get-room-details', () => {
    it('should get room details by ID', async () => {
      mockApiClient.getRoom.mockResolvedValue({
        id: 'room-1',
        name: 'Test Room 1',
        privacy: 'public',
        max_participants: 100,
        created_at: '2025-01-06T10:00:00Z',
        join_url: 'https://demo.digitalsamba.com/room-1'
      });

      const result = await executeRoomTool('get-room-details', {
        roomId: 'room-1'
      }, mockRequest, options);

      expect(mockApiClient.getRoom).toHaveBeenCalledWith('room-1');

      const responseText = result.content[0].text;
      expect(responseText).toContain('room-1');
      expect(responseText).toContain('Test Room 1');
      expect(responseText).toContain('join_url');
      expect(result.isError).toBeUndefined();
    });

    it('should handle missing room ID', async () => {
      const result = await executeRoomTool('get-room-details', {}, mockRequest, options);

      expect(result.content[0].text).toBe('Room ID is required.');
      expect(result.isError).toBe(true);
    });

    it('should handle room not found', async () => {
      mockApiClient.getRoom.mockRejectedValue(new Error('Room not found'));

      const result = await executeRoomTool('get-room-details', {
        roomId: 'non-existent'
      }, mockRequest, options);

      expect(result.content[0].text).toContain('Error getting room details: Room not found');
      expect(result.isError).toBe(true);
    });
  });

  describe('list-live-rooms', () => {
    it('should list rooms with active participants', async () => {
      mockApiClient.getLiveRooms.mockResolvedValue({
        data: [{
          id: 'room-1',
          name: 'Test Room 1',
          participant_count: 5,
          session_duration: 1800
        }]
      });

      const result = await executeRoomTool('list-live-rooms', {}, mockRequest, options);

      expect(mockApiClient.getLiveRooms).toHaveBeenCalled();

      const responseText = result.content[0].text;
      expect(responseText).toContain('room-1');
      expect(responseText).toContain('Test Room 1');
      expect(responseText).toContain('participant_count');
      expect(responseText).toContain('5');
      expect(result.isError).toBeUndefined();
    });

    it('should handle no live rooms', async () => {
      mockApiClient.getLiveRooms.mockResolvedValue({ data: [] });

      const result = await executeRoomTool('list-live-rooms', {}, mockRequest, options);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('list-live-participants', () => {
    it('should list all participants across live rooms', async () => {
      mockApiClient.getLiveRoomsWithParticipants.mockResolvedValue({
        data: [{
          id: 'room-1',
          name: 'Test Room 1',
          participants: [
            { id: 'p1', name: 'John Doe', joined_at: '2025-01-06T10:00:00Z' },
            { id: 'p2', name: 'Jane Smith', joined_at: '2025-01-06T10:05:00Z' }
          ]
        }]
      });

      const result = await executeRoomTool('list-live-participants', {}, mockRequest, options);

      expect(mockApiClient.getLiveRoomsWithParticipants).toHaveBeenCalled();

      const responseText = result.content[0].text;
      expect(responseText).toContain('room-1');
      expect(responseText).toContain('Test Room 1');
      expect(responseText).toContain('John Doe');
      expect(responseText).toContain('Jane Smith');
      expect(result.isError).toBeUndefined();
    });

    it('should handle no participants', async () => {
      mockApiClient.getLiveRoomsWithParticipants.mockResolvedValue({ data: [] });

      const result = await executeRoomTool('list-live-participants', {}, mockRequest, options);

      expect(result.content[0].text).toContain('[]');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key', async () => {
      (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = '';

      const result = await executeRoomTool('list-rooms', {}, mockRequest, options);

      expect(result.content[0].text).toBe('No API key found. Please include an Authorization header with a Bearer token.');
      expect(result.isError).toBe(true);
    });

    it('should handle unknown tool name', async () => {
      await expect(
        executeRoomTool('unknown-room-tool', {}, mockRequest, options)
      ).rejects.toThrow('Unknown room tool: unknown-room-tool');
    });
  });
});