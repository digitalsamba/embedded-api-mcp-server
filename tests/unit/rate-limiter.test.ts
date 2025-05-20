/**
 * Unit tests for the API Key Rate Limiter
 * 
 * This file tests the rate limiting functionality including token bucket algorithm,
 * request throttling, and middleware integration.
 * 
 * @group unit
 * @group rate-limiter
 */

import { ApiKeyRateLimiter, createApiKeyRateLimiter } from '../../src/rate-limiter';
import { extractApiKey } from '../../src/auth';

// Mock the auth module
jest.mock('../../src/auth', () => ({
  extractApiKey: jest.fn(),
}));

// Mock the logger
jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the metrics registry
jest.mock('../../src/metrics', () => ({
  __esModule: true,
  default: {
    rateLimitedRequests: {
      inc: jest.fn(),
    },
    rateLimitTokensAvailable: {
      set: jest.fn(),
    },
  },
}));

describe('ApiKeyRateLimiter', () => {
  // Mock Date.now for time-based tests
  const originalDateNow = Date.now;
  let currentTime = 1622000000000; // Fixed timestamp for testing
  
  beforeEach(() => {
    // Mock Date.now to return controlled time
    Date.now = jest.fn(() => currentTime);
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
  });
  
  describe('Constructor', () => {
    it('should create a rate limiter with default options', () => {
      const rateLimiter = new ApiKeyRateLimiter();
      expect(rateLimiter).toBeInstanceOf(ApiKeyRateLimiter);
    });
    
    it('should create a rate limiter with custom maxRequests', () => {
      const rateLimiter = new ApiKeyRateLimiter({ maxRequests: 100 });
      expect(rateLimiter).toBeInstanceOf(ApiKeyRateLimiter);
    });
    
    it('should create a rate limiter with custom windowMs', () => {
      const rateLimiter = new ApiKeyRateLimiter({ windowMs: 5000 });
      expect(rateLimiter).toBeInstanceOf(ApiKeyRateLimiter);
    });
  });
  
  describe('consumeToken', () => {
    it('should allow requests under the rate limit', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey = 'test-key';
      
      // Make 10 requests (at the limit)
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
    });
    
    it('should block requests over the rate limit', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey = 'test-key';
      
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // The 6th request should be blocked
      expect(rateLimiter.consumeToken(apiKey)).toBe(false);
    });
    
    it('should replenish tokens over time', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey = 'test-key';
      
      // Use all 10 tokens
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // No more tokens available
      expect(rateLimiter.consumeToken(apiKey)).toBe(false);
      
      // Advance time by 30 seconds (should replenish 5 tokens)
      currentTime += 30000;
      
      // Should now have 5 tokens available
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // No more tokens available
      expect(rateLimiter.consumeToken(apiKey)).toBe(false);
      
      // Advance time by another 30 seconds (should replenish 5 more tokens)
      currentTime += 30000;
      
      // Should now have 5 more tokens available
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // No more tokens available
      expect(rateLimiter.consumeToken(apiKey)).toBe(false);
    });
    
    it('should not exceed the maximum token limit', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey = 'test-key';
      
      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // Advance time by 2 minutes (should regenerate all tokens and more)
      currentTime += 120000;
      
      // Should only have 10 tokens available (the maximum)
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.consumeToken(apiKey)).toBe(true);
      }
      
      // No more tokens available
      expect(rateLimiter.consumeToken(apiKey)).toBe(false);
    });
    
    it('should track remaining tokens correctly', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey = 'test-key';
      
      // Initially should have 10 tokens
      expect(rateLimiter.getRemainingTokens(apiKey)).toBe(10);
      
      // Use 3 tokens
      for (let i = 0; i < 3; i++) {
        rateLimiter.consumeToken(apiKey);
      }
      
      // Should have 7 tokens remaining
      expect(rateLimiter.getRemainingTokens(apiKey)).toBe(7);
      
      // Advance time by 30 seconds (should replenish 5 tokens, but max is 10)
      currentTime += 30000;
      
      // Should now have 10 tokens (7 + 5 = 12, but max is 10)
      expect(rateLimiter.getRemainingTokens(apiKey)).toBe(10);
    });
    
    it('should handle multiple API keys independently', () => {
      const rateLimiter = new ApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
      
      const apiKey1 = 'api-key-1';
      const apiKey2 = 'api-key-2';
      
      // Use 3 tokens for apiKey1
      for (let i = 0; i < 3; i++) {
        rateLimiter.consumeToken(apiKey1);
      }
      
      // Use 4 tokens for apiKey2
      for (let i = 0; i < 4; i++) {
        rateLimiter.consumeToken(apiKey2);
      }
      
      // apiKey1 should have 2 tokens remaining
      expect(rateLimiter.getRemainingTokens(apiKey1)).toBe(2);
      
      // apiKey2 should have 1 token remaining
      expect(rateLimiter.getRemainingTokens(apiKey2)).toBe(1);
      
      // Use 2 more tokens for apiKey1
      for (let i = 0; i < 2; i++) {
        rateLimiter.consumeToken(apiKey1);
      }
      
      // apiKey1 should have 0 tokens remaining
      expect(rateLimiter.getRemainingTokens(apiKey1)).toBe(0);
      
      // apiKey2 should still have 1 token remaining
      expect(rateLimiter.getRemainingTokens(apiKey2)).toBe(1);
    });
  });
  
  describe('Express Middleware', () => {
    it('should create middleware that allows requests under the limit', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
      
      // Mock express request and response
      const req = { headers: { authorization: 'Bearer test-key' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return a key
      (extractApiKey as jest.Mock).mockReturnValue('test-key');
      
      // Call middleware
      middleware(req as any, res as any, next);
      
      // Should call next() without error
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    it('should block requests over the limit', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 2,
        windowMs: 60000, // 1 minute
      });
      
      // Mock express request and response
      const req = { headers: { authorization: 'Bearer test-key' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return a key
      (extractApiKey as jest.Mock).mockReturnValue('test-key');
      
      // Call middleware twice - should be allowed
      middleware(req as any, res as any, next);
      middleware(req as any, res as any, next);
      
      // Next should have been called twice
      expect(next).toHaveBeenCalledTimes(2);
      
      // Third call should be rate limited
      middleware(req as any, res as any, next);
      
      // Should not call next() again
      expect(next).toHaveBeenCalledTimes(2);
      
      // Should return 429 Too Many Requests
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
    
    it('should include rate limit headers in the response', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
      
      // Mock express request and response
      const req = { headers: { authorization: 'Bearer test-key' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return a key
      (extractApiKey as jest.Mock).mockReturnValue('test-key');
      
      // Call middleware
      middleware(req as any, res as any, next);
      
      // Should set rate limit headers
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });
    
    it('should use default message for rate limited requests', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 1,
        windowMs: 60000, // 1 minute
      });
      
      // Mock express request and response
      const req = { headers: { authorization: 'Bearer test-key' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return a key
      (extractApiKey as jest.Mock).mockReturnValue('test-key');
      
      // First call is allowed
      middleware(req as any, res as any, next);
      
      // Second call should be rate limited
      middleware(req as any, res as any, next);
      
      // Should return 429 with default message
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests, please try again later.'
      });
    });
    
    it('should use custom message for rate limited requests', () => {
      const customMessage = 'Custom rate limit message';
      const middleware = createApiKeyRateLimiter({
        maxRequests: 1,
        windowMs: 60000, // 1 minute
        message: customMessage,
      });
      
      // Mock express request and response
      const req = { headers: { authorization: 'Bearer test-key' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return a key
      (extractApiKey as jest.Mock).mockReturnValue('test-key');
      
      // First call is allowed
      middleware(req as any, res as any, next);
      
      // Second call should be rate limited
      middleware(req as any, res as any, next);
      
      // Should return 429 with custom message
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: customMessage
      });
    });
    
    it('should allow request without API key if skipIfNoApiKey is true', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
        skipIfNoApiKey: true,
      });
      
      // Mock express request and response
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return undefined (no API key)
      (extractApiKey as jest.Mock).mockReturnValue(undefined);
      
      // Call middleware
      middleware(req as any, res as any, next);
      
      // Should call next() without error
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should block request without API key if skipIfNoApiKey is false', () => {
      const middleware = createApiKeyRateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
        skipIfNoApiKey: false,
      });
      
      // Mock express request and response
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
      };
      const next = jest.fn();
      
      // Mock extractApiKey to return undefined (no API key)
      (extractApiKey as jest.Mock).mockReturnValue(undefined);
      
      // Call middleware
      middleware(req as any, res as any, next);
      
      // Should return 401 Unauthorized
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing API key'
      });
    });
  });
});
