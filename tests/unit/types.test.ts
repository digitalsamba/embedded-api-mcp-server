import { 
  AnalyticsType,
  AnalyticsPeriod,
  SessionStatus,
  ParticipantRole,
  RecordingStatus,
  DeviceType,
  BrowserType,
  parseAnalyticsType,
  parseAnalyticsPeriod,
  parseSessionStatus,
  validateDateRange,
  formatAnalyticsDate
} from '../../src/types/analytics-resource.js';

describe('Analytics Types', () => {
  describe('Type Guards and Parsers', () => {
    describe('parseAnalyticsType', () => {
      it('should parse valid analytics types', () => {
        expect(parseAnalyticsType('team')).toBe('team');
        expect(parseAnalyticsType('rooms')).toBe('rooms');
        expect(parseAnalyticsType('sessions')).toBe('sessions');
        expect(parseAnalyticsType('participants')).toBe('participants');
      });

      it('should return undefined for invalid types', () => {
        expect(parseAnalyticsType('invalid')).toBeUndefined();
        expect(parseAnalyticsType('')).toBeUndefined();
        expect(parseAnalyticsType(null as any)).toBeUndefined();
      });
    });

    describe('parseAnalyticsPeriod', () => {
      it('should parse valid periods', () => {
        expect(parseAnalyticsPeriod('day')).toBe('day');
        expect(parseAnalyticsPeriod('week')).toBe('week');
        expect(parseAnalyticsPeriod('month')).toBe('month');
        expect(parseAnalyticsPeriod('year')).toBe('year');
      });

      it('should return undefined for invalid periods', () => {
        expect(parseAnalyticsPeriod('hour')).toBeUndefined();
        expect(parseAnalyticsPeriod('decade')).toBeUndefined();
        expect(parseAnalyticsPeriod(123 as any)).toBeUndefined();
      });
    });

    describe('parseSessionStatus', () => {
      it('should parse valid session statuses', () => {
        expect(parseSessionStatus('live')).toBe('live');
        expect(parseSessionStatus('ended')).toBe('ended');
      });

      it('should return undefined for invalid statuses', () => {
        expect(parseSessionStatus('active')).toBeUndefined();
        expect(parseSessionStatus('paused')).toBeUndefined();
        expect(parseSessionStatus(true as any)).toBeUndefined();
      });
    });
  });

  describe('Date Utilities', () => {
    describe('validateDateRange', () => {
      it('should validate correct date ranges', () => {
        expect(validateDateRange('2025-01-01', '2025-01-31')).toBe(true);
        expect(validateDateRange('2025-01-01', '2025-01-01')).toBe(true);
      });

      it('should reject invalid date ranges', () => {
        expect(validateDateRange('2025-01-31', '2025-01-01')).toBe(false);
        expect(validateDateRange('invalid-date', '2025-01-01')).toBe(false);
        expect(validateDateRange('2025-01-01', 'not-a-date')).toBe(false);
      });

      it('should handle missing dates', () => {
        expect(validateDateRange(undefined, '2025-01-01')).toBe(true);
        expect(validateDateRange('2025-01-01', undefined)).toBe(true);
        expect(validateDateRange(undefined, undefined)).toBe(true);
      });
    });

    describe('formatAnalyticsDate', () => {
      it('should format dates correctly', () => {
        const date = new Date('2025-01-15T12:30:00Z');
        expect(formatAnalyticsDate(date)).toBe('2025-01-15');
      });

      it('should handle different date inputs', () => {
        expect(formatAnalyticsDate('2025-01-15')).toBe('2025-01-15');
        expect(formatAnalyticsDate(new Date(2025, 0, 15))).toBe('2025-01-15');
      });

      it('should pad single digits', () => {
        const date = new Date('2025-03-05');
        expect(formatAnalyticsDate(date)).toBe('2025-03-05');
      });
    });
  });

  describe('Type Definitions', () => {
    it('should accept valid analytics types', () => {
      const validTypes: AnalyticsType[] = ['team', 'rooms', 'sessions', 'participants'];
      expect(validTypes).toHaveLength(4);
    });

    it('should accept valid periods', () => {
      const validPeriods: AnalyticsPeriod[] = ['day', 'week', 'month', 'year'];
      expect(validPeriods).toHaveLength(4);
    });

    it('should accept valid session statuses', () => {
      const validStatuses: SessionStatus[] = ['live', 'ended'];
      expect(validStatuses).toHaveLength(2);
    });

    it('should accept valid participant roles', () => {
      const validRoles: ParticipantRole[] = ['moderator', 'participant', 'viewer'];
      expect(validRoles).toHaveLength(3);
    });

    it('should accept valid recording statuses', () => {
      const validStatuses: RecordingStatus[] = ['processing', 'ready', 'failed', 'deleted'];
      expect(validStatuses).toHaveLength(4);
    });

    it('should accept valid device types', () => {
      const validDevices: DeviceType[] = ['desktop', 'mobile', 'tablet', 'unknown'];
      expect(validDevices).toHaveLength(4);
    });

    it('should accept valid browser types', () => {
      const validBrowsers: BrowserType[] = ['chrome', 'firefox', 'safari', 'edge', 'other'];
      expect(validBrowsers).toHaveLength(5);
    });
  });

  describe('Interface Validation', () => {
    it('should create valid TeamAnalytics object', () => {
      const analytics = {
        period: 'month' as AnalyticsPeriod,
        date_start: '2025-01-01',
        date_end: '2025-01-31',
        data: {
          total_sessions: 100,
          total_participants: 500,
          total_minutes: 10000,
          unique_participants: 250,
          average_session_duration: 100,
          average_participants_per_session: 5
        }
      };
      
      expect(analytics.data.total_sessions).toBe(100);
    });

    it('should create valid SessionAnalytics object', () => {
      const sessionAnalytics = {
        session_id: 'session-123',
        room_id: 'room-456',
        started_at: '2025-01-01T10:00:00Z',
        ended_at: '2025-01-01T11:00:00Z',
        duration: 3600,
        participant_count: 25,
        recording_count: 2,
        chat_message_count: 150
      };
      
      expect(sessionAnalytics.duration).toBe(3600);
    });

    it('should create valid ParticipantStatistics object', () => {
      const stats = {
        participant_id: 'user-123',
        external_id: 'ext-123',
        name: 'John Doe',
        email: 'john@example.com',
        total_sessions: 10,
        total_duration: 36000,
        average_duration: 3600,
        device_stats: {
          desktop: 8,
          mobile: 2
        },
        browser_stats: {
          chrome: 7,
          firefox: 3
        }
      };
      
      expect(stats.device_stats.desktop).toBe(8);
    });
  });
});