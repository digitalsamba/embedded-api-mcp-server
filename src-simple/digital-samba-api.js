/**
 * Digital Samba API Client
 * 
 * This is a simple client for the Digital Samba API.
 * It provides basic functionality for room and participant management.
 */

export interface Room {
  id: string;
  name: string;
  description?: string;
  friendly_url?: string;
  privacy: 'public' | 'private';
  max_participants?: number;
  created_at: string;
  updated_at: string;
}

export interface RoomCreateSettings {
  name?: string;
  description?: string;
  friendly_url?: string;
  privacy?: 'public' | 'private';
  max_participants?: number;
  roles?: string[];
  default_role?: string;
}

export interface Participant {
  id: string;
  name: string;
  role?: string;
  external_id?: string;
  room_id: string;
  joined_at: string;
}

export interface TokenOptions {
  u?: string;        // User name
  role?: string;     // User role
  ud?: string;       // User data (external ID)
  initials?: string; // User initials
  avatar?: string;   // Avatar URL
  exp?: string;      // Expiration time
}

export interface TokenResponse {
  token: string;
  expires_at: string;
}

export class DigitalSambaApiClient {
  private apiKey: string;
  private apiBaseUrl: string;
  
  constructor(apiKey: string, apiBaseUrl: string = 'https://api.digitalsamba.com/v1') {
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Make an authenticated request to the Digital Samba API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  /**
   * List all rooms
   */
  async listRooms(): Promise<Room[]> {
    return this.request<Room[]>('/rooms');
  }
  
  /**
   * Get details for a specific room
   */
  async getRoom(roomId: string): Promise<Room> {
    return this.request<Room>(`/rooms/${roomId}`);
  }
  
  /**
   * Create a new room
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Update an existing room
   */
  async updateRoom(roomId: string, settings: Partial<RoomCreateSettings>): Promise<Room> {
    return this.request<Room>(`/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a room
   */
  async deleteRoom(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * List participants in a room
   */
  async listParticipants(roomId: string): Promise<Participant[]> {
    return this.request<Participant[]>(`/rooms/${roomId}/participants`);
  }
  
  /**
   * Get details for a specific participant
   */
  async getParticipant(participantId: string): Promise<Participant> {
    return this.request<Participant>(`/participants/${participantId}`);
  }
  
  /**
   * Generate a token for joining a room
   */
  async generateRoomToken(roomId: string, options: TokenOptions): Promise<TokenResponse> {
    return this.request<TokenResponse>(`/rooms/${roomId}/token`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }
}