import { DigitalSambaApiClient } from '../../src/digital-samba-api.js';
import { registerAnalyticsTools } from '../../src/tools/analytics-tools/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Mock the logger
jest.mock('../../src/logger.js', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Analytics Tools', () => {
  let mockApi: jest.Mocked<DigitalSambaApiClient>;
  let tools: ReturnType<typeof registerAnalyticsTools>;

  beforeEach(() => {
    mockApi = {
      getParticipantStatistics: jest.fn(),
      getRoomAnalytics: jest.fn(),
      getUsageStatistics: jest.fn()
    } as any;

    tools = createAnalyticsTools(mockApi);
  });

  describe('get-participant-statistics', () => {
    const tool = tools.find(t => t.name === 'get-participant-statistics')!;

    it('should get participant statistics without filters', async () => {
      const mockStats = {
        total_participants: 150,
        average_duration: 2400,
        unique_participants: 75
      };

      mockApi.getParticipantStatistics.mockResolvedValueOnce(mockStats);

      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockStats, null, 2)
        }]
      });
      expect(mockApi.getParticipantStatistics).toHaveBeenCalledWith({});
    });

    it('should get participant statistics with date filters', async () => {
      const mockStats = {
        total_participants: 50,
        average_duration: 1800
      };

      mockApi.getParticipantStatistics.mockResolvedValueOnce(mockStats);

      const result = await tool.handler({
        date_start: '2025-01-01',
        date_end: '2025-01-31'
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockStats, null, 2)
        }]
      });
      expect(mockApi.getParticipantStatistics).toHaveBeenCalledWith({
        date_start: '2025-01-01',
        date_end: '2025-01-31'
      });
    });

    it('should get participant statistics for specific room', async () => {
      const mockStats = {
        room_id: 'room-123',
        total_participants: 25
      };

      mockApi.getParticipantStatistics.mockResolvedValueOnce(mockStats);

      const result = await tool.handler({
        room_id: 'room-123'
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockStats, null, 2)
        }]
      });
    });

    it('should handle errors gracefully', async () => {
      mockApi.getParticipantStatistics.mockRejectedValueOnce(
        new Error('API Error')
      );

      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error getting participant statistics: API Error'
        }],
        isError: true
      });
    });
  });

  describe('get-room-analytics', () => {
    const tool = tools.find(t => t.name === 'get-room-analytics')!;

    it('should get room analytics for all rooms', async () => {
      const mockAnalytics = {
        total_rooms: 10,
        active_rooms: 5,
        total_sessions: 100
      };

      mockApi.getRoomAnalytics.mockResolvedValueOnce(mockAnalytics);

      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockAnalytics, null, 2)
        }]
      });
    });

    it('should get analytics for specific room', async () => {
      const mockAnalytics = {
        room_id: 'room-456',
        total_sessions: 20,
        total_participants: 200
      };

      mockApi.getRoomAnalytics.mockResolvedValueOnce(mockAnalytics);

      const result = await tool.handler({
        room_id: 'room-456'
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockAnalytics, null, 2)
        }]
      });
    });

    it('should get analytics with period filter', async () => {
      const mockAnalytics = {
        period: 'month',
        data: [
          { month: '2025-01', sessions: 50 },
          { month: '2025-02', sessions: 60 }
        ]
      };

      mockApi.getRoomAnalytics.mockResolvedValueOnce(mockAnalytics);

      const result = await tool.handler({
        period: 'month',
        date_start: '2025-01-01',
        date_end: '2025-02-28'
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockAnalytics, null, 2)
        }]
      });
    });
  });

  describe('get-usage-statistics', () => {
    const tool = tools.find(t => t.name === 'get-usage-statistics')!;

    it('should get usage statistics', async () => {
      const mockUsage = {
        total_minutes: 10000,
        total_sessions: 250,
        unique_users: 100
      };

      mockApi.getUsageStatistics.mockResolvedValueOnce(mockUsage);

      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockUsage, null, 2)
        }]
      });
    });

    it('should get usage statistics with filters', async () => {
      const mockUsage = {
        period: 'week',
        data: [
          { week: '2025-W01', minutes: 2000 },
          { week: '2025-W02', minutes: 2500 }
        ]
      };

      mockApi.getUsageStatistics.mockResolvedValueOnce(mockUsage);

      const result = await tool.handler({
        period: 'week',
        date_start: '2025-01-01',
        date_end: '2025-01-14'
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(mockUsage, null, 2)
        }]
      });
    });

    it('should handle API errors', async () => {
      mockApi.getUsageStatistics.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error getting usage statistics: Network timeout'
        }],
        isError: true
      });
    });
  });
});