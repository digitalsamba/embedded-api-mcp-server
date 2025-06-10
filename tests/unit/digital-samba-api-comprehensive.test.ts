import { DigitalSambaAPI, DigitalSambaApiClient } from '../../src/digital-samba-api.js';
import { 
  ApiRequestError, 
  ApiResponseError, 
  AuthenticationError, 
  ResourceNotFoundError,
  ValidationError 
} from '../../src/errors.js';
import apiKeyContext from '../../src/auth.js';
import { MemoryCache } from '../../src/cache.js';

// Mock dependencies
jest.mock('../../src/logger.js', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/auth.js', () => ({
  default: {
    getStore: jest.fn(),
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('DigitalSambaAPI Comprehensive Tests', () => {
  let api: DigitalSambaAPI;
  let mockApiKeyContext: jest.Mocked<typeof apiKeyContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiKeyContext = apiKeyContext as jest.Mocked<typeof apiKeyContext>;
    mockApiKeyContext.getStore.mockReturnValue(null);
    
    // Set up environment
    process.env.DIGITALSAMBA_DEV_KEY = 'test-key';
    api = new DigitalSambaAPI();
  });

  afterEach(() => {
    delete process.env.DIGITALSAMBA_DEV_KEY;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with environment variable', () => {
      expect(api).toBeInstanceOf(DigitalSambaAPI);
    });

    it('should initialize with direct API key', () => {
      delete process.env.DIGITALSAMBA_DEV_KEY;
      const apiWithKey = new DigitalSambaAPI({ apiKey: 'direct-key' });
      expect(apiWithKey).toBeInstanceOf(DigitalSambaAPI);
    });

    it('should initialize with custom base URL', () => {
      const apiWithUrl = new DigitalSambaAPI({ 
        apiBaseUrl: 'https://custom.api.com' 
      });
      expect(apiWithUrl).toBeInstanceOf(DigitalSambaAPI);
    });

    it('should initialize with cache disabled', () => {
      const apiNoCache = new DigitalSambaAPI({ cache: false });
      expect(apiNoCache).toBeInstanceOf(DigitalSambaAPI);
    });

    it('should initialize with custom cache', () => {
      const customCache = new MemoryCache({ ttl: 60000 });
      const apiWithCache = new DigitalSambaAPI({ cache: customCache });
      expect(apiWithCache).toBeInstanceOf(DigitalSambaAPI);
    });
  });

  describe('Authentication', () => {
    it('should use context API key when available', async () => {
      mockApiKeyContext.getStore.mockReturnValue('context-key');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      await api.getRooms();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer context-key'
          })
        })
      );
    });

    it('should fall back to environment key when context not available', async () => {
      mockApiKeyContext.getStore.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      await api.getRooms();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should throw AuthenticationError when no API key available', async () => {
      delete process.env.DIGITALSAMBA_DEV_KEY;
      mockApiKeyContext.getStore.mockReturnValue(null);
      const apiNoKey = new DigitalSambaAPI();

      await expect(apiNoKey.getRooms()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Request Handling', () => {
    it('should handle successful responses', async () => {
      const mockData = { data: [{ id: '1', name: 'Room 1' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await api.getRooms();
      expect(result).toEqual(mockData);
    });

    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => { throw new Error('No content'); }
      });

      const result = await api.deleteRoom('room-123');
      expect(result).toEqual({});
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(api.getRooms()).rejects.toThrow(ApiRequestError);
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(api.getRooms()).rejects.toThrow(AuthenticationError);
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' })
      });

      await expect(api.getRoom('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should handle 400 Bad Request with validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          message: 'Validation failed',
          errors: { name: ['Required'] }
        })
      });

      await expect(api.createRoom({})).rejects.toThrow(ValidationError);
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' })
      });

      await expect(api.getRooms()).rejects.toThrow(ApiResponseError);
    });
  });

  describe('Caching', () => {
    it('should cache GET requests', async () => {
      const mockData = { data: [{ id: '1', name: 'Room 1' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      });

      // First call - should hit API
      const result1 = await api.getRooms();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await api.getRooms();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
      expect(result2).toEqual(result1);
    });

    it('should not cache non-GET requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', name: 'New Room' })
      });

      await api.createRoom({ name: 'New Room' });
      await api.createRoom({ name: 'New Room' });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Room Management Methods', () => {
    it('should update room with correct parameters', async () => {
      const updates = { name: 'Updated Room', max_participants: 50 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'room-1', ...updates })
      });

      const result = await api.updateRoom('room-1', updates);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
      expect(result.name).toBe('Updated Room');
    });

    it('should generate token with all parameters', async () => {
      const tokenParams = {
        role: 'moderator',
        externalId: 'user-123',
        userName: 'John Doe'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          token: 'generated-token',
          joinUrl: 'https://example.com/join'
        })
      });

      const result = await api.generateToken('room-1', tokenParams);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1/generate_access_token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            externalUserId: tokenParams.externalId,
            username: tokenParams.userName,
            role: tokenParams.role
          })
        })
      );
    });
  });

  describe('Session Management Methods', () => {
    it('should get session statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          totalParticipants: 25,
          duration: 3600
        })
      });

      const result = await api.getSessionStatistics('session-1');
      expect(result.totalParticipants).toBe(25);
    });

    it('should bulk delete session data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.bulkDeleteSessionData('session-1', ['chat', 'qa']);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-1/data/bulk'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ dataTypes: ['chat', 'qa'] })
        })
      );
    });
  });

  describe('Poll Management', () => {
    it('should create poll with all options', async () => {
      const pollData = {
        question: 'Test question?',
        options: [
          { text: 'Option 1' },
          { text: 'Option 2' }
        ],
        type: 'single' as const,
        anonymous: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'poll-1', ...pollData })
      });

      const result = await api.createPoll('room-1', pollData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1/polls'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(pollData)
        })
      );
    });

    it('should publish poll results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await api.publishPollResults('room-1', 'poll-1', 'session-1');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1/polls/poll-1/publish'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sessionId: 'session-1' })
        })
      );
    });
  });

  describe('Library Management', () => {
    it('should bulk upload files', async () => {
      const files = [
        { name: 'file1.pdf', size: 1000, mimeType: 'application/pdf' },
        { name: 'file2.jpg', size: 2000, mimeType: 'image/jpeg' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          uploadUrls: [
            { fileId: 'file-1', uploadUrl: 'https://upload1.com' },
            { fileId: 'file-2', uploadUrl: 'https://upload2.com' }
          ]
        })
      });

      const result = await api.bulkUploadLibraryFiles('lib-1', files);
      expect(result.uploadUrls).toHaveLength(2);
    });

    it('should copy library content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, newId: 'copy-1' })
      });

      const result = await api.copyLibraryContent({
        sourceLibraryId: 'lib-1',
        targetLibraryId: 'lib-2',
        contentType: 'file',
        contentId: 'file-1',
        newName: 'Copied File'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/library/copy'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Webhook Management', () => {
    it('should list webhook events', async () => {
      const mockEvents = {
        events: [
          { name: 'room.created', description: 'Room created' },
          { name: 'session.ended', description: 'Session ended' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      const result = await api.listWebhookEvents();
      expect(result.events).toHaveLength(2);
    });
  });

  describe('Error Response Handling', () => {
    it('should handle HTML error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null
        },
        text: async () => '<html>Error page</html>',
        json: async () => { throw new Error('Not JSON'); }
      });

      await expect(api.getRooms()).rejects.toThrow(ApiResponseError);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Invalid JSON response'
      });

      await expect(api.getRooms()).rejects.toThrow(ApiResponseError);
    });
  });
});