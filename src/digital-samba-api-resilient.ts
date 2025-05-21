/**
 * Digital Samba API Client with Graceful Degradation Integration
 * 
 * This module integrates the graceful degradation pattern with the Digital Samba API client
 * and circuit breaker for comprehensive resilience strategies.
 * 
 * Key features:
 * - Combines circuit breaker pattern with graceful degradation strategies
 * - Provides fallback mechanisms for API operations during outages
 * - Implements cache-based fallbacks for degraded service
 * - Features intelligent retry mechanisms with exponential backoff
 * - Includes health monitoring and metrics integration
 * 
 * @module digital-samba-api-resilient
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js modules
import { EventEmitter } from 'events';

// Local modules
import { 
  DigitalSambaApiClient, 
  ApiResponse, 
  PaginationParams, 
  DateRangeParams,
  Room,
  RoomCreateSettings,
  TokenResponse,
} from './digital-samba-api.js';
import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';
import { MemoryCache } from './cache.js';
import { ApiRequestError, ApiResponseError, DegradedServiceError } from './errors.js';
import logger from './logger.js';
import { gracefulDegradation, FallbackConfig, ServiceHealthStatus } from './graceful-degradation.js';

/**
 * Resilient API client options
 */
export interface ResilientApiClientOptions {
  /**
   * Circuit breaker options
   */
  circuitBreaker?: {
    /**
     * Prefix for circuit breaker names
     * @default 'api'
     */
    circuitPrefix?: string;
    
    /**
     * Failure threshold for circuit breaker
     * @default 3
     */
    failureThreshold?: number;
    
    /**
     * Reset timeout for circuit breaker (ms)
     * @default 30000
     */
    resetTimeout?: number;
    
    /**
     * Success threshold for circuit breaker
     * @default 2
     */
    successThreshold?: number;
    
    /**
     * Request timeout for circuit breaker (ms)
     * @default 10000
     */
    requestTimeout?: number;
  };
  
  /**
   * Graceful degradation options
   */
  gracefulDegradation?: {
    /**
     * Maximum number of retry attempts
     * @default 3
     */
    maxRetryAttempts?: number;
    
    /**
     * Initial retry delay (ms)
     * @default 1000
     */
    initialRetryDelay?: number;
    
    /**
     * Retry backoff factor
     * @default 2
     */
    retryBackoffFactor?: number;
    
    /**
     * Maximum retry delay (ms)
     * @default 30000
     */
    maxRetryDelay?: number;
  };
  
  /**
   * Specify fallbacks for specific operations
   */
  fallbacks?: {
    /**
     * Fallback for listRooms operation
     */
    listRooms?: FallbackConfig<ApiResponse<Room>>;
    
    /**
     * Fallback for getRoom operation
     */
    getRoom?: FallbackConfig<Room>;
    
    /**
     * Add other operation fallbacks as needed
     */
    [key: string]: FallbackConfig<any> | undefined;
  };
  
  /**
   * Cache instance
   */
  cache?: MemoryCache;
}

/**
 * Digital Samba API client with resilience patterns
 * 
 * This class combines the circuit breaker and graceful degradation patterns
 * to provide comprehensive resilience for the Digital Samba API client.
 */
export class ResilientApiClient {
  private circuitBreakerClient: CircuitBreakerApiClient;
  private cache?: MemoryCache;
  private readonly options: ResilientApiClientOptions;
  
  /**
   * Creates a new resilient API client
   * 
   * @param apiClient The Digital Samba API client to wrap
   * @param options Configuration options
   */
  constructor(
    apiClient: DigitalSambaApiClient,
    options: ResilientApiClientOptions = {}
  ) {
    this.options = options;
    this.cache = options.cache;
    
    // Create circuit breaker client
    this.circuitBreakerClient = CircuitBreakerApiClient.withCircuitBreaker(
      apiClient,
      {
        circuitPrefix: options.circuitBreaker?.circuitPrefix || 'api',
        defaultOptions: {
          failureThreshold: options.circuitBreaker?.failureThreshold || 3,
          resetTimeout: options.circuitBreaker?.resetTimeout || 30000,
          successThreshold: options.circuitBreaker?.successThreshold || 2,
          requestTimeout: options.circuitBreaker?.requestTimeout || 10000
        }
      }
    );
    
    // Register fallbacks
    this.registerFallbacks(options.fallbacks || {});
    
    logger.debug('Created resilient API client', {
      hasCache: !!this.cache,
      circuitBreakerOptions: options.circuitBreaker,
      gracefulDegradationOptions: options.gracefulDegradation,
      fallbackCount: Object.keys(options.fallbacks || {}).length
    });
  }
  
  /**
   * Register fallbacks for operations
   * 
   * @private
   * @param fallbacks Fallback configurations
   */
  private registerFallbacks(fallbacks: Record<string, FallbackConfig<any> | undefined>): void {
    // Register standard fallbacks
    
    // Fallback for listRooms
    if (!fallbacks.listRooms) {
      fallbacks.listRooms = {
        fallbackFn: async () => ({
          data: [],
          total_count: 0,
          length: 0,
          map: () => []
        }),
        isCritical: true,
        cacheTTL: 600000 // 10 minutes
      };
    }
    
    // Register all fallbacks with graceful degradation service
    for (const [operation, config] of Object.entries(fallbacks)) {
      if (config) {
        gracefulDegradation.registerFallback(operation, config);
        logger.info(`Registered fallback for operation: ${operation}`, {
          isCritical: config.isCritical,
          cacheTTL: config.cacheTTL
        });
      }
    }
  }
  
  /**
   * List all rooms with resilience
   * 
   * @param params Pagination parameters
   * @returns Rooms response
   */
  async listRooms(params?: PaginationParams): Promise<ApiResponse<Room>> {
    const result = await gracefulDegradation.executeWithFallback(
      'listRooms',
      () => this.circuitBreakerClient.listRooms(params),
      { 
        cacheKey: 'listRooms',
        cacheTTL: 300000 // 5 minutes
      }
    );
    
    return result.data;
  }
  
  /**
   * Get a specific room with resilience
   * 
   * @param roomId Room ID
   * @returns Room details
   */
  async getRoom(roomId: string): Promise<Room> {
    const result = await gracefulDegradation.executeWithFallback(
      'getRoom',
      () => this.circuitBreakerClient.getRoom(roomId),
      { 
        cacheKey: `getRoom-${roomId}`,
        cacheTTL: 300000 // 5 minutes
      }
    );
    
    return result.data;
  }
  
  /**
   * Create a new room with resilience
   * 
   * @param settings Room creation settings
   * @returns Created room
   */
  async createRoom(settings: RoomCreateSettings): Promise<Room> {
    return gracefulDegradation.executeWithFallback(
      'createRoom',
      () => this.circuitBreakerClient.createRoom(settings),
      { 
        skipCache: true // Don't cache write operations
      }
    );
  }
  
  /**
   * Update an existing room with resilience
   * 
   * @param roomId Room ID
   * @param settings Room update settings
   * @returns Updated room
   */
  async updateRoom(roomId: string, settings: Partial<RoomCreateSettings>): Promise<Room> {
    const result = await gracefulDegradation.executeWithFallback(
      'updateRoom',
      () => this.circuitBreakerClient.updateRoom(roomId, settings),
      { 
        skipCache: true // Don't cache write operations
      }
    );
    
    // Invalidate cached room if successful
    if (!result.isDegraded && this.cache) {
      this.cache.invalidate('degradation', `getRoom-${roomId}`);
    }
    
    return result.data;
  }
  
  /**
   * Delete a room with resilience
   * 
   * @param roomId Room ID
   * @param options Delete options
   */
  async deleteRoom(roomId: string, options?: { delete_resources?: boolean }): Promise<void> {
    const result = await gracefulDegradation.executeWithFallback(
      'deleteRoom',
      () => this.circuitBreakerClient.deleteRoom(roomId, options),
      { 
        skipCache: true // Don't cache write operations
      }
    );
    
    // Invalidate cached room if successful
    if (!result.isDegraded && this.cache) {
      this.cache.invalidate('degradation', `getRoom-${roomId}`);
      this.cache.invalidate('degradation', 'listRooms');
    }
    
    return result.data;
  }
  
  /**
   * Generate a room token with resilience
   * 
   * @param roomId Room ID
   * @param options Token options
   * @returns Token response
   */
  async generateRoomToken(roomId: string, options: any): Promise<TokenResponse> {
    return gracefulDegradation.executeWithFallback(
      'generateRoomToken',
      () => this.circuitBreakerClient.generateRoomToken(roomId, options),
      { 
        skipCache: true // Security tokens should not be cached
      }
    );
  }
  
  /**
   * Get system health status
   * 
   * @returns System health status
   */
  getSystemHealth(): {
    overall: ServiceHealthStatus;
    components: {
      name: string;
      status: ServiceHealthStatus;
      lastCheck: Date;
      errorCount: number;
      message?: string;
    }[];
  } {
    const overall = gracefulDegradation.getOverallHealth();
    const components = gracefulDegradation.getComponentHealth();
    
    return {
      overall,
      components
    };
  }
  
  /**
   * Create a resilient API client from a standard Digital Samba API client
   * 
   * @param apiClient Digital Samba API client
   * @param options Resilient API client options
   * @returns A new resilient API client
   */
  static withResilience(
    apiClient: DigitalSambaApiClient,
    options: ResilientApiClientOptions = {}
  ): ResilientApiClient {
    return new ResilientApiClient(apiClient, options);
  }
  
  /**
   * Create a new resilient API client with the given API key
   * 
   * @param apiKey API key
   * @param apiBaseUrl API base URL
   * @param options Resilient API client options
   * @returns A new resilient API client
   */
  static createWithApiKey(
    apiKey: string,
    apiBaseUrl?: string,
    options: ResilientApiClientOptions = {}
  ): ResilientApiClient {
    const apiClient = new DigitalSambaApiClient(apiKey, apiBaseUrl, options.cache);
    return ResilientApiClient.withResilience(apiClient, options);
  }
}

export default ResilientApiClient;
