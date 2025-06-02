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
      deleteRecording: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
  });

  describe('registerRecordingResources', () => {
    it('should register all recording resources', () => {
      const resources = registerRecordingResources();
      
      expect(resources).toHaveLength(2);
      expect(resources[0]).toEqual({
        uri: 'digitalsamba://recordings',
        name: 'recordings',
        description: 'List all recordings',
        mimeType: 'application/json'
      });
      expect(resources[1]).toEqual({
        uri: 'digitalsamba://recordings/{recordingId}',
        name: 'recording',
        description: 'Get details for a specific recording',
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
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual([
        'delete-recording',
        'update-recording'
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
          recordingId: 'test-recording-id'
        }, mockApiClient);

        expect(mockApiClient.deleteRecording).toHaveBeenCalledWith('test-recording-id');
        expect(result.content[0].text).toBe('Recording test-recording-id deleted successfully');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.deleteRecording.mockRejectedValue(new Error('Recording not found'));

        await expect(executeRecordingTool('delete-recording', {
          recordingId: 'test-recording-id'
        }, mockApiClient)).rejects.toThrow('Recording not found');
      });
    });

    describe('update-recording', () => {
      it('should indicate update is not supported', async () => {
        const result = await executeRecordingTool('update-recording', {
          recordingId: 'test-recording-id',
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