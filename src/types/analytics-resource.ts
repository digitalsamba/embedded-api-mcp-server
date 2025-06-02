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
}