/**
 * Unit tests for Room Resources and Tools
 * 
 * @group unit
 * @group rooms
 */

import { registerRoomResources, handleRoomResource } from '../../src/resources/rooms/index';
import { registerRoomTools, executeRoomTool } from '../../src/tools/room-management/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { getApiKeyFromRequest } from '../../src/auth';

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

// Mock data
const mockRoom = {
  id: 'test-room-id',
  name: 'Test Room',
  description: 'A test room',
  friendly_url: 'test-room',
  privacy: 'public',
  max_participants: 100,
  created_at: '2025-01-06T10:00:00Z',
  updated_at: '2025-01-06T10:00:00Z'
};

const mockRoomsList = {
  data: [
    mockRoom,
    {
      id: 'test-room-id-2',
      name: 'Another Test Room',
      description: 'Another test room',
      friendly_url: 'another-test-room',
      privacy: 'private',
      max_participants: 50,
      created_at: '2025-01-06T11:00:00Z',
      updated_at: '2025-01-06T11:00:00Z'
    }
  ],
  pagination: {
    page: 1,
    per_page: 20,
    total: 2
  }
};

const mockToken = {
  token: 'test-token-string',
  expires_at: '2025-01-06T12:00:00Z',
  room_url: 'https://digitalsamba.com/room/test-room',
  auto_join: true
};

describe('Room Resources', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listRooms: jest.fn(),
      getRoom: jest.fn(),
      createRoom: jest.fn(),
      updateRoom: jest.fn(),
      deleteRoom: jest.fn(),
      generateRoomToken: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    
    // Setup mock request
    mockRequest = {
      sessionId: 'test-session-id'
    };
    
    // Setup auth mock
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });

  describe('registerRoomResources', () => {
    it('should register all room resources', () => {
      const resources = registerRoomResources();
      
      expect(resources).toHaveLength(6); // Updated to include live resources
      expect(resources[0]).toEqual({
        uri: 'digitalsamba://rooms',
        name: 'rooms',
        description: '[Room Data - RESOURCE] List all rooms in your account. Use when users say: "show rooms", "list rooms", "show all rooms", "get rooms", "display rooms", "view rooms", "list meeting rooms", "get room list", "what rooms exist", "room directory", "all rooms", "my rooms". This is a READ-ONLY RESOURCE, not a tool. Returns array of room objects with IDs, names, settings, and join URLs. Useful for browsing available meeting spaces or finding specific rooms.',
        mimeType: 'application/json'
      });
      expect(resources[1]).toEqual({
        uri: 'digitalsamba://rooms/{roomId}',
        name: 'room',
        description: '[Room Data] Get complete details for a specific room. Use to access: "show room details", "get room info", "room configuration", "room settings", "what are room parameters". Requires roomId parameter. Returns full room object with all settings, max participants, features, and URLs.',
        mimeType: 'application/json'
      });
      // Verify live resources exist
      expect(resources[2].uri).toBe('digitalsamba://rooms/live');
      expect(resources[3].uri).toBe('digitalsamba://rooms/live/participants');
      expect(resources[4].uri).toBe('digitalsamba://rooms/{roomId}/live');
      expect(resources[5].uri).toBe('digitalsamba://rooms/{roomId}/live/participants');
    });
  });

  describe('handleRoomResource', () => {
    const options = {
      apiUrl: 'https://api.digitalsamba.com/api/v1'
    };

    describe('List Rooms', () => {
      it('should list all rooms', async () => {
        mockApiClient.listRooms.mockResolvedValue(mockRoomsList);

        const result = await handleRoomResource(
          'digitalsamba://rooms',
          {},
          mockRequest,
          options
        );

        expect(mockApiClient.listRooms).toHaveBeenCalled();
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://rooms/test-room-id');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockRoom);
      });

      it('should handle API errors when listing rooms', async () => {
        mockApiClient.listRooms.mockRejectedValue(new Error('API Error'));

        await expect(handleRoomResource(
          'digitalsamba://rooms',
          {},
          mockRequest,
          options
        )).rejects.toThrow('API Error');
      });

      it('should handle missing API key', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);
        process.env.DIGITAL_SAMBA_DEVELOPER_KEY = '';

        await expect(handleRoomResource(
          'digitalsamba://rooms',
          {},
          mockRequest,
          options
        )).rejects.toThrow('No API key found');
      });

      it('should use API key from environment variable as fallback', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);
        process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'env-api-key';
        mockApiClient.listRooms.mockResolvedValue(mockRoomsList);

        const result = await handleRoomResource(
          'digitalsamba://rooms',
          {},
          mockRequest,
          options
        );

        expect(DigitalSambaApiClient).toHaveBeenCalledWith('env-api-key', options.apiUrl, undefined);
        expect(result.contents).toHaveLength(2);
      });
    });

    describe('Get Specific Room', () => {
      it('should get room details by ID in URI', async () => {
        mockApiClient.getRoom.mockResolvedValue(mockRoom);

        const result = await handleRoomResource(
          'digitalsamba://rooms/test-room-id',
          {},
          mockRequest,
          options
        );

        expect(mockApiClient.getRoom).toHaveBeenCalledWith('test-room-id');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].uri).toBe('digitalsamba://rooms/test-room-id');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockRoom);
      });

      it('should get room details by ID in params', async () => {
        mockApiClient.getRoom.mockResolvedValue(mockRoom);

        const result = await handleRoomResource(
          'digitalsamba://rooms/test-room-id',
          { roomId: 'test-room-id' },
          mockRequest,
          options
        );

        expect(mockApiClient.getRoom).toHaveBeenCalledWith('test-room-id');
        expect(result.contents).toHaveLength(1);
      });

      it('should error when URI is ambiguous without room ID', async () => {
        mockApiClient.listRooms.mockResolvedValue({ data: [] });

        const result = await handleRoomResource(
          'digitalsamba://rooms/',
          {},
          mockRequest,
          options
        );

        expect(mockApiClient.listRooms).toHaveBeenCalled();
        expect(result.contents).toHaveLength(0);
      });

      it('should handle API errors when getting room', async () => {
        mockApiClient.getRoom.mockRejectedValue(new Error('Room not found'));

        await expect(handleRoomResource(
          'digitalsamba://rooms/test-room-id',
          {},
          mockRequest,
          options
        )).rejects.toThrow('Room not found');
      });

      it('should handle missing API key for specific room', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);

        await expect(handleRoomResource(
          'digitalsamba://rooms/test-room-id',
          {},
          mockRequest,
          options
        )).rejects.toThrow('No API key found');
      });
    });
  });
});

describe('Room Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockRequest: any;
  const options = {
    apiUrl: 'https://api.digitalsamba.com/api/v1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      createRoom: jest.fn(),
      updateRoom: jest.fn(),
      deleteRoom: jest.fn(),
      generateRoomToken: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    
    // Setup mock request
    mockRequest = {
      sessionId: 'test-session-id'
    };
    
    // Setup auth mock
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });

  describe('registerRoomTools', () => {
    it('should register all room tools', () => {
      const tools = registerRoomTools();
      
      expect(tools).toHaveLength(10);
      expect(tools.map(t => t.name)).toEqual([
        'create-room',
        'update-room',
        'delete-room',
        'generate-token',
        'get-default-room-settings',
        'update-default-room-settings',
        'list-rooms',
        'get-room-details',
        'list-live-rooms',
        'list-live-participants'
      ]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('executeRoomTool', () => {
    describe('create-room', () => {
      it('should create a room with all parameters', async () => {
        mockApiClient.createRoom.mockResolvedValue(mockRoom);

        const result = await executeRoomTool('create-room', {
          name: 'Test Room',
          description: 'A test room',
          friendly_url: 'test-room',
          privacy: 'public',
          max_participants: 100
        }, mockRequest, options);

        expect(mockApiClient.createRoom).toHaveBeenCalledWith({
          name: 'Test Room',
          description: 'A test room',
          friendly_url: 'test-room',
          privacy: 'public',
          max_participants: 100
        });
        expect(result.content[0].text).toContain('Room created successfully');
        expect(result.isError).toBeUndefined();
      });

      it('should create a room with default values', async () => {
        mockApiClient.createRoom.mockResolvedValue(mockRoom);

        const result = await executeRoomTool('create-room', {}, mockRequest, options);

        expect(mockApiClient.createRoom).toHaveBeenCalledWith({
          name: 'Test Room',
          privacy: 'public'
        });
        expect(result.content[0].text).toContain('Room created successfully');
      });

      it('should handle creation errors', async () => {
        mockApiClient.createRoom.mockRejectedValue(new Error('Invalid room name'));

        const result = await executeRoomTool('create-room', {
          name: 'a' // Too short
        }, mockRequest, options);

        expect(result.content[0].text).toContain('Error creating room: Invalid room name');
        expect(result.isError).toBe(true);
      });
    });

    describe('update-room', () => {
      it('should update a room', async () => {
        mockApiClient.updateRoom.mockResolvedValue(mockRoom);

        const result = await executeRoomTool('update-room', {
          roomId: 'test-room-id',
          name: 'Updated Room',
          privacy: 'private'
        }, mockRequest, options);

        expect(mockApiClient.updateRoom).toHaveBeenCalledWith('test-room-id', {
          name: 'Updated Room',
          privacy: 'private'
        });
        expect(result.content[0].text).toContain('Room updated successfully');
        expect(result.isError).toBeUndefined();
      });

      it('should handle missing room ID', async () => {
        const result = await executeRoomTool('update-room', {
          name: 'Updated Room'
        }, mockRequest, options);

        expect(result.content[0].text).toBe('Room ID is required.');
        expect(result.isError).toBe(true);
      });

      it('should handle update errors', async () => {
        mockApiClient.updateRoom.mockRejectedValue(new Error('Room not found'));

        const result = await executeRoomTool('update-room', {
          roomId: 'test-room-id',
          name: 'Updated Room'
        }, mockRequest, options);

        expect(result.content[0].text).toContain('Error updating room: Room not found');
        expect(result.isError).toBe(true);
      });
    });

    describe('delete-room', () => {
      it('should delete a room', async () => {
        mockApiClient.deleteRoom.mockResolvedValue(undefined);

        const result = await executeRoomTool('delete-room', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(mockApiClient.deleteRoom).toHaveBeenCalledWith('test-room-id');
        expect(result.content[0].text).toBe('Room test-room-id deleted successfully!');
        expect(result.isError).toBeUndefined();
      });

      it('should handle missing room ID', async () => {
        const result = await executeRoomTool('delete-room', {}, mockRequest, options);

        expect(result.content[0].text).toBe('Room ID is required.');
        expect(result.isError).toBe(true);
      });

      it('should handle deletion errors', async () => {
        mockApiClient.deleteRoom.mockRejectedValue(new Error('Room not found'));

        const result = await executeRoomTool('delete-room', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(result.content[0].text).toContain('Error deleting room: Room not found');
        expect(result.isError).toBe(true);
      });
    });

    describe('generate-token', () => {
      it('should generate a room token with all parameters', async () => {
        mockApiClient.generateRoomToken.mockResolvedValue(mockToken);

        const result = await executeRoomTool('generate-token', {
          roomId: 'test-room-id',
          userName: 'John Doe',
          role: 'moderator',
          externalId: 'user-123'
        }, mockRequest, options);

        expect(mockApiClient.generateRoomToken).toHaveBeenCalledWith('test-room-id', {
          u: 'John Doe',
          role: 'moderator',
          ud: 'user-123'
        });
        expect(result.content[0].text).toContain('Token generated successfully');
        expect(result.isError).toBeUndefined();
      });

      it('should generate a room token with minimal parameters', async () => {
        mockApiClient.generateRoomToken.mockResolvedValue(mockToken);

        const result = await executeRoomTool('generate-token', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(mockApiClient.generateRoomToken).toHaveBeenCalledWith('test-room-id', {
          u: undefined,
          role: undefined,
          ud: undefined
        });
        expect(result.content[0].text).toContain('Token generated successfully');
      });

      it('should handle token generation errors', async () => {
        mockApiClient.generateRoomToken.mockRejectedValue(new Error('Room not found'));

        const result = await executeRoomTool('generate-token', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(result.content[0].text).toContain('Error generating token: Room not found');
        expect(result.isError).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle missing API key', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);

        const result = await executeRoomTool('create-room', {
          name: 'Test Room'
        }, mockRequest, options);

        expect(result.content[0].text).toBe('No API key found. Please include an Authorization header with a Bearer token.');
        expect(result.isError).toBe(true);
      });

      it('should handle unknown tool name', async () => {
        await expect(executeRoomTool('unknown-tool', {}, mockRequest, options))
          .rejects.toThrow('Unknown room tool: unknown-tool');
      });
    });
  });
});