/**
 * Unit tests for Export Tools
 * 
 * @group unit
 * @group export-tools
 */

import { registerExportTools, executeExportTool } from '../../src/tools/export-tools/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { getApiKeyFromRequest } from '../../src/auth';

// Mock dependencies
jest.mock('../../src/digital-samba-api');
jest.mock('../../src/auth');
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock data
const mockChatExportData = `[2025-01-06 10:00:00] John Doe: Hello everyone!
[2025-01-06 10:01:00] Jane Smith: Hi John!`;

const mockQAExportData = `Q: What is the agenda for today?
A: We'll be discussing the Q1 roadmap and project timelines.`;

const mockTranscriptExportData = `00:00:00 John Doe: Welcome to today's meeting
00:01:00 Jane Smith: Thank you for joining`;

const mockPollExportData = `Poll: What day works best for our weekly standup?
Options:
- Monday: 5 votes
- Tuesday: 3 votes  
- Wednesday: 2 votes`;

describe('Export Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockRequest: any;
  const options = {
    apiUrl: 'https://api.digitalsamba.com/api/v1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      exportChatMessages: jest.fn(),
      exportQA: jest.fn(),
      exportTranscripts: jest.fn(),
      exportPolls: jest.fn(),
      getRecording: jest.fn(),
      getSessionStatistics: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
    
    // Setup mock request
    mockRequest = {
      sessionId: 'test-session-id'
    };
    
    // Setup auth mock
    (getApiKeyFromRequest as jest.Mock).mockReturnValue('test-api-key');
  });

  describe('registerExportTools', () => {
    it('should register all export tools', () => {
      const tools = registerExportTools();
      
      expect(tools).toHaveLength(7);
      expect(tools.map(t => t.name)).toEqual([
        'export-chat-messages',
        'export-qa-data',
        'export-session-transcripts',
        'export-poll-results',
        'export-recording-metadata',
        'export-session-summary',
        'export-session-metadata'
      ]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.description).toContain('[Export Tools]');
        expect(tool.description).toContain('Mirrors digitalsamba://exports');
      });
    });
  });

  describe('executeExportTool', () => {
    describe('export-chat-messages', () => {
      it('should export chat messages in default format', async () => {
        mockApiClient.exportChatMessages.mockResolvedValue(mockChatExportData);

        const result = await executeExportTool('export-chat-messages', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(mockApiClient.exportChatMessages).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Chat messages export for room test-room-id');
        expect(result.content[0].text).toContain(mockChatExportData);
        expect(result.isError).toBeUndefined();
      });
    });

    describe('export-qa-data', () => {
      it('should export Q&A data', async () => {
        mockApiClient.exportQA.mockResolvedValue(mockQAExportData);

        const result = await executeExportTool('export-qa-data', {
          roomId: 'test-room-id',
          format: 'json'
        }, mockRequest, options);

        expect(mockApiClient.exportQA).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Q&A export for room test-room-id');
        expect(result.content[0].text).toContain(mockQAExportData);
      });
    });

    describe('export-session-transcripts', () => {
      it('should export session transcripts', async () => {
        mockApiClient.exportTranscripts.mockResolvedValue(mockTranscriptExportData);

        const result = await executeExportTool('export-session-transcripts', {
          sessionId: 'test-session-id'
        }, mockRequest, options);

        expect(mockApiClient.exportTranscripts).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Transcript export for session test-session-id');
        expect(result.content[0].text).toContain(mockTranscriptExportData);
      });
    });

    describe('export-poll-results', () => {
      it('should export poll results', async () => {
        mockApiClient.exportPolls.mockResolvedValue(mockPollExportData);

        const result = await executeExportTool('export-poll-results', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(mockApiClient.exportPolls).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Polls Export for Room test-room-id');
        expect(result.content[0].text).toContain(mockPollExportData);
      });
    });

    describe('export-recording-metadata', () => {
      it('should export recording metadata', async () => {
        const mockRecording = {
          id: 'test-recording-id',
          name: 'Test Recording',
          status: 'READY',
          duration: 3600
        };

        mockApiClient.getRecording.mockResolvedValue(mockRecording);

        const result = await executeExportTool('export-recording-metadata', {
          recordingId: 'test-recording-id'
        }, mockRequest, options);

        expect(mockApiClient.getRecording).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Recording Export Information');
        expect(result.content[0].text).toContain('**Recording ID**: test-recording-id');
        expect(result.content[0].text).toContain(JSON.stringify(mockRecording, null, 2));
      });
    });

    describe('export-session-summary', () => {
      it('should export session summary', async () => {
        const mockSession = {
          session_id: 'test-session-id',
          room_id: 'test-room-id',
          room_description: 'Test Room',
          session_start_time: '2025-01-06T10:00:00Z',
          session_end_time: '2025-01-06T11:00:00Z',
          session_duration: 60,
          session_live: false,
          participation_minutes: 120
        };

        mockApiClient.getSessionStatistics.mockResolvedValue(mockSession);

        const result = await executeExportTool('export-session-summary', {
          sessionId: 'test-session-id'
        }, mockRequest, options);

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Session Summary');
        expect(result.content[0].text).toContain('**Session ID**: test-session-id');
        expect(result.content[0].text).toContain('**Room**: Test Room');
      });
    });

    describe('export-session-metadata', () => {
      it('should export session metadata', async () => {
        const mockSession = {
          session_id: 'test-session-id',
          room_id: 'test-room-id',
          session_data: 'some data'
        };

        mockApiClient.getSessionStatistics.mockResolvedValue(mockSession);

        const result = await executeExportTool('export-session-metadata', {
          sessionId: 'test-session-id'
        }, mockRequest, options);

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Session Metadata Export');
        expect(result.content[0].text).toContain(JSON.stringify(mockSession, null, 2));
      });
    });

    describe('Error Handling', () => {
      it('should handle missing API key', async () => {
        (getApiKeyFromRequest as jest.Mock).mockReturnValue(null);
        process.env.DIGITAL_SAMBA_DEVELOPER_KEY = '';

        const result = await executeExportTool('export-chat-messages', {
          roomId: 'test-room-id'
        }, mockRequest, options);

        expect(result.content[0].text).toBe('No API key found. Please include an Authorization header with a Bearer token.');
        expect(result.isError).toBe(true);
      });

      it('should handle unknown tool name', async () => {
        const result = await executeExportTool('unknown-export-tool', {}, mockRequest, options);
        
        expect(result.content[0].text).toContain('Error: Unknown export tool: unknown-export-tool');
        expect(result.isError).toBe(true);
      });
    });
  });
});