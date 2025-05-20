# Circuit Breaker Pattern in Digital Samba MCP Server

## Overview

The Digital Samba MCP Server implements the Circuit Breaker pattern to improve fault tolerance and system resilience when interacting with the Digital Samba API. This pattern helps prevent cascading failures, reduces load on struggling services, and provides graceful fallback mechanisms when services are unavailable.

## How It Works

The Circuit Breaker pattern acts like an electrical circuit breaker:

1. **CLOSED State (Normal Operation):**
   - Requests flow through normally to the Digital Samba API
   - Failures are counted but don't affect operation until they reach a threshold

2. **OPEN State (Service Unavailable):**
   - After a specified number of failures, the circuit "trips" to the OPEN state
   - Requests are immediately rejected without attempting to call the API
   - This gives the API time to recover and prevents additional load

3. **HALF-OPEN State (Testing Recovery):**
   - After a timeout period, the circuit transitions to HALF-OPEN
   - A limited number of test requests are allowed through
   - If these requests succeed, the circuit returns to CLOSED
   - If they fail, the circuit returns to OPEN

## Features

- **Per-endpoint isolation:** Each API endpoint has its own circuit breaker
- **Configurable thresholds:** Customize failure counts and timeouts
- **Intelligent failure detection:** Only certain types of errors (like network errors or 5xx responses) trip the circuit
- **Fallback mechanisms:** Support for providing fallback responses when circuits are open
- **Manual controls:** Ability to manually trip or reset circuits
- **Prometheus metrics:** Complete metrics for circuit state and events
- **Event hooks:** Event emitters for state changes and monitoring

## Configuration

The circuit breaker can be configured using environment variables or programmatically:

```env
# Enable circuit breaker pattern
ENABLE_CIRCUIT_BREAKER=true

# Number of failures required to trip the circuit
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5

# Time in milliseconds to wait before testing recovery (default: 30000 - 30 seconds)
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

Or when creating the server programmatically:

```typescript
const server = startServer({
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetTimeout: 30000
});
```

## Metrics

When metrics are enabled, the server collects the following circuit breaker metrics:

- `digital_samba_mcp_circuit_breakers_total`: Count of total circuit breakers created
- `digital_samba_mcp_circuit_breaker_success_total`: Count of successful requests through circuit breakers
- `digital_samba_mcp_circuit_breaker_failures_total`: Count of failed requests through circuit breakers
- `digital_samba_mcp_circuit_breaker_state_info`: Current state of each circuit breaker
- `digital_samba_mcp_circuit_breaker_resets_total`: Count of manual circuit resets
- `digital_samba_mcp_circuit_breaker_trips_total`: Count of manual circuit trips

## Testing

To test the circuit breaker functionality, run:

```bash
test-circuit-breaker.bat
```

This script simulates API failures and shows how the circuit breaker responds.

## Implementation Details

The circuit breaker implementation is in the following files:

- `src/circuit-breaker.ts`: Core circuit breaker implementation
- `src/digital-samba-api-circuit-breaker.ts`: Integration with the Digital Samba API client
- `test-circuit-breaker.js`: Test script

## Benefits

- **Improved stability:** Prevents cascading failures across your application
- **Reduced API load:** Stops sending requests to an already struggling service
- **Better user experience:** Fails fast with meaningful errors rather than timeouts
- **Automatic recovery:** Self-heals when the service becomes available again
- **Observability:** Metrics help identify problematic endpoints
