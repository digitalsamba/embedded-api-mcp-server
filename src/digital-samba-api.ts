/**
 * Digital Samba API Client
 * 
 * A comprehensive client for the Digital Samba API.
 * Updated to use the ApiKeyContext for authorization.
 */
import apiKeyContext from './auth.js';
import logger from './logger.js';

// Base interfaces
export interface PaginationParams {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  after?: string;
}

export interface DateRangeParams {
  date_start?: string; // Format: 'YYYY-MM-DD'
  date_end?: string; // Format: 'YYYY-MM-DD'
}

export interface ApiResponse<T> {
  data: T[];
  total_count: string | number;
  // Add these properties for compatibility
  length: number;
  map: <U>(callback: (value: T, index: number, array: T[]) => U) => U[];
}

// Room related interfaces
export interface Room {
  id: string;
  description?: string;
  topic?: string;
  friendly_url?: string;
  privacy: 'public' | 'private';
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
  toolbar_position?: 'left' | 'right' | 'bottom';
  toolbar_color?: string;
  primary_color?: string;
  background_color?: string;
  palette_mode?: 'light' | 'dark';
  language?: string;
  language_selection_enabled?: boolean;
  
  // Meeting features
  audio_on_join_enabled?: boolean;
  video_on_join_enabled?: boolean;
  screenshare_enabled?: boolean;
  participants_list_enabled?: boolean;
  chat_enabled?: boolean;
  private_chat_enabled?: boolean;
  recordings_enabled?: boolean;
  
  // Breakout room fields
  is_breakout?: boolean;
  parent_id?: string;
  
  [key: string]: any; // For additional properties
}

export interface RoomCreateSettings {
  name: string;  // Required field
  description?: string;
  friendly_url?: string;
  privacy?: 'public' | 'private';
  external_id?: string;
  max_participants?: number;
  max_broadcasters?: number;
  is_locked?: boolean;
  roles?: string[];
  default_role?: string;
  
  // Settings
  topbar_enabled?: boolean;
  toolbar_enabled?: boolean;
  toolbar_position?: 'left' | 'right' | 'bottom';
  toolbar_color?: string;
  primary_color?: string;
  background_color?: string;
  palette_mode?: 'light' | 'dark';
  language?: string;
  language_selection_enabled?: boolean;
  
  // Meeting features
  audio_on_join_enabled?: boolean;
  video_on_join_enabled?: boolean;
  screenshare_enabled?: boolean;
  participants_list_enabled?: boolean;
  chat_enabled?: boolean;
  private_chat_enabled?: boolean;
  recordings_enabled?: boolean;
  
  [key: string]: any; // For additional parameters
}

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
  ud?: string;        // External user identifier
  u?: string;         // User name
  role?: string;      // User role
  initials?: string;  // User initials
  avatar?: string;    // Avatar URL
  breakoutId?: string; // Breakout room ID
  nbf?: string;       // Not before date time
  exp?: string;       // Token expiration in minutes
}

export interface TokenResponse {
  token: string;
  link: string;
}

// Recording related interfaces
export interface Recording {
  id: string;
  name?: string;
  status: 'AWAITING_START' | 'IN_PROGRESS' | 'PENDING_CONVERSION' | 'READY';
  room_id: string;
  external_room_id?: string;
  friendly_url?: string;
  privacy?: 'public' | 'private';
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

// Webhook related interfaces
export interface Webhook {
  id: string;
  endpoint: string;
  authorization_header?: string;
  name?: string;
  events?: string[];
  created_at: string;
  updated_at: string;
}

export interface WebhookCreateSettings {
  endpoint: string;
  name?: string;
  authorization_header?: string;
  events: string[];
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
  distribution_method?: 'random' | 'manual';
}

export interface BreakoutRoomParticipantAssignment {
  participant_id: string;
  breakout_id: string | null;
}

// Poll related interfaces
export interface Poll {
  id: string;
  question: string;
  status: string;
  multiple: boolean;
  anonymous: boolean;
  options: PollOption[];
  created_at: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollCreateSettings {
  question: string;
  multiple?: boolean;
  anonymous?: boolean;
  options: { text: string }[];
}

// Role and permission interfaces
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  default: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Record<string, any>;
}

export interface RoleCreateSettings {
  name: string;
  display_name: string;
  description?: string;
  permissions: Record<string, any>;
}

// Library related interfaces
export interface Library {
  id: string;
  external_id?: string;
  name: string;
  created_at: string;
}

export interface LibraryFolder {
  id: string;
  external_id?: string;
  description?: string;
  created_at: string;
}

export interface LibraryFile {
  id: string;
  folder_id?: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
}

/**
 * Digital Samba API Client
 */
export class DigitalSambaApiClient {
  private apiBaseUrl: string;
  
  constructor(apiKey?: string, apiBaseUrl: string = 'https://api.digitalsamba.com/api/v1') {
    // Store the API key in ApiKeyContext if provided
    if (apiKey) {
      // For direct usage outside of MCP context
      this._apiKey = apiKey;
    }
    this.apiBaseUrl = apiBaseUrl;
  }
  
  // Private field for storing API key when used outside MCP context
  private _apiKey?: string;
  
  /**
   * Get the API key from context or direct value
   */
  private getApiKey(): string {
    // Try to get API key from context first
    const contextApiKey = apiKeyContext.getCurrentApiKey();
    if (contextApiKey) {
      return contextApiKey;
    }
    
    // Fall back to direct API key if set
    if (this._apiKey) {
      return this._apiKey;
    }
    
    // No API key available
    throw new Error('No API key found in context or provided directly. Please include an Authorization header with a Bearer token.');
  }
  
  /**
   * Make an authenticated request to the Digital Samba API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    try {
      const apiKey = this.getApiKey();
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Log the request details (excluding sensitive info)
      logger.debug(`Making API request to: ${url}`, {
        method: options.method || 'GET',
        headers: { ...headers, Authorization: '[REDACTED]' }
      });
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Log response details
      logger.debug(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API Error Response: ${errorText}`);
        throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
      }
      
      // Return empty object for 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }
      
      const responseData = await response.json();
      
      // Add array-like properties to ApiResponse objects
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // Add length property
        responseData.length = responseData.data.length;
        
        // Add map function that forwards to the data array
        responseData.map = function<U>(callback: (value: any, index: number, array: any[]) => U): U[] {
          return this.data.map(callback);
        };
      }
      
      return responseData;
    } catch (error) {
      logger.error('Error in API request', {
        url,
        method: options.method || 'GET',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // Default Room Settings
  
  /**
   * Get default room settings
   */
  async getDefaultRoomSettings(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('');
  }
  
  /**
   * Update default room settings
   */
  async updateDefaultRoomSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  // Rooms
  
  /**
   * List all rooms
   */
  async listRooms(params?: PaginationParams): Promise<ApiResponse<Room>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Room>>(`/rooms${query}`);
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
    // Make sure name is defined (it's required by the API)
    const roomSettings = {
      ...settings,
      name: settings.name || 'New Meeting Room'
    };

    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomSettings)
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
  async deleteRoom(roomId: string, options?: { delete_resources?: boolean }): Promise<void> {
    await this.request<void>(`/rooms/${roomId}`, {
      method: 'DELETE',
      body: options ? JSON.stringify(options) : undefined
    });
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
  
  /**
   * Delete all resources for a room
   */
  async deleteRoomResources(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/resources`, {
      method: 'DELETE'
    });
  }
  
  // Live Participants
  
  /**
   * Get rooms with live participants count
   */
  async getLiveRooms(params?: PaginationParams): Promise<ApiResponse<{
    id: string;
    external_id?: string;
    start_time: string;
    session_duration: number;
    live_participants: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      id: string;
      external_id?: string;
      start_time: string;
      session_duration: number;
      live_participants: number;
    }>>(`/rooms/live${query}`);
  }
  
  /**
   * Get rooms with live participants data
   */
  async getLiveRoomsWithParticipants(params?: PaginationParams): Promise<ApiResponse<{
    id: string;
    external_id?: string;
    start_time: string;
    session_duration: number;
    live_participants: {
      id: string;
      external_id?: string;
      name: string;
      role: string;
      join_time: string;
    }[];
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      id: string;
      external_id?: string;
      start_time: string;
      session_duration: number;
      live_participants: {
        id: string;
        external_id?: string;
        name: string;
        role: string;
        join_time: string;
      }[];
    }>>(`/rooms/live/participants${query}`);
  }
  
  /**
   * Get single room with live participants count
   */
  async getRoomLiveParticipantsCount(roomId: string): Promise<{
    id: string;
    external_id?: string;
    start_time: string;
    session_duration: number;
    live_participants: number;
  }> {
    return this.request<{
      id: string;
      external_id?: string;
      start_time: string;
      session_duration: number;
      live_participants: number;
    }>(`/rooms/${roomId}/live`);
  }
  
  /**
   * Get single room with live participants data
   */
  async getRoomLiveParticipantsData(roomId: string): Promise<{
    id: string;
    external_id?: string;
    start_time: string;
    session_duration: number;
    live_participants: {
      id: string;
      external_id?: string;
      name: string;
      role: string;
      join_time: string;
    }[];
  }> {
    return this.request<{
      id: string;
      external_id?: string;
      start_time: string;
      session_duration: number;
      live_participants: {
        id: string;
        external_id?: string;
        name: string;
        role: string;
        join_time: string;
      }[];
    }>(`/rooms/${roomId}/live/participants`);
  }
  
  // Participants
  
  /**
   * List all participants
   */
  async listParticipants(params?: PaginationParams & DateRangeParams & {
    live?: boolean;
    room_id?: string;
    session_id?: string;
  }): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Participant>>(`/participants${query}`);
  }
  
  /**
   * Get details for a specific participant
   */
  async getParticipant(participantId: string): Promise<ParticipantDetail> {
    return this.request<ParticipantDetail>(`/participants/${participantId}`);
  }
  
  /**
   * List participants in a room
   */
  async listRoomParticipants(roomId: string, params?: PaginationParams & DateRangeParams & {
    live?: boolean;
    session_id?: string;
  }): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Participant>>(`/rooms/${roomId}/participants${query}`);
  }
  
  /**
   * List participants in a session
   */
  async listSessionParticipants(sessionId: string, params?: PaginationParams & DateRangeParams & {
    live?: boolean;
  }): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Participant>>(`/sessions/${sessionId}/participants${query}`);
  }
  
  /**
   * Phone participants joined
   */
  async phoneParticipantsJoined(roomId: string, participants: {
    call_id: string;
    name?: string;
    caller_number?: string;
    external_id?: string;
  }[]): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/phone-participants/joined`, {
      method: 'POST',
      body: JSON.stringify(participants)
    });
  }
  
  /**
   * Phone participants left
   */
  async phoneParticipantsLeft(roomId: string, callIds: string[]): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/phone-participants/left`, {
      method: 'POST',
      body: JSON.stringify(callIds)
    });
  }
  
  // Recordings
  
  /**
   * List all recordings
   */
  async listRecordings(params?: PaginationParams & {
    room_id?: string;
    session_id?: string;
    status?: 'IN_PROGRESS' | 'PENDING_CONVERSION' | 'READY';
  }): Promise<ApiResponse<Recording>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Recording>>(`/recordings${query}`);
  }
  
  /**
   * List archived recordings
   */
  async listArchivedRecordings(params?: PaginationParams & {
    room_id?: string;
  }): Promise<ApiResponse<Recording>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Recording>>(`/recordings/archived${query}`);
  }
  
  /**
   * Get a specific recording
   */
  async getRecording(recordingId: string): Promise<Recording> {
    return this.request<Recording>(`/recordings/${recordingId}`);
  }
  
  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    await this.request<void>(`/recordings/${recordingId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Get a download link for a recording
   */
  async getRecordingDownloadLink(recordingId: string, validForMinutes?: number): Promise<RecordingDownloadLink> {
    const queryParams = new URLSearchParams();
    if (validForMinutes !== undefined) {
      queryParams.append('valid_for_minutes', String(validForMinutes));
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<RecordingDownloadLink>(`/recordings/${recordingId}/download${query}`);
  }
  
  /**
   * Archive a recording
   */
  async archiveRecording(recordingId: string): Promise<void> {
    await this.request<void>(`/recordings/${recordingId}/archive`, {
      method: 'POST'
    });
  }
  
  /**
   * Unarchive a recording
   */
  async unarchiveRecording(recordingId: string): Promise<void> {
    await this.request<void>(`/recordings/${recordingId}/unarchive`, {
      method: 'POST'
    });
  }
  
  /**
   * Start recording in a room
   */
  async startRecording(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/recordings/start`, {
      method: 'POST'
    });
  }
  
  /**
   * Stop recording in a room
   */
  async stopRecording(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/recordings/stop`, {
      method: 'POST'
    });
  }
  
  // Webhooks
  
  /**
   * List available event types for webhooks
   */
  async listWebhookEvents(): Promise<string[]> {
    return this.request<string[]>('/events');
  }
  
  /**
   * List all webhooks
   */
  async listWebhooks(params?: PaginationParams): Promise<ApiResponse<Webhook>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Webhook>>(`/webhooks${query}`);
  }
  
  /**
   * Create a new webhook
   */
  async createWebhook(settings: WebhookCreateSettings): Promise<Webhook> {
    return this.request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific webhook
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${webhookId}`);
  }
  
  /**
   * Update a webhook
   */
  async updateWebhook(webhookId: string, settings: Partial<WebhookCreateSettings>): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${webhookId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    });
  }
  
  // Roles and Permissions
  
  /**
   * List all roles
   */
  async listRoles(params?: PaginationParams): Promise<ApiResponse<Role>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Role>>(`/roles${query}`);
  }
  
  /**
   * Create a new role
   */
  async createRole(settings: RoleCreateSettings): Promise<Role> {
    return this.request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific role
   */
  async getRole(roleId: string): Promise<Role> {
    return this.request<Role>(`/roles/${roleId}`);
  }
  
  /**
   * Update a role
   */
  async updateRole(roleId: string, settings: Partial<RoleCreateSettings>): Promise<Role> {
    return this.request<Role>(`/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    await this.request<void>(`/roles/${roleId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * List all available permissions
   */
  async listPermissions(): Promise<string[]> {
    return this.request<string[]>('/permissions');
  }
  
  // Sessions
  
  /**
   * List all sessions
   */
  async listSessions(params?: PaginationParams & DateRangeParams & {
    live?: boolean;
    room_id?: string;
  }): Promise<ApiResponse<Session>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Session>>(`/sessions${query}`);
  }
  
  /**
   * List sessions for a specific room
   */
  async listRoomSessions(roomId: string, params?: PaginationParams & DateRangeParams & {
    live?: boolean;
  }): Promise<ApiResponse<Session>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Session>>(`/rooms/${roomId}/sessions${query}`);
  }
  
  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string, metrics?: string): Promise<SessionStatistics> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append('metrics', metrics);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<SessionStatistics>(`/sessions/${sessionId}${query}`);
  }
  
  /**
   * End a live session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}/end`, {
      method: 'POST'
    });
  }
  
  /**
   * Get session summary
   */
  async getSessionSummary(sessionId: string): Promise<{
    job_id: string;
    status: 'IN_PROGRESS' | 'READY';
    summary: string;
  }> {
    return this.request<{
      job_id: string;
      status: 'IN_PROGRESS' | 'READY';
      summary: string;
    }>(`/sessions/${sessionId}/summary`);
  }
  
  /**
   * Get session transcripts
   */
  async getSessionTranscripts(sessionId: string, params?: PaginationParams): Promise<ApiResponse<{
    participant_id: string;
    participant_name: string;
    transcript: string;
    start_time: string;
    end_time: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      participant_id: string;
      participant_name: string;
      transcript: string;
      start_time: string;
      end_time: string;
    }>>(`/sessions/${sessionId}/transcripts${query}`);
  }
  
  /**
   * Delete session data
   */
  async deleteSessionData(sessionId: string, dataType: 'chat' | 'questions' | 'summaries' | 'transcripts' | 'polls' | 'recordings' | 'resources'): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}/${dataType}`, {
      method: 'DELETE'
    });
  }
  
  // Chat and Q&A
  
  /**
   * Get chat messages
   */
  async getChatMessages(roomId: string, params?: PaginationParams & {
    session_id?: string;
  }): Promise<ApiResponse<{
    id: string;
    message: string;
    participant_id: string;
    external_participant_id?: string;
    participant_name: string;
    breakout_id?: string;
    created_at: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      id: string;
      message: string;
      participant_id: string;
      external_participant_id?: string;
      participant_name: string;
      breakout_id?: string;
      created_at: string;
    }>>(`/rooms/${roomId}/chat${query}`);
  }
  
  /**
   * Delete chat messages
   */
  async deleteChatMessages(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/chat`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Export chat messages
   */
  async exportChatMessages(roomId: string, options?: {
    session_id?: string;
    format?: 'txt' | 'json';
  }): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const apiKey = this.getApiKey();
    const response = await fetch(`${this.apiBaseUrl}/rooms/${roomId}/chat/export${query}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.text();
  }
  
  /**
   * Get Q&A
   */
  async getQuestionsAndAnswers(roomId: string, params?: PaginationParams & {
    session_id?: string;
  }): Promise<ApiResponse<{
    id: string;
    question: string;
    participant_id: string;
    external_participant_id?: string;
    participant_name: string;
    created_at: string;
    answers: {
      id: string;
      answer: string;
      participant_id: string;
      external_participant_id?: string;
      participant_name: string;
      created_at: string;
    }[];
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      id: string;
      question: string;
      participant_id: string;
      external_participant_id?: string;
      participant_name: string;
      created_at: string;
      answers: {
        id: string;
        answer: string;
        participant_id: string;
        external_participant_id?: string;
        participant_name: string;
        created_at: string;
      }[];
    }>>(`/rooms/${roomId}/questions${query}`);
  }
  
  /**
   * Delete Q&A
   */
  async deleteQA(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/questions`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Export Q&A
   */
  async exportQA(roomId: string, options?: {
    session_id?: string;
    format?: 'txt' | 'json';
  }): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const apiKey = this.getApiKey();
    const response = await fetch(`${this.apiBaseUrl}/rooms/${roomId}/questions/export${query}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.text();
  }
  
  // Polls
  
  /**
   * Get polls
   */
  async getPolls(roomId: string, params?: PaginationParams): Promise<Poll[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Poll[]>(`/rooms/${roomId}/polls${query}`);
  }
  
  /**
   * Create a poll
   */
  async createPoll(roomId: string, settings: PollCreateSettings): Promise<Poll> {
    return this.request<Poll>(`/rooms/${roomId}/polls`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific poll
   */
  async getPoll(roomId: string, pollId: string): Promise<Poll> {
    return this.request<Poll>(`/rooms/${roomId}/polls/${pollId}`);
  }
  
  /**
   * Update a poll
   */
  async updatePoll(roomId: string, pollId: string, settings: Partial<PollCreateSettings>): Promise<Poll> {
    return this.request<Poll>(`/rooms/${roomId}/polls/${pollId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a poll
   */
  async deletePoll(roomId: string, pollId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/polls/${pollId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Get poll results
   */
  async getPollResults(roomId: string, pollId: string, sessionId?: string): Promise<{
    id: string;
    session_id: string;
    question: string;
    status: string;
    started: string;
    ended?: string;
    votes: number;
    options: {
      id: string;
      text: string;
      voted: number;
      voters: {
        id: string;
        name: string;
      }[];
    }[];
  }[]> {
    const queryParams = new URLSearchParams();
    if (sessionId) {
      queryParams.append('session_id', sessionId);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<{
      id: string;
      session_id: string;
      question: string;
      status: string;
      started: string;
      ended?: string;
      votes: number;
      options: {
        id: string;
        text: string;
        voted: number;
        voters: {
          id: string;
          name: string;
        }[];
      }[];
    }[]>(`/rooms/${roomId}/polls/${pollId}/results${query}`);
  }
  
  /**
   * Export polls
   */
  async exportPolls(roomId: string, options?: {
    session_id?: string;
    format?: 'txt' | 'json';
  }): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const apiKey = this.getApiKey();
    const response = await fetch(`${this.apiBaseUrl}/rooms/${roomId}/polls/export${query}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.text();
  }
  
  // Libraries
  
  /**
   * List all libraries
   */
  async listLibraries(params?: PaginationParams): Promise<ApiResponse<Library>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Library>>(`/libraries${query}`);
  }
  
  /**
   * Create a new library
   */
  async createLibrary(settings: {
    name?: string;
    external_id: string;
  }): Promise<Library> {
    return this.request<Library>('/libraries', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific library
   */
  async getLibrary(libraryId: string): Promise<Library> {
    return this.request<Library>(`/libraries/${libraryId}`);
  }
  
  /**
   * Update a library
   */
  async updateLibrary(libraryId: string, settings: {
    name?: string;
    external_id?: string;
  }): Promise<Library> {
    return this.request<Library>(`/libraries/${libraryId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a library
   */
  async deleteLibrary(libraryId: string): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Get library hierarchy
   */
  async getLibraryHierarchy(libraryId: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/libraries/${libraryId}/hierarchy`);
  }
  
  /**
   * List library folders
   */
  async listLibraryFolders(libraryId: string, params?: PaginationParams): Promise<ApiResponse<LibraryFolder>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<LibraryFolder>>(`/libraries/${libraryId}/folders${query}`);
  }
  
  /**
   * Create a library folder
   */
  async createLibraryFolder(libraryId: string, settings: {
    name?: string;
    parent_id?: string;
  }): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(`/libraries/${libraryId}/folders`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific library folder
   */
  async getLibraryFolder(libraryId: string, folderId: string): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(`/libraries/${libraryId}/folders/${folderId}`);
  }
  
  /**
   * Update a library folder
   */
  async updateLibraryFolder(libraryId: string, folderId: string, settings: {
    name?: string;
    parent_id?: string;
  }): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(`/libraries/${libraryId}/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a library folder
   */
  async deleteLibraryFolder(libraryId: string, folderId: string): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}/folders/${folderId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * List library files
   */
  async listLibraryFiles(libraryId: string, params?: PaginationParams): Promise<LibraryFile[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<LibraryFile[]>(`/libraries/${libraryId}/files${query}`);
  }
  
  /**
   * Create a new library file (get upload URL and token)
   */
  async createLibraryFile(libraryId: string, settings: {
    name: string;
    folder_id?: string;
  }): Promise<{
    file_id: string;
    file_name: string;
    external_storage_url: string;
    token: string;
    expiration_timestamp: number;
  }> {
    return this.request<{
      file_id: string;
      file_name: string;
      external_storage_url: string;
      token: string;
      expiration_timestamp: number;
    }>(`/libraries/${libraryId}/files`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Get a specific library file
   */
  async getLibraryFile(libraryId: string, fileId: string): Promise<LibraryFile> {
    return this.request<LibraryFile>(`/libraries/${libraryId}/files/${fileId}`);
  }
  
  /**
   * Update a library file
   */
  async updateLibraryFile(libraryId: string, fileId: string, settings: {
    name?: string;
    folder_id?: string;
  }): Promise<LibraryFile> {
    return this.request<LibraryFile>(`/libraries/${libraryId}/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a library file
   */
  async deleteLibraryFile(libraryId: string, fileId: string): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}/files/${fileId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Get file links
   */
  async getFileLinks(libraryId: string, fileId: string): Promise<{
    pages: {
      url: string;
      thumbnail_url: string;
    }[];
  }> {
    return this.request<{
      pages: {
        url: string;
        thumbnail_url: string;
      }[];
    }>(`/libraries/${libraryId}/files/${fileId}/links`);
  }
  
  // Moderation
  
  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/participants/${participantId}/remove`, {
      method: 'POST'
    });
  }
  
  /**
   * Set participant mute status
   */
  async setParticipantMute(roomId: string, participantId: string, options: {
    mute: boolean;
    type?: 'audio' | 'video' | 'all';
  }): Promise<void> {
    const { mute, type = 'all' } = options;
    
    await this.request<void>(`/rooms/${roomId}/participants/${participantId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ mute, type })
    });
  }
  
  /**
   * Set participant role
   */
  async setParticipantRole(roomId: string, participantId: string, role: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/participants/${participantId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });
  }
  
  /**
   * Ban a participant from a room
   */
  async banParticipant(roomId: string, participantId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/participants/${participantId}/ban`, {
      method: 'POST'
    });
  }
  
  /**
   * Unban a participant from a room
   */
  async unbanParticipant(roomId: string, participantId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/participants/${participantId}/unban`, {
      method: 'POST'
    });
  }
  
  /**
   * Get banned participants
   */
  async getBannedParticipants(roomId: string): Promise<ApiResponse<{
    id: string;
    external_id?: string;
    name: string;
    ban_time: string;
  }>> {
    return this.request<ApiResponse<{
      id: string;
      external_id?: string;
      name: string;
      ban_time: string;
    }>>(`/rooms/${roomId}/banned-participants`);
  }
  
  // Statistics
  
  /**
   * Get team global statistics by period
   */
  async getTeamStatistics(params?: DateRangeParams & {
    metrics?: string;
  }): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Record<string, any>>(`/statistics${query}`);
  }
  
  /**
   * Get team global statistics by current period
   */
  async getTeamCurrentStatistics(metrics?: string): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append('metrics', metrics);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Record<string, any>>(`/statistics/team/current${query}`);
  }
  
  /**
   * Get team statistics for current period (simplified)
   */
  async getSimplifiedTeamCurrentStatistics(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/statistics/current');
  }
  
  /**
   * Get room statistics by period
   */
  async getRoomStatistics(roomId: string, params?: DateRangeParams & {
    metrics?: string;
  }): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Record<string, any>>(`/rooms/${roomId}/statistics${query}`);
  }
  
  /**
   * Get room statistics for current period
   */
  async getRoomCurrentStatistics(roomId: string, metrics?: string): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append('metrics', metrics);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Record<string, any>>(`/rooms/${roomId}/statistics/current${query}`);
  }
  
  /**
   * Get participant statistics
   */
  async getParticipantStatistics(participantId: string): Promise<ParticipantDetail> {
    return this.request<ParticipantDetail>(`/participants/${participantId}/statistics`);
  }
  
  // Transcripts
  
  /**
   * Start transcription
   */
  async startTranscription(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcription/start`, {
      method: 'POST'
    });
  }
  
  /**
   * Stop transcription
   */
  async stopTranscription(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcription/stop`, {
      method: 'POST'
    });
  }
  
  /**
   * Get room transcripts
   */
  async getRoomTranscripts(roomId: string, params?: PaginationParams & {
    session_id?: string;
  }): Promise<ApiResponse<{
    participant_id: string;
    participant_name: string;
    transcript: string;
    start_time: string;
    end_time: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<{
      participant_id: string;
      participant_name: string;
      transcript: string;
      start_time: string;
      end_time: string;
    }>>(`/rooms/${roomId}/transcripts${query}`);
  }
  
  /**
   * Delete room transcripts
   */
  async deleteRoomTranscripts(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcripts`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Export room transcripts
   */
  async exportRoomTranscripts(roomId: string, format?: 'txt' | 'json'): Promise<string> {
    const queryParams = new URLSearchParams();
    if (format) {
      queryParams.append('format', format);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const apiKey = this.getApiKey();
    const response = await fetch(`${this.apiBaseUrl}/rooms/${roomId}/transcripts/export${query}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.text();
  }
  
  /**
   * Export session transcripts
   */
  async exportSessionTranscripts(sessionId: string, format?: 'txt' | 'json'): Promise<string> {
    const queryParams = new URLSearchParams();
    if (format) {
      queryParams.append('format', format);
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const apiKey = this.getApiKey();
    const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}/transcripts/export${query}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digital Samba API error (${response.status}): ${errorText}`);
    }
    
    return response.text();
  }
  
  // Breakout Rooms
  
  /**
   * List breakout rooms for a parent room
   */
  async listBreakoutRooms(roomId: string, params?: PaginationParams): Promise<ApiResponse<BreakoutRoom>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<BreakoutRoom>>(`/rooms/${roomId}/breakout-rooms${query}`);
  }
  
  /**
   * Get a specific breakout room
   */
  async getBreakoutRoom(roomId: string, breakoutRoomId: string): Promise<BreakoutRoom> {
    return this.request<BreakoutRoom>(`/rooms/${roomId}/breakout-rooms/${breakoutRoomId}`);
  }
  
  /**
   * Create breakout rooms
   */
  async createBreakoutRooms(roomId: string, settings: BreakoutRoomCreateSettings): Promise<ApiResponse<BreakoutRoom>> {
    return this.request<ApiResponse<BreakoutRoom>>(`/rooms/${roomId}/breakout-rooms`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
  
  /**
   * Delete a breakout room
   */
  async deleteBreakoutRoom(roomId: string, breakoutRoomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/${breakoutRoomId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Delete all breakout rooms
   */
  async deleteAllBreakoutRooms(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms`, {
      method: 'DELETE'
    });
  }
  
  /**
   * List participants in a breakout room
   */
  async listBreakoutRoomParticipants(roomId: string, breakoutRoomId: string, params?: PaginationParams): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<ApiResponse<Participant>>(`/rooms/${roomId}/breakout-rooms/${breakoutRoomId}/participants${query}`);
  }
  
  /**
   * Assign participants to breakout rooms
   */
  async assignParticipantsToBreakoutRooms(roomId: string, assignments: BreakoutRoomParticipantAssignment[]): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/assignments`, {
      method: 'POST',
      body: JSON.stringify(assignments)
    });
  }
  
  /**
   * Return all participants to the main room
   */
  async returnAllParticipantsToMainRoom(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/return-all`, {
      method: 'POST'
    });
  }
  
  /**
   * Broadcast message to all breakout rooms
   */
  async broadcastToBreakoutRooms(roomId: string, options: { message: string }): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/broadcast`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }
  
  /**
   * Open breakout rooms (start breakout sessions)
   */
  async openBreakoutRooms(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/open`, {
      method: 'POST'
    });
  }
  
  /**
   * Close breakout rooms
   */
  async closeBreakoutRooms(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/close`, {
      method: 'POST'
    });
  }
}