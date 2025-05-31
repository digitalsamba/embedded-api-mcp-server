/**
 * Unit tests for the Rate Limiter
 * 
 * This file tests the rate limiting functionality including token bucket algorithm,
 * request throttling, and middleware integration.
 * 
 * @group unit
 * @group rate-limiter
 */

import { TokenBucketRateLimiter, createApiKeyRateLimiter } from '../../src/rate-limiter';
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

describe('TokenBucketRateLimiter', () => {
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
      const rateLimiter = new TokenBucketRateLimiter();
      expect(rateLimiter).toBeInstanceOf(TokenBucketRateLimiter);
    });
    
    it('should create a rate limiter with custom maxRequests', () => {
      const rateLimiter = new TokenBucketRateLimiter({ maxRequests: 100 });
      expect(rateLimiter).toBeInstanceOf(TokenBucketRateLimiter);
    });
    
    it('should create a rate limiter with custom windowMs', () => {
      const rateLimiter = new TokenBucketRateLimiter({ windowMs: 5000 });
      expect(rateLimiter).toBeInstanceOf(TokenBucketRateLimiter);
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
        setHeader: jest.fn(),
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
        setHeader: jest.fn(),
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
        error: 'Too Many Requests',
        message: 'Too many requests, please try again later.',
        status: 429
      });
    });
  });
});