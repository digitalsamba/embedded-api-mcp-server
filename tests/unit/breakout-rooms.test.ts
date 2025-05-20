/**
 * Unit tests for the breakout-rooms.ts module
 * 
 * These tests verify the functionality of the breakout rooms implementation,
 * focusing on error handling, parameter validation, and API interaction patterns.
 * 
 * @module breakout-rooms.test
 * @author Digital Samba Team
 * @version 0.1.0
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupBreakoutRoomsFunctionality } from '../src/breakout-rooms';
import { DigitalSambaApiClient } from '../src/digital-samba-api';
import { getApiKeyFromRequest } from '../src/auth';
import { 
  AuthenticationError, 
  ResourceNotFoundError, 
  ValidationError 
} from '../src/errors';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const mockResource = jest.fn();
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

describe('Breakout Rooms Functionality', () => {
  let server: McpServer;
  let mockRequest: any;
  let mockResourceHandler: any;
  let mockToolHandler: any;
  
  const API_URL = 'https://api.digitalsamba.com/v1';
  const API_KEY = 'test-api-key';
  
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
      }
    };
    
    // Mock API key retrieval
    (getApiKeyFromRequest as jest.Mock).mockReturnValue(API_KEY);
    
    // Set up the breakout rooms functionality
    setupBreakoutRoomsFunctionality(server, API_URL);
    
    // Capture resource and tool handlers
    mockResourceHandler = (server.resource as jest.Mock).mock.calls[0][2];
    mockToolHandler = (server.tool as jest.Mock).mock.calls[0][2];
  });
  
  describe('Resources', () => {
    test('should throw ValidationError when roomId is missing', async () => {
      // Arrange
      const uri = { href: 'digitalsamba://rooms/undefined/breakout-rooms' };
      const params = { roomId: undefined };
      
      // Act & Assert
      await expect(mockResourceHandler(uri, params, mockRequest))
        .rejects
        .toThrow(ValidationError);
    });
    
    test('should throw AuthenticationError when API key is missing', async () => {
      // Arrange
      const uri = { href: 'digitalsamba://rooms/123/breakout-rooms' };
      const params = { roomId: '123' };
      
      // Mock API key retrieval to return undefined
      (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(undefined);
      
      // Act & Assert
      await expect(mockResourceHandler(uri, params, mockRequest))
        .rejects
        .toThrow(AuthenticationError);
    });
    
    test('should throw ResourceNotFoundError when room is not found', async () => {
      // Arrange
      const uri = { href: 'digitalsamba://rooms/invalid-id/breakout-rooms' };
      const params = { roomId: 'invalid-id' };
      
      // Mock API client to throw 404 error
      const mockError = new Error('Room not found');
      mockError.statusCode = 404;
      
      (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
        listBreakoutRooms: jest.fn().mockRejectedValue(mockError)
      }));
      
      // Act & Assert
      await expect(mockResourceHandler(uri, params, mockRequest))
        .rejects
        .toThrow(ResourceNotFoundError);
    });
    
    test('should return breakout rooms when API call is successful', async () => {
      // Arrange
      const uri = { href: 'digitalsamba://rooms/123/breakout-rooms' };
      const params = { roomId: '123' };
      
      const mockBreakoutRooms = [
        { id: 'b1', name: 'Breakout Room 1' },
        { id: 'b2', name: 'Breakout Room 2' }
      ];
      
      (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
        listBreakoutRooms: jest.fn().mockResolvedValue({
          data: mockBreakoutRooms
        })
      }));
      
      // Act
      const result = await mockResourceHandler(uri, params, mockRequest);
      
      // Assert
      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(2);
      expect(result.contents[0].uri).toBe('digitalsamba://rooms/123/breakout-rooms/b1');
      expect(result.contents[1].uri).toBe('digitalsamba://rooms/123/breakout-rooms/b2');
    });
  });
  
  describe('Tools', () => {
    test('should return error response when roomId is missing', async () => {
      // Arrange
      const params = {
        roomId: '',
        numRooms: 3,
        namePrefix: 'Test Room'
      };
      
      // Act
      const result = await mockToolHandler(params, mockRequest);
      
      // Assert
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Room ID is required');
    });
    
    test('should return error response when API key is missing', async () => {
      // Arrange
      const params = {
        roomId: '123',
        numRooms: 3
      };
      
      // Mock API key retrieval to return undefined
      (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(undefined);
      
      // Act
      const result = await mockToolHandler(params, mockRequest);
      
      // Assert
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('No API key found');
    });
    
    test('should handle 404 errors with appropriate message', async () => {
      // Arrange
      const params = {
        roomId: 'invalid-id',
        numRooms: 3
      };
      
      // Mock API client to throw 404 error
      const mockError = new Error('Room not found');
      mockError.statusCode = 404;
      
      (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
        createBreakoutRooms: jest.fn().mockRejectedValue(mockError)
      }));
      
      // Act
      const result = await mockToolHandler(params, mockRequest);
      
      // Assert
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Room with ID invalid-id not found');
    });
    
    test('should handle 403 errors with permission message', async () => {
      // Arrange
      const params = {
        roomId: '123',
        numRooms: 3
      };
      
      // Mock API client to throw 403 error
      const mockError = new Error('Insufficient permissions');
      mockError.statusCode = 403;
      
      (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
        createBreakoutRooms: jest.fn().mockRejectedValue(mockError)
      }));
      
      // Act
      const result = await mockToolHandler(params, mockRequest);
      
      // Assert
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Insufficient permissions');
    });
    
    test('should return success response when creating breakout rooms', async () => {
      // Arrange
      const params = {
        roomId: '123',
        numRooms: 3,
        namePrefix: 'Test Room'
      };
      
      const mockCreatedRooms = [
        { id: 'b1', name: 'Test Room 1' },
        { id: 'b2', name: 'Test Room 2' },
        { id: 'b3', name: 'Test Room 3' }
      ];
      
      (DigitalSambaApiClient as jest.Mock).mockImplementationOnce(() => ({
        createBreakoutRooms: jest.fn().mockResolvedValue({
          data: mockCreatedRooms
        })
      }));
      
      // Act
      const result = await mockToolHandler(params, mockRequest);
      
      // Assert
      expect(result).not.toHaveProperty('isError');
      expect(result.content[0].text).toContain('Successfully created 3 breakout rooms');
      expect(result.content[0].text).toContain('Test Room 1');
      expect(result.content[0].text).toContain('Test Room 2');
      expect(result.content[0].text).toContain('Test Room 3');
    });
  });
});
