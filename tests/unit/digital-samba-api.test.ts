/**
 * Unit tests for Digital Samba API Client
 * 
 * This file contains tests for the DigitalSambaApiClient class, mocking the fetch API
 * to test the request handling, error handling, and API method implementation.
 * 
 * @group unit
 * @group api-client
 */

import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import apiKeyContext from '../../src/auth';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the apiKeyContext
jest.mock('../../src/auth', () => ({
  __esModule: true,
  default: {
    getCurrentApiKey: jest.fn(),
  },
}));

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

describe('DigitalSambaApiClient', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for fetch to return success
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ data: [] }),
      text: jest.fn().mockResolvedValue(''),
    });
  });
  
  describe('Constructor', () => {
    it('should create an instance with direct API key', () => {
      const client = new DigitalSambaApiClient('test-api-key');
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
    });
    
    it('should create an instance with default API base URL', () => {
      const client = new DigitalSambaApiClient('test-api-key');
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
      // Can't directly test the private apiBaseUrl property
    });
    
    it('should create an instance with custom API base URL', () => {
      const client = new DigitalSambaApiClient('test-api-key', 'https://custom-api.example.com/v1');
      expect(client).toBeInstanceOf(DigitalSambaApiClient);
      // Can't directly test the private apiBaseUrl property
    });
  });
  
  describe('API Key Handling', () => {
    it('should use API key from ApiKeyContext when available', async () => {
      // Set up the mock to return an API key from context
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('context-api-key');
      
      const client = new DigitalSambaApiClient();
      await client.listRooms();
      
      // Check that fetch was called with the context API key
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers).toHaveProperty('Authorization', 'Bearer context-api-key');
    });
    
    it('should use direct API key when ApiKeyContext has no key', async () => {
      // Set up the mock to return no API key from context
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue(undefined);
      
      const client = new DigitalSambaApiClient('direct-api-key');
      await client.listRooms();
      
      // Check that fetch was called with the direct API key
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers).toHaveProperty('Authorization', 'Bearer direct-api-key');
    });
    
    it('should throw error when no API key is available', async () => {
      // Set up the mock to return no API key from context
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue(undefined);
      
      const client = new DigitalSambaApiClient();
      
      // Should throw an error when trying to make a request
      await expect(client.listRooms()).rejects.toThrow('No API key found');
    });
  });
  
  describe('Request Handling', () => {
    it('should make a GET request with proper headers', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      const client = new DigitalSambaApiClient();
      await client.listRooms();
      
      // Check that fetch was called correctly
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms');
      expect(options.method).toBeUndefined(); // Default is GET
      expect(options.headers).toEqual({
        'Authorization': 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
    });
    
    it('should make a POST request with proper body', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      const client = new DigitalSambaApiClient();
      await client.createRoom({ name: 'Test Room' });
      
      // Check that fetch was called correctly
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms');
      expect(options.method).toBe('POST');
      expect(options.body).toBe('{"name":"Test Room"}');
    });
    
    it('should handle query parameters correctly', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      const client = new DigitalSambaApiClient();
      await client.listRooms({ limit: 10, offset: 20, order: 'asc' });
      
      // Check that fetch was called with the correct URL including query parameters
      expect(global.fetch).toHaveBeenCalled();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms?limit=10&offset=20&order=asc');
    });
    
    it('should handle empty response correctly (204 No Content)', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return 204 No Content
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.deleteRoom('room-id');
      
      // Check that the result is an empty object
      expect(result).toEqual({});
    });
  });
  
  describe('Response Handling', () => {
    it('should parse JSON response correctly', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          data: [
            { id: 'room-1', name: 'Room 1' },
            { id: 'room-2', name: 'Room 2' },
          ],
          total_count: 2,
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.listRooms();
      
      // Check that the response was parsed correctly
      expect(result).toEqual({
        data: [
          { id: 'room-1', name: 'Room 1' },
          { id: 'room-2', name: 'Room 2' },
        ],
        total_count: 2,
        length: 2,
        map: expect.any(Function),
      });
    });
    
    it('should add array-like properties to ApiResponse objects', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          data: [
            { id: 'room-1', name: 'Room 1' },
            { id: 'room-2', name: 'Room 2' },
          ],
          total_count: 2,
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.listRooms();
      
      // Check that array-like properties were added
      expect(result.length).toBe(2);
      
      // Check that the map function works
      const mapped = result.map(room => room.id);
      expect(mapped).toEqual(['room-1', 'room-2']);
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error for non-2xx responses', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a 404 Not Found response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Room not found'),
      });
      
      const client = new DigitalSambaApiClient();
      
      // Should throw an error with the response information
      await expect(client.getRoom('non-existent-room')).rejects.toThrow('Digital Samba API error (404): Room not found');
    });
    
    it('should throw error for network failures', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to throw a network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const client = new DigitalSambaApiClient();
      
      // Should throw the network error
      await expect(client.listRooms()).rejects.toThrow('Network error');
    });
  });
  
  describe('Room API Methods', () => {
    it('should correctly call the listRooms endpoint', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          data: [
            { id: 'room-1', name: 'Room 1' },
          ],
          total_count: 1,
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.listRooms();
      
      // Check that fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalled();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms');
      
      // Check that the response was processed correctly
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('room-1');
    });
    
    it('should correctly call the getRoom endpoint', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          id: 'room-1',
          name: 'Room 1',
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.getRoom('room-1');
      
      // Check that fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalled();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms/room-1');
      
      // Check that the response was processed correctly
      expect(result.id).toBe('room-1');
      expect(result.name).toBe('Room 1');
    });
    
    it('should correctly call the createRoom endpoint', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          id: 'new-room',
          name: 'New Room',
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.createRoom({ name: 'New Room' });
      
      // Check that fetch was called with the correct URL and body
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ name: 'New Room' });
      
      // Check that the response was processed correctly
      expect(result.id).toBe('new-room');
      expect(result.name).toBe('New Room');
    });
  });
  
  describe('Recordings API Methods', () => {
    it('should correctly call the listRecordings endpoint', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return a specific JSON response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          data: [
            { 
              id: 'recording-1', 
              name: 'Recording 1',
              status: 'READY',
              room_id: 'room-1',
              created_at: '2025-05-01T00:00:00Z',
              updated_at: '2025-05-01T00:10:00Z'
            },
          ],
          total_count: 1,
        }),
      });
      
      const client = new DigitalSambaApiClient();
      const result = await client.listRecordings();
      
      // Check that fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalled();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/recordings');
      
      // Check that the response was processed correctly
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('recording-1');
      expect(result.data[0].status).toBe('READY');
    });
    
    it('should correctly call the startRecording endpoint', async () => {
      // Set up the mock to return an API key
      (apiKeyContext.getCurrentApiKey as jest.Mock).mockReturnValue('test-api-key');
      
      // Mock fetch to return 204 No Content
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });
      
      const client = new DigitalSambaApiClient();
      await client.startRecording('room-1');
      
      // Check that fetch was called with the correct URL and method
      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.digitalsamba.com/api/v1/rooms/room-1/recordings/start');
      expect(options.method).toBe('POST');
    });
  });
});
