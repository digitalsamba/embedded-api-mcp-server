/**
 * Digital Samba MCP Server - Connection Manager Module (Simplified)
 * 
 * This is a simplified version that focuses on basic fetch functionality
 * without the complexity of connection pools and reconnection logic.
 */
// Node.js built-in modules
import { EventEmitter } from 'events';

// External dependencies
import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';

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
  
  /** Function to create a fetch implementation (for testing) */
  fetchImpl?: typeof fetch;
}

/**
 * Simplified Connection Manager class
 */
export class ConnectionManager extends EventEmitter {
  private options: Required<ConnectionManagerOptions>;
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
      fetchImpl: options.fetchImpl || fetch
    };
    
    // Set fetch implementation
    this._fetch = this.options.fetchImpl;
    
    logger.info('Connection Manager initialized', {
      apiUrl: this.options.apiUrl
    });
  }
  
  /**
   * Execute a request
   * @param url URL to fetch
   * @param options Request options
   * @returns Promise resolving to the response
   */
  public async fetch(url: RequestInfo, options: RequestInit = {}): Promise<Response> {
    // Create full URL if relative
    const fullUrl = url.toString().startsWith('http') 
      ? url
      : `${this.options.apiUrl}${url.toString()}`;
    
    try {
      // Execute request
      const response = await this._fetch(fullUrl, options);
      
      // Return response
      return response;
    } catch (error) {
      // Log error
      logger.error('Error making request', {
        url: String(fullUrl).split('?')[0], // Log without query params
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Rethrow as API request error
      throw new ApiRequestError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined }
      );
    }
  }
  
  /**
   * Reset the connection manager
   */
  public reset(): void {
    logger.info('Connection manager reset');
    this.emit('reset');
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
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
