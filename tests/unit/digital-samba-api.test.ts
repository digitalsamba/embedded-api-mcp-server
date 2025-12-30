/**
 * Unit tests for Digital Samba API Client
 * 
 * This file tests the core API client functionality including authentication,
 * request handling, error handling, and all API methods.
 * 
 * @group unit
 * @group api
 */

import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import apiKeyContext from '../../src/auth';
import { MemoryCache } from '../../src/cache';
import {
  ApiRequestError,
  ApiResponseError,
  AuthenticationError,
  ValidationError,
} from '../../src/errors';
import logger from '../../src/logger';

// Mock dependencies
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock auth module
jest.mock('../../src/auth', () => ({
  __esModule: true,
  default: {
    run: jest.fn((key, callback) => callback()),
    getStore: jest.fn(() => null)
  }
}));

// Mock global fetch
global.fetch = jest.fn();

describe('DigitalSambaApiClient', () => {
  let client: DigitalSambaApiClient;
  let mockCache: MemoryCache;
  const mockApiKey = 'test-api-key';
  const mockApiUrl = 'https://api.test.com/v1';
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = new MemoryCache();
    // Mock the invalidateNamespace method
    mockCache.invalidateNamespace = jest.fn();
    client = new DigitalSambaApiClient(mockApiKey, mockApiUrl, mockCache);
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Constructor and Authentication', () => {
    it('should create client with default API URL', () => {
      const defaultClient = new DigitalSambaApiClient(mockApiKey);
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom API URL', () => {
      const customClient = new DigitalSambaApiClient(mockApiKey, 'https://custom.api.com');
      expect(customClient).toBeDefined();
    });

    it('should create client without API key', () => {
      const clientWithoutKey = new DigitalSambaApiClient();
      expect(clientWithoutKey).toBeDefined();
    });

    it('should use API key from context when available', async () => {
      const clientWithoutKey = new DigitalSambaApiClient(undefined, mockApiUrl);
      
      // Mock the context to return the API key
      (apiKeyContext.getStore as jest.Mock).mockReturnValueOnce('context-api-key');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await clientWithoutKey.listRooms();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer context-api-key'
          })
        })
      );
    });

    it('should throw AuthenticationError when no API key available', async () => {
      const clientWithoutKey = new DigitalSambaApiClient(undefined, mockApiUrl);
      
      await expect(clientWithoutKey.listRooms()).rejects.toThrow(AuthenticationError);
      await expect(clientWithoutKey.listRooms()).rejects.toThrow(
        'No developer key found in context or provided directly. Please include an Authorization header with a Bearer token.'
      );
    });
  });

  describe('Request Method', () => {
    describe('Successful requests', () => {
      it('should make successful GET request', async () => {
        const mockResponse = { data: [{ id: '1', name: 'Room 1' }], total_count: 1 };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        const result = await client.listRooms();
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockApiKey}`,
              'Content-Type': 'application/json'
            })
          })
        );
        expect(result.data).toEqual(mockResponse.data);
        expect(result.total_count).toEqual(mockResponse.total_count);
        expect(result.length).toBe(1);
        expect(typeof result.map).toBe('function');
      });

      it('should make successful POST request with body', async () => {
        const roomData = { name: 'Test Room' };
        const mockResponse = { id: '123', ...roomData };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        const result = await client.createRoom(roomData);
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(roomData),
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockApiKey}`,
              'Content-Type': 'application/json'
            })
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle 204 No Content response', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: jest.fn().mockResolvedValue('')
        });

        const result = await client.deleteRoom('123');
        
        expect(result).toEqual({});
      });

      it('should handle empty response body', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('')
        });

        const result = await client.deleteRoom('123');
        
        expect(result).toEqual({});
      });

      it('should add array-like properties to ApiResponse', async () => {
        const mockData = [{ id: '1' }, { id: '2' }];
        const mockResponse = { data: mockData, total_count: 2 };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        const result = await client.listRooms();
        
        expect(result.length).toBe(2);
        expect(result.map).toBeDefined();
        expect(result.map((item: any) => item.id)).toEqual(['1', '2']);
      });

      it('should handle full URL endpoints', async () => {
        const fullUrl = 'https://external.api.com/endpoint';
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('{"success": true}')
        });

        // Use internal request method via a public method that allows full URLs
        const result = await client.getRecordingDownloadLink('123');
        
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/recordings/123/download'),
          expect.any(Object)
        );
      });
    });

    describe('Caching', () => {
      it('should cache GET requests', async () => {
        const mockResponse = { data: [{ id: '1' }], total_count: 1 };
        
        // Mock cache methods
        mockCache.get = jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce({ value: mockResponse });
        mockCache.set = jest.fn();
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        // First request - should hit API
        const result1 = await client.listRooms();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result1.data).toEqual(mockResponse.data);
        expect(result1.total_count).toEqual(mockResponse.total_count);
        expect(mockCache.set).toHaveBeenCalledWith('api', '/rooms', expect.objectContaining({
          data: mockResponse.data,
          total_count: mockResponse.total_count,
          length: 1,
          map: expect.any(Function)
        }));

        // Second request - should hit cache
        const result2 = await client.listRooms();
        expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
        expect(result2.data).toEqual(mockResponse.data);
        expect(result2.total_count).toEqual(mockResponse.total_count);
        expect(logger.debug).toHaveBeenCalledWith('Cache hit for /rooms');
      });

      it('should not cache non-GET requests', async () => {
        const roomData = { name: 'Test Room' };
        
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue('{"id": "123"}')
        });

        await client.createRoom(roomData);
        await client.createRoom(roomData);
        
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it('should invalidate cache when deleting resources', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 204,
          text: jest.fn().mockResolvedValue('')
        });
        
        await client.deleteRoom('123');
        
        expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('api');
      });
    });

    describe('Error handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network failure');
        (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

        await expect(client.listRooms()).rejects.toThrow(ApiRequestError);
      });

      it('should handle 400 Bad Request as ValidationError', async () => {
        const errorResponse = {
          message: 'Invalid input',
          errors: { name: ['Name is required'] }
        };
        
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: jest.fn().mockResolvedValue(JSON.stringify(errorResponse))
        });

        await expect(client.createRoom({})).rejects.toThrow(ValidationError);
        await expect(client.createRoom({})).rejects.toThrow('Validation error: Invalid input');
      });

      it('should handle 401 Unauthorized as AuthenticationError', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: jest.fn().mockResolvedValue('{"message": "Invalid API key"}')
        });

        await expect(client.listRooms()).rejects.toThrow(AuthenticationError);
        await expect(client.listRooms()).rejects.toThrow('Authentication error: Invalid API key');
      });

      it('should handle 403 Forbidden as AuthenticationError', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: jest.fn().mockResolvedValue('{"message": "Insufficient permissions"}')
        });

        await expect(client.listRooms()).rejects.toThrow(AuthenticationError);
      });

      it('should handle 404 Not Found as ApiResponseError', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: jest.fn().mockResolvedValue('{"message": "Room not found"}')
        });

        await expect(client.getRoom('123')).rejects.toThrow(ApiResponseError);
        await expect(client.getRoom('123')).rejects.toThrow(
          'Digital Samba API error (404): Room not found'
        );
      });

      it('should handle generic API errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: jest.fn().mockResolvedValue('{"message": "Server error"}')
        });

        await expect(client.listRooms()).rejects.toThrow(ApiResponseError);
        await expect(client.listRooms()).rejects.toThrow(
          'Digital Samba API error (500): Server error'
        );
      });

      it('should handle non-JSON error responses', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: jest.fn().mockResolvedValue('Plain text error')
        });

        await expect(client.listRooms()).rejects.toThrow(ApiResponseError);
        await expect(client.listRooms()).rejects.toThrow(
          'Digital Samba API error (500): Plain text error'
        );
      });

      it('should handle invalid JSON responses', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('Invalid JSON {')
        });

        await expect(client.listRooms()).rejects.toThrow(ApiResponseError);
        await expect(client.listRooms()).rejects.toThrow('Invalid JSON response from Digital Samba API');
      });

      it('should handle unexpected errors', async () => {
        // Create a non-Error object to test the error handling
        const weirdError = { toString: () => 'Weird error' };
        (global.fetch as jest.Mock).mockImplementationOnce(() => {
          throw weirdError;
        });

        await expect(client.listRooms()).rejects.toThrow(ApiRequestError);
        await expect(client.listRooms()).rejects.toThrow('Unexpected error in Digital Samba API request');
      });
    });
  });

  describe('Room Management Methods', () => {
    describe('listRooms', () => {
      it('should list rooms without parameters', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
        });

        await client.listRooms();
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms`,
          expect.any(Object)
        );
      });

      it('should list rooms with pagination parameters', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
        });

        await client.listRooms({ limit: 20, offset: 10, order: 'desc' });
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms?limit=20&offset=10&order=desc`,
          expect.any(Object)
        );
      });

      it('should handle undefined parameters', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
        });

        await client.listRooms({ limit: undefined, offset: 10 });
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms?offset=10`,
          expect.any(Object)
        );
      });
    });

    describe('getRoom', () => {
      it('should get a specific room', async () => {
        const mockRoom = { id: '123', name: 'Test Room' };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockRoom))
        });

        const result = await client.getRoom('123');
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms/123`,
          expect.any(Object)
        );
        expect(result).toEqual(mockRoom);
      });
    });

    describe('createRoom', () => {
      it('should create room with minimal settings', async () => {
        const mockRoom = { id: '123', name: 'New Meeting Room' };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockRoom))
        });

        const result = await client.createRoom({});
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'New Meeting Room' })
          })
        );
        expect(result).toEqual(mockRoom);
      });

      it('should create room with full settings', async () => {
        const settings = {
          name: 'Test Room',
          description: 'A test room',
          privacy: 'private' as const,
          max_participants: 100
        };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue('{"id": "123"}')
        });

        await client.createRoom(settings);
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(settings)
          })
        );
      });
    });

    describe('updateRoom', () => {
      it('should update room settings', async () => {
        const updates = { name: 'Updated Room' };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('{"id": "123", "name": "Updated Room"}')
        });

        await client.updateRoom('123', updates);
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms/123`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(updates)
          })
        );
      });
    });

    describe('deleteRoom', () => {
      it('should delete room without options', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: jest.fn().mockResolvedValue('')
        });

        await client.deleteRoom('123');
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms/123`,
          expect.objectContaining({
            method: 'DELETE',
            body: undefined
          })
        );
      });

      it('should delete room with options', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: jest.fn().mockResolvedValue('')
        });

        await client.deleteRoom('123', { delete_resources: true });
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms/123`,
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ delete_resources: true })
          })
        );
      });
    });

    describe('generateRoomToken', () => {
      it('should generate room token', async () => {
        const tokenOptions = { u: 'John Doe', role: 'moderator' };
        const mockResponse = { token: 'jwt-token', link: 'https://join.link' };
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
        });

        const result = await client.generateRoomToken('123', tokenOptions);
        
        expect(global.fetch).toHaveBeenCalledWith(
          `${mockApiUrl}/rooms/123/token`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(tokenOptions)
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Session Management Methods', () => {
    it('should list sessions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listSessions({ room_id: '123', live: true });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions?room_id=123&live=true`,
        expect.any(Object)
      );
    });

    it('should end session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.endSession('session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/end`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get session summary', async () => {
      const mockSummary = { 
        job_id: 'job-123',
        status: 'READY' as const,
        summary: 'Session summary'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockSummary))
      });

      const result = await client.getSessionSummary('session-123');
      
      expect(result).toEqual(mockSummary);
    });

    it('should delete session data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteSessionData('session-123', 'chat');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/chat`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Recording Management Methods', () => {
    it('should list recordings', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listRecordings({ room_id: '123', status: 'READY' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings?room_id=123&status=READY`,
        expect.any(Object)
      );
    });

    it('should list archived recordings', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listArchivedRecordings({ room_id: '123' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/archived?room_id=123`,
        expect.any(Object)
      );
    });

    it('should get recording download link', async () => {
      const mockLink = { url: 'https://download.link', expires_at: '2024-01-01' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockLink))
      });

      const result = await client.getRecordingDownloadLink('rec-123', 60);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/rec-123/download?valid_for_minutes=60`,
        expect.any(Object)
      );
      expect(result).toEqual(mockLink);
    });

    it('should start recording', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.startRecording('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/recordings/start`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should stop recording', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.stopRecording('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/recordings/stop`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Export Methods', () => {
    it('should export chat messages', async () => {
      const mockExport = 'Chat export content';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(mockExport)
      });

      const result = await client.exportChatMessages('room-123', { 
        session_id: 'session-123',
        format: 'json'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/chat/export?session_id=session-123&format=json`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`
          })
        })
      );
      expect(result).toBe(mockExport);
    });

    it('should export Q&A', async () => {
      const mockExport = 'Q&A export content';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(mockExport)
      });

      const result = await client.exportQA('room-123', { format: 'txt' });
      
      expect(result).toBe(mockExport);
    });

    it('should export transcripts', async () => {
      const mockExport = 'Transcript export content';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(mockExport)
      });

      const result = await client.exportTranscripts('session-123', { format: 'json' });
      
      expect(result).toBe(mockExport);
    });

    it('should handle export errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not found')
      });

      await expect(client.exportPolls('room-123')).rejects.toThrow(
        'Digital Samba API error (404): Not found'
      );
    });
  });

  describe('Webhook Management Methods', () => {
    it('should list webhook events', async () => {
      const mockEvents = ['room.created', 'room.deleted'];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockEvents))
      });

      const result = await client.listWebhookEvents();
      
      expect(result).toEqual(mockEvents);
    });

    it('should create webhook', async () => {
      const webhookSettings = {
        endpoint: 'https://webhook.url',
        events: ['room.created']
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"id": "webhook-123"}')
      });

      await client.createWebhook(webhookSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/webhooks`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(webhookSettings)
        })
      );
    });
  });

  describe('Role Management Methods', () => {
    it('should list roles', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listRoles({ limit: 10 });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/roles?limit=10`,
        expect.any(Object)
      );
    });

    it('should create role', async () => {
      const roleSettings = {
        name: 'custom-role',
        display_name: 'Custom Role',
        permissions: { can_share_screen: true }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"id": "role-123"}')
      });

      await client.createRole(roleSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/roles`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(roleSettings)
        })
      );
    });

    it('should list permissions', async () => {
      const mockPermissions = ['can_share_screen', 'can_record'];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockPermissions))
      });

      const result = await client.listPermissions();
      
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('Library Management Methods', () => {
    it('should list libraries', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listLibraries();
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries`,
        expect.any(Object)
      );
    });

    it('should create library', async () => {
      const librarySettings = {
        name: 'Test Library',
        external_id: 'ext-123'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"id": "lib-123"}')
      });

      await client.createLibrary(librarySettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(librarySettings)
        })
      );
    });

    it('should get library hierarchy', async () => {
      const mockHierarchy = { folders: [], files: [] };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockHierarchy))
      });

      const result = await client.getLibraryHierarchy('lib-123');
      
      expect(result).toEqual(mockHierarchy);
    });

    it('should create library file', async () => {
      const fileSettings = {
        name: 'test.pdf',
        folder_id: 'folder-123'
      };
      const mockResponse = {
        file_id: 'file-123',
        file_name: 'test.pdf',
        external_storage_url: 'https://upload.url',
        token: 'upload-token',
        expiration_timestamp: 1234567890
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await client.createLibraryFile('lib-123', fileSettings);
      
      expect(result).toEqual(mockResponse);
    });

    it('should get file links', async () => {
      const mockLinks = {
        pages: [{
          url: 'https://view.url',
          thumbnail_url: 'https://thumb.url'
        }]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockLinks))
      });

      const result = await client.getFileLinks('lib-123', 'file-123');
      
      expect(result).toEqual(mockLinks);
    });
  });

  describe('Statistics Methods', () => {
    it('should get team statistics', async () => {
      const mockStats = { sessions: 10, participants: 50 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getTeamStatistics({ 
        date_start: '2024-01-01',
        date_end: '2024-01-31'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/statistics?date_start=2024-01-01&date_end=2024-01-31`,
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });

    it('should get room statistics', async () => {
      const mockStats = { sessions: 5, participants: 20 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getRoomStatistics('room-123', { metrics: 'sessions,participants' });
      
      expect(result).toEqual(mockStats);
    });

    it('should get participant statistics', async () => {
      const mockStats = { sessions_attended: 3, total_duration: 7200 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getParticipantStatistics('participant-123');
      
      expect(result).toEqual(mockStats);
    });
  });

  describe('Live Session Controls', () => {
    it('should start transcription', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.startTranscription('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/transcription/start`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should stop transcription', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.stopTranscription('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/transcription/stop`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle phone participants joined', async () => {
      const participants = [{
        call_id: 'call-123',
        name: 'John Doe',
        caller_number: '+1234567890'
      }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.phoneParticipantsJoined('room-123', participants);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/phone-participants/joined`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(participants)
        })
      );
    });

    it('should handle phone participants left', async () => {
      const callIds = ['call-123', 'call-456'];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.phoneParticipantsLeft('room-123', callIds);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/phone-participants/left`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(callIds)
        })
      );
    });
  });

  describe('Communication Management Methods', () => {
    it('should get chat messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.getChatMessages('room-123', { session_id: 'session-123' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/chat?session_id=session-123`,
        expect.any(Object)
      );
    });

    it('should delete chat messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteChatMessages('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/chat`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get Q&A', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.getQuestionsAndAnswers('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/questions`,
        expect.any(Object)
      );
    });

    it('should delete session chats', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteSessionChats('session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/chat`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should delete session Q&A', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteSessionQA('session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/questions`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should delete session summaries', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteSessionSummaries('session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/summaries`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Poll Management Methods', () => {
    it('should get polls', async () => {
      const mockPolls = [{ id: 'poll-1', question: 'Test poll?' }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockPolls))
      });

      const result = await client.getPolls('room-123');
      
      expect(result).toEqual(mockPolls);
    });

    it('should create poll', async () => {
      const pollSettings = {
        question: 'Test poll?',
        options: [{ text: 'Yes' }, { text: 'No' }]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"id": "poll-123"}')
      });

      await client.createPoll('room-123', pollSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(pollSettings)
        })
      );
    });

    it('should get poll results', async () => {
      const mockResults = [{
        id: 'poll-123',
        votes: 10,
        options: []
      }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResults))
      });

      const result = await client.getPollResults('room-123', 'poll-123', 'session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls/poll-123/results?session_id=session-123`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResults);
    });

    it('should delete session polls', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteSessionPolls('session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/polls`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should publish poll results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.publishPollResults('poll-123', 'session-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/polls/poll-123/publish-results`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Default Room Settings', () => {
    it('should get default room settings', async () => {
      const mockSettings = { chat_enabled: true, recordings_enabled: false };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockSettings))
      });

      const result = await client.getDefaultRoomSettings();
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockSettings);
    });

    it('should update default room settings', async () => {
      const updates = { chat_enabled: false };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"chat_enabled": false}')
      });

      await client.updateDefaultRoomSettings(updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });
  });

  describe('Webapp and Whiteboard Methods', () => {
    it('should create webapp', async () => {
      const webappSettings = {
        name: 'Test App',
        folder_id: 'folder-123'
      };
      const mockResponse = {
        file_id: 'webapp-123',
        file_name: 'Test App',
        external_storage_url: 'https://upload.url',
        token: 'upload-token',
        expiration_timestamp: 1234567890
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await client.createWebapp('lib-123', webappSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/webapps`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(webappSettings)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create whiteboard', async () => {
      const whiteboardSettings = {
        name: 'Test Board'
      };
      const mockResponse = {
        file_id: 'wb-123',
        file_name: 'Test Board',
        external_storage_url: 'https://upload.url',
        token: 'upload-token',
        expiration_timestamp: 1234567890
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await client.createWhiteboard('lib-123', whiteboardSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/whiteboards`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(whiteboardSettings)
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Breakout Rooms', () => {
    it('should list breakout rooms', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listBreakoutRooms('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms`,
        expect.any(Object)
      );
    });

    it('should create breakout rooms', async () => {
      const settings = {
        count: 3,
        name_prefix: 'Breakout'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 3}')
      });

      await client.createBreakoutRooms('room-123', settings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(settings)
        })
      );
    });

    it('should delete all breakout rooms', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteAllBreakoutRooms('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms`,
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('api');
    });

    it('should assign participants to breakout rooms', async () => {
      const assignments = [{
        breakout_room_id: 'br-123',
        participant_ids: ['p1', 'p2']
      }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.assignParticipantsToBreakoutRooms('room-123', assignments);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/assignments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(assignments)
        })
      );
    });

    it('should broadcast to breakout rooms', async () => {
      const message = { message: 'Please wrap up your discussions' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.broadcastToBreakoutRooms('room-123', message);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/broadcast`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(message)
        })
      );
    });

    it('should open breakout rooms', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.openBreakoutRooms('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/open`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should close breakout rooms', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.closeBreakoutRooms('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/close`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return all participants to main room', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.returnAllParticipantsToMainRoom('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/return-all`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Live Participants', () => {
    it('should get live rooms', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.getLiveRooms({ limit: 10 });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/live?limit=10`,
        expect.any(Object)
      );
    });

    it('should get live rooms with participants', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.getLiveRoomsWithParticipants();
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/live/participants`,
        expect.any(Object)
      );
    });

    it('should get room live participants count', async () => {
      const mockResponse = {
        id: 'room-123',
        live_participants: 5,
        start_time: '2024-01-01T10:00:00Z',
        session_duration: 3600
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await client.getRoomLiveParticipantsCount('room-123');
      
      expect(result).toEqual(mockResponse);
    });

    it('should get room live participants data', async () => {
      const mockResponse = {
        id: 'room-123',
        live_participants: [{
          id: 'p1',
          name: 'John',
          role: 'moderator',
          join_time: '2024-01-01T10:00:00Z'
        }],
        start_time: '2024-01-01T10:00:00Z',
        session_duration: 3600
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse))
      });

      const result = await client.getRoomLiveParticipantsData('room-123');
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Additional Coverage', () => {
    it('should list participants with all filters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listParticipants({
        limit: 20,
        offset: 0,
        live: true,
        room_id: 'room-123',
        session_id: 'session-123',
        date_start: '2024-01-01',
        date_end: '2024-01-31'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('room_id=room-123'),
        expect.any(Object)
      );
    });

    it('should get specific participant', async () => {
      const mockParticipant = {
        id: 'p-123',
        name: 'John Doe',
        sessions_attended: 5
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockParticipant))
      });

      const result = await client.getParticipant('p-123');
      
      expect(result).toEqual(mockParticipant);
    });

    it('should list room participants', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listRoomParticipants('room-123', {
        live: false,
        session_id: 'session-123'
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/participants?live=false&session_id=session-123`,
        expect.any(Object)
      );
    });

    it('should list session participants', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listSessionParticipants('session-123', { live: true });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/participants?live=true`,
        expect.any(Object)
      );
    });

    it('should get recording', async () => {
      const mockRecording = {
        id: 'rec-123',
        status: 'READY',
        duration: 3600
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockRecording))
      });

      const result = await client.getRecording('rec-123');
      
      expect(result).toEqual(mockRecording);
    });

    it('should delete recording', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteRecording('rec-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/rec-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should archive recording', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.archiveRecording('rec-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/rec-123/archive`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should unarchive recording', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.unarchiveRecording('rec-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/rec-123/unarchive`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get webhook', async () => {
      const mockWebhook = {
        id: 'wh-123',
        endpoint: 'https://webhook.url',
        events: ['room.created']
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockWebhook))
      });

      const result = await client.getWebhook('wh-123');
      
      expect(result).toEqual(mockWebhook);
    });

    it('should update webhook', async () => {
      const updates = { events: ['room.deleted'] };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "wh-123"}')
      });

      await client.updateWebhook('wh-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/webhooks/wh-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete webhook', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteWebhook('wh-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/webhooks/wh-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get role', async () => {
      const mockRole = {
        id: 'role-123',
        name: 'custom-role',
        permissions: {}
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockRole))
      });

      const result = await client.getRole('role-123');
      
      expect(result).toEqual(mockRole);
    });

    it('should update role', async () => {
      const updates = { display_name: 'Updated Role' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "role-123"}')
      });

      await client.updateRole('role-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/roles/role-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete role', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteRole('role-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/roles/role-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should delete room resources', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteRoomResources('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/resources`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get poll', async () => {
      const mockPoll = {
        id: 'poll-123',
        question: 'Test?',
        options: []
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockPoll))
      });

      const result = await client.getPoll('room-123', 'poll-123');
      
      expect(result).toEqual(mockPoll);
    });

    it('should update poll', async () => {
      const updates = { question: 'Updated question?' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "poll-123"}')
      });

      await client.updatePoll('room-123', 'poll-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls/poll-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete poll', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deletePoll('room-123', 'poll-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls/poll-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should delete Q&A', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteQA('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/questions`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get library', async () => {
      const mockLibrary = {
        id: 'lib-123',
        name: 'Test Library'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockLibrary))
      });

      const result = await client.getLibrary('lib-123');
      
      expect(result).toEqual(mockLibrary);
    });

    it('should update library', async () => {
      const updates = { name: 'Updated Library' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "lib-123"}')
      });

      await client.updateLibrary('lib-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete library', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteLibrary('lib-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should list library folders', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listLibraryFolders('lib-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/folders`,
        expect.any(Object)
      );
    });

    it('should create library folder', async () => {
      const folderSettings = { name: 'New Folder' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"id": "folder-123"}')
      });

      await client.createLibraryFolder('lib-123', folderSettings);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/folders`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(folderSettings)
        })
      );
    });

    it('should get library folder', async () => {
      const mockFolder = {
        id: 'folder-123',
        name: 'Test Folder'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockFolder))
      });

      const result = await client.getLibraryFolder('lib-123', 'folder-123');
      
      expect(result).toEqual(mockFolder);
    });

    it('should update library folder', async () => {
      const updates = { name: 'Updated Folder' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "folder-123"}')
      });

      await client.updateLibraryFolder('lib-123', 'folder-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/folders/folder-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete library folder', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteLibraryFolder('lib-123', 'folder-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/folders/folder-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should list library files', async () => {
      const mockFiles = [{ id: 'file-1', name: 'test.pdf' }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockFiles))
      });

      const result = await client.listLibraryFiles('lib-123');
      
      expect(result).toEqual(mockFiles);
    });

    it('should get library file', async () => {
      const mockFile = {
        id: 'file-123',
        name: 'test.pdf'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockFile))
      });

      const result = await client.getLibraryFile('lib-123', 'file-123');
      
      expect(result).toEqual(mockFile);
    });

    it('should update library file', async () => {
      const updates = { name: 'renamed.pdf' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id": "file-123"}')
      });

      await client.updateLibraryFile('lib-123', 'file-123', updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/files/file-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete library file', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteLibraryFile('lib-123', 'file-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/libraries/lib-123/files/file-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get team current statistics', async () => {
      const mockStats = { sessions: 5 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getTeamCurrentStatistics('sessions');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/statistics/team/current?metrics=sessions`,
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });

    it('should get simplified team current statistics', async () => {
      const mockStats = { total: 100 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getSimplifiedTeamCurrentStatistics();
      
      expect(result).toEqual(mockStats);
    });

    it('should get room current statistics', async () => {
      const mockStats = { sessions: 3 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getRoomCurrentStatistics('room-123', 'sessions');
      
      expect(result).toEqual(mockStats);
    });

    it('should get session statistics with metrics', async () => {
      const mockStats = { participants: 10 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockStats))
      });

      const result = await client.getSessionStatistics('session-123', 'participants');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/sessions/session-123/statistics?metrics=participants`,
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });

    it('should get breakout room', async () => {
      const mockBreakout = {
        id: 'br-123',
        name: 'Breakout 1'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockBreakout))
      });

      const result = await client.getBreakoutRoom('room-123', 'br-123');
      
      expect(result).toEqual(mockBreakout);
    });

    it('should delete breakout room', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue('')
      });

      await client.deleteBreakoutRoom('room-123', 'br-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/br-123`,
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockCache.invalidateNamespace).toHaveBeenCalledWith('api');
    });

    it('should list breakout room participants', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listBreakoutRoomParticipants('room-123', 'br-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/breakout-rooms/br-123/participants`,
        expect.any(Object)
      );
    });

    it('should export polls without options', async () => {
      const mockExport = 'Poll export';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(mockExport)
      });

      const result = await client.exportPolls('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls/export`,
        expect.any(Object)
      );
      expect(result).toBe(mockExport);
    });

    it('should handle empty query params in listWebhooks', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"data": [], "total_count": 0}')
      });

      await client.listWebhooks();
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/webhooks`,
        expect.any(Object)
      );
    });

    it('should handle getRecordingDownloadLink without validForMinutes', async () => {
      const mockLink = { url: 'https://download.link' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockLink))
      });

      const result = await client.getRecordingDownloadLink('rec-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/recordings/rec-123/download`,
        expect.any(Object)
      );
      expect(result).toEqual(mockLink);
    });

    it('should handle getPollResults without sessionId', async () => {
      const mockResults = [{ id: 'poll-123' }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResults))
      });

      const result = await client.getPollResults('room-123', 'poll-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/rooms/room-123/polls/poll-123/results`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResults);
    });
  });
});