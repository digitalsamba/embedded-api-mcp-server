/**
 * Unit tests for Digital Samba API Client
 * 
 * Tests for the simplified DigitalSambaApiClient class
 * 
 * @group unit
 * @group api-client
 */

import { DigitalSambaApiClient } from '../../src/digital-samba-api';

// Mock the logger
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the auth module
jest.mock('../../src/auth', () => ({
  __esModule: true,
  default: {
    getStore: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('DigitalSambaApiClient', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful response - create a proper mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => name === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ data: [] }),
      text: async () => JSON.stringify({ data: [] }),
    } as any);
  });
  
  describe('Constructor', () => {
    it('should create an instance with API key', () => {
      const client = new DigitalSambaApiClient('test-api-key');
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
    });
    
    it('should create an instance with custom API URL', () => {
      const client = new DigitalSambaApiClient('test-api-key', 'https://custom-api.com');
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
    });
    
    it('should create instance without API key (for context-based auth)', () => {
      const client = new DigitalSambaApiClient();
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
    });
  });
  
  describe('Room Management', () => {
    let client: DigitalSambaApiClient;
    
    beforeEach(() => {
      client = new DigitalSambaApiClient('test-api-key');
    });
    
    it('should list rooms', async () => {
      const mockRooms = [
        { id: 'room-1', name: 'Test Room 1' },
        { id: 'room-2', name: 'Test Room 2' },
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: mockRooms }),
        text: async () => JSON.stringify({ data: mockRooms }),
      } as any);
      
      const result = await client.listRooms();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
      
      expect(result.data).toEqual(mockRooms);
    });
    
    it('should create a room', async () => {
      const newRoom = { 
        id: 'new-room', 
        name: 'New Room',
        privacy: 'private' as const,
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => newRoom,
        text: async () => JSON.stringify(newRoom),
      } as any);
      
      const result = await client.createRoom({
        name: 'New Room',
        privacy: 'private',
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            name: 'New Room',
            privacy: 'private',
          }),
        })
      );
      
      expect(result).toEqual(newRoom);
    });
    
    it('should get a room by ID', async () => {
      const room = { id: 'room-123', name: 'Test Room' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => room,
        text: async () => JSON.stringify(room),
      } as any);
      
      const result = await client.getRoom('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
      
      expect(result).toEqual(room);
    });
    
    it('should update a room', async () => {
      const updatedRoom = { id: 'room-123', name: 'Updated Room' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => updatedRoom,
        text: async () => JSON.stringify(updatedRoom),
      } as any);
      
      const result = await client.updateRoom('room-123', {
        name: 'Updated Room',
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
          body: JSON.stringify({ name: 'Updated Room' }),
        })
      );
      
      expect(result).toEqual(updatedRoom);
    });
    
    it('should delete a room', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: {
          get: (name: string) => null,
        },
        json: async () => null,
        text: async () => '',
      } as any);
      
      await client.deleteRoom('room-123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    let client: DigitalSambaApiClient;
    
    beforeEach(() => {
      client = new DigitalSambaApiClient('test-api-key');
    });
    
    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/plain' : null,
        },
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Not Found',
      } as any);
      
      await expect(client.getRoom('nonexistent')).rejects.toThrow('Not Found');
    });
    
    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Unauthorized' }),
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      } as any);
      
      await expect(client.listRooms()).rejects.toThrow('Authentication error: Unauthorized');
    });
    
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(client.listRooms()).rejects.toThrow('Network error');
    });
    
    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Invalid JSON',
      } as any);
      
      await expect(client.listRooms()).rejects.toThrow();
    });
  });
  
  describe('Token Generation', () => {
    let client: DigitalSambaApiClient;
    
    beforeEach(() => {
      client = new DigitalSambaApiClient('test-api-key');
    });
    
    it('should generate a room token', async () => {
      const tokenResponse = {
        token: 'jwt-token-123',
        link: 'https://app.digitalsamba.com/join/jwt-token-123',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => tokenResponse,
        text: async () => JSON.stringify(tokenResponse),
      } as any);
      
      const result = await client.generateRoomToken('room-123', {
        userName: 'John Doe',
        role: 'moderator',
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/token'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
          body: JSON.stringify({
            userName: 'John Doe',
            role: 'moderator',
          }),
        })
      );
      
      expect(result).toEqual(tokenResponse);
    });
  });
  
  describe('Pagination', () => {
    let client: DigitalSambaApiClient;
    
    beforeEach(() => {
      client = new DigitalSambaApiClient('test-api-key');
    });
    
    it('should handle pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: [] }),
        text: async () => JSON.stringify({ data: [] }),
      } as any);
      
      await client.listRooms({ limit: 10, offset: 20 });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });
  });
});