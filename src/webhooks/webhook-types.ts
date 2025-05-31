/**
 * Digital Samba MCP Server - Webhook Types and Interfaces
 * 
 * This module defines all types, interfaces, and enums used throughout
 * the webhook system. It provides type definitions for webhook events,
 * payloads, configuration, and handlers.
 * 
 * @module webhooks/webhook-types
 * @author Digital Samba Team
 * @version 1.0.0
 */

// Define webhook event types
export enum WebhookEventType {
  // Room events
  ROOM_CREATED = 'room.created',
  ROOM_UPDATED = 'room.updated',
  ROOM_DELETED = 'room.deleted',
  
  // Session events
  SESSION_STARTED = 'session.started',
  SESSION_ENDED = 'session.ended',
  
  // Participant events
  PARTICIPANT_JOINED = 'participant.joined',
  PARTICIPANT_LEFT = 'participant.left',
  
  // Recording events
  RECORDING_STARTED = 'recording.started',
  RECORDING_STOPPED = 'recording.stopped',
  RECORDING_READY = 'recording.ready',
  
  // Chat events
  CHAT_MESSAGE = 'chat.message',
  
  // Poll events
  POLL_CREATED = 'poll.created',
  POLL_UPDATED = 'poll.updated',
  POLL_DELETED = 'poll.deleted',
  
  // Q&A events
  QUESTION_ASKED = 'qa.question',
  QUESTION_ANSWERED = 'qa.answer',
}

// Define webhook payload interface
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

// Webhook configuration
export interface WebhookConfig {
  secret?: string;  // For verifying webhook signatures
  endpoint: string; // Endpoint path for receiving webhooks
}

// Webhook event handler type
export type WebhookEventHandler = (payload: WebhookPayload) => Promise<void>;