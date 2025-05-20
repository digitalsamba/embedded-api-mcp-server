# Rate Limiting and Caching Implementation

## Overview

This implementation adds two essential performance and security features to the Digital Samba MCP Server:

1. **Request Throttling and Rate Limiting**: Prevents API abuse by limiting the number of requests a client can make in a given time period.
2. **API Response Caching**: Improves performance by caching responses from the Digital Samba API to reduce duplicate requests.

## Rate Limiting

### Features

- Token bucket algorithm implementation for rate limiting
- Configurable rate limits (requests per minute, per hour)
- API key-based rate limiting for client identification
- Express middleware integration
- Headers for rate limit information (X-RateLimit-*)
- Detailed logging of rate limiting events
- Customizable response handling for rate-limited requests

### Configuration Options

Rate limiting can be enabled through:

- Environment variables:
  ```
  ENABLE_RATE_LIMITING=true
  RATE_LIMIT_REQUESTS_PER_MINUTE=60
  ```

- Server options:
  ```javascript
  startServer({
    enableRateLimiting: true,
    rateLimitRequestsPerMinute: 60
  });
  ```

### Implementation Details

The rate limiter is implemented in `src/rate-limiter.ts` and follows the token bucket algorithm:

1. Each client (identified by API key) has a bucket of tokens
2. Tokens are replenished at a constant rate (e.g., 60 tokens per minute)
3. Each request consumes one token
4. When a client's bucket is empty, requests are rejected with a 429 status code

## Caching

### Features

- Memory-based caching of API responses
- Configurable TTL (Time-To-Live) for cached items
- Automatic cache invalidation on write/delete operations
- Cache namespacing to avoid key collisions
- Cache eviction policies for memory management
- ETag support for conditional requests

### Configuration Options

Caching can be enabled through:

- Environment variables:
  ```
  ENABLE_CACHE=true
  CACHE_TTL=300000  # 5 minutes in milliseconds
  ```

- Server options:
  ```javascript
  startServer({
    enableCache: true,
    cacheTtl: 300000  // 5 minutes
  });
  ```

### Implementation Details

The cache is implemented in `src/cache.ts` and provides:

1. In-memory storage of API responses with TTL
2. Cache keys generated from API endpoints
3. Cache invalidation when resources are modified or deleted
4. LRU (Least Recently Used) eviction policy when the cache is full
5. Cache statistics for monitoring

## Testing

- Unit tests for both rate limiting and caching modules
- Integration test script for real-world testing
- Performance comparison tests for cached vs. non-cached responses

## Example Usage

### Running with Rate Limiting and Caching Enabled

```javascript
// Start the server with both features enabled
const server = startServer({
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 60,
  enableCache: true,
  cacheTtl: 300000 // 5 minutes
});
```

### Testing Rate Limiting and Caching

Run the provided test script:

```bash
test-rate-limiting-caching.bat YOUR_API_KEY
```

This will:
1. Start the server with rate limiting and caching enabled
2. Test rate limiting by sending a burst of requests
3. Test caching by measuring response times for duplicate requests
4. Test cache invalidation by creating and deleting a resource

## Next Steps

1. **Redis-based implementations** for distributed deployments
2. **Enhanced metrics** for rate limiting and cache performance
3. **Advanced configuration options** for different endpoints or resources
4. **Cache warmup** strategies for frequently accessed resources
