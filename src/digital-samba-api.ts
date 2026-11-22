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

// Import all types from organized type definitions
import type {
  // Common types
  PaginationParams,
  DateRangeParams,
  ApiResponse,

  // Room types
  Room,
  RoomCreateSettings,
  BreakoutRoom,
  BreakoutRoomCreateSettings,
  BreakoutRoomParticipantAssignment,

  // Session types
  Session,
  SessionStatistics,

  // Participant types
  Participant,
  ParticipantDetail,
  TokenOptions,
  TokenResponse,

  // Recording types
  Recording,
  RecordingDownloadLink,

  // Communication types
  Poll,
  PollOption,
  PollCreateSettings,
  Quiz,
  QuizCreateSettings,
  QuizResult,
  RestreamerOptions,
  QAParticipant,
  ChatMessageRecord,
  QuestionRecord,

  // Content types
  Library,
  LibraryFolder,
  LibraryFile,

  // Webhook types
  Webhook,
  WebhookCreateSettings,

  // Role types
  Role,
  RoleCreateSettings,
} from "./types/index.js";

// Re-export all types for backward compatibility
export type {
  // Common types
  PaginationParams,
  DateRangeParams,
  ApiResponse,

  // Room types
  Room,
  RoomCreateSettings,
  BreakoutRoom,
  BreakoutRoomCreateSettings,
  BreakoutRoomParticipantAssignment,

  // Session types
  Session,
  SessionStatistics,

  // Participant types
  Participant,
  ParticipantDetail,
  TokenOptions,
  TokenResponse,

  // Recording types
  Recording,
  RecordingDownloadLink,

  // Communication types
  Poll,
  PollOption,
  PollCreateSettings,
  Quiz,
  QuizCreateSettings,
  QuizResult,
  RestreamerOptions,
  QAParticipant,

  // Content types
  Library,
  LibraryFolder,
  LibraryFile,

  // Webhook types
  Webhook,
  WebhookCreateSettings,

  // Role types
  Role,
  RoleCreateSettings,
};

/**
 * Body returned by a write endpoint.
 *
 * Several Digital Samba write endpoints are undocumented in the OpenAPI spec or
 * document an empty success body, and the client normalises 204s and empty
 * bodies to `{}`. Callers must therefore treat an empty object as "the API
 * accepted the request but told us nothing" — never as proof the write landed.
 * Use a read-back to confirm writes that matter.
 */
export type WriteResult = Record<string, unknown>;

/**
 * Refuse an API path whose segments would be rewritten before it is sent.
 *
 * IDs are interpolated into paths. fetch() resolves "." and ".." segments and
 * the API ignores a trailing slash, so an ID of "..", ".", "" or "?x" silently
 * retargets a request at a different route with the same HTTP method: on dev,
 * deleting poll "." deleted every poll in the room (DELETE /rooms/{room}/polls)
 * and deleting poll ".." deleted the room (DELETE /rooms/{room}). An ID can
 * come from meeting content a model was asked to act on, so this is checked
 * centrally instead of trusting each handler.
 *
 * It does not make an ID containing "/" safe; that needs per-ID encoding.
 *
 * @throws {ValidationError} if a path segment is empty, "." or ".."
 */
export function assertSafeApiPath(endpoint: string): void {
  const path = endpoint.split(/[?#]/)[0];
  if (path === "/") return; // team settings live at the API root

  const reject = (reason: string): never => {
    throw new ValidationError(
      `Refusing to call the API: ${reason}. An ID argument is empty or malformed, and sending it would address a different resource than intended.`,
      { validationErrors: { path: reason } },
    );
  };

  if (!path.startsWith("/")) reject("the request path is not absolute");

  for (const segment of path.split("/").slice(1)) {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      // Not valid percent-encoding: compare the raw text.
    }
    if (decoded === "") reject("the request path has an empty segment");
    if (decoded === "." || decoded === "..") {
      reject(`the request path contains a "${decoded}" segment`);
    }
  }
}

/** "?k=v&..." from the defined entries of a params object, or "". */
function toQuery(params?: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.append(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Deadline for one upstream API call; API_TIMEOUT_MS overrides it. */
const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS) || 120_000;

/** POST /libraries/{library}/files response (see createLibraryFile). */
export interface LibraryFileUploadTicket {
  file_id: string;
  file_name: string;
  storage?: "default" | "scaleway" | string;
  external_storage_url: string;
  expiration_timestamp: number;
  /** default storage */
  token?: string;
  /** presigned (scaleway) storage */
  callback_url?: string;
  callback_token?: string;
  /** presigned multipart, for large files */
  upload_id?: string;
  part_size?: number;
  parts?: { part_number: number; url: string }[];
}

/** GET /libraries/{library}/files/{file}/links response. */
export interface LibraryFileLinks {
  pages?: {
    url: string;
    thumbnail_url?: string;
    whiteboard_url?: string;
  }[];
  url?: string;
  whiteboard_url?: string;
}

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
  /**
   * Drop cached GET responses.
   *
   * Called after writes that a read-back verifies, so the confirming read
   * cannot be served the pre-write state from cache.
   */
  protected invalidateApiCache(): void {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }
  }

  /**
   * Build the URL for an API path, refusing paths that would not reach the
   * route they were written for (see assertSafeApiPath).
   */
  private apiUrl(endpoint: string): string {
    assertSafeApiPath(endpoint);
    return `${this.apiBaseUrl}${endpoint}`;
  }

  /**
   * fetch() with a deadline. Without one, a stalled API held a tool call
   * until Node's own fetch timeout, with nothing logged. The default is
   * generous because exports can be slow; API_TIMEOUT_MS overrides it.
   */
  protected async fetchWithTimeout(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const timeoutMs = API_TIMEOUT_MS;
    try {
      return await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        const method = init.method || "GET";
        const path = url.replace(this.apiBaseUrl, "");
        logger.error(`API request timed out after ${timeoutMs} ms`, {
          method,
          path,
        });
        throw new ApiRequestError(
          `The Digital Samba API did not respond within ${Math.round(timeoutMs / 1000)} s (${method} ${path}).` +
            (method === "GET"
              ? ""
              : " The change may still have been applied; check before retrying."),
          { cause: error },
        );
      }
      throw error;
    }
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Handle case where endpoint is already a full URL (starts with http:// or https://)
    const url = endpoint.startsWith("http") ? endpoint : this.apiUrl(endpoint);
    const method = options.method || "GET";

    // Log the actual URL being called (INFO level for visibility)
    logger.info(`API Request: ${method} ${url}`);
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
        response = await this.fetchWithTimeout(url, {
          ...options,
          headers,
        });
      } catch (error) {
        // A timeout is already a clear ApiRequestError.
        if (error instanceof ApiRequestError) throw error;
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
          const upstream = errorData.message || errorText;
          // Over OAuth, sign-in, initialize and tools/list all succeed before
          // the first API call, so a bare "Unauthenticated." gave the user no
          // idea why every tool fails or what to do about it.
          const viaOAuth = this.apiBaseUrl.includes("/oauth-api/");
          throw new AuthenticationError(
            viaOAuth && response.status === 401
              ? `Authentication error: Digital Samba rejected this connection's access (${upstream}). ` +
                "Sign-in worked, but the signed-in Digital Samba user cannot use the API through the connector. " +
                "This usually means the user is not the team owner: connector access currently works for the team owner's login only. " +
                "It also happens if access was revoked; disconnecting and reconnecting fixes that case."
              : `Authentication error: ${upstream}`,
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
      if (!responseText || responseText.trim() === "") {
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
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
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
   * All settings are optional. The API has no room name field; use `description`.
   *
   * @param {RoomCreateSettings} settings - Room configuration
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
   *   description: 'Team Standup'
   * });
   *
   * @example
   * // Create a fully configured room
   * const room = await client.createRoom({
   *   description: 'All Hands Meeting',
   *   privacy: 'private',
   *   max_participants: 200,
   *   friendly_url: 'all-hands',
   *   recordings_enabled: true,
   *   chat_enabled: true
   * });
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    return this.request<Room>("/rooms", {
      method: "POST",
      body: JSON.stringify(settings),
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
    options?: {
      delete_resources?: boolean;
      delete_history?: boolean;
      delete_library?: boolean;
    },
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
   * Delete all rooms matching one or more tags
   */
  async deleteRoomsByTag(data: {
    tags: string | string[];
    delete_resources?: boolean;
    delete_history?: boolean;
    delete_library?: boolean;
  }): Promise<any> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    return this.request<any>(`/rooms`, {
      method: "DELETE",
      body: JSON.stringify(data),
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

  /**
   * Raise participant's hand
   */
  async raiseParticipantHand(
    roomId: string,
    participantId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/participants/${participantId}/raise-hand`,
      { method: "POST" },
    );
  }

  /**
   * Lower participant's hand
   */
  async lowerParticipantHand(
    roomId: string,
    participantId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/participants/${participantId}/lower-hand`,
      { method: "POST" },
    );
  }

  /**
   * Raise phone participant's hand
   */
  async raisePhoneParticipantHand(
    roomId: string,
    callId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/phone-participants/${callId}/raise-hand`,
      { method: "POST" },
    );
  }

  /**
   * Lower phone participant's hand
   */
  async lowerPhoneParticipantHand(
    roomId: string,
    callId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/phone-participants/${callId}/lower-hand`,
      { method: "POST" },
    );
  }

  /**
   * Mute a phone participant
   */
  async mutePhoneParticipant(
    roomId: string,
    callId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/phone-participants/${callId}/mute`,
      { method: "POST" },
    );
  }

  /**
   * Unmute a phone participant
   */
  async unmutePhoneParticipant(
    roomId: string,
    callId: string,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/phone-participants/${callId}/unmute`,
      { method: "POST" },
    );
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
   * Get bookmarks for a recording
   */
  async getRecordingBookmarks(recordingId: string): Promise<
    Array<{
      id: string;
      timestamp: number;
      label?: string;
      created_at: string;
    }>
  > {
    return this.request<
      Array<{
        id: string;
        timestamp: number;
        label?: string;
        created_at: string;
      }>
    >(`/recordings/${recordingId}/bookmarks`);
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
    return this.request<SessionStatistics>(
      `/sessions/${sessionId}/statistics${query}`,
    );
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
    id: string;
    status: "IN_PROGRESS" | "READY";
    summary: string;
  }> {
    return this.request<{
      id: string;
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
      | "resources"
      | "quizzes",
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

  /**
   * Send a chat message to a room
   */
  async sendChatMessage(
    roomId: string,
    data: {
      message: string;
      participant: QAParticipant;
      breakout_id?: string;
    },
  ): Promise<WriteResult> {
    this.invalidateApiCache();
    return this.request<WriteResult>(`/rooms/${roomId}/chat`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a question in a room
   */
  async createQuestion(
    roomId: string,
    data: {
      participant: QAParticipant;
      question: string;
      anonymous?: boolean;
      breakout_id?: string;
    },
  ): Promise<WriteResult> {
    this.invalidateApiCache();
    return this.request<WriteResult>(`/rooms/${roomId}/questions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a question
   */
  async updateQuestion(
    roomId: string,
    questionId: string,
    data: {
      participant: QAParticipant;
      question: string;
    },
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Delete a question
   */
  async deleteQuestion(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/questions/${questionId}`, {
      method: "DELETE",
      body: JSON.stringify({ participant }),
    });
  }

  /**
   * Perform a question action (dismiss, reopen, vote, live-answer control)
   */
  private async questionAction(
    roomId: string,
    questionId: string,
    action: string,
    participant: QAParticipant,
    method: "POST" | "DELETE" = "POST",
  ): Promise<void> {
    await this.request<void>(
      `/rooms/${roomId}/questions/${questionId}${action}`,
      {
        method,
        body: JSON.stringify({ participant }),
      },
    );
  }

  /** Dismiss a question */
  async dismissQuestion(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(roomId, questionId, "/dismiss", participant);
  }

  /** Reopen a dismissed question */
  async reopenQuestion(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(roomId, questionId, "/reopen", participant);
  }

  /** Upvote a question */
  async upvoteQuestion(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(roomId, questionId, "/vote", participant);
  }

  /** Remove a vote from a question */
  async removeQuestionVote(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(
      roomId,
      questionId,
      "/vote",
      participant,
      "DELETE",
    );
  }

  /**
   * Answer a question
   */
  async answerQuestion(
    roomId: string,
    questionId: string,
    data: {
      participant: QAParticipant;
      answer: string;
      private?: boolean;
    },
  ): Promise<WriteResult> {
    this.invalidateApiCache();
    return this.request<WriteResult>(
      `/rooms/${roomId}/questions/${questionId}/answers`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Update an answer
   */
  async updateAnswer(
    roomId: string,
    questionId: string,
    answerId: string,
    data: {
      participant: QAParticipant;
      answer: string;
    },
  ): Promise<WriteResult> {
    return this.request<WriteResult>(
      `/rooms/${roomId}/questions/${questionId}/answers/${answerId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Delete an answer
   */
  async deleteAnswer(
    roomId: string,
    questionId: string,
    answerId: string,
    participant: QAParticipant,
  ): Promise<void> {
    await this.request<void>(
      `/rooms/${roomId}/questions/${questionId}/answers/${answerId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ participant }),
      },
    );
  }

  /** Start a live (verbal) answer to a question */
  async startLiveAnswer(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(
      roomId,
      questionId,
      "/live-answers/start",
      participant,
    );
  }

  /** Stop a live answer */
  async stopLiveAnswer(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(
      roomId,
      questionId,
      "/live-answers/stop",
      participant,
    );
  }

  /** Cancel a live answer */
  async cancelLiveAnswer(
    roomId: string,
    questionId: string,
    participant: QAParticipant,
  ): Promise<void> {
    return this.questionAction(
      roomId,
      questionId,
      "/live-answers/cancel",
      participant,
    );
  }

  // Transcripts

  /**
   * Get room transcripts (closed captioning data)
   */
  async getRoomTranscripts(
    roomId: string,
    params?: PaginationParams & {
      session_id?: string;
    },
  ): Promise<
    ApiResponse<{
      id: string;
      text: string;
      participant_id: string;
      participant_name: string;
      session_id: string;
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
        text: string;
        participant_id: string;
        participant_name: string;
        session_id: string;
        created_at: string;
      }>
    >(`/rooms/${roomId}/transcripts${query}`);
  }

  /**
   * Get session transcripts (closed captioning data)
   */
  async getSessionTranscripts(
    sessionId: string,
    params?: PaginationParams,
  ): Promise<
    ApiResponse<{
      id: string;
      text: string;
      participant_id: string;
      participant_name: string;
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
        text: string;
        participant_id: string;
        participant_name: string;
        created_at: string;
      }>
    >(`/sessions/${sessionId}/transcripts${query}`);
  }

  /**
   * Delete room transcripts
   */
  async deleteRoomTranscripts(roomId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/transcripts`, {
      method: "DELETE",
    });
  }

  /**
   * Export room transcripts
   */
  async exportRoomTranscripts(
    roomId: string,
    options?: {
      format?: "txt" | "json";
      locale?: string;
      timezone?: string;
      session_id?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/transcripts/export${query}`),
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
   * Download a raw file (CSV template) from the API
   */
  private async downloadTemplate(endpoint: string): Promise<string> {
    const apiKey = this.getApiKey();
    const response = await this.fetchWithTimeout(this.apiUrl(endpoint), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    return response.text();
  }

  /**
   * Upload a CSV file via multipart form data
   */
  private async importCsv(
    endpoint: string,
    csvContent: string,
    filename: string,
  ): Promise<any> {
    const apiKey = this.getApiKey();
    const form = new FormData();
    form.append("file", new Blob([csvContent], { type: "text/csv" }), filename);

    // Do not set Content-Type: fetch adds the multipart boundary itself
    const response = await this.fetchWithTimeout(this.apiUrl(endpoint), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Digital Samba API error (${response.status}): ${errorText}`,
      );
    }

    this.invalidateApiCache();

    const text = await response.text();
    if (!text || text.trim() === "") return {};
    try {
      return JSON.parse(text);
    } catch {
      return { result: text };
    }
  }

  /**
   * Download the poll CSV import template
   */
  async getPollImportTemplate(roomId: string): Promise<string> {
    return this.downloadTemplate(`/rooms/${roomId}/polls/template`);
  }

  /**
   * Import polls from CSV content
   */
  async importPolls(roomId: string, csvContent: string): Promise<any> {
    return this.importCsv(
      `/rooms/${roomId}/polls/import`,
      csvContent,
      "polls.csv",
    );
  }

  /**
   * Download the quiz CSV import template
   */
  async getQuizImportTemplate(roomId: string): Promise<string> {
    return this.downloadTemplate(`/rooms/${roomId}/quizzes/template`);
  }

  /**
   * Import quizzes from CSV content
   */
  async importQuizzes(roomId: string, csvContent: string): Promise<any> {
    return this.importCsv(
      `/rooms/${roomId}/quizzes/import`,
      csvContent,
      "quizzes.csv",
    );
  }

  /**
   * Get poll results: one entry per ended run of the poll
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
        /** Absent for free-text polls, where each distinct answer is an option */
        id?: string;
        text: string;
        correct?: boolean;
        voted: number;
        /** Absent when the poll is anonymous or the option has no votes */
        voters?: {
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
          /** Absent for free-text polls, where each distinct answer is an option */
          id?: string;
          text: string;
          correct?: boolean;
          voted: number;
          /** Absent when the poll is anonymous or the option has no votes */
          voters?: {
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
      locale?: string;
      timezone?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/polls/export${query}`),
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
      locale?: string;
      timezone?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/chat/export${query}`),
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
   * Download a recording's captions (WebVTT or SRT), built from the stored
   * transcripts of the recorded session. Empty of cues when the room does not
   * store transcripts.
   */
  async getRecordingCaptions(
    recordingId: string,
    format?: "vtt" | "srt",
  ): Promise<string> {
    const queryParams = new URLSearchParams();
    if (format) queryParams.append("format", format);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const apiKey = this.getApiKey();
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/recordings/${recordingId}/captions${query}`),
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
   * List a room's chat messages as paginated JSON (newest first by default).
   * Only rooms that persist chat have any.
   */
  async listChatMessages(
    roomId: string,
    params?: PaginationParams & { session_id?: string },
  ): Promise<ApiResponse<ChatMessageRecord>> {
    return this.request<ApiResponse<ChatMessageRecord>>(
      `/rooms/${roomId}/chat${toQuery(params)}`,
    );
  }

  /**
   * List a room's questions, with their votes and answers, as paginated JSON
   * (newest first by default).
   */
  async listQuestions(
    roomId: string,
    params?: PaginationParams & { session_id?: string },
  ): Promise<ApiResponse<QuestionRecord>> {
    return this.request<ApiResponse<QuestionRecord>>(
      `/rooms/${roomId}/questions${toQuery(params)}`,
    );
  }

  /**
   * Export Q&A (questions and answers)
   */
  async exportQA(
    roomId: string,
    options?: {
      session_id?: string;
      format?: "txt" | "json";
      locale?: string;
      timezone?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/questions/export${query}`),
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
      locale?: string;
      timezone?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/sessions/${sessionId}/transcripts/export${query}`),
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
   *
   * The response depends on the storage behind the library: `storage:
   * "default"` carries an upload `token`; `storage: "scaleway"` carries a
   * presigned URL (prepared for `content_type`) plus `callback_url` /
   * `callback_token`, and for files of at least the part size, multipart
   * `upload_id` / `part_size` / `parts`.
   */
  async createLibraryFile(
    libraryId: string,
    settings: {
      name: string;
      folder_id?: string;
      file_size?: number;
      content_type?: string;
    },
  ): Promise<LibraryFileUploadTicket> {
    return this.request<LibraryFileUploadTicket>(
      `/libraries/${libraryId}/files`,
      {
        method: "POST",
        body: JSON.stringify(settings),
      },
    );
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
   * Move a library file to another folder of the same library, or to the
   * root with null (POST /libraries/{library}/files/{file}/move). Unlike a
   * PATCH of folder_id, the API checks the target is in the same library.
   */
  async moveLibraryFile(
    libraryId: string,
    fileId: string,
    folderId: string | null,
  ): Promise<LibraryFile> {
    return this.request<LibraryFile>(
      `/libraries/${libraryId}/files/${fileId}/move`,
      { method: "POST", body: JSON.stringify({ folder_id: folderId }) },
    );
  }

  /**
   * Move a library folder under another folder of the same library, or to
   * the root with null (POST /libraries/{library}/folders/{folder}/move).
   */
  async moveLibraryFolder(
    libraryId: string,
    folderId: string,
    parentId: string | null,
  ): Promise<LibraryFolder> {
    return this.request<LibraryFolder>(
      `/libraries/${libraryId}/folders/${folderId}/move`,
      { method: "POST", body: JSON.stringify({ parent_id: parentId }) },
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
  /**
   * Get file links. Documents (convertible files) have `pages`; every other
   * type (video, audio, image, webapp, whiteboard) has a single `url`.
   */
  async getFileLinks(
    libraryId: string,
    fileId: string,
  ): Promise<LibraryFileLinks> {
    return this.request<LibraryFileLinks>(
      `/libraries/${libraryId}/files/${fileId}/links`,
    );
  }

  // Webapps

  /**
   * Create a webapp in a library
   */
  async createWebapp(
    libraryId: string,
    settings: {
      url: string;
      name?: string;
      folder_id?: string;
    },
  ): Promise<{
    id: string;
    folder_id?: string;
    name: string;
    type: string;
    url: string;
    status: string;
    created_at: string;
  }> {
    return this.request<{
      id: string;
      folder_id?: string;
      name: string;
      type: string;
      url: string;
      status: string;
      created_at: string;
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
      /** Ignored by the API, which assigns its own "Whiteboard N" name. */
      name?: string;
      folder_id?: string;
    },
  ): Promise<{
    id: string;
    folder_id?: string;
    name: string;
    type: string;
    size: number;
    storage_file_name: string;
    storage_url: string;
    status: string;
    created_at: string;
  }> {
    return this.request<{
      id: string;
      folder_id?: string;
      name: string;
      type: string;
      size: number;
      storage_file_name: string;
      storage_url: string;
      status: string;
      created_at: string;
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

  // Communication Management Methods

  /**
   * Delete session chats
   */
  async deleteSessionChats(sessionId: string): Promise<void> {
    // Invalidate cache when deleting resources
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/chat`, {
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

    await this.request<void>(`/sessions/${sessionId}/questions`, {
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
   * Delete every poll in a room (DELETE /rooms/{room}/polls).
   *
   * This is not the same as deleting per session: the session-level endpoint
   * removes only polls created by that session's participants, so polls
   * created through the API or dashboard survive it.
   */
  async deleteRoomPolls(roomId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/rooms/${roomId}/polls`, {
      method: "DELETE",
    });
  }

  /**
   * Delete the AI summaries of every session in a room
   * (DELETE /rooms/{room}/summaries).
   */
  async deleteRoomSummaries(roomId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/rooms/${roomId}/summaries`, {
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
   *
   * @deprecated The API does not route this path — no `publish` action exists in
   * the backend. Kept only so the dead path stays visible; publish-poll-results
   * refuses without calling it.
   */
  async publishPollResults(pollId: string, sessionId: string): Promise<void> {
    await this.request<void>(
      `/sessions/${sessionId}/polls/${pollId}/publish-results`,
      {
        method: "POST",
      },
    );
  }

  /**
   * Delete session recordings
   */
  async deleteSessionRecordings(sessionId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/recordings`, {
      method: "DELETE",
    });
  }

  /**
   * Delete session resources
   */
  async deleteSessionResources(sessionId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/resources`, {
      method: "DELETE",
    });
  }

  // Phone Bridge

  /**
   * Connect to SIP phone bridge
   */
  async connectPhone(roomId: string): Promise<WriteResult> {
    return this.request<WriteResult>(`/rooms/${roomId}/phone/connect`, {
      method: "POST",
    });
  }

  /**
   * Disconnect from SIP phone bridge
   */
  async disconnectPhone(roomId: string): Promise<WriteResult> {
    return this.request<WriteResult>(`/rooms/${roomId}/phone/disconnect`, {
      method: "POST",
    });
  }

  // Quizzes

  /**
   * List quizzes for a room
   */
  async listQuizzes(
    roomId: string,
    params?: PaginationParams,
  ): Promise<ApiResponse<Quiz>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<ApiResponse<Quiz>>(`/rooms/${roomId}/quizzes${query}`);
  }

  /**
   * Create a quiz
   */
  async createQuiz(
    roomId: string,
    settings: QuizCreateSettings,
  ): Promise<Quiz> {
    return this.request<Quiz>(`/rooms/${roomId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Get a specific quiz
   */
  async getQuiz(roomId: string, quizId: string): Promise<Quiz> {
    return this.request<Quiz>(`/rooms/${roomId}/quizzes/${quizId}`);
  }

  /**
   * Update a quiz
   */
  async updateQuiz(
    roomId: string,
    quizId: string,
    settings: Partial<QuizCreateSettings>,
  ): Promise<Quiz> {
    return this.request<Quiz>(`/rooms/${roomId}/quizzes/${quizId}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete a quiz
   */
  async deleteQuiz(roomId: string, quizId: string): Promise<void> {
    await this.request<void>(`/rooms/${roomId}/quizzes/${quizId}`, {
      method: "DELETE",
    });
  }

  /**
   * Delete all quizzes for a room
   */
  async deleteRoomQuizzes(roomId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/rooms/${roomId}/quizzes`, {
      method: "DELETE",
    });
  }

  /**
   * Delete all quizzes for a session
   */
  async deleteSessionQuizzes(sessionId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/sessions/${sessionId}/quizzes`, {
      method: "DELETE",
    });
  }

  /**
   * Get quiz results
   */
  async getQuizResults(
    roomId: string,
    quizId: string,
    sessionId?: string,
  ): Promise<QuizResult[]> {
    const queryParams = new URLSearchParams();
    if (sessionId) {
      queryParams.append("session_id", sessionId);
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return this.request<QuizResult[]>(
      `/rooms/${roomId}/quizzes/${quizId}/results${query}`,
    );
  }

  /**
   * Export quiz results for a room (summary: one row per participant per run).
   * The API defaults to csv; its `zip` format (detailed report) is binary and
   * is not supported here.
   */
  async exportQuizzes(
    roomId: string,
    options?: {
      session_id?: string;
      format?: "csv" | "txt" | "json";
      locale?: string;
      timezone?: string;
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
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/quizzes/export${query}`),
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
   * Export a room's shared notes document as md (the API default), txt or html.
   * The API answers 400 when shared notes are off for the room.
   */
  async exportSharedNotes(
    roomId: string,
    format?: "md" | "txt" | "html",
  ): Promise<string> {
    const query = format
      ? `?${new URLSearchParams({ format }).toString()}`
      : "";

    const apiKey = this.getApiKey();
    const response = await this.fetchWithTimeout(
      this.apiUrl(`/rooms/${roomId}/shared-notes/export${query}`),
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
   * Delete a room's shared notes document. The API then gives the room a new,
   * empty document, and refuses (400) while the room has a live session.
   */
  async deleteRoomSharedNotes(roomId: string): Promise<void> {
    if (this.cache) {
      this.cache.invalidateNamespace("api");
    }

    await this.request<void>(`/rooms/${roomId}/shared-notes`, {
      method: "DELETE",
    });
  }

  /**
   * Which kinds of content a room holds (GET /rooms/{room}/resources). In the
   * v1 routes but not in the published spec.
   */
  async getRoomResources(roomId: string): Promise<{
    has_transcripts: boolean;
    has_chat_messages: boolean;
    has_qa: boolean;
    has_polls: boolean;
    has_quizzes: boolean;
    has_shared_notes: boolean;
  }> {
    return this.request(`/rooms/${roomId}/resources`);
  }

  // Restreamers

  /**
   * Start live streaming to a provider
   */
  async startRestreamer(
    roomId: string,
    options: RestreamerOptions,
  ): Promise<WriteResult> {
    return this.request<WriteResult>(`/rooms/${roomId}/restreamers/start`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Stop live streaming
   */
  async stopRestreamer(roomId: string): Promise<WriteResult> {
    return this.request<WriteResult>(`/rooms/${roomId}/restreamers/stop`, {
      method: "POST",
    });
  }
}
