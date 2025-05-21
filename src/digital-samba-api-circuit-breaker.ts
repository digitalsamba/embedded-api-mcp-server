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
  type ApiResponse, 
  type PaginationParams, 
  type DateRangeParams,
  type Room,
  type RoomCreateSettings,
  type TokenOptions,
  type TokenResponse,
  type Recording,
  type RecordingDownloadLink,
  type Participant,
  type ParticipantDetail,
  type Session,
  type SessionStatistics,
  type Webhook,
  type WebhookCreateSettings,
  type BreakoutRoom,
  type BreakoutRoomCreateSettings,
  type BreakoutRoomParticipantAssignment,
  type ScheduledMeeting,
  type MeetingCreateSettings,
  type MeetingUpdateSettings,
  type MeetingParticipantAddOptions,
  type MeetingParticipantRemoveOptions,
  type MeetingReminderOptions,
  type MeetingAvailabilityOptions,
  type AvailableTimeSlot,
  type Poll,
  type PollCreateSettings,
  type Role,
  type RoleCreateSettings,
  type Library,
  type LibraryFolder,
  type LibraryFile
} from './digital-samba-api.js';
import { MemoryCache } from './cache.js';
import { ApiRequestError, ApiResponseError } from './errors.js';
import logger from './logger.js';
import { CircuitBreaker, circuitBreakerRegistry, type CircuitBreakerOptions } from './circuit-breaker.js';

/**
 * Default circuit breaker options
 */
const DEFAULT_CIRCUIT_OPTIONS: Partial<CircuitBreakerOptions> = {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  requestTimeout: 15000, // 15 seconds
  initialRequestTimeout: 60000, // 60 seconds for the initial request
  isFailure: (error: unknown) => {
    // Only count server errors (5xx) and network errors as circuit failures
    if (error instanceof ApiResponseError) {
      return error.statusCode >= 500;
    }
    
    if (error instanceof ApiRequestError) {
      return true; // Network errors break the circuit
    }
    
    return false; // Other errors (validation, not found, etc.) don't break the circuit
  }
};

// We don't need a specific type for fallback function as we're using the generic type parameters

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
   * Initialize the API connection
   * This is a special method that bypasses timeouts for the initial request
   */
  async initializeConnection(): Promise<boolean> {
    try {
      // Create a special circuit breaker for initialization
      const circuit = this.createCircuitBreaker('initialize', {
        // Fail fast on initialization errors
        failureThreshold: 1,
        // Don't use timeouts for initialization
        requestTimeout: undefined,
        initialRequestTimeout: undefined
      }, true); // Force no timeout
      
      // Make a simple request to verify connectivity
      await circuit.exec(
        async () => {
          try {
            // Try something simple like fetching default settings
            // or just checking if the API base URL is reachable
            return await fetch(this.apiBaseUrl, {
              method: 'HEAD',
              headers: {
                'Authorization': `Bearer ${this.getApiKey()}`
              }
            });
          } catch (error) {
            // If we can't reach the base URL, try a specific endpoint
            return await fetch(`${this.apiBaseUrl}/rooms`, {
              headers: {
                'Authorization': `Bearer ${this.getApiKey()}`
              }
            });
          }
        },
        [], // No arguments needed
        true // Force no timeout
      );
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize API connection', {
        error: error instanceof Error ? error.message : String(error),
        apiBaseUrl: this.apiBaseUrl
      });
      
      return false;
    }
  }
  
  /**
   * Create a circuit breaker for a specific API endpoint
   * 
   * @param endpoint The API endpoint name
   * @param options Additional circuit breaker options
   * @param forceNoTimeout If true, disables timeout for this endpoint
   * @returns A circuit breaker instance
   */
  protected createCircuitBreaker(endpoint: string, options: Partial<CircuitBreakerOptions> = {}, forceNoTimeout: boolean = false): CircuitBreaker {
    const name = `${this.circuitPrefix}.${endpoint}`;
    
    return circuitBreakerRegistry.getOrCreate({
      name,
      ...this.defaultOptions,
      ...options
    });
  }

  /**
   * Get the API key from context or direct value
   * 
   * This method retrieves the API key using a prioritized approach:
   * 1. First tries to get the API key from the ApiKeyContext (for session-based auth)
   * 2. If not found, falls back to using the direct API key if provided during construction
   * 3. If neither source provides an API key, throws an AuthenticationError
   *
   * @protected
   * @returns {string} The API key to use for authentication
   * @throws {AuthenticationError} If no API key is available from any source
   */
  protected getApiKey(): string {
    return this.apiClient['getApiKey']();
  }

  /**
   * Get base URL of the API
   */
  protected get apiBaseUrl(): string {
    return (this.apiClient as any).apiBaseUrl;
  }
  
  /**
   * Get default room settings
   */
  async getDefaultRoomSettings(): Promise<Record<string, any>> {
    const circuit = this.createCircuitBreaker('getDefaultRoomSettings');
    return circuit.exec(() => this.apiClient.getDefaultRoomSettings(), []);
  }
  
  /**
   * Update default room settings
   */
  async updateDefaultRoomSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    const circuit = this.createCircuitBreaker('updateDefaultRoomSettings');
    return circuit.exec(() => this.apiClient.updateDefaultRoomSettings(settings), [settings]);
  }
  
  // Rooms
  
  /**
   * List all rooms
   */
  async listRooms(params?: PaginationParams): Promise<ApiResponse<Room>> {
    const circuit = this.createCircuitBreaker('listRooms', {
      // Correctly type the fallback function to match the circuit breaker's exec method signature
      fallback: async <T, Args extends any[]>(_args: Args): Promise<T> => {
        const response: ApiResponse<Room> = {
          data: [],
          total_count: 0,
          length: 0,
          map: function<U>(callback: (value: any, index: number, array: any[]) => U): U[] {
            return this.data.map(callback);
          }
        };
        return response as unknown as T;
      }
    });
    
    return circuit.exec(() => this.apiClient.listRooms(params), [params]);
  }
  
  /**
   * Get details for a specific room
   */
  async getRoom(roomId: string): Promise<Room> {
    const circuit = this.createCircuitBreaker('getRoom');
    return circuit.exec(() => this.apiClient.getRoom(roomId), [roomId]);
  }
  
  /**
   * Create a new room
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    const circuit = this.createCircuitBreaker('createRoom');
    return circuit.exec(() => this.apiClient.createRoom(settings), [settings]);
  }
  
  /**
   * Update an existing room
   */
  async updateRoom(roomId: string, settings: Partial<RoomCreateSettings>): Promise<Room> {
    const circuit = this.createCircuitBreaker('updateRoom');
    return circuit.exec(() => this.apiClient.updateRoom(roomId, settings), [roomId, settings]);
  }
  
  /**
   * Delete a room
   */
  async deleteRoom(roomId: string, options?: { delete_resources?: boolean }): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteRoom');
    return circuit.exec(() => this.apiClient.deleteRoom(roomId, options), [roomId, options]);
  }
  
  /**
   * Generate a token for joining a room
   */
  async generateRoomToken(roomId: string, options: TokenOptions): Promise<TokenResponse> {
    const circuit = this.createCircuitBreaker('generateRoomToken');
    return circuit.exec(() => this.apiClient.generateRoomToken(roomId, options), [roomId, options]);
  }
  
  /**
   * Delete all resources for a room
   */
  async deleteRoomResources(roomId: string): Promise<void> {
    const circuit = this.createCircuitBreaker('deleteRoomResources');
    return circuit.exec(() => this.apiClient.deleteRoomResources(roomId), [roomId]);
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
