import { DigitalSambaAPI } from '../../src/digital-samba-api.js';
import { DigitalSambaError } from '../../src/errors.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('DigitalSambaAPI Extended Tests', () => {
  let api: DigitalSambaAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DIGITALSAMBA_DEV_KEY = 'test-key';
    api = new DigitalSambaAPI();
  });

  afterEach(() => {
    delete process.env.DIGITALSAMBA_DEV_KEY;
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getRooms()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(api.getRooms()).rejects.toThrow(DigitalSambaError);
    });

    it('should handle 404 not found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' })
      });

      await expect(api.getRoom('non-existent')).rejects.toThrow(DigitalSambaError);
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      });

      await expect(api.getRooms()).rejects.toThrow(DigitalSambaError);
    });
  });

  describe('Session Management', () => {
    it('should get all room sessions', async () => {
      const mockSessions = {
        data: [
          { id: 'session-1', room_id: 'room-1', created_at: '2025-01-01' },
          { id: 'session-2', room_id: 'room-1', created_at: '2025-01-02' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions
      });

      const result = await api.getAllRoomSessions('room-1');
      expect(result).toEqual(mockSessions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1/sessions'),
        expect.any(Object)
      );
    });

    it('should end a session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.endSession('session-1');
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-1/end'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get session summary', async () => {
      const mockSummary = {
        id: 'session-1',
        duration: 3600,
        participants: 10
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary
      });

      const result = await api.getSessionSummary('session-1');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('Recording Management', () => {
    it('should delete a recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.deleteRecording('recording-1');
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recordings/recording-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should start recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recording_id: 'new-recording' })
      });

      const result = await api.startRecording('room-1');
      expect(result).toEqual({ recording_id: 'new-recording' });
    });

    it('should stop recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.stopRecording('room-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Analytics', () => {
    it('should get participant statistics', async () => {
      const mockStats = {
        total_participants: 100,
        average_duration: 1800
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      const result = await api.getParticipantStatistics();
      expect(result).toEqual(mockStats);
    });

    it('should get room analytics', async () => {
      const mockAnalytics = {
        room_id: 'room-1',
        total_sessions: 50
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics
      });

      const result = await api.getRoomAnalytics({ room_id: 'room-1' });
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('Live Session Controls', () => {
    it('should start transcription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.startTranscription('room-1');
      expect(result).toEqual({ success: true });
    });

    it('should stop transcription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.stopTranscription('room-1');
      expect(result).toEqual({ success: true });
    });

    it('should register phone participants joined', async () => {
      const participants = [
        { call_id: 'call-1', name: 'John Doe' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api.phoneParticipantsJoined('room-1', participants);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Role Management', () => {
    it('should create a role', async () => {
      const newRole = {
        name: 'custom-role',
        display_name: 'Custom Role',
        permissions: { can_broadcast: true }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'role-1', ...newRole })
      });

      const result = await api.createRole(newRole);
      expect(result).toEqual({ id: 'role-1', ...newRole });
    });

    it('should get roles', async () => {
      const mockRoles = {
        data: [
          { id: 'role-1', name: 'moderator' },
          { id: 'role-2', name: 'participant' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRoles
      });

      const result = await api.getRoles();
      expect(result).toEqual(mockRoles);
    });
  });

  describe('Webhook Management', () => {
    it('should create a webhook', async () => {
      const webhook = {
        endpoint: 'https://example.com/webhook',
        events: ['room.created', 'session.ended']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'webhook-1', ...webhook })
      });

      const result = await api.createWebhook(webhook);
      expect(result).toEqual({ id: 'webhook-1', ...webhook });
    });

    it('should list webhooks', async () => {
      const mockWebhooks = {
        data: [
          { id: 'webhook-1', endpoint: 'https://example.com/webhook' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWebhooks
      });

      const result = await api.listWebhooks();
      expect(result).toEqual(mockWebhooks);
    });
  });
});