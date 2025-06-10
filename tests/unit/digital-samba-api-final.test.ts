/**
 * Final unit tests for Digital Samba API Client
 * Covers remaining uncovered methods and edge cases
 * 
 * @group unit
 * @group api-client
 */

import { DigitalSambaApiClient } from '../../src/digital-samba-api';

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

// Mock the cache
jest.mock('../../src/cache', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('DigitalSambaApiClient Final Coverage Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  let client: DigitalSambaApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    client = new DigitalSambaApiClient('test-key');
  });

  describe('Constructor and Configuration', () => {
    it('should create client with API URL', () => {
      const clientWithUrl = new DigitalSambaApiClient('test-key', 'https://custom.api.com');
      expect(clientWithUrl).toBeDefined();
    });

    it('should create client with cache', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
      };
      const clientWithCache = new DigitalSambaApiClient('test-key', undefined, mockCache);
      expect(clientWithCache).toBeDefined();
    });
  });

  describe('API Methods with Pagination', () => {
    it('should list webhooks with pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'webhook-1', endpoint: 'https://example.com/1' },
            { id: 'webhook-2', endpoint: 'https://example.com/2' }
          ],
          total: 10,
          limit: 2,
          offset: 0
        }),
      } as any);

      const result = await client.listWebhooks({ limit: 2, offset: 0 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should list room participants with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'p1', name: 'User 1', room_id: 'room-123' },
            { id: 'p2', name: 'User 2', room_id: 'room-123' }
          ]
        }),
      } as any);

      const result = await client.listRoomParticipants('room-123', { limit: 10 });
      expect(result.data).toHaveLength(2);
    });

    it('should list session participants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'p1', name: 'User 1', session_id: 'session-123' },
            { id: 'p2', name: 'User 2', session_id: 'session-123' }
          ]
        }),
      } as any);

      const result = await client.listSessionParticipants('session-123');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Session and Recording Methods', () => {
    it('should get session statistics', async () => {
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
            participants_count: 15,
            messages_count: 100,
            questions_count: 5
          }
        }),
      } as any);

      const stats = await client.getSessionStatistics('session-123');
      expect(stats.duration).toBe(3600);
      expect(stats.participants_count).toBe(15);
    });

    it('should get recording by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'rec-123',
            name: 'Meeting Recording',
            status: 'READY',
            duration: 3600,
            size: 1024000
          }
        }),
      } as any);

      const recording = await client.getRecording('rec-123');
      expect(recording.id).toBe('rec-123');
      expect(recording.status).toBe('READY');
    });

    it('should list recordings with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'rec-1', name: 'Recording 1', room_id: 'room-123' },
            { id: 'rec-2', name: 'Recording 2', room_id: 'room-123' }
          ]
        }),
      } as any);

      const result = await client.listRecordings({ room_id: 'room-123', limit: 10 });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Library Management Edge Cases', () => {
    it('should update library folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'folder-123',
            name: 'Updated Folder',
            parent_id: 'parent-456'
          }
        }),
      } as any);

      const folder = await client.updateLibraryFolder('lib-123', 'folder-123', {
        name: 'Updated Folder',
        parent_id: 'parent-456'
      });

      expect(folder.name).toBe('Updated Folder');
    });

    it('should delete library folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Folder deleted' }),
      } as any);

      await client.deleteLibraryFolder('lib-123', 'folder-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123/folders/folder-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should update library file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'file-123',
            name: 'updated-document.pdf',
            folder_id: 'folder-456'
          }
        }),
      } as any);

      const file = await client.updateLibraryFile('lib-123', 'file-123', {
        name: 'updated-document.pdf',
        folder_id: 'folder-456'
      });

      expect(file.name).toBe('updated-document.pdf');
    });

    it('should delete library file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'File deleted' }),
      } as any);

      await client.deleteLibraryFile('lib-123', 'file-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123/files/file-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should create webapp', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'webapp-123',
            name: 'My Web App',
            type: 'webapp'
          }
        }),
      } as any);

      const webapp = await client.createWebapp('lib-123', {
        name: 'My Web App'
      });

      expect(webapp.id).toBe('webapp-123');
      expect(webapp.type).toBe('webapp');
    });

    it('should create whiteboard', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'whiteboard-123',
            name: 'My Whiteboard',
            type: 'whiteboard'
          }
        }),
      } as any);

      const whiteboard = await client.createWhiteboard('lib-123', {
        name: 'My Whiteboard'
      });

      expect(whiteboard.id).toBe('whiteboard-123');
      expect(whiteboard.type).toBe('whiteboard');
    });

    it('should move library folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Folder moved' }),
      } as any);

      await client.moveLibraryFolder('lib-123', 'folder-123', 'parent-456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123/folders/folder-123/move'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ target_parent_id: 'parent-456' })
        })
      );
    });

    it('should bulk upload library files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'file-1', name: 'doc1.pdf', upload_url: 'https://upload.com/1' },
            { id: 'file-2', name: 'doc2.pdf', upload_url: 'https://upload.com/2' }
          ]
        }),
      } as any);

      const files = await client.bulkUploadLibraryFiles('lib-123', [
        { name: 'doc1.pdf', size: 1000, mime_type: 'application/pdf' },
        { name: 'doc2.pdf', size: 2000, mime_type: 'application/pdf' }
      ]);

      expect(files).toHaveLength(2);
      expect(files[0].upload_url).toBe('https://upload.com/1');
    });
  });

  describe('Cache Integration', () => {
    it('should use cache when available', async () => {
      const mockCache = {
        get: jest.fn().mockReturnValue({ value: { data: 'cached-data' } }),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
      };

      const clientWithCache = new DigitalSambaApiClient('test-key', undefined, mockCache);
      
      const result = await clientWithCache.listRooms();
      expect(result).toEqual({ data: 'cached-data' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set cache after successful request', async () => {
      const mockCache = {
        get: jest.fn().mockReturnValue(null),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
      };

      const clientWithCache = new DigitalSambaApiClient('test-key', undefined, mockCache);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: 'fresh-data' }),
      } as any);

      await clientWithCache.listRooms();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('Advanced Error Scenarios', () => {
    it('should handle empty response body gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({}),
      } as any);

      const result = await client.listRooms();
      expect(result).toEqual({});
    });

    it('should handle malformed JSON in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => { throw new Error('Malformed JSON'); },
        text: async () => 'Internal server error',
      } as any);

      await expect(client.listRooms()).rejects.toThrow('Internal server error');
    });

    it('should handle timeout-like network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(client.listRooms()).rejects.toThrow(/timeout/i);
    });

    it('should handle other client types (with no api key)', () => {
      // Test extractApiKey fallback
      const clientNoKey = new DigitalSambaApiClient('');
      expect(clientNoKey).toBeDefined();
    });
  });

  describe('Query Parameter Handling', () => {
    it('should handle undefined values in query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: [] }),
      } as any);

      await client.listWebhooks({ limit: undefined, offset: 0 });
      
      // Should only include offset, not limit
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=0'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('limit='),
        expect.anything()
      );
    });

    it('should handle filters with nested objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ data: {} }),
      } as any);

      await client.getParticipantStatistics({ 
        date_start: '2025-01-01',
        room_id: 'room-123'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('date_start=2025-01-01'),
        expect.anything()
      );
    });
  });
});