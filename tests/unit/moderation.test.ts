/**
 * Unit tests for the moderation module
 * 
 * These tests validate the moderation functionality, including resources and tools
 * for room moderation, participant management, and ban handling.
 * 
 * @author Digital Samba Team
 * @version 0.1.0
 */
import { setupModerationFunctionality } from '../../src/moderation';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { 
  AuthenticationError, 
  ResourceNotFoundError, 
  ValidationError, 
  ApiResponseError 
} from '../../src/errors';

// Mock the dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../src/auth', () => ({
  getApiKeyFromRequest: jest.fn(),
}));

// Create mock MCP server
const mockServer = {
  resource: jest.fn(),
  tool: jest.fn(),
};

// Mock API client methods
const mockApiClient = {
  getRoom: jest.fn(),
  updateRoom: jest.fn(),
  removeParticipant: jest.fn(),
  setParticipantMute: jest.fn(),
  setParticipantRole: jest.fn(),
  getBannedParticipants: jest.fn(),
  banParticipant: jest.fn(),
  unbanParticipant: jest.fn(),
};

// Import mocked modules
import { getApiKeyFromRequest } from '../../src/auth';

describe('Moderation Module', () => {
  const apiUrl = 'https://api.example.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock return values
    (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApiClient);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });
  
  describe('setupModerationFunctionality', () => {
    it('should register the expected resources and tools', () => {
      setupModerationFunctionality(mockServer as any, apiUrl);
      
      // Check if resources are registered
      expect(mockServer.resource).toHaveBeenCalledTimes(2);
      expect(mockServer.resource).toHaveBeenCalledWith(
        'room-moderation-settings',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.resource).toHaveBeenCalledWith(
        'banned-participants',
        expect.anything(),
        expect.any(Function)
      );
      
      // Check if tools are registered
      expect(mockServer.tool).toHaveBeenCalledTimes(8);
      expect(mockServer.tool).toHaveBeenCalledWith(
        'set-room-lock',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'remove-participant',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'set-participant-mute',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'update-room-media-settings',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'set-participant-role',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ban-participant',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'unban-participant',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'list-banned-participants',
        expect.anything(),
        expect.any(Function)
      );
    });
  });
  
  describe('Resource Handlers', () => {
    let resourceHandlers: Record<string, Function> = {};
    
    beforeEach(() => {
      // Reset the handlers
      resourceHandlers = {};
      
      // Capture resource handlers when they're registered
      (mockServer.resource as jest.Mock).mockImplementation((name, template, handler) => {
        resourceHandlers[name] = handler;
      });
      
      // Setup the server
      setupModerationFunctionality(mockServer as any, apiUrl);
    });
    
    describe('room-moderation-settings handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockUri = { href: 'digitalsamba://rooms/123/moderation' };
      const mockParams = { roomId: '123' };
      
      it('should throw ValidationError when roomId is missing', async () => {
        await expect(resourceHandlers['room-moderation-settings'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(ValidationError);
      });
      
      it('should throw AuthenticationError when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        await expect(resourceHandlers['room-moderation-settings'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
      
      it('should return moderation settings successfully', async () => {
        mockApiClient.getRoom.mockResolvedValueOnce({
          id: '123',
          name: 'Test Room',
          is_locked: true,
          chat_enabled: false,
          private_chat_enabled: true
        });
        
        const result = await resourceHandlers['room-moderation-settings'](
          mockUri, 
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toHaveProperty('uri', mockUri.href);
        
        const settings = JSON.parse(result.contents[0].text);
        expect(settings).toHaveProperty('is_locked', true);
        expect(settings).toHaveProperty('chat_enabled', false);
        expect(settings).toHaveProperty('private_chat_enabled', true);
      });
      
      it('should handle API errors correctly with ResourceNotFoundError', async () => {
        mockApiClient.getRoom.mockRejectedValueOnce(new Error('Room not found (404)'));
        
        await expect(resourceHandlers['room-moderation-settings'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(ResourceNotFoundError);
      });
      
      it('should handle authentication errors correctly', async () => {
        mockApiClient.getRoom.mockRejectedValueOnce(new Error('Unauthorized (401)'));
        
        await expect(resourceHandlers['room-moderation-settings'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
    });
    
    describe('banned-participants handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockUri = { href: 'digitalsamba://rooms/123/banned-participants' };
      const mockParams = { roomId: '123' };
      
      it('should throw ValidationError when roomId is missing', async () => {
        await expect(resourceHandlers['banned-participants'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(ValidationError);
      });
      
      it('should throw AuthenticationError when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        await expect(resourceHandlers['banned-participants'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
      
      it('should return banned participants list successfully', async () => {
        mockApiClient.getBannedParticipants.mockResolvedValueOnce({
          data: [
            { id: 'user1', name: 'User 1', ban_time: '2025-05-20T12:00:00Z' },
            { id: 'user2', name: 'User 2', ban_time: '2025-05-20T13:00:00Z' }
          ]
        });
        
        const result = await resourceHandlers['banned-participants'](
          mockUri, 
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0]).toHaveProperty('uri', 'digitalsamba://rooms/123/banned-participants/user1');
        expect(result.contents[1]).toHaveProperty('uri', 'digitalsamba://rooms/123/banned-participants/user2');
      });
      
      it('should handle not found errors correctly', async () => {
        mockApiClient.getBannedParticipants.mockRejectedValueOnce(new Error('Room not found (404)'));
        
        await expect(resourceHandlers['banned-participants'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(ResourceNotFoundError);
      });
    });
  });
  
  describe('Tool Handlers', () => {
    let toolHandlers: Record<string, Function> = {};
    
    beforeEach(() => {
      // Reset the handlers
      toolHandlers = {};
      
      // Capture tool handlers when they're registered
      (mockServer.tool as jest.Mock).mockImplementation((name, schema, handler) => {
        toolHandlers[name] = handler;
      });
      
      // Setup the server
      setupModerationFunctionality(mockServer as any, apiUrl);
    });
    
    describe('set-room-lock handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { roomId: '123', lock: true };
      
      it('should return error when roomId is missing', async () => {
        const result = await toolHandlers['set-room-lock'](
          { lock: true }, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Room ID is required');
      });
      
      it('should return error when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        const result = await toolHandlers['set-room-lock'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('No API key found');
      });
      
      it('should lock room successfully', async () => {
        mockApiClient.updateRoom.mockResolvedValueOnce({ id: '123', is_locked: true });
        
        const result = await toolHandlers['set-room-lock'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('locked successfully');
        expect(mockApiClient.updateRoom).toHaveBeenCalledWith('123', { is_locked: true });
      });
      
      it('should handle room not found error', async () => {
        mockApiClient.updateRoom.mockRejectedValueOnce(new Error('Room not found (404)'));
        
        const result = await toolHandlers['set-room-lock'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Room with ID 123 not found');
      });
    });
    
    describe('ban-participant handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { roomId: '123', participantId: 'user1' };
      
      it('should return error when required params are missing', async () => {
        const result = await toolHandlers['ban-participant'](
          { roomId: '123' }, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('required');
      });
      
      it('should ban participant successfully', async () => {
        mockApiClient.banParticipant.mockResolvedValueOnce({ success: true });
        
        const result = await toolHandlers['ban-participant'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('banned');
        expect(mockApiClient.banParticipant).toHaveBeenCalledWith('123', 'user1');
      });
      
      it('should handle participant not found error', async () => {
        mockApiClient.banParticipant.mockRejectedValueOnce(new Error('Participant not found (404)'));
        
        const result = await toolHandlers['ban-participant'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Participant with ID user1 not found');
      });
      
      it('should handle permission error', async () => {
        mockApiClient.banParticipant.mockRejectedValueOnce(new Error('Forbidden (403)'));
        
        const result = await toolHandlers['ban-participant'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('You do not have permission');
      });
    });
    
    describe('list-banned-participants handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { roomId: '123' };
      
      it('should return empty message when no banned participants', async () => {
        mockApiClient.getBannedParticipants.mockResolvedValueOnce({ data: [] });
        
        const result = await toolHandlers['list-banned-participants'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('No banned participants found');
      });
      
      it('should list banned participants correctly', async () => {
        mockApiClient.getBannedParticipants.mockResolvedValueOnce({
          data: [
            { id: 'user1', name: 'User 1', ban_time: '2025-05-20T12:00:00Z' },
            { id: 'user2', name: 'User 2', ban_time: '2025-05-20T13:00:00Z' }
          ]
        });
        
        const result = await toolHandlers['list-banned-participants'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('Found 2 banned participants');
        expect(result.content[0].text).toContain('User 1');
        expect(result.content[0].text).toContain('User 2');
      });
    });
  });
});
