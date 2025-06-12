/**
 * Participant-related types and interfaces for the Digital Samba API
 *
 * @module types/participant
 */

// Participant related interfaces
export interface Participant {
  id: string;
  external_id?: string;
  session_id: string;
  room_id: string;
  room_external_id?: string;
  room_is_deleted: boolean;
  name: string;
  role?: string;
  friendly_url?: string;
  join_time: string;
  leave_time?: string;
  live: boolean;
}

export interface ParticipantDetail extends Participant {
  device?: string;
  system?: string;
  browser?: string;
  e2ee?: boolean;
  participation_minutes?: number;
  public_chat_posts?: number;
  questions?: number;
  answers?: number;
}

export interface TokenOptions {
  ud?: string; // External user identifier
  u?: string; // User name
  role?: string; // User role
  initials?: string; // User initials
  avatar?: string; // Avatar URL
  breakoutId?: string; // Breakout room ID
  nbf?: string; // Not before date time
  exp?: string; // Token expiration in minutes
}

export interface TokenResponse {
  token: string;
  link: string;
}