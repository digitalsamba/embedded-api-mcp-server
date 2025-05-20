/**
 * Digital Samba MCP Server - Connection Manager Module
 * 
 * This module provides functionality for managing connections to the Digital Samba API,
 * including connection keepalive, automatic reconnection, and connection pooling for
 * improved performance and stability in high-traffic scenarios.
 * 
 * Features include:
 * - Connection health monitoring
 * - Automatic reconnection with exponential backoff
 * - Connection pooling for improved throughput
 * - Connection keepalive to prevent timeouts
 * - Event emission for connection lifecycle events
 * 
 * @module connection-manager
 * @author Digital Samba Team
 * @version 0.1.0
 */
// Node.js built-in modules
import { EventEmitter } from 'events';

// External dependencies
import { RequestInfo, RequestInit, Response } from 'node-fetch';

// Local modules
import logger from './logger.js';
import { ApiRequestError, ApiResponseError } from './errors.js';

/**
 * Connection state enum
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Connection manager options
 */
export interface ConnectionManagerOptions {
  /** Base URL for the Digital Samba API */
  apiUrl: string;
  
  /** Number of connections in the pool (default: 5) */
  poolSize?: number;
  
  /** Maximum number of requests per connection (default: 1000) */
  maxRequestsPerConnection?: number;
  
  /** Whether to enable keepalive (default: true) */
  keepalive?: boolean;
  
  /** Keepalive interval in milliseconds (default: 30000) */
  keepaliveIntervalMs?: number;
  
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  
  /** Initial reconnection delay in milliseconds (default: 1000) */
  initialReconnectDelayMs?: number;
  
  /** Maximum reconnection delay in milliseconds (default: 30000) */
  maxReconnectDelayMs?: number;
  
  /** Whether to automatically reconnect (default: true) */
  autoReconnect?: boolean;
  
  /** Function to create a fetch implementation (for testing) */
  fetchImpl?: typeof fetch;
}

/**
 * Connection in the pool
 */
interface PoolConnection {
  /** Connection ID */
  id: string;
  
  /** Connection state */
  state: ConnectionState;
  
  /** Number of requests processed */
  requestCount: number;
  
  /** Last activity timestamp */
  lastActivity: number;
  
  /** Last error if any */
  lastError?: Error;
  
  /** Whether this connection is healthy */
  healthy: boolean;
}

/**
 * Connection request result
 */
interface ConnectionRequest {
  /** Request options */
  options: RequestInit;
  
  /** URL to fetch */
  url: RequestInfo;
  
  /** Resolve function */
  resolve: (value: Response) => void;
  
  /** Reject function */
  reject: (reason: any) => void;
  
  /** Timestamp when request was queued */
  queuedAt: number;
  
  /** Retry count for this request */
  retries: number;
}

/**
 * Connection Manager class
 * 
 * Manages connections to the Digital Samba API, handling connection pooling,
 * keepalive, and reconnection.
 */
export class ConnectionManager extends EventEmitter {
  private options: Required<ConnectionManagerOptions>;
  private pool: Map<string, PoolConnection> = new Map();
  private requestQueue: ConnectionRequest[] = [];
  private processing: boolean = false;
  private keepaliveTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempt: number = 0;
  private _fetch: typeof fetch;
  
  /**
   * Connection Manager constructor
   * @param options Connection manager options
   */
  constructor(options: ConnectionManagerOptions) {
    super();
    
    // Set default options
    this.options = {
      apiUrl: options.apiUrl,
      poolSize: options.poolSize || 5,
      maxRequestsPerConnection: options.maxRequestsPerConnection || 1000,
      keepalive: options.keepalive !== false,
      keepaliveIntervalMs: options.keepaliveIntervalMs || 30 * 1000, // 30 seconds
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      initialReconnectDelayMs: options.initialReconnectDelayMs || 1000, // 1 second
      maxReconnectDelayMs: options.maxReconnectDelayMs || 30 * 1000, // 30 seconds
      autoReconnect: options.autoReconnect !== false,
      fetchImpl: options.fetchImpl || fetch
    };
    
    // Set fetch implementation
    this._fetch = this.options.fetchImpl;
    
    logger.info('Connection Manager initialized', {
      apiUrl: this.options.apiUrl,
      poolSize: this.options.poolSize,
      keepalive: this.options.keepalive
    });
    
    // Initialize connection pool
    this.initializePool();
    
    // Start keepalive if enabled
    if (this.options.keepalive) {
      this.startKeepalive();
    }
  }
  
  /**
   * Initialize the connection pool
   */
  private initializePool(): void {
    // Clear existing pool
    this.pool.clear();
    
    // Create connections
    for (let i = 0; i < this.options.poolSize; i++) {
      const id = `conn-${i}`;
      
      this.pool.set(id, {
        id,
        state: ConnectionState.DISCONNECTED,
        requestCount: 0,
        lastActivity: Date.now(),
        healthy: true
      });
    }
    
    logger.debug('Connection pool initialized', { poolSize: this.options.poolSize });
  }
  
  /**
   * Start the keepalive timer
   */
  private startKeepalive(): void {
    // Clear existing timer
    this.stopKeepalive();
    
    // Set up new timer
    this.keepaliveTimer = setInterval(() => {
      this.performKeepalive();
    }, this.options.keepaliveIntervalMs);
    
    logger.debug('Keepalive timer started', { 
      interval: `${this.options.keepaliveIntervalMs / 1000} seconds` 
    });
  }
  
  /**
   * Stop the keepalive timer
   */
  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = undefined;
      
      logger.debug('Keepalive timer stopped');
    }
  }
  
  /**
   * Perform keepalive check on all connections
   */
  private async performKeepalive(): Promise<void> {
    logger.debug('Performing keepalive check');
    
    // Count of healthy connections
    let healthyCount = 0;
    
    // Check each connection
    for (const [id, connection] of this.pool.entries()) {
      // Skip connections that are already known to be unhealthy
      if (!connection.healthy) {
        continue;
      }
      
      // Check if connection is idle for too long
      const idleTime = Date.now() - connection.lastActivity;
      if (idleTime > this.options.keepaliveIntervalMs * 2) {
        logger.debug('Connection idle for too long, checking health', { 
          connectionId: id, 
          idleTime: `${Math.round(idleTime / 1000)} seconds` 
        });
        
        try {
          // Perform health check
          await this.checkConnectionHealth(connection);
          
          // Update healthy connections count
          healthyCount++;
        } catch (error) {
          logger.warn('Connection health check failed', {
            connectionId: id,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Mark connection as unhealthy
          connection.healthy = false;
          connection.state = ConnectionState.ERROR;
          connection.lastError = error instanceof Error ? error : new Error(String(error));
          
          // Emit event
          this.emit('connection:error', { 
            connectionId: id, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      } else {
        // Connection is active, consider it healthy
        healthyCount++;
      }
    }
    
    // Check if we need to reconnect
    if (healthyCount === 0 && this.options.autoReconnect) {
      logger.warn('No healthy connections, initiating reconnect');
      
      this.reconnect();
    } else {
      logger.debug('Keepalive check completed', { healthyConnections: healthyCount });
    }
  }
  
  /**
   * Check the health of a connection
   * @param connection Connection to check
   */
  private async checkConnectionHealth(connection: PoolConnection): Promise<void> {
    try {
      // Mark as connecting during health check
      connection.state = ConnectionState.CONNECTING;
      
      // Simple health check by fetching API root
      const response = await this._fetch(`${this.options.apiUrl}`, {
        method: 'HEAD',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Check response
      if (response.ok) {
        connection.state = ConnectionState.CONNECTED;
        connection.lastActivity = Date.now();
        connection.healthy = true;
        
        logger.debug('Connection health check successful', { connectionId: connection.id });
      } else {
        throw new ApiResponseError(
          `API returned non-OK status: ${response.status}`,
          { statusCode: response.status }
        );
      }
    } catch (error) {
      // Update connection state
      connection.state = ConnectionState.ERROR;
      connection.lastError = error instanceof Error ? error : new Error(String(error));
      connection.healthy = false;
      
      logger.warn('Connection health check failed', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Rethrow for caller
      throw error;
    }
  }
  
  /**
   * Reconnect all connections
   */
  private reconnect(): void {
    // Don't reconnect if already reconnecting
    if (this.reconnectTimer) {
      return;
    }
    
    // Check if we've exceeded maximum reconnect attempts
    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      logger.error('Maximum reconnect attempts reached', {
        attempts: this.reconnectAttempt,
        max: this.options.maxReconnectAttempts
      });
      
      // Emit event
      this.emit('reconnect:failed', { 
        attempts: this.reconnectAttempt,
        max: this.options.maxReconnectAttempts
      });
      
      // Reset reconnect attempt counter for next time
      this.reconnectAttempt = 0;
      
      return;
    }
    
    // Increment reconnect attempt counter
    this.reconnectAttempt++;
    
    // Calculate backoff time
    const backoffTime = Math.min(
      this.options.initialReconnectDelayMs * Math.pow(2, this.reconnectAttempt - 1),
      this.options.maxReconnectDelayMs
    );
    
    logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempt,
      delay: `${backoffTime / 1000} seconds`,
      max: this.options.maxReconnectAttempts
    });
    
    // Emit event
    this.emit('reconnect:scheduled', { 
      attempt: this.reconnectAttempt, 
      delayMs: backoffTime,
      max: this.options.maxReconnectAttempts
    });
    
    // Schedule reconnect
    this.reconnectTimer = setTimeout(() => {
      this.performReconnect();
    }, backoffTime);
  }
  
  /**
   * Perform the actual reconnection
   */
  private async performReconnect(): Promise<void> {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    logger.info('Performing reconnect', { attempt: this.reconnectAttempt });
    
    // Emit event
    this.emit('reconnect:starting', { attempt: this.reconnectAttempt });
    
    // Reinitialize pool
    this.initializePool();
    
    // Track success
    let successCount = 0;
    
    // Test each connection
    for (const [id, connection] of this.pool.entries()) {
      try {
        // Update connection state
        connection.state = ConnectionState.RECONNECTING;
        
        logger.debug('Testing connection during reconnect', { connectionId: id });
        
        // Check connection health
        await this.checkConnectionHealth(connection);
        
        // Connection is healthy
        successCount++;
        
        logger.debug('Connection reconnected successfully', { connectionId: id });
      } catch (error) {
        logger.warn('Connection reconnect failed', {
          connectionId: id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Check if reconnect was successful
    if (successCount > 0) {
      logger.info('Reconnect successful', { 
        successCount, 
        totalConnections: this.pool.size 
      });
      
      // Reset reconnect attempt counter
      this.reconnectAttempt = 0;
      
      // Resume request processing
      this.processRequestQueue();
      
      // Emit event
      this.emit('reconnect:success', { 
        successCount, 
        totalConnections: this.pool.size 
      });
    } else {
      logger.warn('Reconnect failed, scheduling another attempt', {
        attempt: this.reconnectAttempt,
        max: this.options.maxReconnectAttempts
      });
      
      // Schedule another reconnect
      this.reconnect();
      
      // Emit event
      this.emit('reconnect:retry', { 
        attempt: this.reconnectAttempt,
        max: this.options.maxReconnectAttempts
      });
    }
  }
  
  /**
   * Get a healthy connection from the pool
   * @returns A healthy connection or undefined if none available
   */
  private getHealthyConnection(): PoolConnection | undefined {
    // Find connections that are healthy and haven't reached max requests
    const eligibleConnections = Array.from(this.pool.values()).filter(conn => 
      conn.healthy && 
      conn.state === ConnectionState.CONNECTED &&
      conn.requestCount < this.options.maxRequestsPerConnection
    );
    
    if (eligibleConnections.length === 0) {
      return undefined;
    }
    
    // Sort by request count (least busy first)
    eligibleConnections.sort((a, b) => a.requestCount - b.requestCount);
    
    return eligibleConnections[0];
  }
  
  /**
   * Process the request queue
   */
  private async processRequestQueue(): Promise<void> {
    // Don't process if already processing or queue is empty
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }
    
    // Set processing flag
    this.processing = true;
    
    logger.debug('Processing request queue', { queueLength: this.requestQueue.length });
    
    try {
      // Process requests until queue is empty
      while (this.requestQueue.length > 0) {
        // Check if we have a healthy connection
        const connection = this.getHealthyConnection();
        if (!connection) {
          logger.warn('No healthy connections available for request processing');
          
          // Check if we should reconnect
          if (this.options.autoReconnect && !this.reconnectTimer) {
            this.reconnect();
          }
          
          // Exit processing loop
          break;
        }
        
        // Get next request
        const request = this.requestQueue.shift();
        if (!request) {
          break;
        }
        
        try {
          // Update connection state
          connection.requestCount++;
          connection.lastActivity = Date.now();
          
          logger.debug('Processing request', { 
            connectionId: connection.id, 
            method: request.options.method || 'GET',
            url: String(request.url).split('?')[0] // Log without query params
          });
          
          // Execute request
          const response = await this._fetch(request.url, request.options);
          
          // Resolve promise
          request.resolve(response);
          
          // Log successful request
          logger.debug('Request completed successfully', {
            connectionId: connection.id,
            statusCode: response.status,
            method: request.options.method || 'GET'
          });
        } catch (error) {
          logger.error('Error processing request', {
            connectionId: connection.id,
            error: error instanceof Error ? error.message : String(error),
            method: request.options.method || 'GET',
            url: String(request.url).split('?')[0] // Log without query params
          });
          
          // Mark connection as unhealthy if it's a connection error
          if (error instanceof ApiRequestError) {
            connection.healthy = false;
            connection.state = ConnectionState.ERROR;
            connection.lastError = error;
            
            // Emit event
            this.emit('connection:error', { 
              connectionId: connection.id, 
              error: error.message 
            });
            
            // Retry request if we have attempts left
            if (request.retries < 3) {
              logger.info('Retrying failed request', {
                retryCount: request.retries + 1,
                method: request.options.method || 'GET'
              });
              
              // Increment retry count
              request.retries++;
              
              // Add back to queue
              this.requestQueue.unshift(request);
              continue;
            }
          }
          
          // Reject promise
          request.reject(error);
        }
      }
    } finally {
      // Clear processing flag
      this.processing = false;
      
      // If queue still has items, schedule another processing run
      if (this.requestQueue.length > 0) {
        process.nextTick(() => this.processRequestQueue());
      }
    }
  }
  
  /**
   * Execute a request using the connection pool
   * @param url URL to fetch
   * @param options Request options
   * @returns Promise resolving to the response
   */
  public async fetch(url: RequestInfo, options: RequestInit = {}): Promise<Response> {
    // Create full URL if relative
    const fullUrl = url.toString().startsWith('http') 
      ? url
      : `${this.options.apiUrl}${url.toString()}`;
    
    // Create promise
    return new Promise<Response>((resolve, reject) => {
      // Add to request queue
      this.requestQueue.push({
        url: fullUrl,
        options,
        resolve,
        reject,
        queuedAt: Date.now(),
        retries: 0
      });
      
      // Start processing queue
      this.processRequestQueue();
    });
  }
  
  /**
   * Check if connection manager has healthy connections
   * @returns Whether the connection manager has healthy connections
   */
  public isHealthy(): boolean {
    // Count healthy connections
    const healthyCount = Array.from(this.pool.values()).filter(conn => conn.healthy).length;
    
    return healthyCount > 0;
  }
  
  /**
   * Get connection manager statistics
   * @returns Connection manager statistics
   */
  public getStats() {
    // Count connections by state
    const stateCount: Record<ConnectionState, number> = {
      [ConnectionState.CONNECTING]: 0,
      [ConnectionState.CONNECTED]: 0,
      [ConnectionState.DISCONNECTED]: 0,
      [ConnectionState.RECONNECTING]: 0,
      [ConnectionState.ERROR]: 0
    };
    
    let totalRequests = 0;
    let healthyConnections = 0;
    
    for (const conn of this.pool.values()) {
      stateCount[conn.state]++;
      totalRequests += conn.requestCount;
      
      if (conn.healthy) {
        healthyConnections++;
      }
    }
    
    return {
      poolSize: this.pool.size,
      queueLength: this.requestQueue.length,
      connectionStates: stateCount,
      totalRequests,
      healthyConnections,
      reconnectAttempt: this.reconnectAttempt,
      processing: this.processing
    };
  }
  
  /**
   * Reset connections and statistics
   */
  public reset(): void {
    // Stop timers
    this.stopKeepalive();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Clear request queue and resolve all with errors
    for (const request of this.requestQueue) {
      request.reject(new Error('Connection manager reset'));
    }
    this.requestQueue = [];
    
    // Reset processing flag
    this.processing = false;
    
    // Reset reconnect attempt counter
    this.reconnectAttempt = 0;
    
    // Reinitialize pool
    this.initializePool();
    
    // Restart keepalive if enabled
    if (this.options.keepalive) {
      this.startKeepalive();
    }
    
    logger.info('Connection manager reset');
    
    // Emit event
    this.emit('reset');
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    // Stop timers
    this.stopKeepalive();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Clear request queue and resolve all with errors
    for (const request of this.requestQueue) {
      request.reject(new Error('Connection manager destroyed'));
    }
    this.requestQueue = [];
    
    // Clear pool
    this.pool.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('Connection manager destroyed');
  }
}

/**
 * Create a connection manager
 * @param apiUrl API URL
 * @param options Additional connection manager options
 * @returns A new connection manager instance
 */
export function createConnectionManager(
  apiUrl: string,
  options: Partial<Omit<ConnectionManagerOptions, 'apiUrl'>> = {}
): ConnectionManager {
  return new ConnectionManager({
    apiUrl,
    ...options
  });
}

/**
 * Export default connection manager utilities
 */
export default {
  ConnectionManager,
  createConnectionManager,
  ConnectionState
};
