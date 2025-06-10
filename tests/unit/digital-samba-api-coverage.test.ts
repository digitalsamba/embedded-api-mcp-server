/**
 * Comprehensive unit tests for Digital Samba API Client
 * Focuses on improving coverage for uncovered methods
 * 
 * @group unit
 * @group api-client
 */

import { DigitalSambaApiClient } from '../../src/digital-samba-api';
import { 
  ValidationError, 
  AuthenticationError, 
  ApiResponseError,
  ApiRequestError 
} from '../../src/errors';

// Mock the logger
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the auth module
jest.mock('../../src/auth', () => ({
  __esModule: true,
  default: {
    getStore: jest.fn(),
  },
  extractApiKey: jest.fn().mockReturnValue('test-key'),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('DigitalSambaApiClient Coverage Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  let client: DigitalSambaApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    client = new DigitalSambaApiClient('test-key');
  });

  describe('Error Handling', () => {
    it('should handle 400 validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          message: 'Validation failed',
          errors: { name: ['Name is required'] }
        }),
        text: async () => JSON.stringify({ 
          message: 'Validation failed',
          errors: { name: ['Name is required'] }
        }),
      } as any);

      await expect(client.createRoom({ name: '' } as any))
        .rejects.toThrow(ValidationError);
    });

    it('should handle 401 authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Invalid API key' }),
        text: async () => JSON.stringify({ message: 'Invalid API key' }),
      } as any);

      await expect(client.listRooms())
        .rejects.toThrow(AuthenticationError);
    });

    it('should handle 403 permission errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Insufficient permissions' }),
        text: async () => JSON.stringify({ message: 'Insufficient permissions' }),
      } as any);

      await expect(client.deleteRoom('room-123'))
        .rejects.toThrow(AuthenticationError);
    });

    it('should handle 404 not found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Room not found' }),
        text: async () => JSON.stringify({ message: 'Room not found' }),
      } as any);

      await expect(client.getRoom('nonexistent'))
        .rejects.toThrow(ApiResponseError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listRooms())
        .rejects.toThrow(ApiRequestError);
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/plain' : null,
        },
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Server error occurred',
      } as any);

      await expect(client.listRooms())
        .rejects.toThrow(ApiResponseError);
    });
  });

  describe('Room Management', () => {
    it('should get default room settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            chat_enabled: true,
            recordings_enabled: false
          }
        }),
      } as any);

      const settings = await client.getDefaultRoomSettings();
      expect(settings).toEqual({
        chat_enabled: true,
        recordings_enabled: false
      });
    });

    it('should update default room settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Settings updated' }),
      } as any);

      await client.updateDefaultRoomSettings({
        chat_enabled: false
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/settings'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ chat_enabled: false })
        })
      );
    });

    it('should delete room resources', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Resources deleted' }),
      } as any);

      await client.deleteRoomResources('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/resources'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Live Room Methods', () => {
    it('should get live rooms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'room1', name: 'Live Room 1', participants_count: 5 },
            { id: 'room2', name: 'Live Room 2', participants_count: 3 }
          ]
        }),
      } as any);

      const result = await client.getLiveRooms();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].participants_count).toBe(5);
    });

    it('should get live rooms with participants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { 
              id: 'room1', 
              name: 'Live Room 1', 
              participants: [
                { id: 'p1', name: 'User 1' },
                { id: 'p2', name: 'User 2' }
              ]
            }
          ]
        }),
      } as any);

      const result = await client.getLiveRoomsWithParticipants();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].participants).toHaveLength(2);
    });

    it('should get room live participants count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: { count: 10 }
        }),
      } as any);

      const result = await client.getRoomLiveParticipantsCount('room-123');
      expect(result.count).toBe(10);
    });

    it('should get room live participants data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            participants: [
              { id: 'p1', name: 'User 1', video_enabled: true },
              { id: 'p2', name: 'User 2', video_enabled: false }
            ]
          }
        }),
      } as any);

      const result = await client.getRoomLiveParticipantsData('room-123');
      expect(result.participants).toHaveLength(2);
    });
  });

  describe('Participant Management', () => {
    it('should list participants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'p1', name: 'User 1' },
            { id: 'p2', name: 'User 2' }
          ],
          total: 2
        }),
      } as any);

      const result = await client.listParticipants();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should get participant details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'p1',
            name: 'User 1',
            email: 'user1@example.com',
            joined_at: '2025-01-01T10:00:00Z'
          }
        }),
      } as any);

      const participant = await client.getParticipant('p1');
      expect(participant.id).toBe('p1');
      expect(participant.email).toBe('user1@example.com');
    });

    it('should handle phone participants joined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Participants joined' }),
      } as any);

      await client.phoneParticipantsJoined('room-123', [
        { call_id: 'call-1', name: 'Phone User 1' }
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/participants/phone/joined'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('call-1')
        })
      );
    });

    it('should handle phone participants left', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Participants left' }),
      } as any);

      await client.phoneParticipantsLeft('room-123', ['call-1', 'call-2']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/participants/phone/left'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ call_ids: ['call-1', 'call-2'] })
        })
      );
    });
  });

  describe('Session Management', () => {
    it('should list room sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 's1', room_id: 'room-123', started_at: '2025-01-01T10:00:00Z' },
            { id: 's2', room_id: 'room-123', started_at: '2025-01-01T11:00:00Z' }
          ]
        }),
      } as any);

      const result = await client.listRoomSessions('room-123');
      expect(result.data).toHaveLength(2);
    });

    it('should end a session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Session ended' }),
      } as any);

      await client.endSession('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/end'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should get session summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            session_id: 'session-123',
            duration: 3600,
            participants_count: 10,
            chat_messages_count: 50
          }
        }),
      } as any);

      const summary = await client.getSessionSummary('session-123');
      expect(summary.duration).toBe(3600);
      expect(summary.participants_count).toBe(10);
    });
  });

  describe('Recording Management', () => {
    it('should start recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: { recording_id: 'rec-123' } }),
      } as any);

      const result = await client.startRecording('room-123');
      expect(result.recording_id).toBe('rec-123');
    });

    it('should stop recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Recording stopped' }),
      } as any);

      await client.stopRecording('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/recording/stop'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should delete recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Recording deleted' }),
      } as any);

      await client.deleteRecording('rec-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recordings/rec-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should update recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: { id: 'rec-123', name: 'Updated Recording' }
        }),
      } as any);

      const result = await client.updateRecording('rec-123', { name: 'Updated Recording' });
      expect(result.name).toBe('Updated Recording');
    });

    it('should archive recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Recording archived' }),
      } as any);

      await client.archiveRecording('rec-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recordings/rec-123/archive'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should unarchive recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Recording unarchived' }),
      } as any);

      await client.unarchiveRecording('rec-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recordings/rec-123/unarchive'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should get recording download link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: { download_url: 'https://example.com/download/rec-123' }
        }),
      } as any);

      const result = await client.getRecordingDownloadLink('rec-123');
      expect(result.download_url).toBe('https://example.com/download/rec-123');
    });
  });

  describe('Analytics Methods', () => {
    it('should get participant statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            total_participants: 100,
            average_duration: 3600,
            by_date: []
          }
        }),
      } as any);

      const stats = await client.getParticipantStatistics();
      expect(stats.total_participants).toBe(100);
      expect(stats.average_duration).toBe(3600);
    });

    it('should get room analytics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            room_id: 'room-123',
            total_sessions: 50,
            total_participants: 200,
            average_session_duration: 2700
          }
        }),
      } as any);

      const analytics = await client.getRoomAnalytics('room-123');
      expect(analytics.total_sessions).toBe(50);
      expect(analytics.total_participants).toBe(200);
    });

    it('should get usage statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            total_minutes: 10000,
            total_sessions: 100,
            total_participants: 500
          }
        }),
      } as any);

      const usage = await client.getUsageStatistics();
      expect(usage.total_minutes).toBe(10000);
      expect(usage.total_sessions).toBe(100);
    });
  });

  describe('Communication Management', () => {
    it('should delete session chats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Chats deleted' }),
      } as any);

      await client.deleteSessionChats('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/chats'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete room chats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Chats deleted' }),
      } as any);

      await client.deleteRoomChats('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/chats'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should start transcription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Transcription started' }),
      } as any);

      await client.startTranscription('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/transcription/start'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should stop transcription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Transcription stopped' }),
      } as any);

      await client.stopTranscription('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/transcription/stop'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});