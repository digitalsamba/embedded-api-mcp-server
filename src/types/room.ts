/**
 * Room-related types and interfaces for the Digital Samba API
 *
 * @module types/room
 */

// Room related interfaces
export interface Room {
  id: string;
  description?: string;
  topic?: string;
  friendly_url?: string;
  privacy: "public" | "private";
  max_participants?: number;
  max_broadcasters?: number;
  is_locked?: boolean;
  external_id?: string;
  room_url?: string;
  created_at: string;
  updated_at: string;

  // Settings
  topbar_enabled?: boolean;
  toolbar_enabled?: boolean;
  toolbar_position?: "left" | "right" | "bottom";
  toolbar_color?: string;
  primary_color?: string;
  background_color?: string;
  palette_mode?: "light" | "dark";
  language?: string;
  languages?: string[];
  language_selection_enabled?: boolean;

  // Meeting features
  audio_on_join_enabled?: boolean;
  video_on_join_enabled?: boolean;
  screenshare_enabled?: boolean;
  participants_list_enabled?: boolean;
  chat_enabled?: boolean;
  private_chat_enabled?: boolean;
  recordings_enabled?: boolean;
  recording_autostart_enabled?: boolean;
  polls_enabled?: boolean;
  qa_enabled?: boolean;
  transcription_enabled?: boolean;

  // Breakout room fields
  is_breakout?: boolean;
  parent_id?: string;

  [key: string]: any; // For additional properties
}

export interface RoomCreateSettings {
  name: string; // Required field
  description?: string;
  friendly_url?: string;
  privacy?: "public" | "private";
  external_id?: string;
  max_participants?: number;
  max_broadcasters?: number;
  is_locked?: boolean;
  roles?: string[];
  default_role?: string;

  // Settings
  topbar_enabled?: boolean;
  toolbar_enabled?: boolean;
  toolbar_position?: "left" | "right" | "bottom";
  toolbar_color?: string;
  primary_color?: string;
  background_color?: string;
  palette_mode?: "light" | "dark";
  language?: string;
  languages?: string[];
  language_selection_enabled?: boolean;

  // Meeting features
  audio_on_join_enabled?: boolean;
  video_on_join_enabled?: boolean;
  screenshare_enabled?: boolean;
  participants_list_enabled?: boolean;
  chat_enabled?: boolean;
  private_chat_enabled?: boolean;
  recordings_enabled?: boolean;
  recording_autostart_enabled?: boolean;
  polls_enabled?: boolean;
  qa_enabled?: boolean;
  transcription_enabled?: boolean;

  [key: string]: any; // For additional parameters
}

// Breakout room related interfaces
export interface BreakoutRoom extends Room {
  is_breakout: true;
  parent_id: string;
}

export interface BreakoutRoomCreateSettings {
  count: number;
  name_prefix?: string;
  auto_assign?: boolean;
  distribution_method?: "random" | "manual";
}

export interface BreakoutRoomParticipantAssignment {
  participant_id: string;
  breakout_id: string | null;
}