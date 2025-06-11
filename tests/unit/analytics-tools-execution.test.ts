import { DigitalSambaApiClient } from '../../src/digital-samba-api.js';
import { registerAnalyticsTools, executeAnalyticsTool } from '../../src/tools/analytics-tools/index.js';
import { AnalyticsResource } from '../../src/types/analytics-resource.js';

// Mock dependencies
jest.mock('../../src/logger.js', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/types/analytics-resource.js');

describe('Analytics Tools Execution', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;
  let mockAnalyticsResource: jest.Mocked<AnalyticsResource>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient = {} as any;
    
    // Mock the AnalyticsResource constructor
    mockAnalyticsResource = {
      getTeamAnalytics: jest.fn(),
      getRoomAnalytics: jest.fn(),
      getSessionAnalytics: jest.fn(),
      getParticipantStatistics: jest.fn()
    } as any;
    
    (AnalyticsResource as jest.MockedClass<typeof AnalyticsResource>).mockImplementation(() => mockAnalyticsResource);
  });

  describe('registerAnalyticsTools', () => {
    it('should register analytics tools', () => {
      const tools = registerAnalyticsTools();
      
      expect(tools).toHaveLength(8);
      expect(tools[0].name).toBe('get-participant-statistics');
      expect(tools[1].name).toBe('get-room-analytics');
      expect(tools[2].name).toBe('get-usage-statistics');
      expect(tools[3].name).toBe('get-usage-analytics');
      expect(tools[4].name).toBe('get-live-analytics');
      expect(tools[5].name).toBe('get-live-room-analytics');
      expect(tools[6].name).toBe('get-session-analytics');
      expect(tools[7].name).toBe('get-participant-analytics');
    });

    it('should have proper input schemas', () => {
      const tools = registerAnalyticsTools();
      
      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('executeAnalyticsTool', () => {
    describe('get-team-analytics', () => {
      it('should execute team analytics query', async () => {
        const mockData = {
          total_sessions: 100,
          total_participants: 500,
          total_minutes: 10000
        };
        
        mockAnalyticsResource.getTeamAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-team-analytics',
          { dateStart: '2025-01-01', dateEnd: '2025-01-31' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getTeamAnalytics).toHaveBeenCalledWith({
          dateStart: '2025-01-01',
          dateEnd: '2025-01-31'
        });
        
        expect(result).toEqual({
          content: [{
            type: 'text',
            text: JSON.stringify(mockData, null, 2)
          }]
        });
      });
    });

    describe('get-room-analytics', () => {
      it('should execute room analytics query with room ID', async () => {
        const mockData = {
          roomId: 'room-123',
          total_sessions: 20,
          total_participants: 100
        };
        
        mockAnalyticsResource.getRoomAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-room-analytics',
          { roomId: 'room-123', period: 'month' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getRoomAnalytics).toHaveBeenCalledWith(
          'room-123',
          { roomId: 'room-123', period: 'month' }
        );
        
        expect(result.content[0].text).toContain('room-123');
      });

      it('should fall back to team analytics when no room ID provided', async () => {
        const mockData = {
          total_rooms: 10,
          active_rooms: 5
        };
        
        mockAnalyticsResource.getTeamAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-room-analytics',
          { dateStart: '2025-01-01' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getTeamAnalytics).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Team-wide room analytics');
      });
    });

    describe('get-session-analytics', () => {
      it('should execute session analytics query', async () => {
        const mockData = {
          sessionId: 'session-123',
          duration: 3600,
          participant_count: 25
        };
        
        mockAnalyticsResource.getSessionAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-session-analytics',
          { sessionId: 'session-123' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getSessionAnalytics).toHaveBeenCalledWith(
          'session-123',
          { sessionId: 'session-123' }
        );
        
        expect(result.content[0].text).toContain('session-123');
      });
    });

    describe('get-participant-statistics', () => {
      it('should execute participant statistics query using team analytics', async () => {
        const mockData = {
          participants: [
            { id: 'user-1', sessions: 10 },
            { id: 'user-2', sessions: 5 }
          ]
        };
        
        mockAnalyticsResource.getTeamAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-participant-statistics',
          { participantId: 'user-1' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getTeamAnalytics).toHaveBeenCalledWith({
          participantId: 'user-1'
        });
        
        expect(result.content[0].text).toBeDefined();
      });
    });

    describe('get-usage-statistics', () => {
      it('should execute usage statistics query', async () => {
        const mockData = {
          usage: {
            minutes: 50000,
            sessions: 250
          }
        };
        
        mockAnalyticsResource.getTeamAnalytics.mockResolvedValueOnce(mockData);
        
        const result = await executeAnalyticsTool(
          'get-usage-statistics',
          { period: 'week' },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getTeamAnalytics).toHaveBeenCalledWith({
          period: 'week'
        });
        
        expect(result.content[0].text).toContain('usage');
      });
    });

    describe('Filter handling', () => {
      it('should remove undefined values from filters', async () => {
        mockAnalyticsResource.getTeamAnalytics.mockResolvedValueOnce({});
        
        await executeAnalyticsTool(
          'get-team-analytics',
          { 
            dateStart: '2025-01-01',
            dateEnd: undefined,
            roomId: null,
            period: 'month'
          },
          mockApiClient
        );
        
        expect(mockAnalyticsResource.getTeamAnalytics).toHaveBeenCalledWith({
          dateStart: '2025-01-01',
          period: 'month'
        });
      });
    });

    describe('Error handling', () => {
      it('should return error result when analytics query fails', async () => {
        mockAnalyticsResource.getTeamAnalytics.mockRejectedValueOnce(
          new Error('API Error')
        );
        
        const result = await executeAnalyticsTool(
          'get-team-analytics',
          {},
          mockApiClient
        );
        
        expect(result).toEqual({
          content: [{
            type: 'text',
            text: 'Error executing analytics query: API Error'
          }],
          isError: true
        });
      });

      it('should handle unknown tool names', async () => {
        const result = await executeAnalyticsTool(
          'unknown-tool',
          {},
          mockApiClient
        );
        
        expect(result).toEqual({
          content: [{
            type: 'text',
            text: 'Unknown analytics tool: unknown-tool'
          }],
          isError: true
        });
      });
    });
  });
});