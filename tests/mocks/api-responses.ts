/**
 * Mocks for Digital Samba API responses
 */

export const mockApiResponses = {
  // Room Responses (DS API uses 'topic' for room name)
  rooms: {
    list: {
      data: [
        {
          id: 'room-1',
          topic: 'Test Room 1',
          description: 'A test room',
          friendly_url: 'test-room-1',
          privacy: 'public',
          created_at: '2025-05-01T12:00:00Z',
          updated_at: '2025-05-01T12:00:00Z',
        },
        {
          id: 'room-2',
          topic: 'Test Room 2',
          description: 'Another test room',
          friendly_url: 'test-room-2',
          privacy: 'private',
          created_at: '2025-05-02T12:00:00Z',
          updated_at: '2025-05-02T12:00:00Z',
        },
      ],
      total_count: 2,
    },
    single: {
      id: 'room-1',
      topic: 'Test Room 1',
      description: 'A test room',
      friendly_url: 'test-room-1',
      privacy: 'public',
      created_at: '2025-05-01T12:00:00Z',
      updated_at: '2025-05-01T12:00:00Z',
    },
  },
  
  // Participant Responses
  participants: {
    list: {
      data: [
        {
          id: 'participant-1',
          name: 'Test User 1',
          room_id: 'room-1',
          session_id: 'session-1',
          room_is_deleted: false,
          join_time: '2025-05-01T12:30:00Z',
          live: true,
        },
        {
          id: 'participant-2',
          name: 'Test User 2',
          room_id: 'room-1',
          session_id: 'session-1',
          room_is_deleted: false,
          join_time: '2025-05-01T12:35:00Z',
          live: true,
        },
      ],
      total_count: 2,
    },
  },
  
  // Recording Responses
  recordings: {
    list: {
      data: [
        {
          id: 'recording-1',
          name: 'Test Recording 1',
          status: 'READY',
          room_id: 'room-1',
          created_at: '2025-05-01T13:00:00Z',
          updated_at: '2025-05-01T14:00:00Z',
          duration: 3600,
        },
        {
          id: 'recording-2',
          name: 'Test Recording 2',
          status: 'PENDING_CONVERSION',
          room_id: 'room-1',
          created_at: '2025-05-02T13:00:00Z',
          updated_at: '2025-05-02T13:30:00Z',
        },
      ],
      total_count: 2,
    },
    downloadLink: {
      link: 'https://example.com/download/recording-1',
      valid_until: '2025-05-10T00:00:00Z',
    },
  },
  
  // Breakout Room Responses
  breakoutRooms: {
    list: {
      data: [
        {
          id: 'breakout-1',
          name: 'Breakout Room 1',
          parent_id: 'room-1',
          is_breakout: true,
          privacy: 'public',
          created_at: '2025-05-01T15:00:00Z',
          updated_at: '2025-05-01T15:00:00Z',
        },
        {
          id: 'breakout-2',
          name: 'Breakout Room 2',
          parent_id: 'room-1',
          is_breakout: true,
          privacy: 'public',
          created_at: '2025-05-01T15:00:00Z',
          updated_at: '2025-05-01T15:00:00Z',
        },
      ],
      total_count: 2,
    },
  },
  
  // Webhook Responses
  webhooks: {
    list: {
      data: [
        {
          id: 'webhook-1',
          name: 'Test Webhook',
          endpoint: 'https://example.com/webhook',
          events: ['room.created', 'room.updated'],
          created_at: '2025-05-01T12:00:00Z',
          updated_at: '2025-05-01T12:00:00Z',
        },
      ],
      total_count: 1,
    },
    events: [
      'room.created',
      'room.updated',
      'room.deleted',
      'session.started',
      'session.ended',
      'participant.joined',
      'participant.left',
      'recording.started',
      'recording.stopped',
      'recording.ready',
    ],
  },
  
  // Meeting Responses
  meetings: {
    list: {
      data: [
        {
          id: 'meeting-1',
          title: 'Test Meeting 1',
          description: 'A test meeting',
          room_id: 'room-1',
          start_time: '2025-05-10T10:00:00Z',
          end_time: '2025-05-10T11:00:00Z',
          timezone: 'UTC',
          host_name: 'Test Host',
          participants: [
            {
              name: 'Participant 1',
              email: 'participant1@example.com',
              role: 'attendee',
            },
            {
              name: 'Participant 2',
              email: 'participant2@example.com',
              role: 'attendee',
            },
          ],
          status: 'scheduled',
          created_at: '2025-05-01T12:00:00Z',
          updated_at: '2025-05-01T12:00:00Z',
        },
      ],
      total_count: 1,
    },
  },
};

/**
 * Mock request object for testing
 */
export const mockRequest = {
  headers: {
    authorization: 'Bearer test-api-key',
  },
  sessionId: 'test-session-id',
};

/**
 * Mock MCP request for testing
 */
export const mockMcpRequest = {
  method: 'test-method',
  params: {},
};

/**
 * Mock MCP tool request
 */
export const mockToolRequest = {
  method: 'tools/call',
  params: {
    name: 'test-tool',
    arguments: {},
  },
};

/**
 * Mock MCP resource request
 */
export const mockResourceRequest = {
  method: 'resources/read',
  params: {
    uri: 'digitalsamba://test-resource',
  },
};
