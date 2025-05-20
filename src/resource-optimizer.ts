/**
 * Digital Samba MCP Server - Resource Optimizer Module
 * 
 * This module provides optimization strategies for high-traffic scenarios,
 * reducing resource usage and improving performance of the MCP server.
 * 
 * Features include:
 * - Request batching to reduce API calls
 * - Resource prioritization
 * - Response compression
 * - Incremental data loading
 * - Memory usage optimization
 * 
 * @module resource-optimizer
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js built-in modules
import { EventEmitter } from 'events';

// Local modules
import logger from './logger.js';
import { MemoryCache } from './cache.js';

/**
 * Resource optimizer options
 */
export interface ResourceOptimizerOptions {
  /** Maximum batch size for requests (default: 10) */
  maxBatchSize?: number;
  
  /** Batch delay in milliseconds (default: 50) */
  batchDelayMs?: number;
  
  /** Whether to enable response compression (default: true) */
  enableCompression?: boolean;
  
  /** Whether to enable incremental loading (default: true) */
  enableIncrementalLoading?: boolean;
  
  /** Cache TTL for optimized resources in milliseconds (default: 60000) */
  cacheTtl?: number;
  
  /** Maximum memory usage in bytes (default: 100MB) */
  maxMemoryUsage?: number;
  
  /** Memory check interval in milliseconds (default: 30000) */
  memoryCheckIntervalMs?: number;
}

/**
 * Request batch
 */
interface RequestBatch<T> {
  /** Batch ID */
  id: string;
  
  /** Keys in the batch */
  keys: string[];
  
  /** Key to resolver mapping */
  resolvers: Map<string, (value: T) => void>;
  
  /** Key to rejecter mapping */
  rejecters: Map<string, (reason: any) => void>;
  
  /** Timestamp when batch was created */
  createdAt: number;
  
  /** Whether batch is being processed */
  processing: boolean;
}

/**
 * Callback for batch execution
 */
type BatchExecutor<T> = (keys: string[]) => Promise<Map<string, T>>;

/**
 * Resource Optimizer class
 * 
 * Optimizes resource usage for high-traffic scenarios by batching requests,
 * compressing responses, and managing memory usage.
 */
export class ResourceOptimizer extends EventEmitter {
  private options: Required<ResourceOptimizerOptions>;
  private batches: Map<string, RequestBatch<any>> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: MemoryCache;
  private memoryCheckTimer?: NodeJS.Timeout;
  
  /**
   * Resource Optimizer constructor
   * @param options Resource optimizer options
   */
  constructor(options: ResourceOptimizerOptions = {}) {
    super();
    
    // Set default options
    this.options = {
      maxBatchSize: options.maxBatchSize || 10,
      batchDelayMs: options.batchDelayMs || 50,
      enableCompression: options.enableCompression !== false,
      enableIncrementalLoading: options.enableIncrementalLoading !== false,
      cacheTtl: options.cacheTtl || 60000, // 1 minute
      maxMemoryUsage: options.maxMemoryUsage || 100 * 1024 * 1024, // 100MB
      memoryCheckIntervalMs: options.memoryCheckIntervalMs || 30000 // 30 seconds
    };
    
    // Initialize cache
    this.cache = new MemoryCache({
      ttl: this.options.cacheTtl,
      maxItems: 1000
    });
    
    logger.info('Resource Optimizer initialized', {
      maxBatchSize: this.options.maxBatchSize,
      batchDelayMs: this.options.batchDelayMs,
      cacheTtl: this.options.cacheTtl
    });
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }
  
  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    // Clear existing timer
    this.stopMemoryMonitoring();
    
    // Start new timer
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.options.memoryCheckIntervalMs);
    
    logger.debug('Memory monitoring started', {
      interval: `${this.options.memoryCheckIntervalMs / 1000} seconds`,
      maxMemoryUsage: `${Math.round(this.options.maxMemoryUsage / (1024 * 1024))}MB`
    });
  }
  
  /**
   * Stop memory usage monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = undefined;
      
      logger.debug('Memory monitoring stopped');
    }
  }
  
  /**
   * Check memory usage and take action if needed
   */
  private checkMemoryUsage(): void {
    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;
      
      logger.debug('Memory usage check', {
        heapUsedMB: Math.round(heapUsed / (1024 * 1024)),
        maxMemoryUsageMB: Math.round(this.options.maxMemoryUsage / (1024 * 1024)),
        rss: Math.round(memoryUsage.rss / (1024 * 1024))
      });
      
      // Check if memory usage exceeds threshold
      if (heapUsed > this.options.maxMemoryUsage) {
        logger.warn('Memory usage exceeds threshold, clearing cache', {
          heapUsedMB: Math.round(heapUsed / (1024 * 1024)),
          maxMemoryUsageMB: Math.round(this.options.maxMemoryUsage / (1024 * 1024))
        });
        
        // Clear cache
        this.cache.clear();
        
        // Run garbage collection if available
        if (global.gc) {
          logger.debug('Triggering garbage collection');
          global.gc();
        }
        
        // Emit event
        this.emit('memory:exceeded', {
          heapUsed,
          maxMemoryUsage: this.options.maxMemoryUsage
        });
      }
    } catch (error) {
      logger.error('Error checking memory usage', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Batch a request
   * @param batchId Batch identifier
   * @param key Request key
   * @param executor Function to execute the batch
   * @returns Promise resolving to the result
   */
  public batchRequest<T>(batchId: string, key: string, executor: BatchExecutor<T>): Promise<T> {
    // Try to get from cache first
    const cached = this.cache.get(`batch:${batchId}`, key);
    if (cached) {
      logger.debug('Batch request cache hit', { batchId, key });
      return Promise.resolve(cached.value);
    }
    
    return new Promise<T>((resolve, reject) => {
      // Get or create batch
      let batch = this.batches.get(batchId);
      
      if (!batch) {
        batch = {
          id: batchId,
          keys: [],
          resolvers: new Map(),
          rejecters: new Map(),
          createdAt: Date.now(),
          processing: false
        };
        
        this.batches.set(batchId, batch);
        
        // Schedule batch execution
        const timerId = setTimeout(() => {
          this.executeBatch(batchId, executor);
        }, this.options.batchDelayMs);
        
        this.batchTimers.set(batchId, timerId);
        
        logger.debug('Created new batch', { batchId });
      }
      
      // Add to batch
      batch.keys.push(key);
      batch.resolvers.set(key, resolve);
      batch.rejecters.set(key, reject);
      
      logger.debug('Added request to batch', { 
        batchId, 
        key,
        batchSize: batch.keys.length 
      });
      
      // Execute immediately if batch size reached
      if (batch.keys.length >= this.options.maxBatchSize && !batch.processing) {
        // Clear scheduled execution
        const timerId = this.batchTimers.get(batchId);
        if (timerId) {
          clearTimeout(timerId);
          this.batchTimers.delete(batchId);
        }
        
        // Execute batch
        this.executeBatch(batchId, executor);
      }
    });
  }
  
  /**
   * Execute a batch
   * @param batchId Batch identifier
   * @param executor Function to execute the batch
   */
  private async executeBatch<T>(batchId: string, executor: BatchExecutor<T>): Promise<void> {
    // Get batch
    const batch = this.batches.get(batchId);
    if (!batch) {
      logger.warn('Attempted to execute non-existent batch', { batchId });
      return;
    }
    
    // Clear timer
    const timerId = this.batchTimers.get(batchId);
    if (timerId) {
      clearTimeout(timerId);
      this.batchTimers.delete(batchId);
    }
    
    // Skip if already processing
    if (batch.processing) {
      return;
    }
    
    // Mark as processing
    batch.processing = true;
    
    logger.info('Executing batch', { 
      batchId, 
      keyCount: batch.keys.length,
      batchAge: `${(Date.now() - batch.createdAt)}ms`
    });
    
    try {
      // Get unique keys
      const uniqueKeys = Array.from(new Set(batch.keys));
      
      // Execute batch
      const results = await executor(uniqueKeys);
      
      // Process results
      for (const key of batch.keys) {
        const resolver = batch.resolvers.get(key);
        if (!resolver) continue;
        
        const result = results.get(key);
        
        if (result !== undefined) {
          // Cache result
          this.cache.set(`batch:${batchId}`, key, result);
          
          // Resolve promise
          resolver(result);
          
          logger.debug('Batch request resolved', { batchId, key });
        } else {
          // Not found, reject
          const rejecter = batch.rejecters.get(key);
          if (rejecter) {
            rejecter(new Error(`No result found for key: ${key}`));
          }
          
          logger.debug('Batch request rejected (no result)', { batchId, key });
        }
      }
      
      // Emit event
      this.emit('batch:success', {
        batchId,
        keyCount: batch.keys.length,
        uniqueKeyCount: uniqueKeys.length,
        duration: Date.now() - batch.createdAt
      });
    } catch (error) {
      logger.error('Error executing batch', {
        batchId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Reject all promises
      for (const key of batch.keys) {
        const rejecter = batch.rejecters.get(key);
        if (rejecter) {
          rejecter(error);
        }
      }
      
      // Emit event
      this.emit('batch:error', {
        batchId,
        error: error instanceof Error ? error.message : String(error),
        keyCount: batch.keys.length
      });
    } finally {
      // Remove batch
      this.batches.delete(batchId);
      
      logger.debug('Batch execution completed', { batchId });
    }
  }
  
  /**
   * Check if a batch is in progress
   * @param batchId Batch identifier
   * @returns Whether the batch is in progress
   */
  public isBatchInProgress(batchId: string): boolean {
    return this.batches.has(batchId);
  }
  
  /**
   * Cancel a batch
   * @param batchId Batch identifier
   * @returns Whether the batch was cancelled
   */
  public cancelBatch(batchId: string): boolean {
    // Get batch
    const batch = this.batches.get(batchId);
    if (!batch) {
      return false;
    }
    
    // Clear timer
    const timerId = this.batchTimers.get(batchId);
    if (timerId) {
      clearTimeout(timerId);
      this.batchTimers.delete(batchId);
    }
    
    // Reject all promises
    for (const key of batch.keys) {
      const rejecter = batch.rejecters.get(key);
      if (rejecter) {
        rejecter(new Error('Batch cancelled'));
      }
    }
    
    // Remove batch
    this.batches.delete(batchId);
    
    logger.info('Batch cancelled', { batchId, keyCount: batch.keys.length });
    
    // Emit event
    this.emit('batch:cancelled', {
      batchId,
      keyCount: batch.keys.length
    });
    
    return true;
  }
  
  /**
   * Compress a response if compression is enabled
   * @param data Data to compress
   * @returns Compressed data or original data if compression disabled
   */
  public compressResponse(data: any): any {
    if (!this.options.enableCompression) {
      return data;
    }
    
    try {
      // Simple compression for demonstration
      // In a real implementation, use a proper compression algorithm
      
      if (typeof data === 'object' && data !== null) {
        // Remove null and undefined values
        const compressed = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v != null)
        );
        
        return compressed;
      }
      
      return data;
    } catch (error) {
      logger.warn('Error compressing response', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return original data on error
      return data;
    }
  }
  
  /**
   * Load data incrementally
   * @param dataLoader Function to load data
   * @param pageSize Page size
   * @param maxPages Maximum number of pages to load
   * @returns Promise resolving to the loaded data
   */
  public async loadIncrementally<T>(
    dataLoader: (page: number, pageSize: number) => Promise<{ data: T[], total: number }>,
    pageSize: number = 20,
    maxPages: number = 10
  ): Promise<T[]> {
    if (!this.options.enableIncrementalLoading) {
      // Load all data at once
      const result = await dataLoader(1, pageSize * maxPages);
      return result.data;
    }
    
    const allData: T[] = [];
    let page = 1;
    let total = 0;
    
    do {
      // Load page
      const result = await dataLoader(page, pageSize);
      const data = result.data;
      total = result.total;
      
      // Add to results
      allData.push(...data);
      
      // Emit progress event
      this.emit('incremental:progress', {
        page,
        loaded: allData.length,
        total,
        percentage: Math.min(100, Math.round((allData.length / total) * 100))
      });
      
      // Check if we're done
      if (data.length < pageSize || allData.length >= total || page >= maxPages) {
        break;
      }
      
      // Next page
      page++;
    } while (true);
    
    // Emit completion event
    this.emit('incremental:complete', {
      pages: page,
      loaded: allData.length,
      total
    });
    
    return allData;
  }
  
  /**
   * Get statistics for the resource optimizer
   * @returns Resource optimizer statistics
   */
  public getStats() {
    return {
      activeBatches: this.batches.size,
      cacheStats: this.cache.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clear batches
    for (const batchId of this.batches.keys()) {
      this.cancelBatch(batchId);
    }
    
    // Clear cache
    this.cache.clear();
    
    // Stop memory monitoring
    this.stopMemoryMonitoring();
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('Resource Optimizer destroyed');
  }
}

/**
 * Create a resource optimizer
 * @param options Resource optimizer options
 * @returns A new resource optimizer instance
 */
export function createResourceOptimizer(
  options: ResourceOptimizerOptions = {}
): ResourceOptimizer {
  return new ResourceOptimizer(options);
}

/**
 * Export default resource optimizer utilities
 */
export default {
  ResourceOptimizer,
  createResourceOptimizer
};
