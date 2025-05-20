/**
 * Tests for the rate-limiter module
 */
import { TokenBucketRateLimiter, createApiKeyRateLimiter } from '../src/rate-limiter';

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      maxRequests: 10,
      windowMs: 1000, // 1 second
    });
  });

  test('should initialize with correct options', () => {
    expect(limiter).toBeDefined();
  });

  test('should allow requests within the rate limit', () => {
    const key = 'test-key';
    
    // Should allow 10 requests
    for (let i = 0; i < 10; i++) {
      expect(limiter.consumeToken(key)).toBe(true);
    }
    
    // Should block the 11th request
    expect(limiter.consumeToken(key)).toBe(false);
  });

  test('should refill tokens over time', async () => {
    const key = 'test-key';
    
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      expect(limiter.consumeToken(key)).toBe(true);
    }
    
    // No tokens left
    expect(limiter.consumeToken(key)).toBe(false);
    
    // Wait for tokens to refill (half window time)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Should have ~5 tokens now (half of max)
    expect(limiter.getRemainingTokens(key)).toBeGreaterThanOrEqual(4);
    expect(limiter.getRemainingTokens(key)).toBeLessThanOrEqual(6);
    
    // Should be able to consume ~5 tokens
    for (let i = 0; i < 5; i++) {
      expect(limiter.consumeToken(key)).toBe(true);
    }
  });

  test('should track different keys separately', () => {
    const key1 = 'test-key-1';
    const key2 = 'test-key-2';
    
    // Consume all tokens for key1
    for (let i = 0; i < 10; i++) {
      expect(limiter.consumeToken(key1)).toBe(true);
    }
    
    // No tokens left for key1
    expect(limiter.consumeToken(key1)).toBe(false);
    
    // But key2 should still have tokens
    expect(limiter.consumeToken(key2)).toBe(true);
  });

  test('should reset the store', () => {
    const key = 'test-key';
    
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      limiter.consumeToken(key);
    }
    
    // Reset the store
    limiter.reset();
    
    // Should be able to consume tokens again
    expect(limiter.consumeToken(key)).toBe(true);
  });
});

// Mock Express Request and Response
const mockRequest = (headers: Record<string, string> = {}) => ({
  headers,
  ip: '127.0.0.1'
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
};

const mockNext = jest.fn();

describe('createApiKeyRateLimiter middleware', () => {
  test('should create middleware that rate limits based on API key', () => {
    const middleware = createApiKeyRateLimiter({
      maxRequests: 2,
      windowMs: 1000
    });
    
    // Mock request with API key in Authorization header
    const req = mockRequest({
      authorization: 'Bearer test-api-key'
    });
    const res = mockResponse();
    
    // First request should pass
    middleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    mockNext.mockClear();
    
    // Second request should pass
    middleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    mockNext.mockClear();
    
    // Third request should be rate limited
    middleware(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  test('should track different API keys separately', () => {
    const middleware = createApiKeyRateLimiter({
      maxRequests: 2,
      windowMs: 1000
    });
    
    // Mock requests with different API keys
    const req1 = mockRequest({
      authorization: 'Bearer test-api-key-1'
    });
    const req2 = mockRequest({
      authorization: 'Bearer test-api-key-2'
    });
    const res = mockResponse();
    
    // First key: two requests should pass, third should fail
    middleware(req1, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    mockNext.mockClear();
    
    middleware(req1, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    mockNext.mockClear();
    
    middleware(req1, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    
    // Second key: should still be allowed
    middleware(req2, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
