/**
 * Circuit Breaker Pattern Implementation
 * 
 * This module provides a circuit breaker implementation for handling API calls
 * in a fault-tolerant manner. The circuit breaker pattern prevents cascading failures
 * by breaking the circuit when a service is failing, and only attempting to restore
 * the connection after a specified timeout.
 * 
 * Key features:
 * - Three states: CLOSED (normal operation), OPEN (failing, no requests), HALF_OPEN (testing recovery)
 * - Configurable thresholds for failure count, timeouts, and success count for reset
 * - Event hooks for state changes and failures
 * - Support for fallback handlers when the circuit is open
 * - Metrics integration for monitoring circuit state and events
 * 
 * @module circuit-breaker
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js modules
import { EventEmitter } from 'events';

// Local modules
import logger from './logger.js';
import { ApiRequestError } from './errors.js';

/**
 * Circuit state enumeration
 * 
 * CLOSED: Normal operation, requests pass through
 * OPEN: Circuit is broken, no requests pass through
 * HALF_OPEN: Testing if service has recovered
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker options interface
 */
export interface CircuitBreakerOptions {
  /**
   * The name of the circuit breaker (for logging and metrics)
   */
  name: string;
  
  /**
   * Number of consecutive failures required to open the circuit
   * @default 5
   */
  failureThreshold?: number;
  
  /**
   * Time in milliseconds to wait before trying to half-open the circuit
   * @default 30000 (30 seconds)
   */
  resetTimeout?: number;
  
  /**
   * Number of consecutive successful requests required to close the circuit from half-open state
   * @default 2
   */
  successThreshold?: number;
  
  /**
   * Time in milliseconds after which a request is considered a timeout failure
   * If not specified, timeouts will not be detected by the circuit breaker
   */
  requestTimeout?: number;
  
  /**
   * Callback function to determine if an error should be counted as a failure
   * @param error - The error to check
   * @returns true if the error should be counted as a failure, false otherwise
   * @default All errors are counted as failures
   */
  isFailure?: (error: unknown) => boolean;
  
  /**
   * Fallback function to call when the circuit is open
   * @param params - The parameters that would have been passed to the protected function
   * @returns The fallback result
   */
  fallback?: <T, Args extends any[]>(params: Args) => Promise<T>;
}

/**
 * Circuit breaker implementation for handling API calls
 * 
 * The CircuitBreaker class implements the circuit breaker pattern to prevent
 * cascading failures when a service is experiencing issues. It monitors
 * failures and opens the circuit when a threshold is reached, allowing
 * the service time to recover.
 * 
 * @class CircuitBreaker
 * @example
 * // Create a circuit breaker for a specific API endpoint
 * const circuitBreaker = new CircuitBreaker({
 *   name: 'listRooms',
 *   failureThreshold: 3,
 *   resetTimeout: 10000,
 *   successThreshold: 2,
 *   fallback: async () => ({ data: [], total_count: 0, length: 0, map: () => [] })
 * });
 * 
 * // Protect a function call with the circuit breaker
 * const rooms = await circuitBreaker.exec(() => apiClient.listRooms());
 */
export class CircuitBreaker extends EventEmitter {
  private name: string;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastError: Error | null = null;
  private nextAttempt: number = Date.now();
  private failureThreshold: number;
  private resetTimeout: number;
  private successThreshold: number;
  private requestTimeout?: number;
  private isFailure: (error: unknown) => boolean;
  private fallback?: <T, Args extends any[]>(params: Args) => Promise<T>;
  
  /**
   * Creates a new CircuitBreaker instance
   * 
   * @constructor
   * @param {CircuitBreakerOptions} options - Configuration options for the circuit breaker
   */
  constructor(options: CircuitBreakerOptions) {
    super();
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.successThreshold = options.successThreshold ?? 2;
    this.requestTimeout = options.requestTimeout;
    this.isFailure = options.isFailure ?? (() => true);
    this.fallback = options.fallback;
    
    // Log the circuit breaker creation
    logger.debug(`Circuit breaker created: ${this.name}`, {
      circuit: this.name,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      successThreshold: this.successThreshold,
      requestTimeout: this.requestTimeout
    });
    
    // Track circuit created metric if metrics module is available
    this.updateMetrics('created');
  }
  
  /**
   * Get the current state of the circuit
   * 
   * @returns {CircuitState} The current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get the name of the circuit
   * 
   * @returns {string} The circuit name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the last error that occurred
   * 
   * @returns {Error | null} The last error or null if no errors have occurred
   */
  getLastError(): Error | null {
    return this.lastError;
  }
  
  /**
   * Execute a function with circuit breaker protection
   * 
   * This method wraps the provided function with circuit breaker logic.
   * If the circuit is open, the function will not be called and an error will be thrown
   * (or the fallback will be used if provided). In CLOSED or HALF_OPEN states,
   * the function will be called and the result will be monitored for success or failure.
   * 
   * @template T - The return type of the function
   * @template Args - The argument types of the function
   * @param {(...args: Args) => Promise<T>} fn - The function to protect
   * @param {...Args} args - Arguments to pass to the function
   * @returns {Promise<T>} The result of the function or fallback
   * @throws {Error} If the circuit is open and no fallback is provided
   * @example
   * // Protect an API call
   * const result = await circuitBreaker.exec(async () => {
   *   return await fetch('https://api.example.com/data');
   * });
   */
  async exec<T, Args extends any[]>(fn: (...args: Args) => Promise<T>, ...args: Args): Promise<T> {
    // Check if the circuit is open
    if (this.state === CircuitState.OPEN) {
      // If we passed the reset timeout, transition to half-open
      if (Date.now() > this.nextAttempt) {
        this.toHalfOpen();
      } else {
        // Circuit is still open, use fallback or throw error
        if (this.fallback) {
          logger.debug(`Circuit ${this.name} is OPEN, using fallback`, {
            circuit: this.name,
            nextAttempt: new Date(this.nextAttempt).toISOString()
          });
          return this.fallback(args);
        }
        
        // No fallback available, throw error
        logger.warn(`Circuit ${this.name} is OPEN, rejecting request`, {
          circuit: this.name,
          nextAttempt: new Date(this.nextAttempt).toISOString()
        });
        
        throw new ApiRequestError(
          `Circuit breaker ${this.name} is OPEN. Last error: ${this.lastError?.message ?? 'Unknown error'}`,
          { cause: this.lastError ?? undefined }
        );
      }
    }
    
    // Execute the function with optional timeout
    try {
      let result: T;
      
      if (this.requestTimeout !== undefined) {
        // Use Promise.race to implement timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${this.requestTimeout}ms`));
          }, this.requestTimeout);
        });
        
        // Race the function execution against the timeout
        result = await Promise.race([
          fn(...args),
          timeoutPromise
        ]);
      } else {
        // No timeout, just execute the function
        result = await fn(...args);
      }
      
      // Success - handle based on current state
      this.handleSuccess();
      return result;
    } catch (error) {
      // Determine if this error should count as a circuit failure
      if (this.isFailure(error)) {
        this.handleFailure(error instanceof Error ? error : new Error(String(error)));
        
        // Re-throw the original error
        throw error;
      } else {
        // Not a circuit failure, but still an error
        logger.debug(`Error in circuit ${this.name} not counted as failure`, {
          circuit: this.name,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Re-throw the original error
        throw error;
      }
    }
  }
  
  /**
   * Handle a successful execution
   * 
   * @private
   */
  private handleSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // In half-open state, count successes toward closing the circuit
      this.successCount++;
      logger.debug(`Circuit ${this.name} success in HALF_OPEN state (${this.successCount}/${this.successThreshold})`, {
        circuit: this.name,
        successCount: this.successCount,
        successThreshold: this.successThreshold
      });
      
      this.updateMetrics('success');
      
      // Check if we've reached the threshold to close the circuit
      if (this.successCount >= this.successThreshold) {
        this.toClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // In closed state, reset the failure count on success
      this.failureCount = 0;
      this.lastError = null;
      this.updateMetrics('success');
    }
  }
  
  /**
   * Handle a failure
   * 
   * @private
   * @param {Error} error - The error that occurred
   */
  private handleFailure(error: Error): void {
    // Store the last error
    this.lastError = error;
    
    if (this.state === CircuitState.CLOSED) {
      // In closed state, count failures toward opening the circuit
      this.failureCount++;
      logger.debug(`Circuit ${this.name} failure in CLOSED state (${this.failureCount}/${this.failureThreshold})`, {
        circuit: this.name,
        failureCount: this.failureCount,
        failureThreshold: this.failureThreshold,
        error: error.message
      });
      
      this.updateMetrics('failure');
      
      // Check if we've reached the threshold to open the circuit
      if (this.failureCount >= this.failureThreshold) {
        this.toOpen();
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state immediately opens the circuit
      logger.debug(`Circuit ${this.name} failure in HALF_OPEN state, opening circuit`, {
        circuit: this.name,
        error: error.message
      });
      
      this.updateMetrics('failure');
      this.toOpen();
    }
  }
  
  /**
   * Transition the circuit to the OPEN state
   * 
   * @private
   */
  private toOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      const previousState = this.state;
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.successCount = 0;
      
      logger.info(`Circuit ${this.name} transitioned from ${previousState} to OPEN`, {
        circuit: this.name,
        previousState,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
        lastError: this.lastError?.message
      });
      
      // Emit state change event
      this.emit('open', {
        name: this.name,
        previousState,
        lastError: this.lastError
      });
      
      this.updateMetrics('state_change', { state: 'OPEN' });
    }
  }
  
  /**
   * Transition the circuit to the HALF_OPEN state
   * 
   * @private
   */
  private toHalfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      const previousState = this.state;
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      
      logger.info(`Circuit ${this.name} transitioned from ${previousState} to HALF_OPEN`, {
        circuit: this.name,
        previousState
      });
      
      // Emit state change event
      this.emit('half-open', {
        name: this.name,
        previousState
      });
      
      this.updateMetrics('state_change', { state: 'HALF_OPEN' });
    }
  }
  
  /**
   * Transition the circuit to the CLOSED state
   * 
   * @private
   */
  private toClosed(): void {
    if (this.state !== CircuitState.CLOSED) {
      const previousState = this.state;
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.lastError = null;
      
      logger.info(`Circuit ${this.name} transitioned from ${previousState} to CLOSED`, {
        circuit: this.name,
        previousState
      });
      
      // Emit state change event
      this.emit('close', {
        name: this.name,
        previousState
      });
      
      this.updateMetrics('state_change', { state: 'CLOSED' });
    }
  }
  
  /**
   * Reset the circuit to the CLOSED state regardless of current state
   * 
   * This method can be called externally to force the circuit back to normal operation.
   * This is useful for manual intervention after investigating and resolving an issue.
   */
  reset(): void {
    logger.info(`Circuit ${this.name} manually reset to CLOSED`, {
      circuit: this.name,
      previousState: this.state
    });
    
    this.toClosed();
    this.emit('reset', { name: this.name });
    this.updateMetrics('reset');
  }
  
  /**
   * Force the circuit to the OPEN state
   * 
   * This method can be called externally to force the circuit to the OPEN state.
   * This is useful for pre-emptively stopping traffic to a service that is known to be down.
   * 
   * @param {Error} [error] - Optional error to store as the last error
   */
  trip(error?: Error): void {
    if (error) {
      this.lastError = error;
    }
    
    logger.info(`Circuit ${this.name} manually tripped to OPEN`, {
      circuit: this.name,
      previousState: this.state,
      error: error?.message
    });
    
    this.toOpen();
    this.emit('trip', { name: this.name, error });
    this.updateMetrics('trip');
  }
  
  /**
   * Update metrics for the circuit breaker
   * 
   * This method attempts to update Prometheus metrics if the metrics module is available.
   * If the metrics module cannot be imported, the method silently ignores the error.
   * 
   * @private
   * @param {string} event - The event type ('created', 'success', 'failure', 'state_change', 'reset', 'trip')
   * @param {Record<string, any>} [labels] - Additional labels for the metric
   */
  private async updateMetrics(
    event: 'created' | 'success' | 'failure' | 'state_change' | 'reset' | 'trip',
    labels?: Record<string, any>
  ): Promise<void> {
    try {
      const metricsRegistry = await import('./metrics.js').then(m => m.default);
      
      const baseLabels = { circuit: this.name, ...labels };
      
      switch (event) {
        case 'created':
          // New circuit breaker created
          metricsRegistry.circuitBreakersTotal.inc(1);
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: this.state 
          }, 1);
          break;
        
        case 'success':
          // Successful request through the circuit
          metricsRegistry.circuitBreakerSuccess.inc(baseLabels);
          break;
        
        case 'failure':
          // Failed request through the circuit
          metricsRegistry.circuitBreakerFailures.inc(baseLabels);
          break;
        
        case 'state_change':
          // Circuit state changed
          if (labels?.state) {
            // Set the new state to 1 and all other states to 0
            const states = Object.values(CircuitState);
            for (const state of states) {
              const value = state === labels.state ? 1 : 0;
              metricsRegistry.circuitBreakerStateInfo.set({
                circuit: this.name,
                state
              }, value);
            }
          }
          break;
        
        case 'reset':
          // Circuit manually reset
          metricsRegistry.circuitBreakerResets.inc(baseLabels);
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.CLOSED 
          }, 1);
          
          // Set other states to 0
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.OPEN 
          }, 0);
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.HALF_OPEN 
          }, 0);
          break;
        
        case 'trip':
          // Circuit manually tripped
          metricsRegistry.circuitBreakerTrips.inc(baseLabels);
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.OPEN 
          }, 1);
          
          // Set other states to 0
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.CLOSED 
          }, 0);
          metricsRegistry.circuitBreakerStateInfo.set({ 
            ...baseLabels, 
            state: CircuitState.HALF_OPEN 
          }, 0);
          break;
      }
    } catch (error) {
      // Metrics module might not be available, or other error occurred
      // This is non-critical, so just log at debug level
      logger.debug(`Error updating circuit breaker metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Circuit breaker registry to manage multiple circuit breakers
 * 
 * This class provides a registry for managing multiple circuit breakers
 * with convenient methods for creation, retrieval, and management.
 * 
 * @class CircuitBreakerRegistry
 * @example
 * // Get the global registry
 * const registry = CircuitBreakerRegistry.getInstance();
 * 
 * // Create a new circuit breaker
 * const listRoomsCircuit = registry.create({
 *   name: 'listRooms',
 *   failureThreshold: 3
 * });
 * 
 * // Get an existing circuit breaker
 * const circuit = registry.get('listRooms');
 * 
 * // Execute a function with the circuit breaker
 * const rooms = await circuit.exec(() => apiClient.listRooms());
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private circuits: Map<string, CircuitBreaker> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   * 
   * @private
   */
  private constructor() {}
  
  /**
   * Get the singleton instance of the registry
   * 
   * @returns {CircuitBreakerRegistry} The singleton registry instance
   */
  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }
  
  /**
   * Create a new circuit breaker and add it to the registry
   * 
   * @param {CircuitBreakerOptions} options - Options for the new circuit breaker
   * @returns {CircuitBreaker} The newly created circuit breaker
   * @throws {Error} If a circuit breaker with the same name already exists
   */
  create(options: CircuitBreakerOptions): CircuitBreaker {
    if (this.circuits.has(options.name)) {
      logger.warn(`Circuit breaker with name ${options.name} already exists`);
      return this.circuits.get(options.name)!;
    }
    
    const circuitBreaker = new CircuitBreaker(options);
    this.circuits.set(options.name, circuitBreaker);
    
    logger.debug(`Added circuit breaker to registry: ${options.name}`, {
      circuit: options.name,
      totalCircuits: this.circuits.size
    });
    
    return circuitBreaker;
  }
  
  /**
   * Get a circuit breaker from the registry
   * 
   * @param {string} name - The name of the circuit breaker to retrieve
   * @returns {CircuitBreaker | undefined} The circuit breaker or undefined if not found
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }
  
  /**
   * Get or create a circuit breaker
   * 
   * If a circuit breaker with the given name exists, it will be returned.
   * Otherwise, a new circuit breaker will be created with the provided options.
   * 
   * @param {CircuitBreakerOptions} options - Options for the circuit breaker
   * @returns {CircuitBreaker} The existing or newly created circuit breaker
   */
  getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    const existing = this.circuits.get(options.name);
    
    if (existing) {
      return existing;
    }
    
    return this.create(options);
  }
  
  /**
   * Remove a circuit breaker from the registry
   * 
   * @param {string} name - The name of the circuit breaker to remove
   * @returns {boolean} True if the circuit breaker was removed, false if it was not found
   */
  remove(name: string): boolean {
    const removed = this.circuits.delete(name);
    
    if (removed) {
      logger.debug(`Removed circuit breaker from registry: ${name}`, {
        circuit: name,
        totalCircuits: this.circuits.size
      });
    }
    
    return removed;
  }
  
  /**
   * Get all circuit breakers in the registry
   * 
   * @returns {CircuitBreaker[]} An array of all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.circuits.values());
  }
  
  /**
   * Get the count of circuit breakers in the registry
   * 
   * @returns {number} The number of circuit breakers
   */
  getCount(): number {
    return this.circuits.size;
  }
  
  /**
   * Reset all circuit breakers to the CLOSED state
   * 
   * This is useful for system restarts or after resolving a widespread issue.
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    
    logger.info(`Reset all ${this.circuits.size} circuit breakers to CLOSED state`);
  }
}

// Export a singleton instance of the registry
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();

export default circuitBreakerRegistry;
