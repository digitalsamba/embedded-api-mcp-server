/**
 * Digital Samba API Client with Circuit Breaker Integration
 * 
 * This module extends the core DigitalSambaApiClient with circuit breaker pattern
 * integration for improved fault tolerance and resilience.
 * 
 * Key features:
 * - Automatic protection of all API requests with circuit breakers
 * - Per-endpoint circuit isolation to prevent cascading failures
 * - Configurable fallback mechanisms for when circuits are open
 * - Metrics integration for circuit state and event monitoring
 * 
 * @module digital-samba-api-circuit-breaker
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Local modules
import { 
  DigitalSambaApiClient, 
  ApiResponse, 
  PaginationParams, 
  DateRangeParams,
  Room,
  RoomCreateSettings,
  TokenOptions,
  TokenResponse,
  Recording,
  RecordingDownloadLink,
  Participant,
  ParticipantDetail,
  Session,
  SessionStatistics,
  Webhook,
  WebhookCreateSettings,
  BreakoutRoom,
  BreakoutRoomCreateSettings,
  BreakoutRoomParticipantAssignment,
  ScheduledMeeting,
  MeetingCreateSettings,
  MeetingUpdateSettings,
  MeetingParticipantAddOptions,
  MeetingParticipantRemoveOptions,
  MeetingReminderOptions,
  MeetingAvailabilityOptions,
  AvailableTimeSlot,
  Poll,
  PollCreateSettings,
  Role,
  RoleCreateSettings,
  Library,
  LibraryFolder,
  LibraryFile
} from './digital-samba-api.js';
import { MemoryCache } from './cache.js';
import { ApiRequestError, ApiResponseError } from './errors.js';
import logger from './logger.js';
import { CircuitBreaker, circuitBreakerRegistry, CircuitBreakerOptions } from './circuit-breaker.js';

/**
 * Default circuit breaker options
 */
const DEFAULT_CIRCUIT_OPTIONS: Partial<CircuitBreakerOptions> = {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  requestTimeout: 10000, // 10 seconds
  isFailure: (error: unknown) => {
    // Only count server errors (5xx) and network errors as circuit failures
    if (error instanceof ApiResponseError) {
      return error.details?.statusCode >= 500;
    }
    
    if (error instanceof ApiRequestError) {
      return true; // Network errors break the circuit
    }
    
    return false; // Other errors (validation, not found, etc.) don't break the circuit
  }
};

/**
 * Circuit breaker wrapper for the Digital Samba API client
 */
export class CircuitBreakerApiClient {
  private apiClient: DigitalSambaApiClient;
  private circuitPrefix: string;
  private defaultOptions: Partial<CircuitBreakerOptions>;
  
  /**
   * Creates a circuit breaker wrapper for the Digital Samba API client
   * 
   * @param apiClient The Digital Samba API client to wrap
   * @param circuitPrefix Prefix for circuit breaker names (default: 'api')
   * @param defaultOptions Default options for all circuit breakers
   */
  constructor(
    apiClient: DigitalSambaApiClient,
    circuitPrefix = 'api',
    defaultOptions: Partial<CircuitBreakerOptions> = {}
  ) {
    this.apiClient = apiClient;
    this.circuitPrefix = circuitPrefix;
    this.defaultOptions = { ...DEFAULT_CIRCUIT_OPTIONS, ...defaultOptions };
    
    logger.debug('Created Circuit Breaker API Client', {
      circuitPrefix,
      defaultOptions: this.defaultOptions
    });
  }
  
  /**
   * Create a circuit breaker for a specific API endpoint
   * 
   * @param endpoint The API endpoint name
   * @param options Additional circuit breaker options
   * @returns A circuit breaker instance
   */
  protected createCircuitBreaker(endpoint: string, options: Partial<CircuitBreakerOptions> = {}): CircuitBreaker {
    const name = `${this.circuitPrefix}.${endpoint}`;
    
    return circuitBreakerRegistry.getOrCreate({
      name,
      ...this.defaultOptions,
      ...options
    });
  }
  
  /**
   * Get default room settings
   */
  async getDefaultRoomSettings(): Promise<Record<string, any>> {
    const circuit = this.createCircuitBreaker('getDefaultRoomSettings');
    return circuit.exec(() => this.apiClient.getDefaultRoomSettings());
  }
  
  /**
   * Update default room settings
   */
  async updateDefaultRoomSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    const circuit = this.createCircuitBreaker('updateDefaultRoomSettings');
    return circuit.exec(() => this.apiClient.updateDefaultRoomSettings(settings));
  }
  
  // Rooms
  
  /**
   * List all rooms
   */
  async listRooms(params?: PaginationParams): Promise<ApiResponse<Room>> {
    const circuit = this.createCircuitBreaker('listRooms', {
      // Example of a fallback for this specific endpoint
      fallback: async () => ({
        data: [],
        total_count: 0,
        length: 0,
        map: () => []
      })
    });
    
    return circuit.exec(() => this.apiClient.listRooms(params));
  }
  
  /**
   * Get details for a specific room
   */
  async getRoom(roomId: string): Promise<Room> {
    const circuit = this.createCircuitBreaker('getRoom');
    return circuit.exec(() => this.apiClient.getRoom(roomId));
  }
  
  /**
   * Create a new room
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    const circuit = this.createCircuitBreaker('createRoom');
    return circuit.exec(() => this.apiClient.createRoom(settings));
  }
  
  /**
   * Update an existing room
   */
  async updateRoom(roomId: string, settings: Partial<RoomCreateSettings>): Promise<Room> {
    const circuit = this.createCircuitBreaker('updateRoom');
    return circuit.exec(() => this.apiClient.updateRoom(roomId, settings));
  }
  
  /**
   * Delete a room
   */
  async deleteRoom(roomId: string, options?: { delete_resources?: boolean }): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteRoom');
    return circuit.exec(() => this.apiClient.deleteRoom(roomId, options));
  }
  
  /**
   * Generate a token for joining a room
   */
  async generateRoomToken(roomId: string, options: TokenOptions): Promise<TokenResponse> {
    const circuit = this.createCircuitBreaker('generateRoomToken');
    return circuit.exec(() => this.apiClient.generateRoomToken(roomId, options));
  }
  
  /**
   * Delete all resources for a room
   */
  async deleteRoomResources(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteRoomResources');
    return circuit.exec(() => this.apiClient.deleteRoomResources(roomId));
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
    const circuit = this.createCircuitBreaker('getLiveRooms');
    return circuit.exec(() => this.apiClient.getLiveRooms(params));
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
    const circuit = this.createCircuitBreaker('getLiveRoomsWithParticipants');
    return circuit.exec(() => this.apiClient.getLiveRoomsWithParticipants(params));
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
    const circuit = this.createCircuitBreaker('getRoomLiveParticipantsCount');
    return circuit.exec(() => this.apiClient.getRoomLiveParticipantsCount(roomId));
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
    const circuit = this.createCircuitBreaker('getRoomLiveParticipantsData');
    return circuit.exec(() => this.apiClient.getRoomLiveParticipantsData(roomId));
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
    const circuit = this.createCircuitBreaker('listParticipants');
    return circuit.exec(() => this.apiClient.listParticipants(params));
  }
  
  /**
   * Get details for a specific participant
   */
  async getParticipant(participantId: string): Promise<ParticipantDetail> {
    const circuit = this.createCircuitBreaker('getParticipant');
    return circuit.exec(() => this.apiClient.getParticipant(participantId));
  }
  
  /**
   * List participants in a room
   */
  async listRoomParticipants(roomId: string, params?: PaginationParams & DateRangeParams & {
    live?: boolean;
    session_id?: string;
  }): Promise<ApiResponse<Participant>> {
    const circuit = this.createCircuitBreaker('listRoomParticipants');
    return circuit.exec(() => this.apiClient.listRoomParticipants(roomId, params));
  }
  
  /**
   * List participants in a session
   */
  async listSessionParticipants(sessionId: string, params?: PaginationParams & DateRangeParams & {
    live?: boolean;
  }): Promise<ApiResponse<Participant>> {
    const circuit = this.createCircuitBreaker('listSessionParticipants');
    return circuit.exec(() => this.apiClient.listSessionParticipants(sessionId, params));
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
    const circuit = this.createCircuitBreaker('phoneParticipantsJoined');
    return circuit.exec(() => this.apiClient.phoneParticipantsJoined(roomId, participants));
  }
  
  /**
   * Phone participants left
   */
  async phoneParticipantsLeft(roomId: string, callIds: string[]): Promise<void> {
    const circuit = this.createCircuitBreaker('phoneParticipantsLeft');
    return circuit.exec(() => this.apiClient.phoneParticipantsLeft(roomId, callIds));
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
    const circuit = this.createCircuitBreaker('listRecordings');
    return circuit.exec(() => this.apiClient.listRecordings(params));
  }
  
  /**
   * List archived recordings
   */
  async listArchivedRecordings(params?: PaginationParams & {
    room_id?: string;
  }): Promise<ApiResponse<Recording>> {
    const circuit = this.createCircuitBreaker('listArchivedRecordings');
    return circuit.exec(() => this.apiClient.listArchivedRecordings(params));
  }
  
  /**
   * Get a specific recording
   */
  async getRecording(recordingId: string): Promise<Recording> {
    const circuit = this.createCircuitBreaker('getRecording');
    return circuit.exec(() => this.apiClient.getRecording(recordingId));
  }
  
  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteRecording');
    return circuit.exec(() => this.apiClient.deleteRecording(recordingId));
  }
  
  /**
   * Get a download link for a recording
   */
  async getRecordingDownloadLink(recordingId: string, validForMinutes?: number): Promise<RecordingDownloadLink> {
    const circuit = this.createCircuitBreaker('getRecordingDownloadLink');
    return circuit.exec(() => this.apiClient.getRecordingDownloadLink(recordingId, validForMinutes));
  }
  
  /**
   * Archive a recording
   */
  async archiveRecording(recordingId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('archiveRecording');
    return circuit.exec(() => this.apiClient.archiveRecording(recordingId));
  }
  
  /**
   * Unarchive a recording
   */
  async unarchiveRecording(recordingId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('unarchiveRecording');
    return circuit.exec(() => this.apiClient.unarchiveRecording(recordingId));
  }
  
  /**
   * Start recording in a room
   */
  async startRecording(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('startRecording');
    return circuit.exec(() => this.apiClient.startRecording(roomId));
  }
  
  /**
   * Stop recording in a room
   */
  async stopRecording(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('stopRecording');
    return circuit.exec(() => this.apiClient.stopRecording(roomId));
  }
  
  // Webhooks
  
  /**
   * List available event types for webhooks
   */
  async listWebhookEvents(): Promise<string[]> {
    const circuit = this.createCircuitBreaker('listWebhookEvents');
    return circuit.exec(() => this.apiClient.listWebhookEvents());
  }
  
  /**
   * List all webhooks
   */
  async listWebhooks(params?: PaginationParams): Promise<ApiResponse<Webhook>> {
    const circuit = this.createCircuitBreaker('listWebhooks');
    return circuit.exec(() => this.apiClient.listWebhooks(params));
  }
  
  /**
   * Create a new webhook
   */
  async createWebhook(settings: WebhookCreateSettings): Promise<Webhook> {
    const circuit = this.createCircuitBreaker('createWebhook');
    return circuit.exec(() => this.apiClient.createWebhook(settings));
  }
  
  /**
   * Get a specific webhook
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    const circuit = this.createCircuitBreaker('getWebhook');
    return circuit.exec(() => this.apiClient.getWebhook(webhookId));
  }
  
  /**
   * Update a webhook
   */
  async updateWebhook(webhookId: string, settings: Partial<WebhookCreateSettings>): Promise<Webhook> {
    const circuit = this.createCircuitBreaker('updateWebhook');
    return circuit.exec(() => this.apiClient.updateWebhook(webhookId, settings));
  }
  
  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteWebhook');
    return circuit.exec(() => this.apiClient.deleteWebhook(webhookId));
  }
  
  // Breakout Rooms
  
  /**
   * List breakout rooms for a parent room
   */
  async listBreakoutRooms(roomId: string, params?: PaginationParams): Promise<ApiResponse<BreakoutRoom>> {
    const circuit = this.createCircuitBreaker('listBreakoutRooms');
    return circuit.exec(() => this.apiClient.listBreakoutRooms(roomId, params));
  }
  
  /**
   * Get a specific breakout room
   */
  async getBreakoutRoom(roomId: string, breakoutRoomId: string): Promise<BreakoutRoom> {
    const circuit = this.createCircuitBreaker('getBreakoutRoom');
    return circuit.exec(() => this.apiClient.getBreakoutRoom(roomId, breakoutRoomId));
  }
  
  /**
   * Create breakout rooms
   */
  async createBreakoutRooms(roomId: string, settings: BreakoutRoomCreateSettings): Promise<ApiResponse<BreakoutRoom>> {
    const circuit = this.createCircuitBreaker('createBreakoutRooms');
    return circuit.exec(() => this.apiClient.createBreakoutRooms(roomId, settings));
  }
  
  /**
   * Delete a breakout room
   */
  async deleteBreakoutRoom(roomId: string, breakoutRoomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteBreakoutRoom');
    return circuit.exec(() => this.apiClient.deleteBreakoutRoom(roomId, breakoutRoomId));
  }
  
  /**
   * Delete all breakout rooms
   */
  async deleteAllBreakoutRooms(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteAllBreakoutRooms');
    return circuit.exec(() => this.apiClient.deleteAllBreakoutRooms(roomId));
  }
  
  /**
   * List participants in a breakout room
   */
  async listBreakoutRoomParticipants(roomId: string, breakoutRoomId: string, params?: PaginationParams): Promise<ApiResponse<Participant>> {
    const circuit = this.createCircuitBreaker('listBreakoutRoomParticipants');
    return circuit.exec(() => this.apiClient.listBreakoutRoomParticipants(roomId, breakoutRoomId, params));
  }
  
  /**
   * Assign participants to breakout rooms
   */
  async assignParticipantsToBreakoutRooms(roomId: string, assignments: BreakoutRoomParticipantAssignment[]): Promise<void> {
    const circuit = this.createCircuitBreaker('assignParticipantsToBreakoutRooms');
    return circuit.exec(() => this.apiClient.assignParticipantsToBreakoutRooms(roomId, assignments));
  }
  
  /**
   * Return all participants to the main room
   */
  async returnAllParticipantsToMainRoom(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('returnAllParticipantsToMainRoom');
    return circuit.exec(() => this.apiClient.returnAllParticipantsToMainRoom(roomId));
  }
  
  /**
   * Broadcast message to all breakout rooms
   */
  async broadcastToBreakoutRooms(roomId: string, options: { message: string }): Promise<void> {
    const circuit = this.createCircuitBreaker('broadcastToBreakoutRooms');
    return circuit.exec(() => this.apiClient.broadcastToBreakoutRooms(roomId, options));
  }
  
  /**
   * Open breakout rooms (start breakout sessions)
   */
  async openBreakoutRooms(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('openBreakoutRooms');
    return circuit.exec(() => this.apiClient.openBreakoutRooms(roomId));
  }
  
  /**
   * Close breakout rooms
   */
  async closeBreakoutRooms(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('closeBreakoutRooms');
    return circuit.exec(() => this.apiClient.closeBreakoutRooms(roomId));
  }
  
  // Meeting Scheduling
  
  /**
   * List all scheduled meetings
   */
  async listScheduledMeetings(params?: PaginationParams & DateRangeParams): Promise<ApiResponse<ScheduledMeeting>> {
    const circuit = this.createCircuitBreaker('listScheduledMeetings');
    return circuit.exec(() => this.apiClient.listScheduledMeetings(params));
  }
  
  /**
   * Get a specific scheduled meeting
   */
  async getScheduledMeeting(meetingId: string): Promise<ScheduledMeeting> {
    const circuit = this.createCircuitBreaker('getScheduledMeeting');
    return circuit.exec(() => this.apiClient.getScheduledMeeting(meetingId));
  }
  
  /**
   * Create a new scheduled meeting
   */
  async createScheduledMeeting(settings: MeetingCreateSettings): Promise<ScheduledMeeting> {
    const circuit = this.createCircuitBreaker('createScheduledMeeting');
    return circuit.exec(() => this.apiClient.createScheduledMeeting(settings));
  }
  
  /**
   * Update a scheduled meeting
   */
  async updateScheduledMeeting(meetingId: string, settings: MeetingUpdateSettings): Promise<ScheduledMeeting> {
    const circuit = this.createCircuitBreaker('updateScheduledMeeting');
    return circuit.exec(() => this.apiClient.updateScheduledMeeting(meetingId, settings));
  }
  
  /**
   * Cancel a scheduled meeting
   */
  async cancelScheduledMeeting(meetingId: string, options?: { notify_participants?: boolean }): Promise<void> {
    const circuit = this.createCircuitBreaker('cancelScheduledMeeting');
    return circuit.exec(() => this.apiClient.cancelScheduledMeeting(meetingId, options));
  }
  
  /**
   * Delete a scheduled meeting
   */
  async deleteScheduledMeeting(meetingId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteScheduledMeeting');
    return circuit.exec(() => this.apiClient.deleteScheduledMeeting(meetingId));
  }
  
  /**
   * Add participants to a meeting
   */
  async addMeetingParticipants(meetingId: string, options: MeetingParticipantAddOptions): Promise<void> {
    const circuit = this.createCircuitBreaker('addMeetingParticipants');
    return circuit.exec(() => this.apiClient.addMeetingParticipants(meetingId, options));
  }
  
  /**
   * Remove participants from a meeting
   */
  async removeMeetingParticipants(meetingId: string, options: MeetingParticipantRemoveOptions): Promise<void> {
    const circuit = this.createCircuitBreaker('removeMeetingParticipants');
    return circuit.exec(() => this.apiClient.removeMeetingParticipants(meetingId, options));
  }
  
  /**
   * Send meeting reminders
   */
  async sendMeetingReminders(meetingId: string, options?: MeetingReminderOptions): Promise<void> {
    const circuit = this.createCircuitBreaker('sendMeetingReminders');
    return circuit.exec(() => this.apiClient.sendMeetingReminders(meetingId, options));
  }
  
  /**
   * Find available meeting times
   */
  async findAvailableMeetingTimes(options: MeetingAvailabilityOptions): Promise<AvailableTimeSlot[]> {
    const circuit = this.createCircuitBreaker('findAvailableMeetingTimes');
    return circuit.exec(() => this.apiClient.findAvailableMeetingTimes(options));
  }
  
  // Factory method to create a circuit breaker API client from a standard client
  
  /**
   * Create a circuit breaker API client from a standard Digital Samba API client
   * 
   * @param apiClient The Digital Samba API client to wrap
   * @param options Circuit breaker options
   * @returns A circuit breaker wrapped API client
   */
  static withCircuitBreaker(
    apiClient: DigitalSambaApiClient,
    options: {
      circuitPrefix?: string;
      defaultOptions?: Partial<CircuitBreakerOptions>;
    } = {}
  ): CircuitBreakerApiClient {
    return new CircuitBreakerApiClient(
      apiClient,
      options.circuitPrefix,
      options.defaultOptions
    );
  }
  
  /**
   * Create a new circuit breaker API client with the given API key
   * 
   * @param apiKey API key for Digital Samba API
   * @param apiBaseUrl Base URL for Digital Samba API
   * @param cache Optional cache for API responses
   * @param options Circuit breaker options
   * @returns A circuit breaker API client
   */
  static createWithApiKey(
    apiKey: string,
    apiBaseUrl?: string,
    cache?: MemoryCache,
    options: {
      circuitPrefix?: string;
      defaultOptions?: Partial<CircuitBreakerOptions>;
    } = {}
  ): CircuitBreakerApiClient {
    const apiClient = new DigitalSambaApiClient(apiKey, apiBaseUrl, cache);
    return CircuitBreakerApiClient.withCircuitBreaker(apiClient, options);
  }
}

export default CircuitBreakerApiClient;
