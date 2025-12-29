/**
 * Session Store for Digital Samba MCP Server
 *
 * Provides persistent storage for OAuth sessions, registered clients, etc.
 * Uses Redis when REDIS_URL is set, falls back to in-memory for local dev.
 */

import { Redis } from "ioredis";
import logger from "./logger.js";

// Store interface - abstraction over Redis/Memory
interface Store {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  size(prefix: string): Promise<number>;
}

// In-memory store for local development
class MemoryStore implements Store {
  private data = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.data.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");
    return Array.from(this.data.keys()).filter((k) => regex.test(k));
  }

  async size(prefix: string): Promise<number> {
    return (await this.keys(prefix + "*")).length;
  }
}

// Redis store for production
class RedisStore implements Store {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on("error", (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    this.client.on("connect", () => {
      logger.info("Redis connected");
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async size(prefix: string): Promise<number> {
    const keys = await this.keys(prefix + "*");
    return keys.length;
  }
}

// Singleton store instance
let store: Store | null = null;

/**
 * Get the session store instance
 * Uses Redis if REDIS_URL is set, otherwise in-memory
 */
export function getStore(): Store {
  if (!store) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      logger.info(`Using Redis store: ${redisUrl.replace(/\/\/.*@/, "//***@")}`);
      store = new RedisStore(redisUrl);
    } else {
      logger.warn("REDIS_URL not set - using in-memory store (sessions lost on restart)");
      store = new MemoryStore();
    }
  }
  return store;
}

// Key prefixes for different data types
export const PREFIXES = {
  SESSION: "mcp:session:",
  CLIENT: "mcp:client:",
  CODE_VERIFIER: "mcp:verifier:",
  PENDING_AUTH: "mcp:pending:",
  PENDING_CLIENT: "mcp:pendingclient:",
  AUTH_CODE: "mcp:authcode:",
} as const;

// TTLs in seconds
export const TTL = {
  SESSION: 24 * 60 * 60, // 24 hours
  CLIENT: 30 * 24 * 60 * 60, // 30 days
  CODE_VERIFIER: 10 * 60, // 10 minutes
  PENDING_AUTH: 10 * 60, // 10 minutes
  AUTH_CODE: 10 * 60, // 10 minutes
} as const;
