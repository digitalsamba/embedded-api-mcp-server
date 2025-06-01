/**
 * Enhanced Digital Samba API Client Module - Integration File
 * 
 * This file extends the base digital-samba-api.ts to integrate the new
 * token-manager, connection-manager, and resource-optimizer features.
 * It enhances the existing API client with improved connection handling,
 * automatic token refresh, and optimized resource usage for high-traffic
 * scenarios.
 * 
 * @module digital-samba-api-enhanced
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Local modules
import { DigitalSambaApiClient } from './digital-samba-api.js';
import { ConnectionManager } from './connection-manager.js';
import { TokenManager } from './token-manager.js';
import { ResourceOptimizer } from './resource-optimizer.js';
import { MemoryCache } from './cache.js';
import logger from './logger.js';

/**
 * Enhanced API client options
 */
export interface EnhancedApiClientOptions {
  /** API base URL */
  apiUrl?: string;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Whether to enable connection management */
  enableConnectionManagement?: boolean;
  
  /** Whether to enable token management */
  enableTokenManagement?: boolean;
  
  /** Whether to enable resource optimization */
  enableResourceOptimization?: boolean;
  
  /** Connection pool size */
  connectionPoolSize?: number;
  
  /** Cache instance */
  cache?: MemoryCache;
}

/**
 * Enhanced Digital Samba API Client
 * 
 * This class extends the base DigitalSambaApiClient with improved connection handling,
 * automatic token refresh, and optimized resource usage for high-traffic scenarios.
 */
export class EnhancedDigitalSambaApiClient extends DigitalSambaApiClient {
  private connectionManager?: ConnectionManager;
  private tokenManagers: Map<string, TokenManager> = new Map();
  private resourceOptimizer?: ResourceOptimizer;
  private readonly enabledFeatures: {
    connectionManagement: boolean;
    tokenManagement: boolean;
    resourceOptimization: boolean;
  };
  
  /**
   * Creates an instance of the Enhanced Digital Samba API Client
   * 
   * @constructor
   * @param {string} [apiKey] - Optional API key for direct authentication
   * @param {string} [apiBaseUrl='https://api.digitalsamba.com/api/v1'] - Base URL for the Digital Samba API
   * @param {MemoryCache} [cache] - Optional cache instance
   * @param {EnhancedApiClientOptions} [options] - Additional options
   */
  constructor(
    apiKey?: string, 
    apiBaseUrl: string = 'https://api.digitalsamba.com/api/v1',
    cache?: MemoryCache,
    options: EnhancedApiClientOptions = {}
  ) {
    super(apiKey, apiBaseUrl, cache);
    
    // Set enabled features
    this.enabledFeatures = {
      connectionManagement: options.enableConnectionManagement !== false,
      tokenManagement: options.enableTokenManagement !== false,
      resourceOptimization: options.enableResourceOptimization !== false
    };
    
    // Initialize connection manager if enabled
    if (this.enabledFeatures.connectionManagement) {
      this.connectionManager = new ConnectionManager({
        apiUrl: apiBaseUrl,
        poolSize: options.connectionPoolSize || 5
      });
      
      // Set up connection event handlers
      this.setupConnectionEventHandlers();
      
      logger.info('Enhanced API client initialized with connection management', {
        poolSize: options.connectionPoolSize || 5
      });
    }
    
    // Initialize resource optimizer if enabled
    if (this.enabledFeatures.resourceOptimization) {
      this.resourceOptimizer = new ResourceOptimizer();
      
      logger.info('Enhanced API client initialized with resource optimization');
    }
    
    logger.info('Enhanced Digital Samba API Client initialized', {
      enabledFeatures: this.enabledFeatures
    });
  }
  
  /**
   * Set up connection event handlers
   */
  private setupConnectionEventHandlers(): void {
    if (!this.connectionManager) return;
    
    // Connection error handler
    this.connectionManager.on('connection:error', ({ connectionId, error }) => {
      logger.warn(`Connection error on ${connectionId}: ${error}`);
    });
    
    // Reconnect events
    this.connectionManager.on('reconnect:scheduled', ({ attempt, delayMs }) => {
      logger.info(`Reconnect scheduled (attempt ${attempt}), delay: ${delayMs}ms`);
    });
    
    this.connectionManager.on('reconnect:success', ({ successCount, totalConnections }) => {
      logger.info(`Reconnect successful, ${successCount}/${totalConnections} connections restored`);
    });
    
    this.connectionManager.on('reconnect:failed', ({ attempts, max }) => {
      logger.error(`Reconnect failed after ${attempts}/${max} attempts`);
    });
  }
  
  /**
   * Override the request method to use the connection manager
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise resolving to the response data
   */
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Use connection manager if enabled
    if (this.enabledFeatures.connectionManagement && this.connectionManager) {
      const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;
      
      // Get API key
      const apiKey = this.getApiKey();
      
      // Set authorization header
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Execute request through connection manager
      // Type assertion to handle compatibility between node-fetch and standard fetch types
      const fetchOptions = {
        ...options,
        headers: headers as Record<string, string>
      };
      
      // Execute request through connection manager
      const response = await this.connectionManager.fetch(url, fetchOptions as RequestInit);
      
      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        
        logger.error(`API Error Response: ${errorText}`, {
          status: response.status,
          statusText: response.statusText
        });
        
        // Parse error text as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use as plain text
          errorData = { message: errorText };
        }
        
        // Handle specific error types (reusing the parent class logic)
        throw this.handleErrorResponse(response.status, errorData, errorText, endpoint);
      }
      
      // Return empty object for 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }
      
      // Parse response
      const responseData = await response.json();
      
      // Apply resource optimization if enabled
      if (this.enabledFeatures.resourceOptimization && this.resourceOptimizer) {
        return this.resourceOptimizer.compressResponse(responseData) as T;
      }
      
      return responseData as T;
    } else {
      // Fall back to parent implementation
      return super.request<T>(endpoint, options);
    }
  }
  
  /**
   * Handle error response - helper method to match parent class behavior
   */
  private handleErrorResponse(status: number, errorData: unknown, errorText: string, endpoint: string): Error {
    // This method simulates the error handling in the parent class
    // In a real implementation, consider refactoring to avoid duplication
    
    if (status === 400) {
      // Validation error
      return new Error(`Validation error: ${errorData.message || errorText}`);
    } else if (status === 401 || status === 403) {
      // Authentication error
      return new Error(`Authentication error: ${errorData.message || errorText}`);
    } else if (status === 404) {
      // Not Found error
      const matches = endpoint.match(/\/([^/]+)\/([^/]+)/);
      const resourceType = matches ? matches[1] : 'resource';
      const resourceId = matches ? matches[2] : 'unknown';
      
      return new Error(`Resource not found: ${resourceType} ${resourceId}`);
    } else {
      // Generic API error
      return new Error(`Digital Samba API error (${status}): ${errorData.message || errorText}`);
    }
  }
  
  /**
   * Create a token manager for a room
   * @param roomId Room ID
   * @param sessionId Session ID
   * @param tokenOptions Token options
   * @returns Token manager for the room
   */
  public createTokenManager(roomId: string, sessionId: string, tokenOptions: unknown = {}): TokenManager {
    // Skip if token management is disabled
    if (!this.enabledFeatures.tokenManagement) {
      throw new Error('Token management is disabled for this client');
    }
    
    // Check if token manager already exists
    const existingManager = this.tokenManagers.get(roomId);
    if (existingManager) {
      return existingManager;
    }
    
    // Create new token manager
    const tokenManager = new TokenManager({
      roomId,
      tokenOptions: {
        ...tokenOptions,
        exp: tokenOptions.exp || '60' // Default to 1 hour
      },
      apiUrl: this.apiBaseUrl
    });
    
    // Store token manager
    this.tokenManagers.set(roomId, tokenManager);
    
    logger.info('Created token manager', { roomId, sessionId });
    
    return tokenManager;
  }
  
  /**
   * Get a token manager for a room
   * @param roomId Room ID
   * @returns Token manager for the room or undefined if not found
   */
  public getTokenManager(roomId: string): TokenManager | undefined {
    return this.tokenManagers.get(roomId);
  }
  
  /**
   * Generate a room token with automatic refresh
   * @param roomId Room ID
   * @param options Token options
   * @param sessionId Session ID for token context
   * @returns Promise resolving to token response
   */
  public async generateRoomTokenWithRefresh(roomId: string, options: unknown = {}, sessionId: string): Promise<unknown> {
    // Skip if token management is disabled
    if (!this.enabledFeatures.tokenManagement) {
      // Fall back to standard token generation
      return this.generateRoomToken(roomId, options);
    }
    
    // Get or create token manager
    let tokenManager = this.getTokenManager(roomId);
    if (!tokenManager) {
      tokenManager = this.createTokenManager(roomId, sessionId, options);
    }
    
    // Generate token
    const token = await tokenManager.generateToken(sessionId, this.getApiKey());
    
    return {
      token: token.token,
      link: token.link,
      expiresAt: token.expiresAt.toISOString()
    };
  }
  
  /**
   * Batch API requests of the same type
   * @param batchId Batch identifier
   * @param key Request key
   * @param executor Function to execute the batch
   * @returns Promise resolving to the result
   */
  public batchRequest<T>(batchId: string, key: string, executor: (keys: string[]) => Promise<Map<string, T>>): Promise<T> {
    // Skip if resource optimization is disabled
    if (!this.enabledFeatures.resourceOptimization || !this.resourceOptimizer) {
      throw new Error('Resource optimization is disabled for this client');
    }
    
    return this.resourceOptimizer.batchRequest(batchId, key, executor);
  }
  
  /**
   * Load data incrementally
   * @param dataLoader Function to load data
   * @param pageSize Page size
   * @param maxPages Maximum number of pages to load
   * @returns Promise resolving to the loaded data
   */
  public loadIncrementally<T>(
    dataLoader: (page: number, pageSize: number) => Promise<{ data: T[], total: number }>,
    pageSize: number = 20,
    maxPages: number = 10
  ): Promise<T[]> {
    // Skip if resource optimization is disabled
    if (!this.enabledFeatures.resourceOptimization || !this.resourceOptimizer) {
      throw new Error('Resource optimization is disabled for this client');
    }
    
    return this.resourceOptimizer.loadIncrementally(dataLoader, pageSize, maxPages);
  }
  
  /**
   * Get client health status
   * @returns Whether the client is healthy
   */
  public isHealthy(): boolean {
    if (this.enabledFeatures.connectionManagement && this.connectionManager) {
      return this.connectionManager.isHealthy();
    }
    
    // Default to true if connection management is disabled
    return true;
  }
  
  /**
   * Get client statistics
   * @returns Client statistics
   */
  public getStats() {
    const stats: Record<string, unknown> = {};
    
    if (this.enabledFeatures.connectionManagement && this.connectionManager) {
      stats.connectionManager = this.connectionManager.getStats();
    }
    
    if (this.enabledFeatures.tokenManagement) {
      stats.tokenManagers = {
        count: this.tokenManagers.size,
        rooms: Array.from(this.tokenManagers.keys())
      };
    }
    
    if (this.enabledFeatures.resourceOptimization && this.resourceOptimizer) {
      stats.resourceOptimizer = this.resourceOptimizer.getStats();
    }
    
    return stats;
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clean up connection manager
    if (this.connectionManager) {
      this.connectionManager.destroy();
    }
    
    // Clean up token managers
    for (const tokenManager of this.tokenManagers.values()) {
      tokenManager.destroy();
    }
    this.tokenManagers.clear();
    
    // Clean up resource optimizer
    if (this.resourceOptimizer) {
      this.resourceOptimizer.destroy();
    }
    
    logger.info('Enhanced Digital Samba API Client destroyed');
  }
}

/**
 * Create an enhanced API client
 * @param apiKey API key
 * @param apiBaseUrl API base URL
 * @param options Additional options
 * @returns A new enhanced API client instance
 */
export function createEnhancedApiClient(
  apiKey?: string,
  apiBaseUrl?: string,
  options: EnhancedApiClientOptions = {}
): EnhancedDigitalSambaApiClient {
  return new EnhancedDigitalSambaApiClient(
    apiKey,
    apiBaseUrl,
    options.cache,
    options
  );
}

/**
 * Export default enhanced API client utilities
 */
export default {
  EnhancedDigitalSambaApiClient,
  createEnhancedApiClient
};
