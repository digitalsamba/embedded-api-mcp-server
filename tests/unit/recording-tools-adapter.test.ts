import { registerRecordingTools, executeRecordingTool } from '../../src/tools/recording-tools-adapter.js';
import { DigitalSambaApiClient } from '../../src/digital-samba-api.js';
import logger from '../../src/logger.js';

// Mock dependencies
jest.mock('../../src/logger.js', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/digital-samba-api.js');

describe('Recording Tools Adapter', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient = {
      deleteRecording: jest.fn(),
      updateRecording: jest.fn(),
      getRecordings: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      archiveRecording: jest.fn(),
      getRecording: jest.fn(),
      getRecordingDownloadLink: jest.fn(),
      unarchiveRecording: jest.fn()
    } as any;
  });

  describe('registerRecordingTools', () => {
    it('should register all recording tools', () => {
      const tools = registerRecordingTools();
      
      expect(tools).toHaveLength(9);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('delete-recording');
      expect(toolNames).toContain('update-recording');
      expect(toolNames).toContain('get-recordings');
      expect(toolNames).toContain('start-recording');
      expect(toolNames).toContain('stop-recording');
      expect(toolNames).toContain('archive-recording');
      expect(toolNames).toContain('get-recording');
      expect(toolNames).toContain('get-recording-download-link');
      expect(toolNames).toContain('unarchive-recording');
    });

    it('should have proper descriptions and schemas', () => {
      const tools = registerRecordingTools();
      
      tools.forEach(tool => {
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('executeRecordingTool', () => {
    it('should delete recording', async () => {
      mockApiClient.deleteRecording.mockResolvedValueOnce({ success: true });
      
      const result = await executeRecordingTool(
        'delete-recording',
        { recordingId: 'rec-123' },
        mockApiClient
      );
      
      expect(mockApiClient.deleteRecording).toHaveBeenCalledWith('rec-123');
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true }, null, 2)
        }]
      });
    });

    it('should update recording', async () => {
      const updatedRecording = { id: 'rec-123', name: 'New Name' };
      mockApiClient.updateRecording.mockResolvedValueOnce(updatedRecording);
      
      const result = await executeRecordingTool(
        'update-recording',
        { recordingId: 'rec-123', name: 'New Name' },
        mockApiClient
      );
      
      expect(mockApiClient.updateRecording).toHaveBeenCalledWith('rec-123', { name: 'New Name' });
      expect(result.content[0].text).toContain('New Name');
    });

    it('should get recordings with filters', async () => {
      const recordings = {
        data: [
          { id: 'rec-1', name: 'Recording 1' },
          { id: 'rec-2', name: 'Recording 2' }
        ]
      };
      mockApiClient.getRecordings.mockResolvedValueOnce(recordings);
      
      const result = await executeRecordingTool(
        'get-recordings',
        { room_id: 'room-123', limit: 10 },
        mockApiClient
      );
      
      expect(mockApiClient.getRecordings).toHaveBeenCalledWith({
        room_id: 'room-123',
        limit: 10
      });
      expect(result.content[0].text).toContain('rec-1');
    });

    it('should start recording', async () => {
      mockApiClient.startRecording.mockResolvedValueOnce({ recording_id: 'new-rec' });
      
      const result = await executeRecordingTool(
        'start-recording',
        { room_id: 'room-123' },
        mockApiClient
      );
      
      expect(mockApiClient.startRecording).toHaveBeenCalledWith('room-123');
      expect(result.content[0].text).toContain('new-rec');
    });

    it('should stop recording', async () => {
      mockApiClient.stopRecording.mockResolvedValueOnce({ success: true });
      
      const result = await executeRecordingTool(
        'stop-recording',
        { room_id: 'room-123' },
        mockApiClient
      );
      
      expect(mockApiClient.stopRecording).toHaveBeenCalledWith('room-123');
      expect(result.content[0].text).toContain('success');
    });

    it('should archive recording', async () => {
      mockApiClient.archiveRecording.mockResolvedValueOnce({ archived: true });
      
      const result = await executeRecordingTool(
        'archive-recording',
        { recordingId: 'rec-123' },
        mockApiClient
      );
      
      expect(mockApiClient.archiveRecording).toHaveBeenCalledWith('rec-123');
      expect(result.content[0].text).toContain('archived');
    });

    it('should get recording details', async () => {
      const recording = {
        id: 'rec-123',
        name: 'Test Recording',
        duration: 3600,
        status: 'ready'
      };
      mockApiClient.getRecording.mockResolvedValueOnce(recording);
      
      const result = await executeRecordingTool(
        'get-recording',
        { recordingId: 'rec-123' },
        mockApiClient
      );
      
      expect(mockApiClient.getRecording).toHaveBeenCalledWith('rec-123');
      expect(result.content[0].text).toContain('Test Recording');
    });

    it('should get download link with custom validity', async () => {
      const downloadInfo = {
        url: 'https://download.example.com/rec-123',
        expires_at: '2025-01-01T12:00:00Z'
      };
      mockApiClient.getRecordingDownloadLink.mockResolvedValueOnce(downloadInfo);
      
      const result = await executeRecordingTool(
        'get-recording-download-link',
        { recordingId: 'rec-123', validForMinutes: 60 },
        mockApiClient
      );
      
      expect(mockApiClient.getRecordingDownloadLink).toHaveBeenCalledWith('rec-123', 60);
      expect(result.content[0].text).toContain('download.example.com');
    });

    it('should unarchive recording', async () => {
      mockApiClient.unarchiveRecording.mockResolvedValueOnce({ archived: false });
      
      const result = await executeRecordingTool(
        'unarchive-recording',
        { recordingId: 'rec-123' },
        mockApiClient
      );
      
      expect(mockApiClient.unarchiveRecording).toHaveBeenCalledWith('rec-123');
      expect(result.content[0].text).toContain('archived');
    });

    it('should handle errors gracefully', async () => {
      mockApiClient.deleteRecording.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await executeRecordingTool(
        'delete-recording',
        { recordingId: 'rec-123' },
        mockApiClient
      );
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error deleting recording: Network error'
        }],
        isError: true
      });
    });

    it('should handle unknown tool names', async () => {
      const result = await executeRecordingTool(
        'unknown-tool',
        {},
        mockApiClient
      );
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Unknown recording tool: unknown-tool'
        }],
        isError: true
      });
    });
  });
});