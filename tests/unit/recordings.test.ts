/**
 * Unit tests for Recording Resources and Tools
 * 
 * @group unit
 * @group recordings
 */

import { registerRecordingResources, handleRecordingResource } from '../../src/resources/recordings-adapter';
import { registerRecordingTools, executeRecordingTool } from '../../src/tools/recording-tools-adapter';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';

// Mock dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock data - matching actual API structure
const mockRecording = {
  id: 'test-recording-id',
  name: 'Test Recording',
  room_id: 'test-room-id',
  session_id: 'test-session-id',
  status: 'READY' as const,
  duration: 3600,
  privacy: 'public' as const,
  friendly_url: 'test-room',
  participant_id: 'test-participant-id',
  participant_name: 'Test User',
  created_at: '2025-01-06T10:00:00Z',
  updated_at: '2025-01-06T11:00:00Z'
};

const mockRecordingsList = {
  data: [
    mockRecording,
    {
      id: 'test-recording-id-2',
      name: 'Test Recording 2',
      room_id: 'test-room-id-2',
      session_id: 'test-session-id-2',
      status: 'PENDING_CONVERSION' as const,
      duration: 1800,
      privacy: 'private' as const,
      friendly_url: 'test-room-2',
      participant_id: 'test-participant-id-2',
      participant_name: 'Test User 2',
      created_at: '2025-01-06T12:00:00Z',
      updated_at: '2025-01-06T12:30:00Z'
    }
  ],
  pagination: {
    page: 1,
    per_page: 20,
    total: 2
  }
};

describe('Recording Resources', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      listRecordings: jest.fn(),
      getRecording: jest.fn(),
      deleteRecording: jest.fn(),
      listArchivedRecordings: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
  });

  describe('registerRecordingResources', () => {
    it('should register all recording resources', () => {
      const resources = registerRecordingResources();
      
      expect(resources).toHaveLength(4);
      expect(resources[0]).toEqual({
        uri: 'digitalsamba://recordings',
        name: 'recordings',
        description: '[Recording Data - RESOURCE] List all recordings in your account. Use to access: "show all recordings", "list recordings", "show recordings", "list videos", "recording directory", "meeting recordings", "video library". NOT for listing rooms - use digitalsamba://rooms instead. Returns array of recording objects with status, duration, room info, and download availability.',
        mimeType: 'application/json'
      });
      expect(resources[1]).toEqual({
        uri: 'digitalsamba://recordings/{recordingId}',
        name: 'recording',
        description: '[Recording Data] Get detailed information about a specific recording. Use to access: "recording details", "video info", "recording metadata", "recording status", "video details". Requires recordingId. Returns complete recording data including name, duration, status, and download URLs.',
        mimeType: 'application/json'
      });
      expect(resources[2]).toEqual({
        uri: 'digitalsamba://recordings/archived',
        name: 'archived-recordings',
        description: '[Recording Data] List all archived recordings. Use to access: "archived recordings", "old recordings", "archived videos", "stored recordings", "recording archive". Returns recordings in archived status for long-term storage. Archived recordings may need to be unarchived before downloading.',
        mimeType: 'application/json'
      });
      expect(resources[3]).toEqual({
        uri: 'digitalsamba://rooms/{roomId}/recordings',
        name: 'room-recordings',
        description: '[Recording Data] List all recordings for a specific room. Use to access: "room recordings", "recordings for this room", "room video history", "meeting recordings for room", "videos from room". Requires roomId. Returns recordings filtered to that specific room with session details.',
        mimeType: 'application/json'
      });
    });
  });

  describe('handleRecordingResource', () => {
    describe('List Recordings', () => {
      it('should list all recordings', async () => {
        mockApiClient.listRecordings.mockResolvedValue(mockRecordingsList);

        const result = await handleRecordingResource(
          'digitalsamba://recordings',
          mockApiClient
        );

        expect(mockApiClient.listRecordings).toHaveBeenCalled();
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://recordings/test-recording-id');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockRecording);
      });

      it('should handle empty recordings list', async () => {
        mockApiClient.listRecordings.mockResolvedValue({ data: [], pagination: { page: 1, per_page: 20, total: 0 } });

        const result = await handleRecordingResource(
          'digitalsamba://recordings',
          mockApiClient
        );

        expect(result.contents).toHaveLength(0);
      });

      it('should handle API errors when listing recordings', async () => {
        mockApiClient.listRecordings.mockRejectedValue(new Error('API Error'));

        await expect(handleRecordingResource(
          'digitalsamba://recordings',
          mockApiClient
        )).rejects.toThrow('API Error');
      });
    });

    describe('Get Specific Recording', () => {
      it('should get recording details', async () => {
        mockApiClient.getRecording.mockResolvedValue(mockRecording);

        const result = await handleRecordingResource(
          'digitalsamba://recordings/test-recording-id',
          mockApiClient
        );

        expect(mockApiClient.getRecording).toHaveBeenCalledWith('test-recording-id');
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].uri).toBe('digitalsamba://recordings/test-recording-id');
        expect(JSON.parse(result.contents[0].text)).toEqual(mockRecording);
      });

      it('should handle API errors when getting recording', async () => {
        mockApiClient.getRecording.mockRejectedValue(new Error('Recording not found'));

        await expect(handleRecordingResource(
          'digitalsamba://recordings/test-recording-id',
          mockApiClient
        )).rejects.toThrow('Recording not found');
      });
    });

    describe('List Archived Recordings', () => {
      it('should list archived recordings', async () => {
        const archivedRecordings = {
          data: [
            { ...mockRecording, id: 'archived-1', status: 'ARCHIVED' },
            { ...mockRecording, id: 'archived-2', status: 'ARCHIVED' }
          ]
        };
        mockApiClient.listArchivedRecordings.mockResolvedValue(archivedRecordings);

        const result = await handleRecordingResource(
          'digitalsamba://recordings/archived',
          mockApiClient
        );

        expect(mockApiClient.listArchivedRecordings).toHaveBeenCalled();
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://recordings/archived-1');
        expect(result.contents[1].uri).toBe('digitalsamba://recordings/archived-2');
      });
    });

    describe('List Room Recordings', () => {
      it('should list recordings for a specific room', async () => {
        const roomRecordings = {
          data: [
            { ...mockRecording, room_id: 'test-room-123' },
            { ...mockRecording, id: 'rec-2', room_id: 'test-room-123' }
          ]
        };
        mockApiClient.listRecordings.mockResolvedValue(roomRecordings);

        const result = await handleRecordingResource(
          'digitalsamba://rooms/test-room-123/recordings',
          mockApiClient
        );

        expect(mockApiClient.listRecordings).toHaveBeenCalledWith({ room_id: 'test-room-123' });
        expect(result.contents).toHaveLength(2);
        expect(result.contents[0].uri).toBe('digitalsamba://recordings/test-recording-id');
        expect(result.contents[1].uri).toBe('digitalsamba://recordings/rec-2');
      });
    });
  });
});

describe('Recording Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      deleteRecording: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
  });

  describe('registerRecordingTools', () => {
    it('should register all recording tools', () => {
      const tools = registerRecordingTools();
      
      expect(tools).toHaveLength(9);
      expect(tools.map(t => t.name)).toEqual([
        'delete-recording',
        'update-recording',
        'get-recordings',
        'start-recording',
        'stop-recording',
        'archive-recording',
        'get-recording',
        'get-recording-download-link',
        'unarchive-recording'
      ]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('executeRecordingTool', () => {
    describe('delete-recording', () => {
      it('should delete a recording', async () => {
        mockApiClient.deleteRecording.mockResolvedValue(undefined);

        const result = await executeRecordingTool('delete-recording', {
          recording_id: 'test-recording-id'
        }, mockApiClient);

        expect(mockApiClient.deleteRecording).toHaveBeenCalledWith('test-recording-id');
        expect(result.content[0].text).toBe('Recording test-recording-id deleted successfully');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.deleteRecording.mockRejectedValue(new Error('Recording not found'));

        await expect(executeRecordingTool('delete-recording', {
          recording_id: 'test-recording-id'
        }, mockApiClient)).rejects.toThrow('Recording not found');
      });
    });

    describe('update-recording', () => {
      it('should indicate update is not supported', async () => {
        const result = await executeRecordingTool('update-recording', {
          recording_id: 'test-recording-id',
          name: 'New Recording Name'
        }, mockApiClient);

        expect(result.content[0].text).toBe('Recording update not supported');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool name', async () => {
        await expect(executeRecordingTool('unknown-tool', {}, mockApiClient))
          .rejects.toThrow('Unknown recording tool: unknown-tool');
      });
    });
  });
});