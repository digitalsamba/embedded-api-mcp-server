/**
 * Analytics types for Digital Samba MCP Server
 */

export interface AnalyticsFilters {
  room_id?: string;
  session_id?: string;
  date_from?: string;
  date_to?: string;
  date_start?: string;
  date_end?: string;
  participant_id?: string;
  is_moderator?: boolean;
  period?: string;
  [key: string]: any; // Allow additional properties
}

export interface TeamAnalyticsOptions {
  filters?: AnalyticsFilters;
}

export interface RoomAnalyticsOptions {
  roomId: string;
  filters?: AnalyticsFilters;
}

export interface SessionAnalyticsOptions {
  sessionId: string;
  filters?: AnalyticsFilters;
}

export interface AnalyticsMetrics {
  sessions?: {
    total?: number;
    completed?: number;
    average_duration?: number;
  };
  participants?: {
    total?: number;
    unique?: number;
    average_per_session?: number;
  };
  recordings?: {
    total?: number;
    total_duration?: number;
  };
  [key: string]: any;
}

export interface AnalyticsResponse {
  data?: AnalyticsMetrics;
  meta?: {
    filters?: AnalyticsFilters;
    period?: {
      start?: string;
      end?: string;
    };
  };
  [key: string]: any;
}
