/**
 * Advanced unit tests for Digital Samba API Client
 * Covers poll management, library management, webhooks, and roles
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

// Mock global fetch
global.fetch = jest.fn();

describe('DigitalSambaApiClient Advanced Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  let client: DigitalSambaApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    client = new DigitalSambaApiClient('test-key');
  });

  describe('Poll Management', () => {
    it('should create a poll', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'poll-123',
            question: 'What is your favorite color?',
            options: [
              { id: 'opt1', text: 'Red' },
              { id: 'opt2', text: 'Blue' }
            ]
          }
        }),
      } as any);

      const poll = await client.createPoll('room-123', {
        question: 'What is your favorite color?',
        options: [
          { text: 'Red' },
          { text: 'Blue' }
        ]
      });

      expect(poll.id).toBe('poll-123');
      expect(poll.question).toBe('What is your favorite color?');
    });

    it('should update a poll', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'poll-123',
            question: 'Updated question'
          }
        }),
      } as any);

      const poll = await client.updatePoll('room-123', 'poll-123', {
        question: 'Updated question'
      });

      expect(poll.question).toBe('Updated question');
    });

    it('should delete a poll', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Poll deleted' }),
      } as any);

      await client.deletePoll('room-123', 'poll-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/polls/poll-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should publish poll results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Results published' }),
      } as any);

      await client.publishPollResults('room-123', 'poll-123', 'session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/polls/poll-123/publish'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should delete session polls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Polls deleted' }),
      } as any);

      await client.deleteSessionPolls('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/polls'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete room polls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Polls deleted' }),
      } as any);

      await client.deleteRoomPolls('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/polls'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Library Management', () => {
    it('should create a library', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'lib-123',
            name: 'My Library',
            external_id: 'ext-123'
          }
        }),
      } as any);

      const library = await client.createLibrary({
        name: 'My Library',
        external_id: 'ext-123'
      });

      expect(library.id).toBe('lib-123');
      expect(library.name).toBe('My Library');
    });

    it('should update a library', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'lib-123',
            name: 'Updated Library'
          }
        }),
      } as any);

      const library = await client.updateLibrary('lib-123', {
        name: 'Updated Library'
      });

      expect(library.name).toBe('Updated Library');
    });

    it('should delete a library', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Library deleted' }),
      } as any);

      await client.deleteLibrary('lib-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should create a library folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'folder-123',
            name: 'Documents',
            parent_id: null
          }
        }),
      } as any);

      const folder = await client.createLibraryFolder('lib-123', {
        name: 'Documents'
      });

      expect(folder.id).toBe('folder-123');
      expect(folder.name).toBe('Documents');
    });

    it('should create a library file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'file-123',
            name: 'document.pdf',
            upload_url: 'https://upload.example.com/file-123'
          }
        }),
      } as any);

      const file = await client.createLibraryFile('lib-123', {
        name: 'document.pdf'
      });

      expect(file.id).toBe('file-123');
      expect(file.upload_url).toBe('https://upload.example.com/file-123');
    });

    it('should get file links', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            view_url: 'https://view.example.com/file-123',
            thumbnail_url: 'https://thumb.example.com/file-123'
          }
        }),
      } as any);

      const links = await client.getFileLinks('lib-123', 'file-123');

      expect(links.view_url).toBe('https://view.example.com/file-123');
      expect(links.thumbnail_url).toBe('https://thumb.example.com/file-123');
    });

    it('should move library file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'File moved' }),
      } as any);

      await client.moveLibraryFile('lib-123', 'file-123', 'folder-456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123/files/file-123/move'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ target_folder_id: 'folder-456' })
        })
      );
    });

    it('should bulk delete library files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Files deleted' }),
      } as any);

      await client.bulkDeleteLibraryFiles('lib-123', ['file-1', 'file-2']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/libraries/lib-123/files/bulk-delete'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ file_ids: ['file-1', 'file-2'] })
        })
      );
    });

    it('should copy library content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'file-copy-123',
            name: 'document-copy.pdf'
          }
        }),
      } as any);

      const copy = await client.copyLibraryContent('lib-123', 'lib-456', {
        content_type: 'file',
        content_id: 'file-123',
        target_folder_id: 'folder-789'
      });

      expect(copy.id).toBe('file-copy-123');
    });
  });

  describe('Role Management', () => {
    it('should create a role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'role-123',
            name: 'custom-role',
            display_name: 'Custom Role',
            permissions: {
              can_share_screen: true,
              can_chat: true
            }
          }
        }),
      } as any);

      const role = await client.createRole({
        name: 'custom-role',
        display_name: 'Custom Role',
        permissions: {
          can_share_screen: true,
          can_chat: true
        }
      });

      expect(role.id).toBe('role-123');
      expect(role.permissions.can_chat).toBe(true);
    });

    it('should update a role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'role-123',
            display_name: 'Updated Role'
          }
        }),
      } as any);

      const role = await client.updateRole('role-123', {
        display_name: 'Updated Role'
      });

      expect(role.display_name).toBe('Updated Role');
    });

    it('should delete a role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Role deleted' }),
      } as any);

      await client.deleteRole('role-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/roles/role-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should list roles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'role-1', name: 'moderator' },
            { id: 'role-2', name: 'participant' }
          ]
        }),
      } as any);

      const result = await client.listRoles();
      expect(result.data).toHaveLength(2);
    });

    it('should get role details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'role-123',
            name: 'moderator',
            permissions: {
              can_manage_participants: true,
              can_record: true
            }
          }
        }),
      } as any);

      const role = await client.getRole('role-123');
      expect(role.permissions.can_manage_participants).toBe(true);
    });

    it('should list permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { name: 'can_chat', description: 'Allow chat' },
            { name: 'can_share_screen', description: 'Allow screen sharing' }
          ]
        }),
      } as any);

      const permissions = await client.listPermissions();
      expect(permissions).toHaveLength(2);
    });
  });

  describe('Webhook Management', () => {
    it('should list webhook events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { name: 'room.created', description: 'Room created' },
            { name: 'session.ended', description: 'Session ended' }
          ]
        }),
      } as any);

      const events = await client.listWebhookEvents();
      expect(events).toHaveLength(2);
    });

    it('should create a webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'webhook-123',
            endpoint: 'https://example.com/webhook',
            events: ['room.created']
          }
        }),
      } as any);

      const webhook = await client.createWebhook({
        endpoint: 'https://example.com/webhook',
        events: ['room.created']
      });

      expect(webhook.id).toBe('webhook-123');
      expect(webhook.endpoint).toBe('https://example.com/webhook');
    });

    it('should update a webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'webhook-123',
            endpoint: 'https://example.com/webhook-updated'
          }
        }),
      } as any);

      const webhook = await client.updateWebhook('webhook-123', {
        endpoint: 'https://example.com/webhook-updated'
      });

      expect(webhook.endpoint).toBe('https://example.com/webhook-updated');
    });

    it('should delete a webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Webhook deleted' }),
      } as any);

      await client.deleteWebhook('webhook-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/webhook-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should list webhooks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: [
            { id: 'webhook-1', endpoint: 'https://example.com/webhook1' },
            { id: 'webhook-2', endpoint: 'https://example.com/webhook2' }
          ]
        }),
      } as any);

      const result = await client.listWebhooks();
      expect(result.data).toHaveLength(2);
    });

    it('should get webhook details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ 
          data: {
            id: 'webhook-123',
            endpoint: 'https://example.com/webhook',
            events: ['room.created', 'session.ended'],
            authorization_header: 'Bearer secret'
          }
        }),
      } as any);

      const webhook = await client.getWebhook('webhook-123');
      expect(webhook.events).toHaveLength(2);
      expect(webhook.authorization_header).toBe('Bearer secret');
    });
  });

  describe('Data Deletion Methods', () => {
    it('should hard delete session resources', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Resources deleted' }),
      } as any);

      await client.hardDeleteSessionResources('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/resources'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should bulk delete session data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Data deleted' }),
      } as any);

      await client.bulkDeleteSessionData('session-123', ['chat', 'questions']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/data'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ data_types: ['chat', 'questions'] })
        })
      );
    });

    it('should delete session Q&A', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Q&A deleted' }),
      } as any);

      await client.deleteSessionQA('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/questions'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete room Q&A', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Q&A deleted' }),
      } as any);

      await client.deleteRoomQA('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/questions'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete session transcripts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Transcripts deleted' }),
      } as any);

      await client.deleteSessionTranscripts('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/transcripts'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete room transcripts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Transcripts deleted' }),
      } as any);

      await client.deleteRoomTranscripts('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/transcripts'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete session summaries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Summaries deleted' }),
      } as any);

      await client.deleteSessionSummaries('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/session-123/summaries'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should delete room summaries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'Summaries deleted' }),
      } as any);

      await client.deleteRoomSummaries('room-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-123/summaries'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });
});