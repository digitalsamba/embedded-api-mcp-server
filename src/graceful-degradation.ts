/**
 * Graceful Degradation Module
 * 
 * This module provides mechanisms for handling partial API outages and ensuring
 * continued functionality with degraded service levels. It works alongside the
 * circuit breaker pattern to provide a comprehensive approach to API resilience.
 * 
 * Key features:
 * - Multiple degradation levels based on service health
 * - Fallback strategies for critical functionality
 * - Cached content serving during outages
 * - Intelligent retry mechanisms with exponential backoff
 * - Health monitoring and automatic recovery
 * - Metrics integration for observability
 * 
 * @module graceful-degradation
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js modules
import { EventEmitter } from 'events';

// Local modules
import { MemoryCache } from './cache.js';
import logger from './logger.js';
import { ApiRequestError, DegradedServiceError } from './errors.js';
import circuitBreakerRegistry, { CircuitBreaker, CircuitState } from './circuit-breaker.js';

/**
 * Service health status levels
 */
export enum ServiceHealthStatus {
  HEALTHY = 'HEALTHY',           // All systems operational
  PARTIALLY_DEGRADED = 'PARTIALLY_DEGRADED', // Some non-critical systems affected
  SEVERELY_DEGRADED = 'SEVERELY_DEGRADED',   // Critical systems affected
  UNAVAILABLE = 'UNAVAILABLE'    // Service completely unavailable
}

/**
 * Service component health tracking
 */
export interface ServiceComponentHealth {
  name: string;
  status: ServiceHealthStatus;
  lastCheck: Date;
  errorCount: number;
  message?: string;
}

/**
 * Fallback strategy type
 * 
 * Defines a function that provides alternative functionality
 * when a primary service is unavailable
 */
export type FallbackStrategy<T> = () => Promise<T>;

/**
 * Degradation options interface
 */
export interface GracefulDegradationOptions {
  /**
   * Cache instance for storing fallback data
   */
  cache?: MemoryCache;
  
  /**
   * Maximum number of retry attempts for failed operations
   * @default 3
   */
  maxRetryAttempts?: number;
  
  /**
   * Initial delay in milliseconds before first retry
   * @default 1000 (1 second)
   */
  initialRetryDelay?: number;
  
  /**
   * Factor to multiply delay by for each subsequent retry
   * @default 2 (exponential backoff)
   */
  retryBackoffFactor?: number;
  
  /**
   * Maximum delay in milliseconds between retries
   * @default 30000 (30 seconds)
   */
  maxRetryDelay?: number;
  
  /**
   * Interval in milliseconds to check service health
   * @default 60000 (1 minute)
   */
  healthCheckInterval?: number;
  
  /**
   * Component failure threshold before considering the component degraded
   * @default 3
   */
  componentFailureThreshold?: number;
  
  /**
   * Component success threshold before considering the component recovered
   * @default 2
   */
  componentRecoveryThreshold?: number;
}

/**
 * Fallback configuration interface
 */
export interface FallbackConfig<T> {
  /**
   * The fallback function to call when the primary operation fails
   */
  fallbackFn: FallbackStrategy<T>;
  
  /**
   * Is this operation critical for the application
   * @default false
   */
  isCritical?: boolean;
  
  /**
   * TTL for cached fallback data in milliseconds
   * @default 300000 (5 minutes)
   */
  cacheTTL?: number;
  
  /**
   * Indicates whether the fallback is currently active
   * @default false
   */
  isActive?: boolean;
}

/**
 * Operation result with degradation information
 */
export interface DegradedResult<T> {
  /**
   * The operation result data
   */
  data: T;
  
  /**
   * Indicates if the result comes from a degraded service
   */
  isDegraded: boolean;
  
  /**
   * Degradation level if applicable
   */
  degradationLevel?: ServiceHealthStatus;
  
  /**
   * Source of the data (primary, cache, fallback)
   */
  source: 'primary' | 'cache' | 'fallback';
  
  /**
   * Optional message about the degradation
   */
  message?: string;
}

/**
 * Graceful degradation service for handling API outages
 * 
 * This class provides mechanisms for handling partial API outages and ensuring
 * the application can continue functioning with degraded service levels.
 * 
 * @class GracefulDegradation
 * @example
 * // Create a graceful degradation service
 * const degradationService = new GracefulDegradation({
 *   cache: new MemoryCache(),
 *   maxRetryAttempts: 3,
 *   initialRetryDelay: 1000
 * });
 * 
 * // Register a fallback for the listRooms operation
 * degradationService.registerFallback('listRooms', {
 *   fallbackFn: async () => ({ data: [], total_count: 0, length: 0, map: () => [] }),
 *   isCritical: true
 * });
 * 
 * // Execute an operation with graceful degradation
 * const result = await degradationService.executeWithFallback(
 *   'listRooms',
 *   () => apiClient.listRooms(),
 *   { cacheKey: 'rooms' }
 * );
 */
export class GracefulDegradation extends EventEmitter {
  private cache?: MemoryCache;
  private maxRetryAttempts: number;
  private initialRetryDelay: number;
  private retryBackoffFactor: number;
  private maxRetryDelay: number;
  private healthCheckInterval: number;
  private componentFailureThreshold: number;
  private componentRecoveryThreshold: number;
  private healthCheckTimer?: NodeJS.Timeout;
  private fallbacks: Map<string, FallbackConfig<any>> = new Map();
  private componentHealth: Map<string, ServiceComponentHealth> = new Map();
  private overallHealth: ServiceHealthStatus = ServiceHealthStatus.HEALTHY;
  
  /**
   * Creates a new GracefulDegradation instance
   * 
   * @constructor
   * @param {GracefulDegradationOptions} options - Configuration options
   */
  constructor(options: GracefulDegradationOptions = {}) {
    super();
    this.cache = options.cache;
    this.maxRetryAttempts = options.maxRetryAttempts ?? 3;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.retryBackoffFactor = options.retryBackoffFactor ?? 2;
    this.maxRetryDelay = options.maxRetryDelay ?? 30000;
    this.healthCheckInterval = options.healthCheckInterval ?? 60000;
    this.componentFailureThreshold = options.componentFailureThreshold ?? 3;
    this.componentRecoveryThreshold = options.componentRecoveryThreshold ?? 2;
    
    // Log the service creation
    logger.debug('Graceful degradation service created', {
      maxRetryAttempts: this.maxRetryAttempts,
      initialRetryDelay: this.initialRetryDelay,
      retryBackoffFactor: this.retryBackoffFactor,
      maxRetryDelay: this.maxRetryDelay,
      healthCheckInterval: this.healthCheckInterval,
      componentFailureThreshold: this.componentFailureThreshold,
      componentRecoveryThreshold: this.componentRecoveryThreshold
    });
    
    // Monitor circuit breakers to automatically detect component health
    this.monitorCircuitBreakers();
    
    // Start health check timer
    this.startHealthCheck();
    
    // Track metrics
    this.updateMetrics('created');
  }
  
  /**
   * Start periodic health checks
   * 
   * @private
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.healthCheckInterval);
    
    // Initial health check
    this.checkHealth();
  }
  
  /**
   * Stop periodic health checks
   * 
   * @private
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }
  
  /**
   * Cleanup resources - call when shutting down
   */
  dispose(): void {
    this.stopHealthCheck();
  }
  
  /**
   * Monitor circuit breakers to detect component health
   * 
   * @private
   */
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
  
  /**
   * Monitor a specific circuit breaker
   * 
   * @private
   * @param {CircuitBreaker} circuit - The circuit breaker to monitor
   */
  private monitorCircuitBreaker(circuit: CircuitBreaker): void {
    const circuitName = circuit.getName();
    
    // Add to component health if not already present
    if (!this.componentHealth.has(circuitName)) {
      this.componentHealth.set(circuitName, {
        name: circuitName,
        status: ServiceHealthStatus.HEALTHY,
        lastCheck: new Date(),
        errorCount: 0
      });
    }
    
    // Monitor state changes
    circuit.on('open', () => {
      this.updateComponentHealth(circuitName, ServiceHealthStatus.SEVERELY_DEGRADED);
      logger.warn(`Circuit ${circuitName} opened, component marked as severely degraded`);
    });
    
    circuit.on('half-open', () => {
      this.updateComponentHealth(circuitName, ServiceHealthStatus.PARTIALLY_DEGRADED);
      logger.info(`Circuit ${circuitName} half-opened, component marked as partially degraded`);
    });
    
    circuit.on('close', () => {
      this.updateComponentHealth(circuitName, ServiceHealthStatus.HEALTHY);
      logger.info(`Circuit ${circuitName} closed, component marked as healthy`);
    });
  }
  
  /**
   * Register a fallback strategy for an operation
   * 
   * @param {string} operationName - The name of the operation
   * @param {FallbackConfig<T>} config - The fallback configuration
   * @example
   * // Register a fallback for the listRooms operation
   * degradationService.registerFallback('listRooms', {
   *   fallbackFn: async () => ({ data: [], total_count: 0, length: 0, map: () => [] }),
   *   isCritical: true,
   *   cacheTTL: 600000 // 10 minutes
   * });
   */
  registerFallback<T>(operationName: string, config: FallbackConfig<T>): void {
    // Ensure the fallback has the isActive property
    const fullConfig: FallbackConfig<T> = {
      ...config,
      isActive: false
    };
    
    this.fallbacks.set(operationName, fullConfig);
    
    logger.debug(`Registered fallback for operation: ${operationName}`, {
      operation: operationName,
      isCritical: fullConfig.isCritical,
      cacheTTL: fullConfig.cacheTTL
    });
    
    this.updateMetrics('fallback_registered', { operation: operationName });
  }
  
  /**
   * Execute an operation with graceful degradation and fallback support
   * 
   * This method attempts to execute the primary operation, and if it fails,
   * it follows a degradation strategy:
   * 1. Try to fetch from cache if available
   * 2. Retry with exponential backoff if appropriate
   * 3. Use the registered fallback if available
   * 4. Throw an error if all strategies fail
   * 
   * @template T - The type of the operation result
   * @param {string} operationName - The name of the operation (should match the registered fallback)
   * @param {() => Promise<T>} primaryFn - The primary operation function
   * @param {Object} options - Additional options
   * @param {string} [options.cacheKey] - Key to use for caching results
   * @param {number} [options.cacheTTL] - TTL for cache in milliseconds
   * @param {boolean} [options.skipCache] - Skip cache check
   * @param {boolean} [options.skipRetry] - Skip retry attempts
   * @returns {Promise<DegradedResult<T>>} The operation result with degradation information
   * @throws {DegradedServiceError} If all strategies fail and no fallback is available
   * @example
   * // Execute a function with graceful degradation
   * const result = await degradationService.executeWithFallback(
   *   'listRooms',
   *   () => apiClient.listRooms(),
   *   { cacheKey: 'rooms', cacheTTL: 300000 }
   * );
   * 
   * // Use the result, checking if it's degraded
   * if (result.isDegraded) {
   *   console.log(`Using ${result.source} data due to ${result.degradationLevel} service`);
   * }
   * const rooms = result.data;
   */
  async executeWithFallback<T>(
    operationName: string,
    primaryFn: () => Promise<T>,
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      skipCache?: boolean;
      skipRetry?: boolean;
    } = {}
  ): Promise<DegradedResult<T>> {
    const startTime = Date.now();
    const { cacheKey, cacheTTL, skipCache = false, skipRetry = false } = options;
    const fallbackConfig = this.fallbacks.get(operationName);
    const cacheNamespace = 'degradation';
    const componentHealth = this.componentHealth.get(operationName) || {
      name: operationName,
      status: ServiceHealthStatus.HEALTHY,
      lastCheck: new Date(),
      errorCount: 0
    };
    let source: 'primary' | 'cache' | 'fallback' = 'primary';
    let retryAttempt = 0;
    
    // Check component health - if severely degraded or unavailable, use fallback immediately
    if (componentHealth.status === ServiceHealthStatus.SEVERELY_DEGRADED ||
        componentHealth.status === ServiceHealthStatus.UNAVAILABLE) {
      logger.debug(`Skipping primary execution for ${operationName} due to ${componentHealth.status} status`);
      
      // Try cache first
      if (!skipCache && this.cache && cacheKey) {
        const cachedResult = this.cache.get(cacheNamespace, cacheKey);
        if (cachedResult) {
          logger.debug(`Cache hit for ${operationName} during degraded service`);
          source = 'cache';
          
          // Track metrics
          this.updateMetrics('cache_hit', { operation: operationName });
          
          return {
            data: cachedResult.value as T,
            isDegraded: true,
            degradationLevel: componentHealth.status,
            source,
            message: `Using cached data due to ${componentHealth.status} service`
          };
        }
      }
      
      // If cache miss, use fallback
      if (fallbackConfig) {
        // Activate fallback if not already active
        if (!fallbackConfig.isActive) {
          fallbackConfig.isActive = true;
          this.emit('fallback_activated', { operationName });
          this.updateMetrics('fallback_activated', { operation: operationName });
        }
        
        logger.debug(`Using fallback for ${operationName} due to ${componentHealth.status} status`);
        source = 'fallback';
        
        try {
          const fallbackResult = await fallbackConfig.fallbackFn();
          
          // Track metrics
          this.updateMetrics('fallback_success', { operation: operationName });
          
          return {
            data: fallbackResult,
            isDegraded: true,
            degradationLevel: componentHealth.status,
            source,
            message: `Using fallback data due to ${componentHealth.status} service`
          };
        } catch (error) {
          // Fallback also failed
          logger.error(`Fallback for ${operationName} failed: ${error instanceof Error ? error.message : String(error)}`);
          
          // Track metrics
          this.updateMetrics('fallback_failure', { operation: operationName });
          
          throw new DegradedServiceError(
            `All strategies failed for ${operationName}: ${error instanceof Error ? error.message : String(error)}`,
            { 
              operationName, 
              componentStatus: componentHealth.status,
              attemptedStrategies: ['cache', 'fallback']
            }
          );
        }
      }
    }
    
    // Try primary function first
    try {
      const result = await primaryFn();
      
      // Success - reset error count
      if (this.componentHealth.has(operationName)) {
        const health = this.componentHealth.get(operationName)!;
        health.errorCount = 0;
        
        // If it was degraded, update status
        if (health.status !== ServiceHealthStatus.HEALTHY) {
          this.updateComponentHealth(operationName, ServiceHealthStatus.HEALTHY);
        }
      }
      
      // Deactivate fallback if active
      if (fallbackConfig?.isActive) {
        fallbackConfig.isActive = false;
        this.emit('fallback_deactivated', { operationName });
        this.updateMetrics('fallback_deactivated', { operation: operationName });
      }
      
      // Cache the successful result if caching is enabled
      if (this.cache && cacheKey && cacheTTL) {
        this.cache.set(cacheNamespace, cacheKey, result, cacheTTL);
        logger.debug(`Cached result for ${operationName}`, { cacheKey, cacheTTL });
      }
      
      // Track execution time in metrics
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.updateMetrics('operation_duration', { operation: operationName, source }, duration);
      
      return {
        data: result,
        isDegraded: false,
        source: 'primary'
      };
    } catch (error) {
      // Primary operation failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Primary operation ${operationName} failed: ${errorMessage}`);
      
      // Track failure in metrics
      this.updateMetrics('operation_failure', { operation: operationName });
      
      // Increment error count and update component health
      if (this.componentHealth.has(operationName)) {
        const health = this.componentHealth.get(operationName)!;
        health.errorCount++;
        
        if (health.errorCount >= this.componentFailureThreshold) {
          this.updateComponentHealth(operationName, ServiceHealthStatus.PARTIALLY_DEGRADED);
        }
      } else {
        // Create new component health entry
        this.componentHealth.set(operationName, {
          name: operationName,
          status: ServiceHealthStatus.HEALTHY, // Start as healthy
          lastCheck: new Date(),
          errorCount: 1 // First error
        });
      }
      
      // Try cache first (if available)
      if (!skipCache && this.cache && cacheKey) {
        const cachedResult = this.cache.get(cacheNamespace, cacheKey);
        if (cachedResult) {
          logger.debug(`Cache hit for ${operationName} after primary failure`);
          source = 'cache';
          
          // Track metrics
          this.updateMetrics('cache_hit', { operation: operationName });
          
          return {
            data: cachedResult.value as T,
            isDegraded: true,
            degradationLevel: ServiceHealthStatus.PARTIALLY_DEGRADED,
            source,
            message: `Using cached data due to temporary service disruption`
          };
        }
      }
      
      // Try retry with exponential backoff (if not skipped)
      if (!skipRetry && retryAttempt < this.maxRetryAttempts) {
        logger.debug(`Retry attempt ${retryAttempt + 1}/${this.maxRetryAttempts} for ${operationName}`);
        
        // Calculate the delay with exponential backoff
        const delay = Math.min(
          this.initialRetryDelay * Math.pow(this.retryBackoffFactor, retryAttempt),
          this.maxRetryDelay
        );
        
        // Track retry metrics
        this.updateMetrics('retry_attempt', { operation: operationName, attempt: String(retryAttempt + 1) });
        
        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increment retry attempt and try again recursively
        retryAttempt++;
        
        try {
          const retryResult = await primaryFn();
          
          // Success on retry - update metrics
          this.updateMetrics('retry_success', { operation: operationName, attempt: String(retryAttempt) });
          
          // Cache the successful result if caching is enabled
          if (this.cache && cacheKey && cacheTTL) {
            this.cache.set(cacheNamespace, cacheKey, retryResult, cacheTTL);
          }
          
          // Track execution time in metrics
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          this.updateMetrics('operation_duration', { operation: operationName, source: 'primary' }, duration);
          
          return {
            data: retryResult,
            isDegraded: false,
            source: 'primary'
          };
        } catch (retryError) {
          // Retry also failed - log and continue with fallback
          logger.warn(`Retry ${retryAttempt}/${this.maxRetryAttempts} for ${operationName} failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
          
          // Track retry failure metrics
          this.updateMetrics('retry_failure', { operation: operationName, attempt: String(retryAttempt) });
        }
      }
      
      // If we have a fallback, use it
      if (fallbackConfig) {
        // Activate fallback if not already active
        if (!fallbackConfig.isActive) {
          fallbackConfig.isActive = true;
          this.emit('fallback_activated', { operationName });
          this.updateMetrics('fallback_activated', { operation: operationName });
        }
        
        logger.debug(`Using fallback for ${operationName} after primary failure`);
        source = 'fallback';
        
        try {
          const fallbackResult = await fallbackConfig.fallbackFn();
          
          // Track metrics
          this.updateMetrics('fallback_success', { operation: operationName });
          
          // Track execution time in metrics
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          this.updateMetrics('operation_duration', { operation: operationName, source }, duration);
          
          return {
            data: fallbackResult,
            isDegraded: true,
            degradationLevel: ServiceHealthStatus.PARTIALLY_DEGRADED,
            source,
            message: `Using fallback data due to temporary service disruption`
          };
        } catch (fallbackError) {
          // Fallback also failed
          logger.error(`Fallback for ${operationName} failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          
          // Track metrics
          this.updateMetrics('fallback_failure', { operation: operationName });
          
          throw new DegradedServiceError(
            `All strategies failed for ${operationName}: ${error instanceof Error ? error.message : String(error)}`,
            { 
              operationName, 
              componentStatus: this.componentHealth.get(operationName)?.status,
              attemptedStrategies: ['primary', 'cache', ...(retryAttempt > 0 ? ['retry'] : []), 'fallback']
            }
          );
        }
      }
      
      // No fallback available, re-throw the original error
      throw error;
    }
  }
  
  /**
   * Update component health status
   * 
   * @private
   * @param {string} componentName - The name of the component
   * @param {ServiceHealthStatus} status - The new status
   */
  private updateComponentHealth(componentName: string, status: ServiceHealthStatus): void {
    // Get current component health or create new entry
    const health = this.componentHealth.get(componentName) || {
      name: componentName,
      status: ServiceHealthStatus.HEALTHY,
      lastCheck: new Date(),
      errorCount: 0
    };
    
    const previousStatus = health.status;
    
    // Update health status
    health.status = status;
    health.lastCheck = new Date();
    
    // If becoming healthy, reset error count
    if (status === ServiceHealthStatus.HEALTHY) {
      health.errorCount = 0;
    }
    
    // Store updated health
    this.componentHealth.set(componentName, health);
    
    // Log status change
    if (previousStatus !== status) {
      logger.info(`Component ${componentName} health changed from ${previousStatus} to ${status}`);
      
      // Emit status change event
      this.emit('component_status_changed', {
        componentName,
        previousStatus,
        newStatus: status
      });
      
      // Update metrics
      this.updateMetrics('component_status_changed', {
        component: componentName,
        status
      });
    }
    
    // Recalculate overall health
    this.recalculateOverallHealth();
  }
  
  /**
   * Check health of all components
   * 
   * @private
   */
  private checkHealth(): void {
    logger.debug('Performing health check');
    
    // Get all circuit breakers
    const circuits = circuitBreakerRegistry.getAll();
    
    // Update component health based on circuit breaker state
    for (const circuit of circuits) {
      const circuitName = circuit.getName();
      const circuitState = circuit.getState();
      
      let status = ServiceHealthStatus.HEALTHY;
      
      if (circuitState === CircuitState.OPEN) {
        status = ServiceHealthStatus.SEVERELY_DEGRADED;
      } else if (circuitState === CircuitState.HALF_OPEN) {
        status = ServiceHealthStatus.PARTIALLY_DEGRADED;
      }
      
      this.updateComponentHealth(circuitName, status);
    }
    
    // Recalculate overall health
    this.recalculateOverallHealth();
    
    // Update metrics
    this.updateMetrics('health_check');
  }
  
  /**
   * Recalculate overall service health based on component health
   * 
   * @private
   */
  private recalculateOverallHealth(): void {
    // Default to healthy
    let newHealth = ServiceHealthStatus.HEALTHY;
    
    // Count critical component issues
    let criticalComponentIssues = 0;
    let nonCriticalComponentIssues = 0;
    
    for (const [componentName, health] of this.componentHealth.entries()) {
      // Skip healthy components
      if (health.status === ServiceHealthStatus.HEALTHY) {
        continue;
      }
      
      // Check if component has a fallback
      const hasFallback = Array.from(this.fallbacks.entries())
        .some(([opName, config]) => opName === componentName);
      
      // Get the fallback config if it exists
      const fallbackConfig = Array.from(this.fallbacks.entries())
        .find(([opName]) => opName === componentName)?.[1];
      
      const isCritical = fallbackConfig?.isCritical ?? false;
      
      // Update counters based on component health and criticality
      if (health.status === ServiceHealthStatus.UNAVAILABLE) {
        // If component is unavailable and critical, it's a critical issue
        if (isCritical && !hasFallback) {
          criticalComponentIssues++;
        } else {
          nonCriticalComponentIssues++;
        }
      } else if (health.status === ServiceHealthStatus.SEVERELY_DEGRADED) {
        // Severely degraded critical component without fallback is a critical issue
        if (isCritical && !hasFallback) {
          criticalComponentIssues++;
        } else {
          nonCriticalComponentIssues++;
        }
      } else if (health.status === ServiceHealthStatus.PARTIALLY_DEGRADED) {
        // Partially degraded components count as non-critical issues
        nonCriticalComponentIssues++;
      }
    }
    
    // Determine overall health based on component issues
    if (criticalComponentIssues > 0) {
      // If any critical components are unavailable or severely degraded without fallbacks,
      // the service is unavailable
      newHealth = ServiceHealthStatus.UNAVAILABLE;
    } else if (nonCriticalComponentIssues > 2) {
      // If more than 2 non-critical components have issues, service is severely degraded
      newHealth = ServiceHealthStatus.SEVERELY_DEGRADED;
    } else if (nonCriticalComponentIssues > 0) {
      // If any non-critical components have issues, service is partially degraded
      newHealth = ServiceHealthStatus.PARTIALLY_DEGRADED;
    }
    
    // Update overall health if changed
    if (newHealth !== this.overallHealth) {
      const previousHealth = this.overallHealth;
      this.overallHealth = newHealth;
      
      logger.info(`Overall service health changed from ${previousHealth} to ${newHealth}`);
      
      // Emit status change event
      this.emit('overall_status_changed', {
        previousStatus: previousHealth,
        newStatus: newHealth
      });
      
      // Update metrics
      this.updateMetrics('overall_status_changed', {
        status: newHealth
      });
    }
  }
  
  /**
   * Get current overall service health
   * 
   * @returns {ServiceHealthStatus} The current overall health status
   */
  getOverallHealth(): ServiceHealthStatus {
    return this.overallHealth;
  }
  
  /**
   * Get health of all components
   * 
   * @returns {ServiceComponentHealth[]} Array of component health statuses
   */
  getComponentHealth(): ServiceComponentHealth[] {
    return Array.from(this.componentHealth.values());
  }
  
  /**
   * Get health of a specific component
   * 
   * @param {string} componentName - The name of the component
   * @returns {ServiceComponentHealth | undefined} The component health or undefined if not found
   */
  getComponentHealthById(componentName: string): ServiceComponentHealth | undefined {
    return this.componentHealth.get(componentName);
  }
  
  /**
   * Update metrics for the graceful degradation service
   * 
   * This method attempts to update Prometheus metrics if the metrics module is available.
   * If the metrics module cannot be imported, the method silently ignores the error.
   * 
   * @private
   * @param {string} event - The event type
   * @param {Record<string, any>} [labels] - Additional labels for the metric
   * @param {number} [value] - Value for gauge metrics
   */
  private async updateMetrics(
    event: 'created' | 'health_check' | 'component_status_changed' | 'overall_status_changed' | 
          'fallback_registered' | 'fallback_activated' | 'fallback_deactivated' | 
          'fallback_success' | 'fallback_failure' | 'operation_duration' | 
          'operation_failure' | 'cache_hit' | 'retry_attempt' | 'retry_success' | 'retry_failure',
    labels?: Record<string, any>,
    value?: number
  ): Promise<void> {
    try {
      const metricsRegistry = await import('./metrics.js').then(m => m.default);
      
      switch (event) {
        case 'created':
          // New degradation service created
          break;
        
        case 'health_check':
          // Health check performed
          metricsRegistry.degradationHealthChecksTotal.inc();
          break;
        
        case 'component_status_changed':
          // Component status changed
          if (labels?.component && labels?.status) {
            metricsRegistry.degradationComponentStatusInfo.set({
              component: labels.component,
              status: labels.status
            }, 1);
            
            // Set other statuses to 0
            const allStatuses = Object.values(ServiceHealthStatus);
            for (const status of allStatuses) {
              if (status !== labels.status) {
                metricsRegistry.degradationComponentStatusInfo.set({
                  component: labels.component,
                  status
                }, 0);
              }
            }
          }
          break;
        
        case 'overall_status_changed':
          // Overall status changed
          if (labels?.status) {
            metricsRegistry.degradationOverallStatusInfo.set({
              status: labels.status
            }, 1);
            
            // Set other statuses to 0
            const allStatuses = Object.values(ServiceHealthStatus);
            for (const status of allStatuses) {
              if (status !== labels.status) {
                metricsRegistry.degradationOverallStatusInfo.set({
                  status
                }, 0);
              }
            }
          }
          break;
        
        case 'fallback_registered':
          // Fallback registered
          if (labels?.operation) {
            metricsRegistry.degradationFallbacksRegisteredTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'fallback_activated':
          // Fallback activated
          if (labels?.operation) {
            metricsRegistry.degradationFallbackActivationsTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'fallback_deactivated':
          // Fallback deactivated
          if (labels?.operation) {
            metricsRegistry.degradationFallbackDeactivationsTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'fallback_success':
          // Fallback success
          if (labels?.operation) {
            metricsRegistry.degradationFallbackSuccessTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'fallback_failure':
          // Fallback failure
          if (labels?.operation) {
            metricsRegistry.degradationFallbackFailureTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'operation_duration':
          // Operation duration
          if (labels?.operation && labels?.source && value !== undefined) {
            metricsRegistry.degradationOperationDuration.observe({
              operation: labels.operation,
              source: labels.source
            }, value);
          }
          break;
        
        case 'operation_failure':
          // Operation failure
          if (labels?.operation) {
            metricsRegistry.degradationOperationFailuresTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'cache_hit':
          // Cache hit
          if (labels?.operation) {
            metricsRegistry.degradationCacheHitsTotal.inc({
              operation: labels.operation
            });
          }
          break;
        
        case 'retry_attempt':
          // Retry attempt
          if (labels?.operation && labels?.attempt) {
            metricsRegistry.degradationRetryAttemptsTotal.inc({
              operation: labels.operation,
              attempt: labels.attempt
            });
          }
          break;
        
        case 'retry_success':
          // Retry success
          if (labels?.operation && labels?.attempt) {
            metricsRegistry.degradationRetrySuccessTotal.inc({
              operation: labels.operation,
              attempt: labels.attempt
            });
          }
          break;
        
        case 'retry_failure':
          // Retry failure
          if (labels?.operation && labels?.attempt) {
            metricsRegistry.degradationRetryFailureTotal.inc({
              operation: labels.operation,
              attempt: labels.attempt
            });
          }
          break;
      }
    } catch (error) {
      // Metrics module might not be available, or other error occurred
      // This is non-critical, so just log at debug level
      logger.debug(`Error updating graceful degradation metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Singleton instance of the graceful degradation service
 */
export const gracefulDegradation = new GracefulDegradation();

export default gracefulDegradation;
