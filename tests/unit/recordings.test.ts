/**
 * Unit tests for the recordings module
 * 
 * These tests validate the recordings functionality, including resources and tools
 * for listing, retrieving, and managing recordings.
 * 
 * @author Digital Samba Team
 * @version 0.1.0
 */
import { setupRecordingFunctionality } from '../../src/recordings';
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
  listRecordings: jest.fn(),
  listArchivedRecordings: jest.fn(),
  getRecording: jest.fn(),
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  deleteRecording: jest.fn(),
  getRecordingDownloadLink: jest.fn(),
  archiveRecording: jest.fn(),
  unarchiveRecording: jest.fn(),
};

// Import mocked modules
import { getApiKeyFromRequest } from '../../src/auth';

describe('Recordings Module', () => {
  const apiUrl = 'https://api.example.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock return values
    (DigitalSambaApiClient as jest.Mock).mockImplementation(() => mockApiClient);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });
  
  describe('setupRecordingFunctionality', () => {
    it('should register the expected resources and tools', () => {
      setupRecordingFunctionality(mockServer as any, apiUrl);
      
      // Check if resources are registered
      expect(mockServer.resource).toHaveBeenCalledTimes(4);
      expect(mockServer.resource).toHaveBeenCalledWith(
        'recordings',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.resource).toHaveBeenCalledWith(
        'recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.resource).toHaveBeenCalledWith(
        'room-recordings',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.resource).toHaveBeenCalledWith(
        'archived-recordings',
        expect.anything(),
        expect.any(Function)
      );
      
      // Check if tools are registered
      expect(mockServer.tool).toHaveBeenCalledTimes(8);
      expect(mockServer.tool).toHaveBeenCalledWith(
        'get-recordings',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'start-recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'stop-recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'delete-recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'get-recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'get-recording-download-link',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'archive-recording',
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.tool).toHaveBeenCalledWith(
        'unarchive-recording',
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
      setupRecordingFunctionality(mockServer as any, apiUrl);
    });
    
    describe('recordings handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockUri = { href: 'digitalsamba://recordings' };
      
      it('should throw AuthenticationError when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        await expect(resourceHandlers['recordings'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
      
      it('should return recordings list successfully', async () => {
        mockApiClient.listRecordings.mockResolvedValueOnce({
          data: [
            { id: 'rec1', room_id: 'room1', status: 'READY', created_at: '2025-05-20T12:00:00Z' },
            { id: 'rec2', room_id: 'room2', status: 'IN_PROGRESS', created_at: '2025-05-20T13:00:00Z' }
          ]
        });
        
        const result = await resourceHandlers['recordings'](
          mockUri, 
          {}, 
          mockRequest
        );
        
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0]).toHaveProperty('uri', 'digitalsamba://recordings/rec1');
        expect(result.contents[1]).toHaveProperty('uri', 'digitalsamba://recordings/rec2');
      });
      
      it('should handle authentication errors correctly', async () => {
        mockApiClient.listRecordings.mockRejectedValueOnce(new Error('Unauthorized (401)'));
        
        await expect(resourceHandlers['recordings'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });

      it('should handle API errors correctly', async () => {
        mockApiClient.listRecordings.mockRejectedValueOnce(new Error('Internal server error (500)'));
        
        await expect(resourceHandlers['recordings'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(ApiResponseError);
      });
    });
    
    describe('recording handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockUri = { href: 'digitalsamba://recordings/rec1' };
      const mockParams = { recordingId: 'rec1' };
      
      it('should throw ValidationError when recordingId is missing', async () => {
        await expect(resourceHandlers['recording'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(ValidationError);
      });
      
      it('should throw AuthenticationError when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        await expect(resourceHandlers['recording'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
      
      it('should return recording details successfully', async () => {
        mockApiClient.getRecording.mockResolvedValueOnce({
          id: 'rec1',
          room_id: 'room1',
          status: 'READY',
          created_at: '2025-05-20T12:00:00Z',
          updated_at: '2025-05-20T13:00:00Z',
          duration: 120
        });
        
        const result = await resourceHandlers['recording'](
          mockUri, 
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toHaveProperty('uri', mockUri.href);
        
        const recordingData = JSON.parse(result.contents[0].text);
        expect(recordingData).toHaveProperty('id', 'rec1');
        expect(recordingData).toHaveProperty('status', 'READY');
        expect(recordingData).toHaveProperty('duration', 120);
      });
      
      it('should handle recording not found errors', async () => {
        mockApiClient.getRecording.mockRejectedValueOnce(new Error('Recording not found (404)'));
        
        await expect(resourceHandlers['recording'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(ResourceNotFoundError);
      });
    });
    
    describe('room-recordings handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockUri = { href: 'digitalsamba://rooms/room1/recordings' };
      const mockParams = { roomId: 'room1' };
      
      it('should throw ValidationError when roomId is missing', async () => {
        await expect(resourceHandlers['room-recordings'](
          mockUri, 
          {}, 
          mockRequest
        )).rejects.toThrow(ValidationError);
      });
      
      it('should throw AuthenticationError when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        await expect(resourceHandlers['room-recordings'](
          mockUri, 
          mockParams, 
          mockRequest
        )).rejects.toThrow(AuthenticationError);
      });
      
      it('should return room recordings list successfully', async () => {
        mockApiClient.listRecordings.mockResolvedValueOnce({
          data: [
            { id: 'rec1', room_id: 'room1', status: 'READY', created_at: '2025-05-20T12:00:00Z' },
            { id: 'rec2', room_id: 'room1', status: 'IN_PROGRESS', created_at: '2025-05-20T13:00:00Z' }
          ]
        });
        
        const result = await resourceHandlers['room-recordings'](
          mockUri, 
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0]).toHaveProperty('uri', 'digitalsamba://recordings/rec1');
        expect(result.contents[1]).toHaveProperty('uri', 'digitalsamba://recordings/rec2');
        expect(mockApiClient.listRecordings).toHaveBeenCalledWith({ room_id: 'room1' });
      });
      
      it('should handle room not found errors', async () => {
        mockApiClient.listRecordings.mockRejectedValueOnce(new Error('Room not found (404)'));
        
        await expect(resourceHandlers['room-recordings'](
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
      setupRecordingFunctionality(mockServer as any, apiUrl);
    });
    
    describe('start-recording handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { roomId: 'room1' };
      
      it('should return error when roomId is missing', async () => {
        const result = await toolHandlers['start-recording'](
          {}, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Room ID is required');
      });
      
      it('should return error when API key is missing', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValueOnce(null);
        
        const result = await toolHandlers['start-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('No API key found');
      });
      
      it('should start recording successfully', async () => {
        mockApiClient.startRecording.mockResolvedValueOnce({ success: true });
        
        const result = await toolHandlers['start-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('started successfully');
        expect(mockApiClient.startRecording).toHaveBeenCalledWith('room1');
      });
      
      it('should handle room not found error', async () => {
        mockApiClient.startRecording.mockRejectedValueOnce(new Error('Room not found (404)'));
        
        const result = await toolHandlers['start-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Room with ID room1 not found');
      });
      
      it('should handle already recording error', async () => {
        mockApiClient.startRecording.mockRejectedValueOnce(new Error('Already recording in this room'));
        
        const result = await toolHandlers['start-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('already in progress');
      });
    });
    
    describe('get-recording handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { recordingId: 'rec1' };
      
      it('should return recording details successfully', async () => {
        mockApiClient.getRecording.mockResolvedValueOnce({
          id: 'rec1',
          room_id: 'room1',
          status: 'READY',
          created_at: '2025-05-20T12:00:00Z',
          updated_at: '2025-05-20T13:00:00Z',
          duration: 120,
          name: 'Test Recording'
        });
        
        const result = await toolHandlers['get-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('Recording Details for ID: rec1');
        expect(result.content[0].text).toContain('Status: READY');
        expect(result.content[0].text).toContain('Name: Test Recording');
        expect(result.content[0].text).toContain('Duration: 2m 0s');
        expect(result.content[0].text).toContain('download link');
      });
      
      it('should handle recording not found error', async () => {
        mockApiClient.getRecording.mockRejectedValueOnce(new Error('Recording not found (404)'));
        
        const result = await toolHandlers['get-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Recording with ID rec1 not found');
      });
    });
    
    describe('get-recording-download-link handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { recordingId: 'rec1', validForMinutes: 30 };
      
      it('should return download link successfully', async () => {
        mockApiClient.getRecordingDownloadLink.mockResolvedValueOnce({
          url: 'https://example.com/download/rec1',
          expires_at: '2025-05-20T14:00:00Z'
        });
        
        const result = await toolHandlers['get-recording-download-link'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('generated successfully');
        expect(result.content[0].text).toContain('https://example.com/download/rec1');
        expect(mockApiClient.getRecordingDownloadLink).toHaveBeenCalledWith('rec1', 30);
      });
      
      it('should handle recording not ready error', async () => {
        mockApiClient.getRecordingDownloadLink.mockRejectedValueOnce(new Error('Recording not ready for download'));
        
        const result = await toolHandlers['get-recording-download-link'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('not ready for download');
      });
    });
    
    describe('archive-recording handler', () => {
      const mockRequest = { headers: { authorization: 'Bearer test-token' } };
      const mockParams = { recordingId: 'rec1' };
      
      it('should archive recording successfully', async () => {
        mockApiClient.archiveRecording.mockResolvedValueOnce({ success: true });
        
        const result = await toolHandlers['archive-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result.content[0].text).toContain('archived successfully');
        expect(mockApiClient.archiveRecording).toHaveBeenCalledWith('rec1');
      });
      
      it('should handle already archived error', async () => {
        mockApiClient.archiveRecording.mockRejectedValueOnce(new Error('Recording already archived'));
        
        const result = await toolHandlers['archive-recording'](
          mockParams, 
          mockRequest
        );
        
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('already archived');
      });
    });
  });
});
