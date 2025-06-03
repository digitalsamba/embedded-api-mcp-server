/**
 * Digital Samba API Mock Server
 * 
 * This file provides a mock implementation of the Digital Samba API
 * for use in testing. It simulates API responses and behavior.
 */

import express from 'express';
import { mockApiResponses } from './api-responses.js';
import logger from '../../src/logger.js';

/**
 * Create a mock Digital Samba API server for testing
 * 
 * @param options - Server options
 * @returns Express app and server instance
 */
export function createMockApiServer(options: {
  port?: number;
  delayMs?: number; // Delay in milliseconds to simulate network latency
  failureRate?: number; // Percentage (0-100) of requests that should fail
  notFoundRate?: number; // Percentage (0-100) of requests that should return 404
}) {
  const {
    port = 8080,
    delayMs = 0,
    failureRate = 0,
    notFoundRate = 0,
  } = options;
  
  // Create Express app
  const app = express();
  app.use(express.json());
  
  // Store created rooms for retrieval
  const createdRooms = new Map<string, any>();
  
  // Default error helper
  const sendError = (res: express.Response, status: number, message: string) => {
    res.status(status).json({
      error: message,
      status,
    });
  };
  
  // Middleware to simulate network latency
  app.use((req, res, next) => {
    if (delayMs > 0) {
      setTimeout(next, delayMs);
    } else {
      next();
    }
  });
  
  // Middleware to simulate random failures and not found errors
  app.use((req, res, next) => {
    // Random chance of failure
    if (failureRate > 0 && Math.random() * 100 < failureRate) {
      return sendError(res, 500, 'Internal Server Error (Simulated failure)');
    }
    
    // Random chance of not found
    if (notFoundRate > 0 && Math.random() * 100 < notFoundRate) {
      return sendError(res, 404, 'Not Found (Simulated not found)');
    }
    
    next();
  });
  
  // Authentication middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized: Missing or invalid API key');
    }
    
    // Extract API key from header
    const apiKey = authHeader.substring(7);
    if (!apiKey || apiKey === 'invalid-key') {
      return sendError(res, 401, 'Unauthorized: Invalid API key');
    }
    
    // Add API key to request for downstream use if needed
    (req as any).apiKey = apiKey;
    next();
  });
  
  // Log all requests
  app.use((req, res, next) => {
    logger.debug(`Mock API: ${req.method} ${req.path}`);
    next();
  });
  
  // --------------------------
  // Room endpoints
  // --------------------------
  
  // List rooms
  app.get('/rooms', (req, res) => {
    res.json(mockApiResponses.rooms.list);
  });
  
  // Get room by ID
  app.get('/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    
    // Check if this room was created during testing
    if (createdRooms.has(roomId)) {
      res.json(createdRooms.get(roomId));
      return;
    }
    
    // Return mock room data with the requested ID
    const room = { 
      ...mockApiResponses.rooms.single,
      id: roomId,
    };
    res.json(room);
  });
  
  // Create room
  app.post('/rooms', (req, res) => {
    const roomData = req.body;
    // Return mock room data with the requested properties
    const room = { 
      ...mockApiResponses.rooms.single,
      id: `room-${Date.now()}`,
      ...roomData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Store the created room for later retrieval
    createdRooms.set(room.id, room);
    
    res.json(room);
  });
  
  // Update room
  app.put('/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const roomData = req.body;
    // Return mock room data with the requested properties
    const room = { 
      ...mockApiResponses.rooms.single,
      id: roomId,
      ...roomData,
      updated_at: new Date().toISOString(),
    };
    res.json(room);
  });
  
  // Delete room
  app.delete('/rooms/:roomId', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // List room participants
  app.get('/rooms/:roomId/participants', (req, res) => {
    const { roomId } = req.params;
    // Return mock participants with the requested room ID
    const participants = {
      ...mockApiResponses.participants.list,
      data: mockApiResponses.participants.list.data.map(p => ({ 
        ...p, 
        room_id: roomId 
      })),
    };
    res.json(participants);
  });
  
  // Generate room token
  app.post('/rooms/:roomId/token', (req, res) => {
    const { roomId } = req.params;
    const { u: userName, role, ud: userData } = req.body;
    
    // Check if room exists (simulate error for non-existent room)
    if (roomId === 'non-existent-room') {
      sendError(res, 404, 'Room not found');
      return;
    }
    
    // Create a token that expires in 1 hour
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const token = {
      token: `mock-token-${roomId}-${Date.now()}`,
      link: `https://meet.example.com/rooms/${roomId}?token=mock-token`,
      expires_at: expiresAt,
    };
    
    res.json(token);
  });
  
  // --------------------------
  // Recording endpoints
  // --------------------------
  
  // List recordings
  app.get('/recordings', (req, res) => {
    res.json(mockApiResponses.recordings.list);
  });
  
  // Get recording by ID
  app.get('/recordings/:recordingId', (req, res) => {
    const { recordingId } = req.params;
    // Return mock recording data with the requested ID
    const recording = { 
      ...mockApiResponses.recordings.list.data[0],
      id: recordingId,
    };
    res.json(recording);
  });
  
  // Start recording
  app.post('/rooms/:roomId/recordings/start', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // Stop recording
  app.post('/rooms/:roomId/recordings/stop', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // Get recording download link
  app.get('/recordings/:recordingId/download', (req, res) => {
    res.json(mockApiResponses.recordings.downloadLink);
  });
  
  // Delete recording
  app.delete('/recordings/:recordingId', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // --------------------------
  // Session endpoints
  // --------------------------
  
  // List all sessions
  app.get('/sessions', (req, res) => {
    res.json({
      data: [
        {
          id: 'session-1',
          room_id: 'room-1',
          started_at: '2025-01-01T10:00:00Z',
          ended_at: '2025-01-01T11:00:00Z',
          participants_count: 5
        }
      ],
      total_count: 1
    });
  });
  
  // Get session by ID
  app.get('/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    res.json({
      id: sessionId,
      room_id: 'room-1',
      started_at: '2025-01-01T10:00:00Z',
      ended_at: '2025-01-01T11:00:00Z',
      participants_count: 5,
      recording_available: false
    });
  });
  
  // Get session summary
  app.get('/sessions/:sessionId/summary', (req, res) => {
    const { sessionId } = req.params;
    res.json({
      id: sessionId,
      summary: 'This was a productive meeting with 5 participants.',
      key_points: ['Discussion of Q1 goals', 'Budget review', 'Team updates'],
      action_items: ['Follow up with marketing team', 'Prepare Q2 projections']
    });
  });
  
  // List session participants
  app.get('/sessions/:sessionId/participants', (req, res) => {
    const { sessionId } = req.params;
    res.json({
      data: [
        {
          id: 'participant-1',
          name: 'John Doe',
          session_id: sessionId,
          join_time: '2025-01-01T10:00:00Z',
          leave_time: '2025-01-01T11:00:00Z'
        }
      ],
      total_count: 1
    });
  });
  
  // List room sessions
  app.get('/rooms/:roomId/sessions', (req, res) => {
    const { roomId } = req.params;
    res.json({
      data: [
        {
          id: 'session-1',
          room_id: roomId,
          started_at: '2025-01-01T10:00:00Z',
          ended_at: '2025-01-01T11:00:00Z',
          participants_count: 5
        }
      ],
      total_count: 1
    });
  });
  
  // --------------------------
  // Breakout room endpoints
  // --------------------------
  
  // List breakout rooms
  app.get('/rooms/:roomId/breakout-rooms', (req, res) => {
    const { roomId } = req.params;
    // Return mock breakout rooms with the requested parent room ID
    const breakoutRooms = {
      ...mockApiResponses.breakoutRooms.list,
      data: mockApiResponses.breakoutRooms.list.data.map(r => ({ 
        ...r, 
        parent_id: roomId 
      })),
    };
    res.json(breakoutRooms);
  });
  
  // Create breakout rooms
  app.post('/rooms/:roomId/breakout-rooms', (req, res) => {
    const { roomId } = req.params;
    const { count, name_prefix } = req.body;
    
    // Create requested number of breakout rooms
    const breakoutRooms = [];
    for (let i = 0; i < (count || 2); i++) {
      breakoutRooms.push({
        id: `breakout-${Date.now()}-${i}`,
        name: `${name_prefix || 'Breakout Room'} ${i + 1}`,
        parent_id: roomId,
        is_breakout: true,
        privacy: 'public',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    res.json({ data: breakoutRooms, total_count: breakoutRooms.length });
  });
  
  // Assign participants to breakout rooms
  app.post('/rooms/:roomId/breakout-rooms/assign', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // Broadcast message to breakout rooms
  app.post('/rooms/:roomId/breakout-rooms/broadcast', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // --------------------------
  // Webhook endpoints
  // --------------------------
  
  // List webhooks
  app.get('/webhooks', (req, res) => {
    res.json(mockApiResponses.webhooks.list);
  });
  
  // Create webhook
  app.post('/webhooks', (req, res) => {
    const webhookData = req.body;
    // Return mock webhook data with the requested properties
    const webhook = { 
      id: `webhook-${Date.now()}`,
      ...webhookData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    res.json(webhook);
  });
  
  // Delete webhook
  app.delete('/webhooks/:webhookId', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // List webhook events
  app.get('/webhooks/events', (req, res) => {
    res.json(mockApiResponses.webhooks.events);
  });
  
  // --------------------------
  // Meeting endpoints
  // --------------------------
  
  // List meetings
  app.get('/meetings', (req, res) => {
    res.json(mockApiResponses.meetings.list);
  });
  
  // Get meeting by ID
  app.get('/meetings/:meetingId', (req, res) => {
    const { meetingId } = req.params;
    // Return mock meeting data with the requested ID
    const meeting = { 
      ...mockApiResponses.meetings.list.data[0],
      id: meetingId,
    };
    res.json(meeting);
  });
  
  // Create meeting
  app.post('/meetings', (req, res) => {
    const meetingData = req.body;
    // Return mock meeting data with the requested properties
    const meeting = { 
      ...mockApiResponses.meetings.list.data[0],
      id: `meeting-${Date.now()}`,
      ...meetingData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    res.json(meeting);
  });
  
  // Update meeting
  app.put('/meetings/:meetingId', (req, res) => {
    const { meetingId } = req.params;
    const meetingData = req.body;
    // Return mock meeting data with the requested properties
    const meeting = { 
      ...mockApiResponses.meetings.list.data[0],
      id: meetingId,
      ...meetingData,
      updated_at: new Date().toISOString(),
    };
    res.json(meeting);
  });
  
  // Delete meeting
  app.delete('/meetings/:meetingId', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // Add participants to meeting
  app.post('/meetings/:meetingId/participants', (req, res) => {
    // Return 204 No Content
    res.status(204).end();
  });
  
  // --------------------------
  // Analytics/Statistics endpoints
  // --------------------------
  
  // Get statistics
  app.get('/statistics', (req, res) => {
    // Return mock statistics
    res.json({
      data: {
        total_rooms: 2,
        total_sessions: 5,
        total_participants: 10,
        total_duration_minutes: 120,
        average_session_duration_minutes: 24,
        date_start: req.query.date_start || '2025-01-01',
        date_end: req.query.date_end || '2025-01-31'
      }
    });
  });
  
  // Get room statistics
  app.get('/rooms/:roomId/statistics', (req, res) => {
    const { roomId } = req.params;
    res.json({
      data: {
        room_id: roomId,
        total_sessions: 3,
        total_participants: 6,
        total_duration_minutes: 75,
        average_session_duration_minutes: 25
      }
    });
  });
  
  // Get session statistics
  app.get('/sessions/:sessionId/statistics', (req, res) => {
    const { sessionId } = req.params;
    res.json({
      data: {
        session_id: sessionId,
        participants: 4,
        duration_minutes: 30,
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T10:30:00Z'
      }
    });
  });
  
  // Handle 404s
  app.use((req, res) => {
    sendError(res, 404, `Not Found: ${req.method} ${req.path}`);
  });
  
  // Handle errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Mock API error:', { error: err.message, stack: err.stack });
    sendError(res, 500, `Internal Server Error: ${err.message}`);
  });
  
  // Create server and listen on port
  const server = app.listen(port, () => {
    logger.info(`Mock Digital Samba API server running on port ${port}`);
  });
  
  return { app, server };
}
