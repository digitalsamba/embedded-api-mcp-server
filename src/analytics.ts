/**
 * Analytics Module for Digital Samba MCP Server
 * 
 * This module provides analytics and statistics functionality for the Digital Samba API.
 * It implements comprehensive analytics resources and tools for collecting participant,
 * room, session, and team statistics.
 * 
 * Note: Analytics endpoints are not fully documented in the main OpenAPI spec.
 * This module provides a framework and uses existing API methods where possible.
 * 
 * @module analytics
 */

import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';

// Analytics interfaces
export interface ParticipantStatistic {
  participant_id: string;
  participant_name?: string;
  email?: string;
  join_time?: string;
  leave_time?: string;
  duration_seconds?: number;
  is_moderator?: boolean;
  audio_enabled?: boolean;
  video_enabled?: boolean;
  screen_share_duration?: number;
  chat_messages_sent?: number;
}

export interface RoomAnalytics {
  room_id: string;
  room_name?: string;
  session_count?: number;
  total_participants?: number;
  total_duration_minutes?: number;
  average_session_duration?: number;
  peak_concurrent_participants?: number;
  created_date?: string;
  last_activity?: string;
}

export interface SessionStatistics {
  session_id: string;
  room_id: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  participant_count?: number;
  peak_participants?: number;
  moderator_count?: number;
  chat_messages?: number;
  questions_asked?: number;
  recordings_created?: number;
}

export interface TeamStatistics {
  team_id?: string;
  period_start?: string;
  period_end?: string;
  total_sessions?: number;
  total_participants?: number;
  total_duration_hours?: number;
  unique_users?: number;
  rooms_created?: number;
  recordings_created?: number;
  average_session_duration?: number;
  peak_concurrent_users?: number;
}

export interface UsageStatistics {
  current_period?: TeamStatistics;
  previous_period?: TeamStatistics;
  growth_metrics?: {
    sessions_growth?: number;
    participants_growth?: number;
    duration_growth?: number;
  };
}

export interface AnalyticsFilters {
  date_start?: string; // 'YYYY-MM-DD'
  date_end?: string;   // 'YYYY-MM-DD'
  room_id?: string;
  session_id?: string;
  participant_id?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Analytics Resource Class
 * 
 * Provides comprehensive analytics and statistics functionality for Digital Samba.
 * Implements participant tracking, room analytics, session statistics, and team metrics.
 */
export class AnalyticsResource {
  private apiClient: DigitalSambaApiClient;

  constructor(apiClient: DigitalSambaApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get all participants across all rooms/sessions
   * Uses the existing listParticipants API method
   */
  async getAllParticipants(filters: AnalyticsFilters = {}): Promise<ParticipantStatistic[]> {
    logger.info('Fetching all participants', { filters });
    
    try {
      // Use existing API method
      const params = {
        date_start: filters.date_start,
        date_end: filters.date_end,
        room_id: filters.room_id,
        session_id: filters.session_id
      };
      
      const response = await this.apiClient.listParticipants(params);
      
      // Transform participant data to analytics format
      return response.data.map(participant => ({
        participant_id: participant.id,
        participant_name: participant.name,
        email: participant.external_id, // Use external_id as email placeholder
        join_time: participant.join_time,
        leave_time: participant.leave_time,
        duration_seconds: undefined, // Not available in basic Participant interface
        is_moderator: participant.role === 'moderator',
        audio_enabled: undefined, // Not available in basic Participant interface
        video_enabled: undefined // Not available in basic Participant interface
      }));
    } catch (error) {
      logger.error('Failed to fetch all participants', { error, filters });
      throw error;
    }
  }

  /**
   * Get participant statistics
   * Uses existing participant APIs and transforms data
   */
  async getParticipantStatistics(participantId?: string, filters: AnalyticsFilters = {}): Promise<ParticipantStatistic[]> {
    logger.info('Fetching participant statistics', { participantId, filters });
    
    try {
      if (participantId) {
        // Get specific participant
        const participant = await this.apiClient.getParticipant(participantId);
        return [{
          participant_id: participant.id,
          participant_name: participant.name,
          email: participant.external_id, // Use external_id as email placeholder
          join_time: participant.join_time,
          leave_time: participant.leave_time,
          duration_seconds: participant.participation_minutes ? participant.participation_minutes * 60 : undefined,
          is_moderator: participant.role === 'moderator',
          audio_enabled: undefined, // Not available in ParticipantDetail interface
          video_enabled: undefined // Not available in ParticipantDetail interface
        }];
      } else {
        // Get all participants with filters
        return this.getAllParticipants(filters);
      }
    } catch (error) {
      logger.error('Failed to fetch participant statistics', { error, participantId, filters });
      throw error;
    }
  }

  /**
   * Get all room participants
   * Uses existing listRoomParticipants API method
   */
  async getAllRoomParticipants(roomId: string, filters: AnalyticsFilters = {}): Promise<ParticipantStatistic[]> {
    logger.info('Fetching all room participants', { roomId, filters });
    
    try {
      const params = {
        date_start: filters.date_start,
        date_end: filters.date_end,
        session_id: filters.session_id
      };
      
      const response = await this.apiClient.listRoomParticipants(roomId, params);
      
      // Transform participant data to analytics format
      return response.data.map(participant => ({
        participant_id: participant.id,
        participant_name: participant.name,
        email: participant.external_id, // Use external_id as email placeholder
        join_time: participant.join_time,
        leave_time: participant.leave_time,
        duration_seconds: undefined, // Not available in basic Participant interface
        is_moderator: participant.role === 'moderator',
        audio_enabled: undefined, // Not available in basic Participant interface
        video_enabled: undefined // Not available in basic Participant interface
      }));
    } catch (error) {
      logger.error('Failed to fetch room participants', { error, roomId, filters });
      throw error;
    }
  }

  /**
   * Get all session participants
   * Uses existing listSessionParticipants API method
   */
  async getAllSessionParticipants(sessionId: string): Promise<ParticipantStatistic[]> {
    logger.info('Fetching all session participants', { sessionId });
    
    try {
      const response = await this.apiClient.listSessionParticipants(sessionId);
      
      // Transform participant data to analytics format
      return response.data.map(participant => ({
        participant_id: participant.id,
        participant_name: participant.name,
        email: participant.external_id, // Use external_id as email placeholder
        join_time: participant.join_time,
        leave_time: participant.leave_time,
        duration_seconds: undefined, // Not available in basic Participant interface
        is_moderator: participant.role === 'moderator',
        audio_enabled: undefined, // Not available in basic Participant interface
        video_enabled: undefined // Not available in basic Participant interface
      }));
    } catch (error) {
      logger.error('Failed to fetch session participants', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get session statistics
   * Note: Analytics endpoints not available - returns placeholder data
   */
  async getSessionStatistics(sessionId?: string, filters: AnalyticsFilters = {}): Promise<SessionStatistics[]> {
    logger.info('Fetching session statistics', { sessionId, filters });
    logger.warn('Session statistics endpoint not available in Digital Samba API - returning placeholder');
    
    // Return placeholder data since analytics endpoints are not available
    return [{
      session_id: sessionId || 'unknown',
      room_id: filters.room_id || 'unknown',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_minutes: 0,
      participant_count: 0,
      peak_participants: 0,
      moderator_count: 0,
      chat_messages: 0,
      questions_asked: 0,
      recordings_created: 0
    }];
  }

  /**
   * Get team global statistics by period
   * Note: Analytics endpoints not available - returns placeholder data
   */
  async getTeamGlobalStatistics(filters: AnalyticsFilters = {}): Promise<TeamStatistics> {
    logger.info('Fetching team global statistics', { filters });
    logger.warn('Team statistics endpoint not available in Digital Samba API - returning placeholder');
    
    // Return placeholder data since analytics endpoints are not available
    return {
      team_id: 'unknown',
      period_start: filters.date_start,
      period_end: filters.date_end,
      total_sessions: 0,
      total_participants: 0,
      total_duration_hours: 0,
      unique_users: 0,
      rooms_created: 0,
      recordings_created: 0,
      average_session_duration: 0,
      peak_concurrent_users: 0
    };
  }

  /**
   * Get team global statistics by current period
   * Note: Analytics endpoints not available - returns placeholder data
   */
  async getTeamGlobalStatisticsCurrent(): Promise<TeamStatistics> {
    logger.info('Fetching team global statistics for current period');
    logger.warn('Team statistics endpoint not available in Digital Samba API - returning placeholder');
    
    return this.getTeamGlobalStatistics();
  }

  /**
   * Get team statistics for current period
   * Note: Analytics endpoints not available - returns placeholder data
   */
  async getTeamStatisticsCurrent(): Promise<TeamStatistics> {
    logger.info('Fetching team statistics for current period');
    logger.warn('Team statistics endpoint not available in Digital Samba API - returning placeholder');
    
    return this.getTeamGlobalStatistics();
  }

  /**
   * Get room statistics by period
   * Uses existing room APIs and builds analytics from available data
   */
  async getRoomStatistics(roomId: string, filters: AnalyticsFilters = {}): Promise<RoomAnalytics> {
    logger.info('Fetching room statistics', { roomId, filters });
    
    try {
      // Get room details using existing API
      const room = await this.apiClient.getRoom(roomId);
      
      // Get participants for this room to build some analytics
      const participants = await this.getAllRoomParticipants(roomId, filters);
      
      return {
        room_id: room.id,
        room_name: room.name,
        session_count: 1, // Placeholder
        total_participants: participants.length,
        total_duration_minutes: participants.reduce((sum, p) => sum + (p.duration_seconds || 0), 0) / 60,
        average_session_duration: participants.length > 0 ? 
          participants.reduce((sum, p) => sum + (p.duration_seconds || 0), 0) / participants.length / 60 : 0,
        peak_concurrent_participants: participants.length,
        created_date: room.created_at,
        last_activity: participants.length > 0 ? 
          Math.max(...participants.map(p => new Date(p.join_time || 0).getTime())).toString() : undefined
      };
    } catch (error) {
      logger.error('Failed to fetch room statistics', { error, roomId, filters });
      throw error;
    }
  }

  /**
   * Get room statistics by current period
   */
  async getRoomStatisticsCurrent(roomId: string): Promise<RoomAnalytics> {
    logger.info('Fetching room statistics for current period', { roomId });
    return this.getRoomStatistics(roomId);
  }

  /**
   * Get room analytics (comprehensive room data)
   * Uses existing room APIs to build analytics
   */
  async getRoomAnalytics(roomId?: string, filters: AnalyticsFilters = {}): Promise<RoomAnalytics[]> {
    logger.info('Fetching room analytics', { roomId, filters });
    
    try {
      if (roomId) {
        const analytics = await this.getRoomStatistics(roomId, filters);
        return [analytics];
      } else {
        // Get all rooms and build analytics for each
        const rooms = await this.apiClient.listRooms();
        const analytics: RoomAnalytics[] = [];
        
        for (const room of rooms.data) {
          try {
            const roomAnalytics = await this.getRoomStatistics(room.id, filters);
            analytics.push(roomAnalytics);
          } catch (error) {
            logger.warn('Failed to get analytics for room', { roomId: room.id, error });
            // Continue with other rooms
          }
        }
        
        return analytics;
      }
    } catch (error) {
      logger.error('Failed to fetch room analytics', { error, roomId, filters });
      throw error;
    }
  }

  /**
   * Get usage statistics (comprehensive usage data)
   * Note: Analytics endpoints not available - returns placeholder data
   */
  async getUsageStatistics(filters: AnalyticsFilters = {}): Promise<UsageStatistics> {
    logger.info('Fetching usage statistics', { filters });
    logger.warn('Usage statistics endpoint not available in Digital Samba API - returning placeholder');
    
    const current = await this.getTeamGlobalStatistics(filters);
    
    return {
      current_period: current,
      previous_period: current,
      growth_metrics: {
        sessions_growth: 0,
        participants_growth: 0,
        duration_growth: 0
      }
    };
  }
}

export default AnalyticsResource;