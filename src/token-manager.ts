/**
 * Digital Samba MCP Server - Token Manager Module
 * 
 * This module provides functionality for managing API tokens, including automatic
 * refresh of tokens when they expire and connection management for maintaining
 * a stable connection to the Digital Samba API.
 * 
 * Features include:
 * - Token refresh based on expiration monitoring
 * - Background token refresh to avoid service interruption
 * - Automatic retry with exponential backoff for failed refresh attempts
 * - Event emission for token refresh lifecycle events
 * - Configurable refresh settings
 * 
 * @module token-manager
 * @author Digital Samba Team
 * @version 0.1.0
 */
// Node.js built-in modules
import { EventEmitter } from 'events';

// Local modules
import logger from './logger.js';
import apiKeyContext from './auth.js';
import { AuthenticationError } from './errors.js';
import { DigitalSambaApiClient, TokenOptions } from './digital-samba-api.js';

/**
 * Token manager options interface
 */
export interface TokenManagerOptions {
  /** API URL for the Digital Samba API */
  apiUrl?: string;
  
  /** Room ID for generating tokens */
  roomId: string;
  
  /** Token options for generating tokens */
  tokenOptions: TokenOptions;
  
  /** Refresh margin before expiration in milliseconds (default: 5 minutes) */
  refreshMarginMs?: number;
  
  /** Maximum number of refresh attempts (default: 3) */
  maxRefreshAttempts?: number;
  
  /** Initial backoff time for failed refresh attempts in milliseconds (default: 1000) */
  initialBackoffMs?: number;
  
  /** Maximum backoff time for failed refresh attempts in milliseconds (default: 30000) */
  maxBackoffMs?: number;
  
  /** Whether to retry on auth errors (default: false) */
  retryOnAuthError?: boolean;
}

/**
 * Token object with expiration and other metadata
 */
export interface Token {
  /** The actual token string */
  token: string;
  
  /** The room link */
  link: string;
  
  /** When the token was created */
  createdAt: Date;
  
  /** When the token expires, calculated from token options */
  expiresAt: Date;
  
  /** Session ID associated with this token */
  sessionId?: string;
}

/**
 * Token refresh result
 */
interface TokenRefreshResult {
  /** The new token */
  token: Token;
  
  /** Whether the refresh was successful */
  success: boolean;
  
  /** Error message if refresh failed */
  error?: string;
  
  /** The attempt number */
  attempt: number;
}

/**
 * Token Manager class
 * 
 * Manages room tokens for the Digital Samba API, handling automatic refresh
 * and expiration monitoring.
 */
export class TokenManager extends EventEmitter {
  private options: Required<TokenManagerOptions>;
  private tokens: Map<string, Token> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private refreshing: Map<string, boolean> = new Map();
  private apiClient: DigitalSambaApiClient;
  
  /**
   * Token Manager constructor
   * @param options Token manager options
   */
  constructor(options: TokenManagerOptions) {
    super();
    
    // Set default options
    this.options = {
      apiUrl: process.env.DIGITAL_SAMBA_API_URL || 'https://api.digitalsamba.com/api/v1',
      roomId: options.roomId,
      tokenOptions: options.tokenOptions,
      refreshMarginMs: options.refreshMarginMs || 5 * 60 * 1000, // 5 minutes
      maxRefreshAttempts: options.maxRefreshAttempts || 3,
      initialBackoffMs: options.initialBackoffMs || 1000, // 1 second
      maxBackoffMs: options.maxBackoffMs || 30 * 1000, // 30 seconds
      retryOnAuthError: options.retryOnAuthError || false
    };
    
    // Initialize API client
    this.apiClient = new DigitalSambaApiClient(undefined, this.options.apiUrl);
    
    logger.info('Token Manager initialized', {
      roomId: this.options.roomId,
      refreshMargin: `${this.options.refreshMarginMs / 1000} seconds`,
      maxRefreshAttempts: this.options.maxRefreshAttempts
    });
  }
  
  /**
   * Generate a new token
   * @param sessionId Session ID for the token
   * @param apiKey API key to use for token generation
   * @returns Promise resolving to the generated token
   */
  public async generateToken(sessionId: string, apiKey?: string): Promise<Token> {
    try {
      logger.info('Generating new token', { sessionId, roomId: this.options.roomId });
      
      // If API key is provided, use it directly
      const client = apiKey 
        ? new DigitalSambaApiClient(apiKey, this.options.apiUrl)
        : this.apiClient;
      
      const response = await client.generateRoomToken(this.options.roomId, this.options.tokenOptions);
      
      // Calculate expiration time
      const expiresInMinutes = this.options.tokenOptions.exp 
        ? parseInt(this.options.tokenOptions.exp, 10) 
        : 60; // Default to 1 hour if not specified
      
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + (expiresInMinutes * 60 * 1000));
      
      // Create token object
      const token: Token = {
        token: response.token,
        link: response.link,
        createdAt,
        expiresAt,
        sessionId
      };
      
      // Store token
      this.tokens.set(sessionId, token);
      
      // Schedule refresh
      this.scheduleRefresh(sessionId);
      
      logger.info('Token generated successfully', { 
        sessionId, 
        expires: expiresAt.toISOString() 
      });
      
      // Emit event
      this.emit('token:generated', { sessionId, expiresAt });
      
      return token;
    } catch (error) {
      logger.error('Error generating token', {
        sessionId,
        roomId: this.options.roomId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Emit event
      this.emit('token:error', { 
        sessionId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      throw error;
    }
  }
  
  /**
   * Get a token for a session
   * @param sessionId Session ID
   * @returns The token or undefined if not found
   */
  public getToken(sessionId: string): Token | undefined {
    return this.tokens.get(sessionId);
  }
  
  /**
   * Check if a token is expired
   * @param token Token to check
   * @returns Whether the token is expired
   */
  public isTokenExpired(token: Token): boolean {
    return token.expiresAt.getTime() <= Date.now();
  }
  
  /**
   * Check if a token is about to expire (within the refresh margin)
   * @param token Token to check
   * @returns Whether the token is about to expire
   */
  public isTokenExpiring(token: Token): boolean {
    return token.expiresAt.getTime() <= (Date.now() + this.options.refreshMarginMs);
  }
  
  /**
   * Schedule a token refresh
   * @param sessionId Session ID
   */
  private scheduleRefresh(sessionId: string): void {
    // Clear any existing timer
    this.clearRefreshTimer(sessionId);
    
    const token = this.tokens.get(sessionId);
    if (!token) {
      logger.warn('Cannot schedule refresh for non-existent token', { sessionId });
      return;
    }
    
    // Calculate time until refresh
    const now = Date.now();
    const refreshTime = token.expiresAt.getTime() - this.options.refreshMarginMs;
    const timeUntilRefresh = Math.max(0, refreshTime - now);
    
    logger.debug('Scheduling token refresh', {
      sessionId,
      refreshIn: `${Math.round(timeUntilRefresh / 1000)} seconds`,
      expiresAt: token.expiresAt.toISOString()
    });
    
    // Set refresh timer
    const timerId = setTimeout(() => {
      this.refreshToken(sessionId);
    }, timeUntilRefresh);
    
    // Store timer reference
    this.refreshTimers.set(sessionId, timerId);
  }
  
  /**
   * Clear a refresh timer
   * @param sessionId Session ID
   */
  private clearRefreshTimer(sessionId: string): void {
    const timerId = this.refreshTimers.get(sessionId);
    if (timerId) {
      clearTimeout(timerId);
      this.refreshTimers.delete(sessionId);
    }
  }
  
  /**
   * Refresh a token
   * @param sessionId Session ID
   * @param attempt Attempt number (for retries)
   */
  private async refreshToken(sessionId: string, attempt: number = 1): Promise<void> {
    // Check if already refreshing
    if (this.refreshing.get(sessionId)) {
      logger.debug('Token refresh already in progress', { sessionId });
      return;
    }
    
    this.refreshing.set(sessionId, true);
    
    try {
      logger.info('Refreshing token', { sessionId, attempt });
      
      // Emit event
      this.emit('token:refreshing', { sessionId, attempt });
      
      // Get API key from context
      const apiKey = apiKeyContext.getApiKey(sessionId);
      if (!apiKey) {
        throw new AuthenticationError('No API key found for session');
      }
      
      // Generate new token
      const token = await this.generateToken(sessionId, apiKey);
      
      // Emit success event
      this.emit('token:refreshed', { 
        sessionId, 
        expiresAt: token.expiresAt 
      });
      
      logger.info('Token refreshed successfully', {
        sessionId,
        expiresAt: token.expiresAt.toISOString()
      });
    } catch (error) {
      logger.error('Error refreshing token', {
        sessionId,
        attempt,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Check if we should retry
      const isAuthError = error instanceof AuthenticationError;
      if (
        attempt < this.options.maxRefreshAttempts && 
        (!isAuthError || this.options.retryOnAuthError)
      ) {
        // Calculate backoff time with exponential backoff
        const backoffTime = Math.min(
          this.options.initialBackoffMs * Math.pow(2, attempt - 1),
          this.options.maxBackoffMs
        );
        
        logger.info('Scheduling token refresh retry', {
          sessionId,
          attempt: attempt + 1,
          backoffTime: `${backoffTime / 1000} seconds`
        });
        
        // Schedule retry
        setTimeout(() => {
          this.refreshToken(sessionId, attempt + 1);
        }, backoffTime);
        
        // Emit retry event
        this.emit('token:refresh-retry', { 
          sessionId, 
          attempt, 
          nextAttempt: attempt + 1, 
          backoffMs: backoffTime 
        });
      } else {
        // Max attempts reached or auth error
        logger.error('Token refresh failed after max attempts', {
          sessionId,
          maxAttempts: this.options.maxRefreshAttempts
        });
        
        // Emit failure event
        this.emit('token:refresh-failed', { 
          sessionId, 
          attempts: attempt,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      this.refreshing.set(sessionId, false);
    }
  }
  
  /**
   * Remove a token
   * @param sessionId Session ID
   * @returns Whether the token was removed
   */
  public removeToken(sessionId: string): boolean {
    // Clear refresh timer
    this.clearRefreshTimer(sessionId);
    
    // Remove from refreshing map
    this.refreshing.delete(sessionId);
    
    // Remove from tokens map
    const removed = this.tokens.delete(sessionId);
    
    if (removed) {
      logger.info('Token removed', { sessionId });
      
      // Emit event
      this.emit('token:removed', { sessionId });
    }
    
    return removed;
  }
  
  /**
   * Get all managed tokens
   * @returns All tokens
   */
  public getAllTokens(): Map<string, Token> {
    return new Map(this.tokens);
  }
  
  /**
   * Get statistics about managed tokens
   * @returns Token statistics
   */
  public getStats(): {
    totalTokens: number;
    expiredTokens: number;
    expiringTokens: number;
    activeRefreshes: number;
  } {
    const now = Date.now();
    let expiredTokens = 0;
    let expiringTokens = 0;
    
    for (const token of this.tokens.values()) {
      if (token.expiresAt.getTime() <= now) {
        expiredTokens++;
      } else if (token.expiresAt.getTime() <= (now + this.options.refreshMarginMs)) {
        expiringTokens++;
      }
    }
    
    return {
      totalTokens: this.tokens.size,
      expiredTokens,
      expiringTokens,
      activeRefreshes: Array.from(this.refreshing.values()).filter(r => r).length
    };
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clear all refresh timers
    for (const timerId of this.refreshTimers.values()) {
      clearTimeout(timerId);
    }
    
    // Clear maps
    this.refreshTimers.clear();
    this.refreshing.clear();
    this.tokens.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('Token Manager destroyed');
  }
}

/**
 * Create a token manager for a room
 * @param roomId Room ID
 * @param tokenOptions Token options
 * @param options Additional token manager options
 * @returns A new token manager instance
 */
export function createTokenManager(
  roomId: string,
  tokenOptions: TokenOptions,
  options: Partial<Omit<TokenManagerOptions, 'roomId' | 'tokenOptions'>> = {}
): TokenManager {
  return new TokenManager({
    roomId,
    tokenOptions,
    ...options
  });
}

/**
 * Export default token manager utilities
 */
export default {
  TokenManager,
  createTokenManager
};
