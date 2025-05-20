/**
 * Digital Samba MCP Server - Rate Limiting Module
 * 
 * This module provides rate limiting functionality for the Digital Samba MCP Server.
 * It implements a token bucket algorithm for limiting the number of requests that can
 * be made in a given time period, helping to protect the Digital Samba API from abuse
 * and ensuring fair usage across clients.
 * 
 * Features include:
 * - Configurable rate limits (requests per minute, per hour)
 * - Memory-based storage for rate limiting data
 * - Optional Redis-based storage for distributed deployments
 * - Detailed logging of rate limiting events
 * - Configurable response behavior for rate limited requests
 * 
 * @module rate-limiter
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js built-in modules
import { IncomingMessage } from 'http';

// External dependencies 
import { Request, Response, NextFunction } from 'express';

// Local modules
import logger from './logger.js';
import { ApiRequestError } from './errors.js';

/**
 * Rate limiter options interface
 */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Whether to include headers in response */
  headers: boolean;
  
  /** Message to send when rate limit is exceeded */
  message?: string;
  
  /** Key function to identify requesters */
  keyGenerator: (req: Request) => string;
  
  /** Skip function to bypass rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  
  /** Handler for when rate limit is exceeded */
  handler?: (req: Request, res: Response) => void;
  
  /** Whether to trust the X-Forwarded-For header */
  trustProxy?: boolean;
}

/**
 * Rate limit status for a client
 */
interface RateLimitStatus {
  /** Number of tokens available */
  tokens: number;
  
  /** Last refill timestamp */
  lastRefill: number;
}

/**
 * Default options for the rate limiter
 */
export const defaultOptions: Partial<RateLimiterOptions> = {
  maxRequests: 60, // 60 requests per minute by default
  windowMs: 60 * 1000, // 1 minute
  headers: true,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => {
    // Default to using IP address as key
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || '127.0.0.1';
  },
  skip: () => false, // Don't skip any requests by default
  trustProxy: false
};

/**
 * TokenBucket rate limiter implementation
 * 
 * This class implements a token bucket algorithm for rate limiting.
 * Each client has a bucket that's refilled at a constant rate.
 * When a request is made, a token is consumed from the bucket.
 * If there are no tokens left, the request is rate limited.
 */
export class TokenBucketRateLimiter {
  private options: RateLimiterOptions;
  private store: Map<string, RateLimitStatus>;
  private tokensPerMs: number;

  /**
   * Creates a new TokenBucketRateLimiter
   * @param options Rate limiter options
   */
  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = { ...defaultOptions, ...options } as RateLimiterOptions;
    this.store = new Map<string, RateLimitStatus>();
    this.tokensPerMs = this.options.maxRequests / this.options.windowMs;
    
    logger.info('Rate limiter initialized', {
      maxRequests: this.options.maxRequests,
      windowMs: this.options.windowMs
    });
  }

  /**
   * Gets the current status for a client
   * @param key Client identifier
   * @returns Rate limit status
   */
  private getClientStatus(key: string): RateLimitStatus {
    const now = Date.now();
    let status = this.store.get(key);
    
    if (!status) {
      // New client, initialize with full bucket
      status = {
        tokens: this.options.maxRequests,
        lastRefill: now
      };
      this.store.set(key, status);
      return status;
    }
    
    // Refill tokens based on elapsed time
    const elapsedMs = now - status.lastRefill;
    if (elapsedMs > 0) {
      const tokensToAdd = elapsedMs * this.tokensPerMs;
      status.tokens = Math.min(status.tokens + tokensToAdd, this.options.maxRequests);
      status.lastRefill = now;
    }
    
    return status;
  }

  /**
   * Consumes a token for a client
   * @param key Client identifier
   * @returns Whether the token was successfully consumed
   */
  public consumeToken(key: string): boolean {
    const status = this.getClientStatus(key);
    
    if (status.tokens >= 1) {
      status.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Gets remaining tokens for a client
   * @param key Client identifier
   * @returns Number of tokens remaining
   */
  public getRemainingTokens(key: string): number {
    const status = this.getClientStatus(key);
    return Math.floor(status.tokens);
  }

  /**
   * Gets reset time for a client's rate limit
   * @param key Client identifier
   * @returns Timestamp when rate limit will reset
   */
  public getResetTime(key: string): number {
    const status = this.getClientStatus(key);
    const tokensNeeded = this.options.maxRequests - status.tokens;
    const msNeeded = tokensNeeded / this.tokensPerMs;
    
    return Date.now() + msNeeded;
  }

  /**
   * Middleware function for Express
   * @returns Express middleware
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip rate limiting if specified
      if (this.options.skip && this.options.skip(req)) {
        return next();
      }
      
      // Trust proxy if enabled
      if (this.options.trustProxy) {
        req.ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip;
      }
      
      // Generate client key
      const key = this.options.keyGenerator(req);
      
      // Check if client has tokens available
      const allowed = this.consumeToken(key);
      
      // Set rate limit headers if enabled
      if (this.options.headers) {
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', this.getRemainingTokens(key).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(this.getResetTime(key) / 1000).toString());
      }
      
      if (!allowed) {
        logger.warn('Rate limit exceeded', { key });
        
        if (this.options.handler) {
          return this.options.handler(req, res);
        }
        
        res.status(429).json({
          error: 'Too Many Requests',
          message: this.options.message,
          status: 429
        });
        return;
      }
      
      next();
    };
  }

  /**
   * Gets rate limit status for a client
   * @param key Client identifier
   * @returns Client rate limit status
   */
  public getStatus(key: string) {
    const status = this.getClientStatus(key);
    
    return {
      remaining: Math.floor(status.tokens),
      limit: this.options.maxRequests,
      reset: this.getResetTime(key)
    };
  }

  /**
   * Clears the rate limiter store
   */
  public reset(): void {
    this.store.clear();
    logger.info('Rate limiter store cleared');
  }
}

/**
 * Redis-backed token bucket rate limiter
 * This implementation uses Redis for storage, making it suitable for distributed deployments.
 * Note: This is a placeholder for the Redis implementation.
 * The actual implementation would use a Redis client library.
 */
export class RedisRateLimiter {
  // Redis implementation would go here
  // This is a placeholder class to show the interface
  
  constructor(options: Partial<RateLimiterOptions> = {}) {
    // Initialize with Redis client
    logger.info('Redis rate limiter initialized');
    
    throw new Error('Redis rate limiter not yet implemented');
  }
}

/**
 * Creates a rate limiter middleware for express
 * @param options Rate limiter options
 * @returns Express middleware
 */
export function createRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const limiter = new TokenBucketRateLimiter(options);
  return limiter.middleware();
}

/**
 * Creates an API key based rate limiter that limits requests per API key
 * @param options Rate limiter options
 * @returns Express middleware
 */
export function createApiKeyRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const apiKeyLimiter = new TokenBucketRateLimiter({
    ...options,
    keyGenerator: (req) => {
      // Extract API key from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return 'anonymous';
      }
      return authHeader.split(' ')[1];
    }
  });
  
  return apiKeyLimiter.middleware();
}

/**
 * Creates an IP based rate limiter that limits requests per IP address
 * @param options Rate limiter options
 * @returns Express middleware
 */
export function createIpRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  return createRateLimiter({
    trustProxy: true,
    ...options
  });
}

/**
 * Exports the default rate limiter
 */
export default {
  TokenBucketRateLimiter,
  RedisRateLimiter,
  createRateLimiter,
  createApiKeyRateLimiter,
  createIpRateLimiter
};
