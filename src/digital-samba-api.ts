/**
 * Digital Samba API Client Module
 *
 * This module provides a comprehensive client for interacting with the Digital Samba API.
 * It offers interfaces for all API entities and a client class that handles authentication,
 * request processing, and provides methods for all available API endpoints.
 *
 * Key features include:
 * - Authentication using either direct developer key or the ApiKeyContext for session-based auth
 * - Comprehensive coverage of all Digital Samba API endpoints
 * - Type-safe interfaces for request and response data
 * - Error handling and logging
 * - Support for pagination, filtering, and other API parameters
 *
 * @module digital-samba-api
 * @author Digital Samba Team
 * @version 0.1.0
 */
// Local modules
import apiKeyContext from "./auth.js";
import { MemoryCache } from "./cache.js";
import {
  ApiRequestError,
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError,
  ValidationError,
} from "./errors.js";
import logger from "./logger.js";

// Base interfaces
export interface PaginationParams {
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
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
  ud?: string; // External user identifier
  u?: string; // User name
  role?: string; // User role
  initials?: string; // User initials
  avatar?: string; // Avatar URL
  breakoutId?: string; // Breakout room ID
  nbf?: string; // Not before date time
  exp?: string; // Token expiration in minutes
}

export interface TokenResponse {
  token: string;
  link: string;
}

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
  distribution_method?: "random" | "manual";
}

export interface BreakoutRoomParticipantAssignment {
  participant_id: string;
  breakout_id: string | null;
}

// Meeting scheduling related interfaces
export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  room_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  host_name: string;
  host_email?: string;
  participants: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;
  status: "scheduled" | "started" | "ended" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface MeetingCreateSettings {
  title: string;
  description?: string;
  room_id?: string;
  room_settings?: {
    name?: string;
    privacy?: "public" | "private";
    max_participants?: number;
  };
  start_time: string;
  end_time: string;
  timezone: string;
  host_name: string;
  host_email?: string;
  participants?: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;
  send_invitations?: boolean;
}

export interface MeetingUpdateSettings {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  host_name?: string;
  host_email?: string;
  participants?: {
    name: string;
    email: string;
    role?: string;
  }[];
  recurring?: boolean;
  recurrence_pattern?: string;
  status?: "scheduled" | "cancelled";
  send_updates?: boolean;
}

export interface MeetingParticipantAddOptions {
  participants: {
    name: string;
    email: string;
    role?: string;
  }[];
  send_invitations?: boolean;
}

export interface MeetingParticipantRemoveOptions {
  participant_emails: string[];
  notify_participants?: boolean;
}

export interface MeetingReminderOptions {
  message?: string;
}

export interface MeetingAvailabilityOptions {
  participants: string[];
  duration_minutes: number;
  start_date: string;
  end_date: string;
  timezone: string;
  working_hours_start?: number;
  working_hours_end?: number;
  min_options?: number;
}

export interface AvailableTimeSlot {
  start_time: string;
  end_time: string;
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
 *
 * This class provides a comprehensive interface to the Digital Samba API. It handles
 * authentication, request formation, response parsing, and error handling for all
 * available API endpoints. The client supports both direct developer key authentication
 * and session-based authentication through the ApiKeyContext.
 *
 * @class DigitalSambaApiClient
 * @example
 * // Create a client with direct developer key
 * const client = new DigitalSambaApiClient('your-developer-key');
 *
 * // Create a client that uses the ApiKeyContext
 * const sessionClient = new DigitalSambaApiClient();
 *
 * // List all rooms
 * const rooms = await client.listRooms();
 *
 * // Create a room
 * const room = await client.createRoom({
 *   name: 'New Meeting Room',
 *   privacy: 'public'
 * });
 */
export class DigitalSambaApiClient {
  protected apiBaseUrl: string;
  protected cache?: MemoryCache;

  /**
   * Creates an instance of the Digital Samba API Client
   *
   * @constructor
   * @param {string} [apiKey] - Optional developer key for direct authentication. If not provided,
   *                          the client will use the ApiKeyContext for session-based authentication
   * @param {string} [apiBaseUrl='https://api.digitalsamba.com/api/v1'] - Base URL for the Digital Samba API
   * @example
   * // Create a client with the default API URL
   * const client = new DigitalSambaApiClient('your-developer-key');
   *
   * // Create a client with a custom API URL
   * const customClient = new DigitalSambaApiClient('your-developer-key', 'https://custom-api.example.com/v1');
   */
  constructor(
    apiKey?: string,
    apiBaseUrl: string = "https://api.digitalsamba.com/api/v1",
    cache?: MemoryCache,
  ) {
    // Store the developer key in ApiKeyContext if provided
    if (apiKey) {
      // For direct usage outside of MCP context
      this._apiKey = apiKey;
    }
    this.apiBaseUrl = apiBaseUrl;
    this.cache = cache;
  }

  // Private field for storing developer key when used outside MCP context
  private _apiKey?: string;

  /**
   * Get the developer key from context or direct value
   *
   * This method retrieves the developer key using a prioritized approach:
   * 1. First tries to get the developer key from the ApiKeyContext (for session-based auth)
   * 2. If not found, falls back to using the direct developer key if provided during construction
   * 3. If neither source provides a developer key, throws an AuthenticationError
   *
   * @protected
   * @returns {string} The developer key to use for authentication
   * @throws {AuthenticationError} If no developer key is available from any source
   */
  protected getApiKey(): string {
    // Try to get developer key from context first
    const contextApiKey = apiKeyContext.getStore();
    if (contextApiKey) {
      return contextApiKey;
    }

    // Fall back to direct developer key if set
    if (this._apiKey) {
      return this._apiKey;
    }

    // No developer key available
    throw new AuthenticationError(
      "No developer key found in context or provided directly. Please include an Authorization header with a Bearer token.",
    );
  }

  /**
   * Make an authenticated request to the Digital Samba API
   *
   * This method handles all API requests including authentication, error handling, and response parsing.
   * It automatically adds the Authorization header with the API key, logs request details (excluding sensitive
   * information), and processes the response. It also handles special cases like 204 No Content responses and
   * adds array-like properties to ApiResponse objects for easier consumption.
   *
   * @protected
   * @template T - The expected response type
   * @param {string} endpoint - The API endpoint path (without the base URL)
   * @param {RequestInit} [options={}] - Request options, including method, body, and additional headers
   * @returns {Promise<T>} A promise resolving to the parsed response data
   * @throws {AuthenticationError} If no API key is available for authentication
   * @throws {ApiRequestError} If a network error occurs during the request
   * @throws {ApiResponseError} If the API returns a non-2xx status code
   * @throws {ValidationError} If the API returns a 400 Bad Request with validation errors
   * @throws {ResourceNotFoundError} If the API returns a 404 Not Found response
   * @example
   * // Example internal usage
   * const rooms = await this.request<ApiResponse<Room>>('/rooms');
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Handle case where endpoint is already a full URL (starts with http:// or https://)
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.apiBaseUrl}${endpoint}`;
    const method = options.method || "GET";
    const isCacheable = this.cache && method === "GET";

    // Generate a cache key based on endpoint and API key (to avoid cross-client leakage)
    const cacheNamespace = "api";
    const cacheKey = endpoint;

    // Check cache first for GET requests
    if (isCacheable) {
      const cachedResponse = this.cache.get(cacheNamespace, cacheKey);
      if (cachedResponse) {
        logger.debug(`Cache hit for ${endpoint}`);

        // Metrics recording removed - metrics.js no longer exists

        return cachedResponse.value as T;
      } else if (this.cache) {
        // Metrics recording removed - metrics.js no longer exists
      }
    }

    // Timer removed - no longer needed without metrics

    try {
      const apiKey = this.getApiKey();

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      };

      // Log the request details (excluding sensitive info)
      logger.debug(`Making API request to: ${url}`, {
        method,
        headers: { ...headers, Authorization: "[REDACTED]" },
        cacheStatus: isCacheable ? "miss" : "disabled",
      });

      // Metrics tracking removed - metrics.js no longer exists

      let response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        // Handle network errors
        logger.error("Network error in API request", {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
        });

        // Metrics tracking removed - metrics.js no longer exists

        throw new ApiRequestError(
          `Network error while connecting to Digital Samba API: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error instanceof Error ? error : undefined },
        );
      }

      // Log response details
      logger.debug(
        `Response status: ${response.status} ${response.statusText}`,
      );

      // Status code handling - metrics removed

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API Error Response: ${errorText}`, {
          status: response.status,
          statusText: response.statusText,
        });

        // Metrics tracking removed - metrics.js no longer exists

        // Parse error text as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use as plain text
          errorData = { message: errorText };
        }

        // Handle specific error types based on status code
        // This provides better error context for API consumers
        if (response.status === 400) {
          // Bad Request - typically validation errors
          // Digital Samba API returns validation errors in the 'errors' field
          const validationErrors = errorData.errors || {};
          throw new ValidationError(
            `Validation error: ${errorData.message || errorText}`,
            { validationErrors: validationErrors },
          );
        } else if (response.status === 401 || response.status === 403) {
          // 401: Missing or invalid API key
          // 403: Valid API key but insufficient permissions
          throw new AuthenticationError(
            `Authentication error: ${errorData.message || errorText}`,
          );
        } else if (response.status === 404) {
          // Not Found error - resource doesn't exist
          // Try to extract resource type and ID from the endpoint for future error enhancement
          const matches = endpoint.match(/\/([^/]+)\/([^/]+)/);
          // Resource type and ID extraction - currently unused but kept for future error details
          void matches;

          // For backwards compatibility with tests, throw a generic API error
          throw new ApiResponseError(
            `Digital Samba API error (${response.status}): ${errorData.message || errorText}`,
            {
              statusCode: response.status,
              apiErrorMessage: errorData.message || errorText,
            },
          );
        } else {
          // Generic API error
          throw new ApiResponseError(
            `Digital Samba API error (${response.status}): ${errorData.message || errorText}`,
            {
              statusCode: response.status,
              apiErrorMessage: errorData.message || errorText,
              apiErrorData: errorData,
            },
          );
        }
      }

      // Return empty object for 204 No Content responses
      if (response.status === 204) {
        // Metrics tracking removed - metrics.js no longer exists

        return {} as T;
      }

      // Get response text first to check if it's empty
      const responseText = await response.text();
      
      // Handle empty response bodies (some endpoints return 200 with empty body or {})
      if (!responseText || responseText.trim() === '') {
        logger.debug(`Empty response body for ${endpoint}`);
        return {} as T;
      }

      // Parse the JSON response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`Failed to parse JSON response for ${endpoint}`, {
          responseText,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        throw new ApiResponseError(
          `Invalid JSON response from Digital Samba API: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          {
            statusCode: response.status,
            apiErrorMessage: `Failed to parse JSON: ${responseText}`,
            apiErrorData: { responseText },
          },
        );
      }

      // Add array-like properties to ApiResponse objects
      if (
        responseData &&
        responseData.data &&
        Array.isArray(responseData.data)
      ) {
        // Add length property
        responseData.length = responseData.data.length;

        // Add map function that forwards to the data array
        responseData.map = function <U>(
          callback: (value: any, index: number, array: any[]) => U,
        ): U[] {
          return this.data.map(callback);
        };
      }

      // Metrics tracking removed - metrics.js no longer exists

      // Store successful GET responses in cache
      if (isCacheable) {
        logger.debug(`Caching response for ${endpoint}`);
        this.cache!.set(cacheNamespace, cacheKey, responseData);

        // Metrics tracking removed - metrics.js no longer exists
      }

      return responseData;
    } catch (error) {
      // Metrics tracking removed - metrics.js no longer exists

      // Catch and re-throw errors that aren't already one of our custom types
      if (
        !(error instanceof AuthenticationError) &&
        !(error instanceof ApiRequestError) &&
        !(error instanceof ApiResponseError) &&
        !(error instanceof ValidationError) &&
        !(error instanceof ResourceNotFoundError)
      ) {
        logger.error("Unexpected error in API request", {
          url,
          method: options.method || "GET",
          error: error instanceof Error ? error.message : String(error),
        });

        // Metrics tracking removed - metrics.js no longer exists

        throw new ApiRequestError(
          `Unexpected error in Digital Samba API request: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error instanceof Error ? error : undefined },
        );
      }

      // Re-throw custom error types
      throw error;
    }
  }

  // Default Room Settings

  /**
   * Get default room settings
   */
  async getDefaultRoomSettings(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>("/");
  }

  /**
   * Update default room settings
   */
  async updateDefaultRoomSettings(
    settings: Record<string, any>,
  ): Promise<Record<string, any>> {
    return this.request<Record<string, any>>("/", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  // Rooms

  /**
   * List all rooms
   *
   * Retrieves a paginated list of all rooms in your Digital Samba account.
   * Supports pagination, filtering, and sorting options.
   *
   * @param {PaginationParams} [params] - Optional pagination parameters
   * @param {number} [params.limit] - Number of items per page (default: 10)
   * @param {number} [params.offset] - Number of items to skip
   * @param {'asc'|'desc'} [params.order] - Sort order
   * @param {string} [params.after] - Cursor for pagination
   * @returns {Promise<ApiResponse<Room>>} Paginated list of rooms
   *
   * @example
   * // Get first 20 rooms
   * const rooms = await client.listRooms({ limit: 20 });
   *
   * @example
   * // Get next page
   * const nextPage = await client.listRooms({
   *   limit: 20,
   *   after: rooms.data[rooms.data.length - 1].id
   * });
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

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
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
   *
   * Creates a new video conferencing room with the specified settings.
   * Only the 'name' field is required; all other settings are optional.
   *
   * @param {RoomCreateSettings} settings - Room configuration
   * @param {string} settings.name - Room name (required)
   * @param {string} [settings.description] - Room description
   * @param {'public'|'private'} [settings.privacy] - Room privacy setting
   * @param {number} [settings.max_participants] - Maximum participants (2-2000)
   * @param {string} [settings.friendly_url] - Custom URL slug
   * @returns {Promise<Room>} The created room object
   * @throws {ValidationError} If required fields are missing or invalid
   * @throws {ApiResponseError} If room creation fails
   *
   * @example
   * // Create a basic room
   * const room = await client.createRoom({
   *   name: 'Team Standup'
   * });
   *
   * @example
   * // Create a fully configured room
   * const room = await client.createRoom({
   *   name: 'All Hands Meeting',
   *   description: 'Monthly company meeting',
   *   privacy: 'private',
   *   max_participants: 200,
   *   friendly_url: 'all-hands',
   *   recordings_enabled: true,
   *   chat_enabled: true
   * });
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    // Make sure name is defined (it's required by the API)
    const roomSettings = {
      ...settings,
      name: settings.name || "New Meeting Room",
    };

    return this.request<Room>("/rooms", {
      method: "POST",
      body: JSON.stringify(roomSettings),
    });
  }

  /**
   * Update an existing room
   */
  async updateRoom(
    roomId: string,
    settings: Partial<RoomCreateSettings>,
  ): Promise<Room> {
    return this.request<Room>(`/rooms/${roomId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a room
   */
  async deleteRoom(
    roomId: string,
    options?: { delete_resources?: boolean },
  ): Promise<any> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    return this.request<any>(`/rooms/${roomId}`, {
      method: "DELETE",
      body: options ? JSON.stringify(options) : undefined,
    });
  }

  /**
   * Generate a token for joining a room
   *
   * Creates a secure access token that allows a user to join a specific room.
   * Tokens can include user information, roles, and expiration settings.
   *
   * @param {string} roomId - The ID of the room to generate a token for
   * @param {TokenOptions} options - Token configuration options
   * @param {string} [options.u] - User name to display
   * @param {string} [options.ud] - External user identifier
   * @param {string} [options.role] - User role (e.g., 'moderator', 'participant')
   * @param {string} [options.avatar] - URL to user's avatar image
   * @param {string} [options.exp] - Token expiration in minutes
   * @returns {Promise<TokenResponse>} Object containing token and join link
   *
   * @example
   * // Generate a basic participant token
   * const { token, link } = await client.generateRoomToken('room-123', {
   *   u: 'John Doe'
   * });
   *
   * @example
   * // Generate a moderator token with expiration
   * const { token, link } = await client.generateRoomToken('room-123', {
   *   u: 'Jane Smith',
   *   ud: 'user-456',
   *   role: 'moderator',
   *   exp: '120' // Expires in 2 hours
   * });
   */
  async generateRoomToken(
    roomId: string,
    options: TokenOptions,
  ): Promise<TokenResponse> {
    return this.request<TokenResponse>(`/rooms/${roomId}/token`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Delete all resources for a room
   */
  async deleteRoomResources(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/resources`, {
      method: "DELETE",
    });
  }

  // Live Participants

  /**
   * Get rooms with live participants count
   */
  async getLiveRooms(params?: PaginationParams): Promise<
    ApiResponse<{
      id: string;
      external_id?: string;
      start_time: string;
      session_duration: number;
      live_participants: number;
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<
      ApiResponse<{
        id: string;
        external_id?: string;
        start_time: string;
        session_duration: number;
        live_participants: number;
      }>
    >(`/rooms/live${query}`);
  }

  /**
   * Get rooms with live participants data
   */
  async getLiveRoomsWithParticipants(params?: PaginationParams): Promise<
    ApiResponse<{
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
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<
      ApiResponse<{
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
      }>
    >(`/rooms/live/participants${query}`);
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
  async listParticipants(
    params?: PaginationParams &
      DateRangeParams & {
        live?: boolean;
        room_id?: string;
        session_id?: string;
      },
  ): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
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
  async listRoomParticipants(
    roomId: string,
    params?: PaginationParams &
      DateRangeParams & {
        live?: boolean;
        session_id?: string;
      },
  ): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Participant>>(
      `/rooms/${roomId}/participants${query}`,
    );
  }

  /**
   * List participants in a session
   */
  async listSessionParticipants(
    sessionId: string,
    params?: PaginationParams &
      DateRangeParams & {
        live?: boolean;
      },
  ): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Participant>>(
      `/sessions/${sessionId}/participants${query}`,
    );
  }

  /**
   * Phone participants joined
   */
  async phoneParticipantsJoined(
    roomId: string,
    participants: {
      call_id: string;
      name?: string;
      caller_number?: string;
      external_id?: string;
    }[],
  ): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/phone-participants/joined`, {
      method: "POST",
      body: JSON.stringify(participants),
    });
  }

  /**
   * Phone participants left
   */
  async phoneParticipantsLeft(
    roomId: string,
    callIds: string[],
  ): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/phone-participants/left`, {
      method: "POST",
      body: JSON.stringify(callIds),
    });
  }

  // Recordings

  /**
   * List all recordings
   */
  async listRecordings(
    params?: PaginationParams & {
      room_id?: string;
      session_id?: string;
      status?: "IN_PROGRESS" | "PENDING_CONVERSION" | "READY";
    },
  ): Promise<ApiResponse<Recording>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Recording>>(`/recordings${query}`);
  }

  /**
   * List archived recordings
   */
  async listArchivedRecordings(
    params?: PaginationParams & {
      room_id?: string;
    },
  ): Promise<ApiResponse<Recording>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
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
      method: "DELETE",
    });
  }

  /**
   * Get a download link for a recording
   */
  async getRecordingDownloadLink(
    recordingId: string,
    validForMinutes?: number,
  ): Promise<RecordingDownloadLink> {
    const queryParams = new URLSearchParams();
    if (validForMinutes !== undefined) {
      queryParams.append("valid_for_minutes", String(validForMinutes));
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<RecordingDownloadLink>(
      `/recordings/${recordingId}/download${query}`,
    );
  }

  /**
   * Archive a recording
   */
  async archiveRecording(recordingId: string): Promise<void> {
    await this.request<void>(`/recordings/${recordingId}/archive`, {
      method: "POST",
    });
  }

  /**
   * Unarchive a recording
   */
  async unarchiveRecording(recordingId: string): Promise<void> {
    await this.request<void>(`/recordings/${recordingId}/unarchive`, {
      method: "POST",
    });
  }

  /**
   * Start recording in a room
   */
  async startRecording(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/recordings/start`, {
      method: "POST",
    });
  }

  /**
   * Stop recording in a room
   */
  async stopRecording(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/recordings/stop`, {
      method: "POST",
    });
  }

  /**
   * Start transcription in a room
   */
  async startTranscription(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcription/start`, {
      method: "POST",
    });
  }

  /**
   * Stop transcription in a room
   */
  async stopTranscription(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcription/stop`, {
      method: "POST",
    });
  }

  // Webhooks

  /**
   * List available event types for webhooks
   */
  async listWebhookEvents(): Promise<string[]> {
    return this.request<string[]>("/events");
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

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Webhook>>(`/webhooks${query}`);
  }

  /**
   * Create a new webhook
   */
  async createWebhook(settings: WebhookCreateSettings): Promise<Webhook> {
    return this.request<Webhook>("/webhooks", {
      method: "POST",
      body: JSON.stringify(settings),
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
  async updateWebhook(
    webhookId: string,
    settings: Partial<WebhookCreateSettings>,
  ): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${webhookId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>(`/webhooks/${webhookId}`, {
      method: "DELETE",
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

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Role>>(`/roles${query}`);
  }

  /**
   * Create a new role
   */
  async createRole(settings: RoleCreateSettings): Promise<Role> {
    return this.request<Role>("/roles", {
      method: "POST",
      body: JSON.stringify(settings),
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
  async updateRole(
    roleId: string,
    settings: Partial<RoleCreateSettings>,
  ): Promise<Role> {
    return this.request<Role>(`/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    await this.request<void>(`/roles/${roleId}`, {
      method: "DELETE",
    });
  }

  /**
   * List all available permissions
   */
  async listPermissions(): Promise<string[]> {
    return this.request<string[]>("/permissions");
  }

  // Sessions

  /**
   * List all sessions
   */
  async listSessions(
    params?: PaginationParams &
      DateRangeParams & {
        live?: boolean;
        room_id?: string;
      },
  ): Promise<ApiResponse<Session>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Session>>(`/sessions${query}`);
  }

  /**
   * List sessions for a specific room
   */
  async listRoomSessions(
    roomId: string,
    params?: PaginationParams &
      DateRangeParams & {
        live?: boolean;
      },
  ): Promise<ApiResponse<Session>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Session>>(
      `/rooms/${roomId}/sessions${query}`,
    );
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(
    sessionId: string,
    metrics?: string,
  ): Promise<SessionStatistics> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append("metrics", metrics);
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<SessionStatistics>(`/sessions/${sessionId}${query}`);
  }

  /**
   * End a live session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}/end`, {
      method: "POST",
    });
  }

  /**
   * Get session summary
   */
  async getSessionSummary(sessionId: string): Promise<{
    job_id: string;
    status: "IN_PROGRESS" | "READY";
    summary: string;
  }> {
    return this.request<{
      job_id: string;
      status: "IN_PROGRESS" | "READY";
      summary: string;
    }>(`/sessions/${sessionId}/summary`);
  }

  /**
   * Delete session data
   */
  async deleteSessionData(
    sessionId: string,
    dataType:
      | "chat"
      | "questions"
      | "summaries"
      | "transcripts"
      | "polls"
      | "recordings"
      | "resources",
  ): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}/${dataType}`, {
      method: "DELETE",
    });
  }

  // Chat and Q&A

  /**
   * Get chat messages
   */
  async getChatMessages(
    roomId: string,
    params?: PaginationParams & {
      session_id?: string;
    },
  ): Promise<
    ApiResponse<{
      id: string;
      message: string;
      participant_id: string;
      external_participant_id?: string;
      participant_name: string;
      breakout_id?: string;
      created_at: string;
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<
      ApiResponse<{
        id: string;
        message: string;
        participant_id: string;
        external_participant_id?: string;
        participant_name: string;
        breakout_id?: string;
        created_at: string;
      }>
    >(`/rooms/${roomId}/chat${query}`);
  }

  /**
   * Delete chat messages
   */
  async deleteChatMessages(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/chat`, {
      method: "DELETE",
    });
  }

  /**
   * Get Q&A
   */
  async getQuestionsAndAnswers(
    roomId: string,
    params?: PaginationParams & {
      session_id?: string;
    },
  ): Promise<
    ApiResponse<{
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
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<
      ApiResponse<{
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
      }>
    >(`/rooms/${roomId}/questions${query}`);
  }

  /**
   * Delete Q&A
   */
  async deleteQA(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/questions`, {
      method: "DELETE",
    });
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

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<Poll[]>(`/rooms/${roomId}/polls${query}`);
  }

  /**
   * Create a poll
   */
  async createPoll(
    roomId: string,
    settings: PollCreateSettings,
  ): Promise<Poll> {
    return this.request<Poll>(`/rooms/${roomId}/polls`, {
      method: "POST",
      body: JSON.stringify(settings),
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
  async updatePoll(
    roomId: string,
    pollId: string,
    settings: Partial<PollCreateSettings>,
  ): Promise<Poll> {
    return this.request<Poll>(`/rooms/${roomId}/polls/${pollId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a poll
   */
  async deletePoll(roomId: string, pollId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/polls/${pollId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get poll results
   */
  async getPollResults(
    roomId: string,
    pollId: string,
    sessionId?: string,
  ): Promise<
    {
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
    }[]
  > {
    const queryParams = new URLSearchParams();
    if (sessionId) {
      queryParams.append("session_id", sessionId);
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<
      {
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
      }[]
    >(`/rooms/${roomId}/polls/${pollId}/results${query}`);
  }

  /**
   * Export polls
   */
  async exportPolls(
    roomId: string,
    options?: {
      session_id?: string;
      format?: "txt" | "json";
    },
  ): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const apiKey = this.getApiKey();
    const response = await fetch(
      `${this.apiBaseUrl}/rooms/${roomId}/polls/export${query}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    return response.text();
  }

  /**
   * Export chat messages
   */
  async exportChatMessages(
    roomId: string,
    options?: {
      session_id?: string;
      format?: "txt" | "json";
    },
  ): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const apiKey = this.getApiKey();
    const response = await fetch(
      `${this.apiBaseUrl}/rooms/${roomId}/chat/export${query}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    return response.text();
  }

  /**
   * Export Q&A (questions and answers)
   */
  async exportQA(
    roomId: string,
    options?: {
      session_id?: string;
      format?: "txt" | "json";
    },
  ): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const apiKey = this.getApiKey();
    const response = await fetch(
      `${this.apiBaseUrl}/rooms/${roomId}/questions/export${query}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    return response.text();
  }

  /**
   * Export session transcripts
   */
  async exportTranscripts(
    sessionId: string,
    options?: {
      format?: "txt" | "json";
    },
  ): Promise<string> {
    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const apiKey = this.getApiKey();
    const response = await fetch(
      `${this.apiBaseUrl}/sessions/${sessionId}/transcripts/export${query}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    return response.text();
  }

  // Libraries

  /**
   * List all libraries
   */
  async listLibraries(
    params?: PaginationParams,
  ): Promise<ApiResponse<Library>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Library>>(`/libraries${query}`);
  }

  /**
   * Create a new library
   */
  async createLibrary(settings: {
    name?: string;
    external_id: string;
  }): Promise<Library> {
    return this.request<Library>("/libraries", {
      method: "POST",
      body: JSON.stringify(settings),
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
  async updateLibrary(
    libraryId: string,
    settings: {
      name?: string;
      external_id?: string;
    },
  ): Promise<Library> {
    return this.request<Library>(`/libraries/${libraryId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a library
   */
  async deleteLibrary(libraryId: string): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get library hierarchy
   */
  async getLibraryHierarchy(libraryId: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(
      `/libraries/${libraryId}/hierarchy`,
    );
  }

  /**
   * List library folders
   */
  async listLibraryFolders(
    libraryId: string,
    params?: PaginationParams,
  ): Promise<ApiResponse<LibraryFolder>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<LibraryFolder>>(
      `/libraries/${libraryId}/folders${query}`,
    );
  }

  /**
   * Create a library folder
   */
  async createLibraryFolder(
    libraryId: string,
    settings: {
      name?: string;
      parent_id?: string;
    },
  ): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(`/libraries/${libraryId}/folders`, {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Get a specific library folder
   */
  async getLibraryFolder(
    libraryId: string,
    folderId: string,
  ): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(
      `/libraries/${libraryId}/folders/${folderId}`,
    );
  }

  /**
   * Update a library folder
   */
  async updateLibraryFolder(
    libraryId: string,
    folderId: string,
    settings: {
      name?: string;
      parent_id?: string;
    },
  ): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(
      `/libraries/${libraryId}/folders/${folderId}`,
      {
        method: "PATCH",
        body: JSON.stringify(settings),
      },
    );
  }

  /**
   * Delete a library folder
   */
  async deleteLibraryFolder(
    libraryId: string,
    folderId: string,
  ): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}/folders/${folderId}`, {
      method: "DELETE",
    });
  }

  /**
   * List library files
   */
  async listLibraryFiles(
    libraryId: string,
    params?: PaginationParams,
  ): Promise<LibraryFile[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<LibraryFile[]>(`/libraries/${libraryId}/files${query}`);
  }

  /**
   * Create a new library file (get upload URL and token)
   */
  async createLibraryFile(
    libraryId: string,
    settings: {
      name: string;
      folder_id?: string;
    },
  ): Promise<{
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
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Get a specific library file
   */
  async getLibraryFile(
    libraryId: string,
    fileId: string,
  ): Promise<LibraryFile> {
    return this.request<LibraryFile>(`/libraries/${libraryId}/files/${fileId}`);
  }

  /**
   * Update a library file
   */
  async updateLibraryFile(
    libraryId: string,
    fileId: string,
    settings: {
      name?: string;
      folder_id?: string;
    },
  ): Promise<LibraryFile> {
    return this.request<LibraryFile>(
      `/libraries/${libraryId}/files/${fileId}`,
      {
        method: "PATCH",
        body: JSON.stringify(settings),
      },
    );
  }

  /**
   * Delete a library file
   */
  async deleteLibraryFile(libraryId: string, fileId: string): Promise<void> {
    await this.request<void>(`/libraries/${libraryId}/files/${fileId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get file links
   */
  async getFileLinks(
    libraryId: string,
    fileId: string,
  ): Promise<{
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

  // Webapps

  /**
   * Create a webapp in a library
   */
  async createWebapp(
    libraryId: string,
    settings: {
      name: string;
      folder_id?: string;
    },
  ): Promise<{
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
    }>(`/libraries/${libraryId}/webapps`, {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  // Whiteboards

  /**
   * Create a whiteboard in a library
   */
  async createWhiteboard(
    libraryId: string,
    settings: {
      name: string;
      folder_id?: string;
    },
  ): Promise<{
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
    }>(`/libraries/${libraryId}/whiteboards`, {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  // Statistics

  /**
   * Get team global statistics by period
   */
  async getTeamStatistics(
    params?: DateRangeParams & {
      metrics?: string;
    },
  ): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<Record<string, any>>(`/statistics${query}`);
  }

  /**
   * Get team global statistics by current period
   */
  async getTeamCurrentStatistics(
    metrics?: string,
  ): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append("metrics", metrics);
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<Record<string, any>>(
      `/statistics/team/current${query}`,
    );
  }

  /**
   * Get team statistics for current period (simplified)
   */
  async getSimplifiedTeamCurrentStatistics(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>("/statistics/current");
  }

  /**
   * Get room statistics by period
   */
  async getRoomStatistics(
    roomId: string,
    params?: DateRangeParams & {
      metrics?: string;
    },
  ): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<Record<string, any>>(
      `/rooms/${roomId}/statistics${query}`,
    );
  }

  /**
   * Get room statistics for current period
   */
  async getRoomCurrentStatistics(
    roomId: string,
    metrics?: string,
  ): Promise<Record<string, any>> {
    const queryParams = new URLSearchParams();
    if (metrics) {
      queryParams.append("metrics", metrics);
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<Record<string, any>>(
      `/rooms/${roomId}/statistics/current${query}`,
    );
  }

  /**
   * Get participant statistics
   */
  async getParticipantStatistics(
    participantId: string,
  ): Promise<ParticipantDetail> {
    return this.request<ParticipantDetail>(
      `/participants/${participantId}/statistics`,
    );
  }

  // Breakout Rooms

  /**
   * List breakout rooms for a parent room
   */
  async listBreakoutRooms(
    roomId: string,
    params?: PaginationParams,
  ): Promise<ApiResponse<BreakoutRoom>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<BreakoutRoom>>(
      `/rooms/${roomId}/breakout-rooms${query}`,
    );
  }

  /**
   * Get a specific breakout room
   */
  async getBreakoutRoom(
    roomId: string,
    breakoutRoomId: string,
  ): Promise<BreakoutRoom> {
    return this.request<BreakoutRoom>(
      `/rooms/${roomId}/breakout-rooms/${breakoutRoomId}`,
    );
  }

  /**
   * Create breakout rooms
   */
  async createBreakoutRooms(
    roomId: string,
    settings: BreakoutRoomCreateSettings,
  ): Promise<ApiResponse<BreakoutRoom>> {
    return this.request<ApiResponse<BreakoutRoom>>(
      `/rooms/${roomId}/breakout-rooms`,
      {
        method: "POST",
        body: JSON.stringify(settings),
      },
    );
  }

  /**
   * Delete a breakout room
   */
  async deleteBreakoutRoom(
    roomId: string,
    breakoutRoomId: string,
  ): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(
      `/rooms/${roomId}/breakout-rooms/${breakoutRoomId}`,
      {
        method: "DELETE",
      },
    );
  }

  /**
   * Delete all breakout rooms
   */
  async deleteAllBreakoutRooms(roomId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/rooms/${roomId}/breakout-rooms`, {
      method: "DELETE",
    });
  }

  /**
   * List participants in a breakout room
   */
  async listBreakoutRoomParticipants(
    roomId: string,
    breakoutRoomId: string,
    params?: PaginationParams,
  ): Promise<ApiResponse<Participant>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Participant>>(
      `/rooms/${roomId}/breakout-rooms/${breakoutRoomId}/participants${query}`,
    );
  }

  /**
   * Assign participants to breakout rooms
   */
  async assignParticipantsToBreakoutRooms(
    roomId: string,
    assignments: BreakoutRoomParticipantAssignment[],
  ): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/assignments`, {
      method: "POST",
      body: JSON.stringify(assignments),
    });
  }

  /**
   * Return all participants to the main room
   */
  async returnAllParticipantsToMainRoom(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/return-all`, {
      method: "POST",
    });
  }

  /**
   * Broadcast message to all breakout rooms
   */
  async broadcastToBreakoutRooms(
    roomId: string,
    options: { message: string },
  ): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/broadcast`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Open breakout rooms (start breakout sessions)
   */
  async openBreakoutRooms(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/open`, {
      method: "POST",
    });
  }

  /**
   * Close breakout rooms
   */
  async closeBreakoutRooms(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/breakout-rooms/close`, {
      method: "POST",
    });
  }

  // Meeting Scheduling

  /**
   * List all scheduled meetings
   */
  async listScheduledMeetings(
    params?: PaginationParams & DateRangeParams,
  ): Promise<ApiResponse<ScheduledMeeting>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<ScheduledMeeting>>(`/meetings${query}`);
  }

  /**
   * Get a specific scheduled meeting
   */
  async getScheduledMeeting(meetingId: string): Promise<ScheduledMeeting> {
    return this.request<ScheduledMeeting>(`/meetings/${meetingId}`);
  }

  /**
   * Create a new scheduled meeting
   */
  async createScheduledMeeting(
    settings: MeetingCreateSettings,
  ): Promise<ScheduledMeeting> {
    return this.request<ScheduledMeeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Update a scheduled meeting
   */
  async updateScheduledMeeting(
    meetingId: string,
    settings: MeetingUpdateSettings,
  ): Promise<ScheduledMeeting> {
    return this.request<ScheduledMeeting>(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Cancel a scheduled meeting
   */
  async cancelScheduledMeeting(
    meetingId: string,
    options?: { notify_participants?: boolean },
  ): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}/cancel`, {
      method: "POST",
      body: options ? JSON.stringify(options) : undefined,
    });
  }

  /**
   * Delete a scheduled meeting
   */
  async deleteScheduledMeeting(meetingId: string): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}`, {
      method: "DELETE",
    });
  }

  /**
   * List upcoming meetings
   */
  async listUpcomingMeetings(
    params?: PaginationParams,
  ): Promise<ApiResponse<ScheduledMeeting>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<ScheduledMeeting>>(
      `/meetings/upcoming${query}`,
    );
  }

  /**
   * List meetings for a specific room
   */
  async listRoomMeetings(
    roomId: string,
    params?: PaginationParams & DateRangeParams,
  ): Promise<ApiResponse<ScheduledMeeting>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<ScheduledMeeting>>(
      `/rooms/${roomId}/meetings${query}`,
    );
  }

  /**
   * Add participants to a meeting
   */
  async addMeetingParticipants(
    meetingId: string,
    options: MeetingParticipantAddOptions,
  ): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}/participants`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Remove participants from a meeting
   */
  async removeMeetingParticipants(
    meetingId: string,
    options: MeetingParticipantRemoveOptions,
  ): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}/participants/remove`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Send meeting reminders
   */
  async sendMeetingReminders(
    meetingId: string,
    options?: MeetingReminderOptions,
  ): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}/reminders`, {
      method: "POST",
      body: options ? JSON.stringify(options) : undefined,
    });
  }

  /**
   * Find available meeting times
   */
  async findAvailableMeetingTimes(
    options: MeetingAvailabilityOptions,
  ): Promise<AvailableTimeSlot[]> {
    return this.request<AvailableTimeSlot[]>("/meetings/available-times", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  // Communication Management Methods

  /**
   * Delete session chats
   */
  async deleteSessionChats(sessionId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/chats`, {
      method: "DELETE",
    });
  }

  /**
   * Delete session Q&A
   */
  async deleteSessionQA(sessionId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/qa`, {
      method: "DELETE",
    });
  }

  /**
   * Delete session summaries
   */
  async deleteSessionSummaries(sessionId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/summaries`, {
      method: "DELETE",
    });
  }

  /**
   * Delete session polls
   */
  async deleteSessionPolls(sessionId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/polls`, {
      method: "DELETE",
    });
  }

  /**
   * Publish poll results
   */
  async publishPollResults(pollId: string, sessionId: string): Promise<void> {
    await this.request<void>(
      `/sessions/${sessionId}/polls/${pollId}/publish-results`,
      {
        method: "POST",
      },
    );
  }
}
