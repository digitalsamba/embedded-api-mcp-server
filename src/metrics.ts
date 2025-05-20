/**
 * Digital Samba MCP Server - Metrics Module
 * 
 * This module provides Prometheus metrics collection for the Digital Samba MCP Server.
 * It sets up standardized metrics for monitoring system health, request performance,
 * and Digital Samba API interactions.
 * 
 * Features include:
 * - HTTP request metrics (count, duration, status codes)
 * - API client metrics (requests, errors, latency)
 * - System metrics (memory usage, CPU, etc.)
 * - Custom application metrics (cache hits/misses, rate limiting)
 * - Metrics endpoint for Prometheus scraping
 * 
 * @module metrics
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js built-in modules
import os from 'os';

// External dependencies
import { collectDefaultMetrics, Counter, Gauge, Histogram, register, Registry } from 'prom-client';
import express from 'express';

// Local modules
import logger from './logger.js';

/**
 * Metrics configuration options
 */
export interface MetricsOptions {
  /** Whether to collect default Node.js metrics */
  defaultMetrics?: boolean;
  
  /** Prefix for all metrics */
  prefix?: string;
  
  /** Whether to enable HTTP request metrics */
  enableHttpMetrics?: boolean;
  
  /** Whether to enable API client metrics */
  enableApiMetrics?: boolean;
  
  /** Whether to enable cache metrics */
  enableCacheMetrics?: boolean;
  
  /** Whether to enable rate limiting metrics */
  enableRateLimitMetrics?: boolean;
  
  /** Collection interval for default metrics in milliseconds */
  defaultMetricsInterval?: number;
}

/**
 * Default metrics configuration
 */
const defaultOptions: MetricsOptions = {
  defaultMetrics: true,
  prefix: 'digital_samba_mcp_',
  enableHttpMetrics: true,
  enableApiMetrics: true,
  enableCacheMetrics: true,
  enableRateLimitMetrics: true,
  defaultMetricsInterval: 10000 // 10 seconds
};

/**
 * Main metrics registry
 */
class MetricsRegistry {
  private registry: Registry;
  private options: MetricsOptions;
  private initialized: boolean = false;

  // HTTP metrics
  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public httpRequestsInFlight: Gauge;
  public httpResponseSize: Histogram;

  // API client metrics
  public apiRequestsTotal: Counter;
  public apiRequestDuration: Histogram;
  public apiErrorsTotal: Counter;

  // Cache metrics
  public cacheHitsTotal: Counter;
  public cacheMissesTotal: Counter;
  public cacheSize: Gauge;
  public cacheEntriesCount: Gauge;

  // Rate limiting metrics
  public rateLimitExceededTotal: Counter;
  public rateLimitRemainingTokens: Gauge;

  // System metrics
  public appInfo: Gauge;
  public activeConnections: Gauge;
  public activeSessions: Gauge;
  
  /**
   * Constructor for the metrics registry
   * @param options Metrics configuration options
   */
  constructor(options: MetricsOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.registry = new Registry();
    
    // Set up app info metric
    this.appInfo = new Gauge({
      name: `${this.options.prefix}app_info`,
      help: 'Application information',
      labelNames: ['version', 'node_version', 'hostname'],
      registers: [this.registry]
    });
    
    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: `${this.options.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry]
    });
    
    this.httpRequestDuration = new Histogram({
      name: `${this.options.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });
    
    this.httpRequestsInFlight = new Gauge({
      name: `${this.options.prefix}http_requests_in_flight`,
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path'],
      registers: [this.registry]
    });
    
    this.httpResponseSize = new Histogram({
      name: `${this.options.prefix}http_response_size_bytes`,
      help: 'Size of HTTP responses in bytes',
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry]
    });
    
    // Initialize API client metrics
    this.apiRequestsTotal = new Counter({
      name: `${this.options.prefix}api_requests_total`,
      help: 'Total number of API requests',
      labelNames: ['endpoint', 'method'],
      registers: [this.registry]
    });
    
    this.apiRequestDuration = new Histogram({
      name: `${this.options.prefix}api_request_duration_seconds`,
      help: 'API request duration in seconds',
      labelNames: ['endpoint', 'method', 'status'],
      buckets: [0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });
    
    this.apiErrorsTotal = new Counter({
      name: `${this.options.prefix}api_errors_total`,
      help: 'Total number of API errors',
      labelNames: ['endpoint', 'method', 'error_type'],
      registers: [this.registry]
    });
    
    // Initialize cache metrics
    this.cacheHitsTotal = new Counter({
      name: `${this.options.prefix}cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['namespace'],
      registers: [this.registry]
    });
    
    this.cacheMissesTotal = new Counter({
      name: `${this.options.prefix}cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['namespace'],
      registers: [this.registry]
    });
    
    this.cacheSize = new Gauge({
      name: `${this.options.prefix}cache_size_bytes`,
      help: 'Size of cache in bytes',
      registers: [this.registry]
    });
    
    this.cacheEntriesCount = new Gauge({
      name: `${this.options.prefix}cache_entries_count`,
      help: 'Number of entries in the cache',
      labelNames: ['namespace'],
      registers: [this.registry]
    });
    
    // Initialize rate limiting metrics
    this.rateLimitExceededTotal = new Counter({
      name: `${this.options.prefix}rate_limit_exceeded_total`,
      help: 'Total number of rate limit exceeded events',
      labelNames: ['key_type'],
      registers: [this.registry]
    });
    
    this.rateLimitRemainingTokens = new Gauge({
      name: `${this.options.prefix}rate_limit_remaining_tokens`,
      help: 'Number of tokens remaining for rate limited keys',
      labelNames: ['key_type'],
      registers: [this.registry]
    });
    
    // Initialize connection metrics
    this.activeConnections = new Gauge({
      name: `${this.options.prefix}active_connections`,
      help: 'Number of active connections',
      registers: [this.registry]
    });
    
    this.activeSessions = new Gauge({
      name: `${this.options.prefix}active_sessions`,
      help: 'Number of active sessions',
      registers: [this.registry]
    });
  }
  
  /**
   * Initialize metrics collection
   */
  initialize() {
    if (this.initialized) {
      return;
    }
    
    if (this.options.defaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: this.options.prefix,
        timestamps: true,
        interval: this.options.defaultMetricsInterval
      });
    }
    
    // Set app info
    this.appInfo.labels(
      process.env.npm_package_version || '0.1.0',
      process.version,
      os.hostname()
    ).set(1);
    
    logger.info('Metrics collection initialized', { 
      prefix: this.options.prefix,
      defaultMetrics: this.options.defaultMetrics,
      defaultMetricsInterval: this.options.defaultMetricsInterval
    });
    
    this.initialized = true;
  }
  
  /**
   * Get the metrics registry
   * @returns Prometheus Registry instance
   */
  getRegistry() {
    return this.registry;
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.registry.resetMetrics();
    logger.info('Metrics reset');
  }
  
  /**
   * Get metrics as string in Prometheus format
   * @returns Prometheus metrics string
   */
  async getMetricsAsString() {
    return await this.registry.metrics();
  }
  
  /**
   * Create Express middleware for tracking HTTP requests
   * @returns Express middleware function
   */
  createHttpMetricsMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!this.options.enableHttpMetrics) {
        return next();
      }
      
      const path = req.path || req.url;
      const method = req.method;
      
      // Skip metrics endpoint to avoid circular measurements
      if (path === '/metrics') {
        return next();
      }
      
      const startTime = Date.now();
      const labels = { method, path };
      
      // Increment in-flight counter
      this.httpRequestsInFlight.inc(labels);
      
      // Add response size tracking
      const originalWrite = res.write;
      const originalEnd = res.end;
      let responseSize = 0;
      
      // Override write method to track response size
      res.write = function(chunk: any, ...args: any[]) {
        responseSize += chunk.length;
        return originalWrite.apply(res, [chunk, ...args]);
      };
      
      // Override end method to track response size and finalize metrics
      res.end = function(chunk: any, ...args: any[]) {
        if (chunk) {
          responseSize += chunk.length;
        }
        
        originalEnd.apply(res, [chunk, ...args]);
      };
      
      // Add response finished handler
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const statusCode = res.statusCode.toString();
        const allLabels = { ...labels, status: statusCode };
        
        // Record metrics
        this.httpRequestsTotal.inc(allLabels);
        this.httpRequestDuration.observe(allLabels, duration);
        this.httpResponseSize.observe(responseSize);
        
        // Decrement in-flight counter
        this.httpRequestsInFlight.dec(labels);
      });
      
      next();
    };
  }
  
  /**
   * Register metrics endpoint on an Express app
   * @param app Express application
   * @param path Optional path for metrics endpoint (default: /metrics)
   */
  registerMetricsEndpoint(app: express.Application, path = '/metrics') {
    app.get(path, async (req, res) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(await this.getMetricsAsString());
    });
    
    logger.info('Metrics endpoint registered', { path });
  }
}

// Create singleton instance
const metricsRegistry = new MetricsRegistry();

/**
 * Initialize metrics collection with options
 * @param options Metrics configuration options
 * @returns The metrics registry instance
 */
export function initializeMetrics(options: MetricsOptions = {}) {
  // Apply options
  const metrics = new MetricsRegistry(options);
  metrics.initialize();
  return metrics;
}

/**
 * Get the metrics registry instance
 * @returns The metrics registry
 */
export function getMetricsRegistry() {
  return metricsRegistry;
}

/**
 * Export the default metrics registry
 */
export default metricsRegistry;
