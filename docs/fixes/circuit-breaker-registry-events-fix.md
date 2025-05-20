# CircuitBreakerRegistry EventEmitter Fix

## Issue

When implementing the graceful degradation feature, an issue was discovered where the `circuitBreakerRegistry` didn't support event emission, causing the server to crash with the following error:

```
TypeError: circuitBreakerRegistry.on is not a function
    at GracefulDegradation.monitorCircuitBreakers (C:\Users\ffxxr\Documents\DS\projects\digital-samba-mcp\src\graceful-degradation.ts:299:28)
    at new GracefulDegradation (C:\Users\ffxxr\Documents\DS\projects\digital-samba-mcp\src\graceful-degradation.ts:240:10)
```

## Root Cause

The `CircuitBreakerRegistry` class needed to extend EventEmitter to support events but was not doing so. The graceful degradation implementation was trying to listen for 'created' events when new circuit breakers are registered.

## Solution

Two changes were made to fix this issue:

1. Made `CircuitBreakerRegistry` extend EventEmitter:
```typescript
export class CircuitBreakerRegistry extends EventEmitter {
  // ...
  
  private constructor() {
    super(); // Initialize EventEmitter
  }
  
  // ...
  
  create(options: CircuitBreakerOptions): CircuitBreaker {
    // ...
    
    // Emit created event for the new circuit breaker
    this.emit('created', circuitBreaker);
    
    return circuitBreaker;
  }
}
```

2. Made the graceful degradation implementation more robust to handle cases when event listeners are not available:
```typescript
private monitorCircuitBreakers(): void {
  const circuits = circuitBreakerRegistry.getAll();
  
  for (const circuit of circuits) {
    this.monitorCircuitBreaker(circuit);
  }
  
  // Listen for new circuit breakers
  try {
    if (typeof circuitBreakerRegistry.on === 'function') {
      circuitBreakerRegistry.on('created', (circuit: CircuitBreaker) => {
        this.monitorCircuitBreaker(circuit);
      });
    } else {
      logger.debug('Circuit breaker registry does not support events, will not monitor new circuits');
    }
  } catch (error) {
    logger.debug(`Error setting up circuit breaker registry listener: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

## Testing

The fix was tested by:
1. Verifying that the server starts without errors
2. Confirming that circuit breakers are properly registered and monitored
3. Testing the graceful degradation functionality with the circuit breaker integration

## Commit Information

- Commit message: "fix: make circuit breaker registry extend EventEmitter for event support"
- Commit SHA: e37ab96
