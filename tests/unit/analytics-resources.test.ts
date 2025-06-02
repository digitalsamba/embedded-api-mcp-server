/**
 * Unit tests for Analytics Resources and Tools
 * 
 * @group unit
 * @group analytics
 */

import { registerAnalyticsResources, handleAnalyticsResource } from '../../src/resources/analytics/index';
import { registerAnalyticsTools, executeAnalyticsTool } from '../../src/tools/analytics-tools/index';
import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { AnalyticsResource } from '../../src/types/analytics-resource';

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

// Mock data
const mockTeamStats = {
  team_id: 'test-team-id',
  participation_minutes: 74209,
  desktop_participation_minutes: 73276,
  mobile_participation_minutes: 934,
  active_participants: 14515,
  max_concurrent_participants: 125,
  total_sessions: 550,
  total_rooms: 42
};

const mockRoomStats = {
  room_id: 'test-room-id',
  room_friendly_url: 'TestRoom123',
  participation_minutes: 1250,
  sessions_count: 10,
  unique_participants: 35,
  average_session_duration: 125
};

const mockSessionStats = {
  session_id: 'test-session-id',
  room_id: 'test-room-id',
  session_duration: 90.5,
  participation_minutes: 450,
  max_concurrent_participants: 15,
  chat_messages: 125,
  polls_created: 3
};

describe('Analytics Resources', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      getTeamStatistics: jest.fn(),
      getRoomStatistics: jest.fn(),
      getSessionStatistics: jest.fn(),
      getTeamCurrentStatistics: jest.fn(),
      getRoomCurrentStatistics: jest.fn()
    } as any;

    (DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>).mockImplementation(() => mockApiClient);
  });

  describe('registerAnalyticsResources', () => {
    it('should register all analytics resources', () => {
      const resources = registerAnalyticsResources(mockApiClient);
      
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.name)).toEqual([
        'analytics-participants',
        'analytics-usage',
        'analytics-rooms',
        'analytics-team'
      ]);
      
      resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType', 'application/json');
      });
    });
  });

  describe('handleAnalyticsResource', () => {
    describe('Team Analytics', () => {
      it('should handle team analytics request', async () => {
        mockApiClient.getTeamStatistics.mockResolvedValue(mockTeamStats);

        const result = await handleAnalyticsResource(
          'digitalsamba://analytics/team',
          mockApiClient
        );

        expect(mockApiClient.getTeamStatistics).toHaveBeenCalled();
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].type).toBe('application/json');
        const data = JSON.parse(result.contents[0].text);
        expect(data).toEqual(mockTeamStats);
      });

      it('should handle team analytics with filters', async () => {
        mockApiClient.getTeamStatistics.mockResolvedValue(mockTeamStats);
        
        const result = await handleAnalyticsResource(
          'digitalsamba://analytics/team?date_start=2025-01-01&date_end=2025-01-31',
          mockApiClient
        );

        expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith({
          date_start: '2025-01-01',
          date_end: '2025-01-31'
        });
      });
    });

    describe('Room Analytics', () => {
      it('should handle room analytics request', async () => {
        mockApiClient.getRoomStatistics.mockResolvedValue(mockRoomStats);

        const result = await handleAnalyticsResource(
          'digitalsamba://analytics/rooms/test-room-id',
          mockApiClient
        );

        expect(mockApiClient.getRoomStatistics).toHaveBeenCalledWith('test-room-id', undefined);
        expect(result.contents).toHaveLength(1);
        const data = JSON.parse(result.contents[0].text);
        expect(data).toEqual(mockRoomStats);
      });

      it('should error when room ID is missing', async () => {
        await expect(handleAnalyticsResource(
          'digitalsamba://analytics/rooms',
          mockApiClient
        )).rejects.toThrow('Room analytics requires room ID');
      });
    });

    describe('Session Analytics', () => {
      it('should handle session analytics request', async () => {
        mockApiClient.getSessionStatistics.mockResolvedValue(mockSessionStats);

        const result = await handleAnalyticsResource(
          'digitalsamba://analytics/sessions/test-session-id',
          mockApiClient
        );

        expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith('test-session-id', undefined);
        expect(result.contents).toHaveLength(1);
        const data = JSON.parse(result.contents[0].text);
        expect(data).toEqual(mockSessionStats);
      });

      it('should error when session ID is missing', async () => {
        await expect(handleAnalyticsResource(
          'digitalsamba://analytics/sessions',
          mockApiClient
        )).rejects.toThrow('Session analytics requires session ID');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid resource URI', async () => {
        await expect(handleAnalyticsResource(
          'digitalsamba://invalid',
          mockApiClient
        )).rejects.toThrow('Invalid analytics resource URI');
      });

      it('should handle unknown resource type', async () => {
        await expect(handleAnalyticsResource(
          'digitalsamba://analytics/unknown',
          mockApiClient
        )).rejects.toThrow('Unknown analytics resource: unknown');
      });
    });
  });
});

describe('Analytics Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let analyticsResource: AnalyticsResource;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API client
    mockApiClient = {
      getTeamStatistics: jest.fn(),
      getRoomStatistics: jest.fn(),
      getSessionStatistics: jest.fn()
    } as any;

    analyticsResource = new AnalyticsResource(mockApiClient);
  });

  describe('registerAnalyticsTools', () => {
    it('should register all analytics tools', () => {
      const tools = registerAnalyticsTools();
      
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual([
        'get-participant-statistics',
        'get-room-analytics',
        'get-usage-statistics'
      ]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('AnalyticsResource methods', () => {
    it('should call correct API method for team analytics', async () => {
      mockApiClient.getTeamStatistics.mockResolvedValue(mockTeamStats);
      
      const result = await analyticsResource.getTeamAnalytics({ date_start: '2025-01-01' });
      
      expect(mockApiClient.getTeamStatistics).toHaveBeenCalledWith({ date_start: '2025-01-01' });
      expect(result).toEqual(mockTeamStats);
    });

    it('should call correct API method for room analytics', async () => {
      mockApiClient.getRoomStatistics.mockResolvedValue(mockRoomStats);
      
      const result = await analyticsResource.getRoomAnalytics('test-room-id');
      
      expect(mockApiClient.getRoomStatistics).toHaveBeenCalledWith('test-room-id', undefined);
      expect(result).toEqual(mockRoomStats);
    });

    it('should call correct API method for session analytics', async () => {
      mockApiClient.getSessionStatistics.mockResolvedValue(mockSessionStats);
      
      const result = await analyticsResource.getSessionAnalytics('test-session-id');
      
      expect(mockApiClient.getSessionStatistics).toHaveBeenCalledWith('test-session-id', undefined);
      expect(result).toEqual(mockSessionStats);
    });
  });
});