# Graceful Degradation for Digital Samba MCP Server

This document describes the implementation of graceful degradation for handling partial API outages in the Digital Samba MCP Server.

## Overview

The graceful degradation module provides a comprehensive approach to handling API failures and ensuring continued operation of the Digital Samba MCP server even when the upstream API experiences issues. It complements the existing circuit breaker pattern with more granular service health monitoring, fallback strategies, and intelligent retry mechanisms.

## Key Features

- **Service Health Monitoring**: Tracks the health status of individual components and the overall system
- **Fallback Strategies**: Provides alternative functionality when primary operations fail
- **Intelligent Retry Mechanism**: Implements exponential backoff for temporary failures
- **Cache Integration**: Uses cached data during API outages
- **Progressive Degradation**: Different levels of service degradation based on severity
- **Metrics Collection**: Comprehensive metrics for monitoring and alerting

## Service Health Status Levels

The system defines four health status levels:

1. `HEALTHY`: All systems operational
2. `PARTIALLY_DEGRADED`: Some non-critical systems affected
3. `SEVERELY_DEGRADED`: Critical systems affected
4. `UNAVAILABLE`: Service completely unavailable

## Using Graceful Degradation

### Basic Usage

To use graceful degradation in your code:

```typescript
import { gracefulDegradation } from '@digital-samba/mcp-server';
import { MemoryCache } from '@digital-samba/mcp-server/cache';

// Create a cache for fallback data
const cache = new MemoryCache();

// Register a fallback for a critical operation
gracefulDegradation.registerFallback('listRooms', {
  fallbackFn: async () => ({
    data: [{ id: 'fallback-room', name: 'Fallback Room' }],
    total_count: 1,
    length: 1,
    map: function(callback) { return this.data.map(callback); }
  }),
  isCritical: true,
  cacheTTL: 300000 // 5 minutes
});

// Execute an operation with graceful degradation
const result = await gracefulDegradation.executeWithFallback(
  'listRooms',
  () => apiClient.listRooms(),
  { cacheKey: 'rooms', cacheTTL: 300000 }
);

// Check if result is degraded
if (result.isDegraded) {
  console.log(`Using ${result.source} data due to ${result.degradationLevel} service`);
}

// Use the result data
const rooms = result.data;
```

### Advanced Configuration

You can customize the graceful degradation service with various options:

```typescript
import { GracefulDegradation } from '@digital-samba/mcp-server/graceful-degradation';

const customDegradation = new GracefulDegradation({
  cache: new MemoryCache(),
  maxRetryAttempts: 5,
  initialRetryDelay: 500,
  retryBackoffFactor: 1.5,
  maxRetryDelay: 60000,
  healthCheckInterval: 30000,
  componentFailureThreshold: 5,
  componentRecoveryThreshold: 3
});
```

## Integration with Circuit Breaker

The graceful degradation system is designed to work alongside the circuit breaker pattern. While the circuit breaker prevents cascading failures by breaking the circuit when a service is failing, graceful degradation provides fallback strategies and progressive service reduction.

Typically, you would use both together:

```typescript
import { circuitBreakerRegistry } from '@digital-samba/mcp-server/circuit-breaker';
import { gracefulDegradation } from '@digital-samba/mcp-server';

// Create a circuit breaker
const listRoomsCircuit = circuitBreakerRegistry.create({
  name: 'listRooms',
  failureThreshold: 3,
  resetTimeout: 30000,
  successThreshold: 2
});

// Register a fallback
gracefulDegradation.registerFallback('listRooms', {
  fallbackFn: async () => ({ /* fallback data */ }),
  isCritical: true
});

// Execute with both protections
const result = await gracefulDegradation.executeWithFallback(
  'listRooms',
  () => listRoomsCircuit.exec(() => apiClient.listRooms()),
  { cacheKey: 'rooms' }
);
```

## Monitoring

The system includes comprehensive metrics for monitoring service health and degradation events:

- `degradation_health_checks_total`: Total number of health checks
- `degradation_component_status_info`: Component health status
- `degradation_overall_status_info`: Overall system health
- `degradation_fallback_activations_total`: Fallback activation count
- `degradation_fallback_success_total`: Successful fallback operations
- `degradation_fallback_failure_total`: Failed fallback operations
- `degradation_operation_duration_seconds`: Operation duration with source type
- `degradation_retry_attempts_total`: Retry attempt count
- `degradation_cache_hits_total`: Cache hit count during degradation

## Test Script

A comprehensive test script is available to verify the graceful degradation functionality:

```bash
npm run test:graceful-degradation
# or use the batch file
test-graceful-degradation.bat
```

The test script creates various scenarios including component failures, fallback activations, circuit breaker interactions, and recovery paths.

## Best Practices

1. **Register Fallbacks for Critical Operations**: Always register fallbacks for operations that are critical to your application's core functionality.

2. **Use Cache Wisely**: Configure appropriate TTL values based on the freshness requirements of your data.

3. **Set Appropriate Thresholds**: Tune the failure thresholds and retry parameters based on your API's stability and performance characteristics.

4. **Monitor Metrics**: Pay attention to degradation metrics to detect and address issues proactively.

5. **Test Failure Scenarios**: Regularly test how your application behaves under different failure scenarios.
