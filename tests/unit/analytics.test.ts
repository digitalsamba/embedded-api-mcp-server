/**
 * Analytics Module Unit Tests
 * 
 * Tests for the Analytics resource functionality including participant statistics,
 * room analytics, session statistics, and team metrics.
 */

import { AnalyticsResource, AnalyticsFilters } from '../../src/analytics.js';
import { DigitalSambaApiClient } from '../../src/digital-samba-api.js';

// Mock the API client
jest.mock('../../src/digital-samba-api.js');
jest.mock('../../src/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('AnalyticsResource', () => {
  let analyticsResource: AnalyticsResource;
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock API client
    mockApiClient = {
      listParticipants: jest.fn(),
      getParticipant: jest.fn(),
      listRoomParticipants: jest.fn(),
      listSessionParticipants: jest.fn(),
      getRoom: jest.fn(),
      listRooms: jest.fn(),
    } as any;

    analyticsResource = new AnalyticsResource(mockApiClient);
  });

  describe('getAllParticipants', () => {
    it('should fetch and transform participant data', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          external_id: 'ext-1',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'John Doe',
          role: 'moderator',
          friendly_url: 'john-doe',
          join_time: '2024-01-01T10:00:00Z',
          leave_time: '2024-01-01T11:00:00Z',
          live: false
        },
        {
          id: 'participant-2',
          external_id: 'ext-2',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'Jane Smith',
          role: 'participant',
          friendly_url: 'jane-smith',
          join_time: '2024-01-01T10:15:00Z',
          leave_time: '2024-01-01T10:45:00Z',
          live: false
        }
      ];

      mockApiClient.listParticipants.mockResolvedValue({
        data: mockParticipants,
        total_count: 2,
        length: 2,
        map: jest.fn()
      });

      const filters: AnalyticsFilters = {
        date_start: '2024-01-01',
        date_end: '2024-01-01',
        room_id: 'room-1'
      };

      const result = await analyticsResource.getAllParticipants(filters);

      expect(mockApiClient.listParticipants).toHaveBeenCalledWith({
        date_start: '2024-01-01',
        date_end: '2024-01-01',
        room_id: 'room-1',
        session_id: undefined
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        participant_id: 'participant-1',
        participant_name: 'John Doe',
        email: 'ext-1',
        join_time: '2024-01-01T10:00:00Z',
        leave_time: '2024-01-01T11:00:00Z',
        duration_seconds: undefined,
        is_moderator: true,
        audio_enabled: undefined,
        video_enabled: undefined
      });

      expect(result[1]).toEqual({
        participant_id: 'participant-2',
        participant_name: 'Jane Smith',
        email: 'ext-2',
        join_time: '2024-01-01T10:15:00Z',
        leave_time: '2024-01-01T10:45:00Z',
        duration_seconds: undefined,
        is_moderator: false,
        audio_enabled: undefined,
        video_enabled: undefined
      });
    });

    it('should handle empty participant list', async () => {
      mockApiClient.listParticipants.mockResolvedValue({
        data: [],
        total_count: 0,
        length: 0,
        map: jest.fn()
      });

      const result = await analyticsResource.getAllParticipants();

      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApiClient.listParticipants.mockRejectedValue(error);

      await expect(analyticsResource.getAllParticipants()).rejects.toThrow('API Error');
    });
  });

  describe('getParticipantStatistics', () => {
    it('should get specific participant when ID provided', async () => {
      const mockParticipant = {
        id: 'participant-1',
        external_id: 'ext-1',
        session_id: 'session-1',
        room_id: 'room-1',
        room_external_id: 'room-ext-1',
        room_is_deleted: false,
        name: 'John Doe',
        role: 'moderator',
        friendly_url: 'john-doe',
        join_time: '2024-01-01T10:00:00Z',
        leave_time: '2024-01-01T11:00:00Z',
        live: false,
        device: 'desktop',
        system: 'Windows',
        browser: 'Chrome',
        e2ee: true,
        participation_minutes: 60,
        public_chat_posts: 5,
        questions: 2,
        answers: 1
      };

      mockApiClient.getParticipant.mockResolvedValue(mockParticipant);

      const result = await analyticsResource.getParticipantStatistics('participant-1');

      expect(mockApiClient.getParticipant).toHaveBeenCalledWith('participant-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        participant_id: 'participant-1',
        participant_name: 'John Doe',
        email: 'ext-1',
        join_time: '2024-01-01T10:00:00Z',
        leave_time: '2024-01-01T11:00:00Z',
        duration_seconds: 3600, // 60 minutes * 60 seconds
        is_moderator: true,
        audio_enabled: undefined,
        video_enabled: undefined
      });
    });

    it('should get all participants when no ID provided', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          external_id: 'ext-1',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'John Doe',
          role: 'moderator',
          friendly_url: 'john-doe',
          join_time: '2024-01-01T10:00:00Z',
          leave_time: '2024-01-01T11:00:00Z',
          live: false
        }
      ];

      mockApiClient.listParticipants.mockResolvedValue({
        data: mockParticipants,
        total_count: 1,
        length: 1,
        map: jest.fn()
      });

      const filters: AnalyticsFilters = { room_id: 'room-1' };
      const result = await analyticsResource.getParticipantStatistics(undefined, filters);

      expect(mockApiClient.listParticipants).toHaveBeenCalledWith({
        date_start: undefined,
        date_end: undefined,
        room_id: 'room-1',
        session_id: undefined
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllRoomParticipants', () => {
    it('should fetch room participants with filters', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          external_id: 'ext-1',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'John Doe',
          role: 'moderator',
          friendly_url: 'john-doe',
          join_time: '2024-01-01T10:00:00Z',
          leave_time: '2024-01-01T11:00:00Z',
          live: false
        }
      ];

      mockApiClient.listRoomParticipants.mockResolvedValue({
        data: mockParticipants,
        total_count: 1,
        length: 1,
        map: jest.fn()
      });

      const filters: AnalyticsFilters = {
        date_start: '2024-01-01',
        session_id: 'session-1'
      };

      const result = await analyticsResource.getAllRoomParticipants('room-1', filters);

      expect(mockApiClient.listRoomParticipants).toHaveBeenCalledWith('room-1', {
        date_start: '2024-01-01',
        date_end: undefined,
        session_id: 'session-1'
      });

      expect(result).toHaveLength(1);
      expect(result[0].participant_id).toBe('participant-1');
    });
  });

  describe('getAllSessionParticipants', () => {
    it('should fetch session participants', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          external_id: 'ext-1',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'John Doe',
          role: 'participant',
          friendly_url: 'john-doe',
          join_time: '2024-01-01T10:00:00Z',
          leave_time: '2024-01-01T11:00:00Z',
          live: false
        }
      ];

      mockApiClient.listSessionParticipants.mockResolvedValue({
        data: mockParticipants,
        total_count: 1,
        length: 1,
        map: jest.fn()
      });

      const result = await analyticsResource.getAllSessionParticipants('session-1');

      expect(mockApiClient.listSessionParticipants).toHaveBeenCalledWith('session-1');
      expect(result).toHaveLength(1);
      expect(result[0].participant_id).toBe('participant-1');
    });
  });

  describe('getSessionStatistics', () => {
    it('should return placeholder session statistics', async () => {
      const filters: AnalyticsFilters = {
        room_id: 'room-1'
      };

      const result = await analyticsResource.getSessionStatistics('session-1', filters);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        session_id: 'session-1',
        room_id: 'room-1',
        start_time: expect.any(String),
        end_time: expect.any(String),
        duration_minutes: 0,
        participant_count: 0,
        peak_participants: 0,
        moderator_count: 0,
        chat_messages: 0,
        questions_asked: 0,
        recordings_created: 0
      });
    });

    it('should handle missing session ID', async () => {
      const result = await analyticsResource.getSessionStatistics();

      expect(result[0].session_id).toBe('unknown');
      expect(result[0].room_id).toBe('unknown');
    });
  });

  describe('getRoomStatistics', () => {
    it('should build room analytics from available data', async () => {
      const mockRoom = {
        id: 'room-1',
        external_id: 'room-ext-1',
        name: 'Test Room',
        friendly_url: 'test-room',
        description: 'Test room description',
        privacy: 'public' as const,
        max_participants: 100,
        waiting_room_enabled: false,
        lobby_enabled: false,
        recording_autostart: false,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z'
      };

      const mockParticipants = [
        {
          id: 'participant-1',
          external_id: 'ext-1',
          session_id: 'session-1',
          room_id: 'room-1',
          room_external_id: 'room-ext-1',
          room_is_deleted: false,
          name: 'John Doe',
          role: 'moderator',
          friendly_url: 'john-doe',
          join_time: '2024-01-01T10:00:00Z',
          leave_time: '2024-01-01T11:00:00Z',
          live: false
        }
      ];

      mockApiClient.getRoom.mockResolvedValue(mockRoom);
      mockApiClient.listRoomParticipants.mockResolvedValue({
        data: mockParticipants,
        total_count: 1,
        length: 1,
        map: jest.fn()
      });

      const result = await analyticsResource.getRoomStatistics('room-1');

      expect(mockApiClient.getRoom).toHaveBeenCalledWith('room-1');
      expect(result).toEqual({
        room_id: 'room-1',
        room_name: 'Test Room',
        session_count: 1,
        total_participants: 1,
        total_duration_minutes: 0, // No duration data available
        average_session_duration: 0,
        peak_concurrent_participants: 1,
        created_date: '2024-01-01T09:00:00Z',
        last_activity: expect.any(String)
      });
    });
  });

  describe('getRoomAnalytics', () => {
    it('should get analytics for specific room', async () => {
      const mockRoom = {
        id: 'room-1',
        external_id: 'room-ext-1',
        name: 'Test Room',
        friendly_url: 'test-room',
        description: 'Test room description',
        privacy: 'public' as const,
        max_participants: 100,
        waiting_room_enabled: false,
        lobby_enabled: false,
        recording_autostart: false,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z'
      };

      mockApiClient.getRoom.mockResolvedValue(mockRoom);
      mockApiClient.listRoomParticipants.mockResolvedValue({
        data: [],
        total_count: 0,
        length: 0,
        map: jest.fn()
      });

      const result = await analyticsResource.getRoomAnalytics('room-1');

      expect(result).toHaveLength(1);
      expect(result[0].room_id).toBe('room-1');
      expect(result[0].room_name).toBe('Test Room');
    });

    it('should get analytics for all rooms when no room ID provided', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          external_id: 'room-ext-1',
          name: 'Test Room 1',
          friendly_url: 'test-room-1',
          description: 'Test room 1',
          privacy: 'public' as const,
          max_participants: 100,
          waiting_room_enabled: false,
          lobby_enabled: false,
          recording_autostart: false,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z'
        }
      ];

      mockApiClient.listRooms.mockResolvedValue({
        data: mockRooms,
        total_count: 1,
        length: 1,
        map: jest.fn()
      });

      mockApiClient.getRoom.mockResolvedValue(mockRooms[0]);
      mockApiClient.listRoomParticipants.mockResolvedValue({
        data: [],
        total_count: 0,
        length: 0,
        map: jest.fn()
      });

      const result = await analyticsResource.getRoomAnalytics();

      expect(mockApiClient.listRooms).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].room_id).toBe('room-1');
    });
  });

  describe('getTeamGlobalStatistics', () => {
    it('should return placeholder team statistics', async () => {
      const filters: AnalyticsFilters = {
        date_start: '2024-01-01',
        date_end: '2024-01-31',
        period: 'month'
      };

      const result = await analyticsResource.getTeamGlobalStatistics(filters);

      expect(result).toEqual({
        team_id: 'unknown',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_sessions: 0,
        total_participants: 0,
        total_duration_hours: 0,
        unique_users: 0,
        rooms_created: 0,
        recordings_created: 0,
        average_session_duration: 0,
        peak_concurrent_users: 0
      });
    });
  });

  describe('getUsageStatistics', () => {
    it('should return usage statistics with growth metrics', async () => {
      const filters: AnalyticsFilters = {
        period: 'month'
      };

      const result = await analyticsResource.getUsageStatistics(filters);

      expect(result).toEqual({
        current_period: expect.objectContaining({
          team_id: 'unknown',
          total_sessions: 0,
          total_participants: 0
        }),
        previous_period: expect.objectContaining({
          team_id: 'unknown',
          total_sessions: 0,
          total_participants: 0
        }),
        growth_metrics: {
          sessions_growth: 0,
          participants_growth: 0,
          duration_growth: 0
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle participant API errors gracefully', async () => {
      const error = new Error('Participant API failed');
      mockApiClient.listParticipants.mockRejectedValue(error);

      await expect(analyticsResource.getAllParticipants()).rejects.toThrow('Participant API failed');
    });

    it('should handle room API errors gracefully', async () => {
      const error = new Error('Room API failed');
      mockApiClient.getRoom.mockRejectedValue(error);

      await expect(analyticsResource.getRoomStatistics('room-1')).rejects.toThrow('Room API failed');
    });

    it('should continue processing other rooms when one fails', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          external_id: 'room-ext-1',
          name: 'Test Room 1',
          friendly_url: 'test-room-1',
          description: 'Test room 1',
          privacy: 'public' as const,
          max_participants: 100,
          waiting_room_enabled: false,
          lobby_enabled: false,
          recording_autostart: false,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z'
        },
        {
          id: 'room-2',
          external_id: 'room-ext-2',
          name: 'Test Room 2',
          friendly_url: 'test-room-2',
          description: 'Test room 2',
          privacy: 'public' as const,
          max_participants: 100,
          waiting_room_enabled: false,
          lobby_enabled: false,
          recording_autostart: false,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z'
        }
      ];

      mockApiClient.listRooms.mockResolvedValue({
        data: mockRooms,
        total_count: 2,
        length: 2,
        map: jest.fn()
      });

      // First room succeeds, second room fails
      mockApiClient.getRoom
        .mockResolvedValueOnce(mockRooms[0])
        .mockRejectedValueOnce(new Error('Room 2 failed'));

      mockApiClient.listRoomParticipants.mockResolvedValue({
        data: [],
        total_count: 0,
        length: 0,
        map: jest.fn()
      });

      const result = await analyticsResource.getRoomAnalytics();

      // Should return analytics for the successful room only
      expect(result).toHaveLength(1);
      expect(result[0].room_id).toBe('room-1');
    });
  });
});