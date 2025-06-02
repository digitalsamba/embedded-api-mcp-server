/**
 * Analytics Resource Class
 */

export class AnalyticsResource {
  private apiClient: any;

  constructor(apiClient: any) {
    this.apiClient = apiClient;
  }

  async getTeamAnalytics(filters?: any): Promise<any> {
    // Implementation handled by API client - using correct method name
    return this.apiClient.getTeamStatistics(filters);
  }

  // Method overloads for getRoomAnalytics
  async getRoomAnalytics(roomId: string): Promise<any>;
  async getRoomAnalytics(roomId: string, filters: any): Promise<any>;
  async getRoomAnalytics(roomId: string, filters?: any): Promise<any> {
    // Implementation handled by API client - using correct method name
    return this.apiClient.getRoomStatistics(roomId, filters);
  }

  // Method overloads for getSessionAnalytics
  async getSessionAnalytics(sessionId: string): Promise<any>;
  async getSessionAnalytics(sessionId: string, filters: any): Promise<any>;
  async getSessionAnalytics(sessionId: string, filters?: any): Promise<any> {
    // Implementation handled by API client - using correct method name
    return this.apiClient.getSessionStatistics(sessionId, filters);
  }

  async getParticipantAnalytics(participantId?: string): Promise<any> {
    if (participantId) {
      // Get specific participant statistics
      return this.apiClient.getParticipant(participantId);
    } else {
      // Get all participants
      return this.apiClient.listParticipants();
    }
  }

  async getUsageAnalytics(filters?: any): Promise<any> {
    // Get usage statistics - can use team statistics with specific metrics
    if (filters?.current) {
      return this.apiClient.getTeamCurrentStatistics(filters.metrics);
    } else {
      return this.apiClient.getTeamStatistics(filters);
    }
  }

  async getLiveAnalytics(roomId?: string, includeParticipants?: boolean): Promise<any> {
    if (roomId) {
      if (includeParticipants) {
        return this.apiClient.getRoomLiveParticipantsData(roomId);
      } else {
        return this.apiClient.getRoomLiveParticipantsCount(roomId);
      }
    } else {
      if (includeParticipants) {
        return this.apiClient.getLiveRoomsWithParticipants();
      } else {
        return this.apiClient.getLiveRooms();
      }
    }
  }
}