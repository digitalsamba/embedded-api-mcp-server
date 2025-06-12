/**
 * Recording-related types and interfaces for the Digital Samba API
 *
 * @module types/recording
 */

// Recording related interfaces
export interface Recording {
  id: string;
  name?: string;
  status: "AWAITING_START" | "IN_PROGRESS" | "PENDING_CONVERSION" | "READY";
  room_id: string;
  external_room_id?: string;
  friendly_url?: string;
  privacy?: "public" | "private";
  session_id?: string;
  participant_id?: string;
  participant_name?: string;
  participant_external_id?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export interface RecordingDownloadLink {
  link: string;
  valid_until: string;
}