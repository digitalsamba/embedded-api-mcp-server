/**
 * Digital Samba MCP Server - Cache Module
 *
 * This module provides caching functionality for the Digital Samba MCP Server.
 * It implements a flexible caching system for API responses, reducing load on
 * the Digital Samba API and improving response times for clients.
 *
 * Features include:
 * - Configurable TTL (Time-To-Live) for cached responses
 * - Memory-based cache storage
 * - Optional Redis-based storage for distributed deployments
 * - Cache invalidation strategies
 * - Support for conditional requests (ETag, If-Modified-Since)
 *
 * @module cache
 * @author Digital Samba Team
 * @version 0.1.0
 */

// Node.js built-in modules
import { createHash } from "crypto";

// External dependencies
// None for now

// Local modules
import logger from "./logger.js";

/**
 * Cache options interface
 */
export interface CacheOptions {
  /** Default TTL in milliseconds */
  ttl: number;

  /** Maximum number of items to store */
  maxItems?: number;

  /** Whether to use ETag for conditional requests */
  useEtag?: boolean;

  /** Function to generate cache keys */
  keyGenerator?: (namespace: string, id: string) => string;

  /** Custom serialization function */
  serializer?: (value: unknown) => string;

  /** Custom deserialization function */
  deserializer?: (value: string) => unknown;
}

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;

  /** Expiration timestamp */
  expires: number;

  /** ETag for conditional requests */
  etag?: string;

  /** Last modified timestamp */
  lastModified?: Date;
}

/**
 * Default cache options
 */
export const defaultCacheOptions: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes by default
  maxItems: 1000,
  useEtag: true,
  keyGenerator: (namespace, id) => `${namespace}:${id}`,
  serializer: (value) => JSON.stringify(value),
  deserializer: (value) => JSON.parse(value),
};

/**
 * Memory-based cache implementation
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private options: CacheOptions;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Creates a new MemoryCache
   * @param options Cache options
   */
  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...defaultCacheOptions, ...options };
    this.cache = new Map<string, CacheEntry<T>>();

    logger.info("Cache initialized", {
      ttl: this.options.ttl,
      maxItems: this.options.maxItems,
    });

    // Start periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Generates an ETag for a value
   *
   * Creates a unique identifier based on the content hash that can be used
   * for HTTP conditional requests (If-None-Match header).
   *
   * @param {unknown} value - Value to generate ETag for
   * @returns {string} ETag string (MD5 hash truncated to 16 chars)
   * @private
   */
  private generateEtag(value: unknown): string {
    const serialized =
      typeof value === "string" ? value : this.options.serializer!(value);

    // Generate deterministic ETag based on content hash
    return createHash("md5").update(serialized).digest("hex").substring(0, 16);
  }

  /**
   * Starts the cleanup interval to remove expired items
   */
  private startCleanupInterval(): void {
    const cleanupInterval = Math.min(this.options.ttl / 2, 60 * 1000); // At most once per minute

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Cleans up expired cache entries
   */
  public cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug("Cache cleanup completed", { expiredCount });
    }
  }

  /**
   * Sets a value in the cache
   *
   * This method stores a value in the cache with automatic expiration and optional
   * ETag generation for conditional requests. It handles cache size limits by
   * evicting the oldest entries when necessary.
   *
   * @param {string} namespace - Cache namespace (e.g., 'rooms', 'sessions')
   * @param {string} id - Unique identifier within the namespace
   * @param {T} value - Value to cache
   * @param {number} [ttl] - Optional TTL override in milliseconds
   * @returns {CacheEntry<T>} The cached entry with metadata
   *
   * @example
   * // Cache a room object for 10 minutes
   * cache.set('rooms', 'room-123', roomData, 600000);
   *
   * @example
   * // Cache with default TTL
   * cache.set('sessions', 'session-456', sessionData);
   */
  public set(
    namespace: string,
    id: string,
    value: T,
    ttl?: number,
  ): CacheEntry<T> {
    const key = this.options.keyGenerator!(namespace, id);
    const now = Date.now();
    const expires = now + (ttl || this.options.ttl);

    // Generate ETag if enabled
    const etag = this.options.useEtag ? this.generateEtag(value) : undefined;

    const entry: CacheEntry<T> = {
      value,
      expires,
      etag,
      lastModified: new Date(),
    };

    // Check if we need to evict items to stay within size limits
    // Only evict if we're adding a new item (not updating existing)
    if (
      this.options.maxItems &&
      this.cache.size >= this.options.maxItems &&
      !this.cache.has(key)
    ) {
      this.evictOldest();
    }

    this.cache.set(key, entry);

    logger.debug("Cache item set", {
      namespace,
      id,
      ttl: ttl || this.options.ttl,
    });

    return entry;
  }

  /**
   * Gets a value from the cache
   * @param namespace Cache namespace
   * @param id Item identifier
   * @returns The cached entry or undefined if not found or expired
   */
  public get(namespace: string, id: string): CacheEntry<T> | undefined {
    const key = this.options.keyGenerator!(namespace, id);
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug("Cache miss", { namespace, id });
      return undefined;
    }

    // Check if expired
    if (entry.expires <= Date.now()) {
      logger.debug("Cache entry expired", { namespace, id });
      this.cache.delete(key);
      return undefined;
    }

    logger.debug("Cache hit", { namespace, id });
    return entry;
  }

  /**
   * Deletes a value from the cache
   * @param namespace Cache namespace
   * @param id Item identifier
   * @returns Whether the item was deleted
   */
  public delete(namespace: string, id: string): boolean {
    const key = this.options.keyGenerator!(namespace, id);
    const deleted = this.cache.delete(key);

    if (deleted) {
      logger.debug("Cache item deleted", { namespace, id });
    }

    return deleted;
  }

  /**
   * Invalidates a specific cache entry in a namespace
   * @param namespace Cache namespace
   * @param id Item identifier
   * @returns Whether the item was invalidated
   */
  public invalidate(namespace: string, id: string): boolean {
    const key = this.options.keyGenerator!(namespace, id);
    const deleted = this.cache.delete(key);

    if (deleted) {
      logger.debug("Cache item invalidated", { namespace, id });
    }

    return deleted;
  }

  /**
   * Invalidates all items in a namespace
   * @param namespace Cache namespace
   * @returns Number of items invalidated
   */
  public invalidateNamespace(namespace: string): number {
    let count = 0;
    const prefix = `${namespace}:`;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.debug("Cache namespace invalidated", { namespace, count });
    }

    return count;
  }

  /**
   * Checks if a value is fresh based on conditional headers
   * @param namespace Cache namespace
   * @param id Item identifier
   * @param etag ETag to compare
   * @param modifiedSince Last-Modified date to compare
   * @returns Whether the cached value is considered fresh
   */
  public isFresh(
    namespace: string,
    id: string,
    etag?: string,
    modifiedSince?: Date,
  ): boolean {
    const entry = this.get(namespace, id);

    if (!entry) {
      return false;
    }

    // Check ETag if provided
    if (etag && entry.etag === etag) {
      return true;
    }

    // Check Last-Modified if provided
    if (
      modifiedSince &&
      entry.lastModified &&
      entry.lastModified <= modifiedSince
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evicts the oldest item from the cache
   * @returns Whether an item was evicted
   */
  private evictOldest(): boolean {
    if (this.cache.size === 0) {
      return false;
    }

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < oldestTime) {
        oldestKey = key;
        oldestTime = entry.expires;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug("Cache item evicted", { key: oldestKey });
      return true;
    }

    return false;
  }

  /**
   * Clears the entire cache
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info("Cache cleared", { itemsCleared: size });
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  public getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;

    for (const entry of this.cache.values()) {
      if (entry.expires > now) {
        validItems++;
      } else {
        expiredItems++;
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      maxItems: this.options.maxItems,
    };
  }

  /**
   * Destroys the cache and clears cleanup timers
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }
}

/**
 * Redis-backed cache implementation
 * This implementation uses Redis for storage, making it suitable for distributed deployments.
 * Note: This is a placeholder for the Redis implementation.
 * The actual implementation would use a Redis client library.
 */
export class RedisCache {
  constructor(_options: Partial<CacheOptions> = {}) {
    // Initialize with Redis client
    logger.info("Redis cache initialized");

    throw new Error("Redis cache not yet implemented");
  }
}

/**
 * Create a caching middleware for Express
 * This is a placeholder function for a potential Express middleware
 */
export function createCacheMiddleware(options: Partial<CacheOptions> = {}) {
  const cache = new MemoryCache(options);

  // Middleware implementation would go here

  logger.info("Cache middleware created");

  return {
    cache,
    middleware: (_namespace: string) => {
      return (_req: unknown, _res: unknown, next: () => void) => {
        // Middleware implementation
        next();
      };
    },
  };
}

/**
 * Exports the default cache
 */
export default {
  MemoryCache,
  RedisCache,
  createCacheMiddleware,
};
