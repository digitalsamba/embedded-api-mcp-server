/**
 * Session-related types and interfaces for the Digital Samba API
 *
 * @module types/session
 */

// Session related interfaces
export interface Session {
  id: string;
  start_time: string;
  end_time?: string;
  room_id: string;
  room_external_id?: string;
  description?: string;
  friendly_url?: string;
  room_is_deleted: boolean;
  participants_live?: number;
  participants_total: number;
  participants_max: number;
  live: boolean;
}

export interface SessionStatistics {
  room_id: string;
  room_external_id?: string;
  room_description?: string;
  room_friendly_url?: string;
  room_privacy?: string;
  room_source?: string;
  room_max_participants?: number;
  room_is_deleted: boolean;
  session_id: string;
  session_duration: number;
  session_live: boolean;
  session_start_time: string;
  session_end_time?: string;
  participation_minutes: number;
  desktop_participation_minutes?: number;
  mobile_participation_minutes?: number;
  tablet_participation_minutes?: number;
  smarttv_participation_minutes?: number;
  broadcasted_minutes?: number;
  subscribed_minutes?: number;
  live_participants: number;
  active_participants: number;
  max_concurrent_participants?: number;
  [key: string]: any; // For additional statistics
}