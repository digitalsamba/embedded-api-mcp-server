/**
 * Unit tests for session-store.ts
 *
 * Covers the in-memory store implementation (get/set/delete/keys/size and TTL
 * expiry), the Redis-backed implementation (against a mocked ioredis client)
 * and the getStore() selection logic driven by REDIS_URL.
 *
 * No real Redis connection is ever made - ioredis is mocked entirely.
 *
 * @module tests/unit/session-store
 */

import type * as SessionStoreModule from "../../src/session-store.js";

// Mock ioredis so constructing a RedisStore never opens a socket.
// Everything the tests need is exposed as statics on the mock class so the
// factory stays self-contained (jest hoists this above the imports).
jest.mock("ioredis", () => {
  class MockRedis {
    static instances: MockRedis[] = [];
    static lastUrl: string | undefined;
    static lastOptions: Record<string, unknown> | undefined;

    url: string;
    handlers: Record<string, (arg?: unknown) => void> = {};

    get = jest.fn();
    set = jest.fn();
    setex = jest.fn();
    del = jest.fn();
    keys = jest.fn();

    constructor(url: string, options?: Record<string, unknown>) {
      this.url = url;
      MockRedis.lastUrl = url;
      MockRedis.lastOptions = options;
      MockRedis.instances.push(this);
    }

    on(event: string, handler: (arg?: unknown) => void) {
      this.handlers[event] = handler;
      return this;
    }
  }
  return { Redis: MockRedis };
});

jest.mock("../../src/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

interface MockRedisClass {
  new (url: string, options?: Record<string, unknown>): MockRedisInstance;
  instances: MockRedisInstance[];
  lastUrl: string | undefined;
  lastOptions: Record<string, unknown> | undefined;
}

interface MockRedisInstance {
  url: string;
  handlers: Record<string, (arg?: unknown) => void>;
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  keys: jest.Mock;
}

interface LoggerMock {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
}

/**
 * Reset the module registry and re-require everything together so the
 * session-store singleton, the ioredis mock and the logger mock all come from
 * the same fresh registry.
 */
function freshModules(): {
  sessionStore: typeof SessionStoreModule;
  Redis: MockRedisClass;
  logger: LoggerMock;
} {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-var-requires */
  const sessionStore = require("../../src/session-store.js");
  const { Redis } = require("ioredis");
  const logger = require("../../src/logger").default;
  /* eslint-enable @typescript-eslint/no-var-requires */
  return { sessionStore, Redis, logger };
}

describe("session-store", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.useRealTimers();
  });

  describe("constants", () => {
    it("exposes distinct key prefixes for each data type", () => {
      const { sessionStore } = freshModules();
      const values = Object.values(sessionStore.PREFIXES);

      expect(new Set(values).size).toBe(values.length);
      values.forEach((prefix) => expect(prefix.startsWith("mcp:")).toBe(true));
    });

    it("exposes TTLs in seconds", () => {
      const { sessionStore } = freshModules();

      expect(sessionStore.TTL.SESSION).toBe(24 * 60 * 60);
      expect(sessionStore.TTL.CLIENT).toBe(30 * 24 * 60 * 60);
      expect(sessionStore.TTL.CODE_VERIFIER).toBe(10 * 60);
      expect(sessionStore.TTL.PENDING_AUTH).toBe(10 * 60);
      expect(sessionStore.TTL.AUTH_CODE).toBe(10 * 60);
    });
  });

  describe("getStore selection", () => {
    it("uses the in-memory store when REDIS_URL is not set", () => {
      const { sessionStore, Redis, logger } = freshModules();

      const store = sessionStore.getStore();

      expect(store).toBeDefined();
      expect(Redis.instances).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("REDIS_URL not set"),
      );
    });

    it("uses the Redis store when REDIS_URL is set", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const { sessionStore, Redis } = freshModules();

      sessionStore.getStore();

      expect(Redis.instances).toHaveLength(1);
      expect(Redis.lastUrl).toBe("redis://localhost:6379");
      expect(Redis.lastOptions).toMatchObject({ maxRetriesPerRequest: 3 });
    });

    it("masks credentials in the Redis connection log", () => {
      process.env.REDIS_URL = "redis://admin:sup3rsecret@redis.internal:6379";
      const { sessionStore, logger } = freshModules();

      sessionStore.getStore();

      const logged = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).toContain("Using Redis store");
      expect(logged).not.toContain("sup3rsecret");
      expect(logged).toContain("//***@redis.internal:6379");
    });

    it("returns the same singleton on repeated calls", () => {
      const { sessionStore } = freshModules();

      expect(sessionStore.getStore()).toBe(sessionStore.getStore());
    });

    it("ignores a REDIS_URL set after the store was already created", () => {
      const { sessionStore, Redis } = freshModules();

      const memoryStore = sessionStore.getStore();
      process.env.REDIS_URL = "redis://localhost:6379";

      expect(sessionStore.getStore()).toBe(memoryStore);
      expect(Redis.instances).toHaveLength(0);
    });

    it("backs off then gives up after three retries", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const { sessionStore, Redis } = freshModules();

      sessionStore.getStore();
      const retryStrategy = Redis.lastOptions?.retryStrategy as (
        times: number,
      ) => number | null;

      expect(retryStrategy(1)).toBe(100);
      expect(retryStrategy(3)).toBe(300);
      expect(retryStrategy(4)).toBeNull();
    });

    it("registers error and connect handlers on the Redis client", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const { sessionStore, Redis, logger } = freshModules();

      sessionStore.getStore();
      const client = Redis.instances[0];

      expect(Object.keys(client.handlers).sort()).toEqual(["connect", "error"]);

      client.handlers.error(new Error("boom"));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("boom"),
      );

      client.handlers.connect();
      expect(logger.info).toHaveBeenCalledWith("Redis connected");
    });
  });

  describe("MemoryStore", () => {
    let store: ReturnType<typeof SessionStoreModule.getStore>;

    beforeEach(() => {
      const { sessionStore } = freshModules();
      store = sessionStore.getStore();
    });

    it("returns null for a key that was never set", async () => {
      await expect(store.get("missing")).resolves.toBeNull();
    });

    it("round-trips a value through set/get", async () => {
      await store.set("a", { hello: "world" });

      await expect(store.get("a")).resolves.toEqual({ hello: "world" });
    });

    it("preserves value types without serialising", async () => {
      await store.set("num", 42);
      await store.set("str", "text");
      await store.set("bool", false);

      await expect(store.get("num")).resolves.toBe(42);
      await expect(store.get("str")).resolves.toBe("text");
      await expect(store.get("bool")).resolves.toBe(false);
    });

    it("overwrites an existing key", async () => {
      await store.set("a", "first");
      await store.set("a", "second");

      await expect(store.get("a")).resolves.toBe("second");
    });

    it("deletes a key", async () => {
      await store.set("a", "value");
      await store.delete("a");

      await expect(store.get("a")).resolves.toBeNull();
    });

    it("treats deleting an unknown key as a no-op", async () => {
      await expect(store.delete("never-set")).resolves.toBeUndefined();
    });

    it("keeps a value with no TTL indefinitely", async () => {
      jest.useFakeTimers();
      await store.set("forever", "value");

      jest.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);

      await expect(store.get("forever")).resolves.toBe("value");
    });

    it("returns a value before its TTL elapses", async () => {
      jest.useFakeTimers();
      await store.set("temp", "value", 60);

      jest.advanceTimersByTime(59_000);

      await expect(store.get("temp")).resolves.toBe("value");
    });

    it("expires a value once its TTL has elapsed", async () => {
      jest.useFakeTimers();
      await store.set("temp", "value", 60);

      jest.advanceTimersByTime(61_000);

      await expect(store.get("temp")).resolves.toBeNull();
    });

    it("drops expired entries from keys() after they are read", async () => {
      jest.useFakeTimers();
      await store.set("p:1", "value", 60);

      jest.advanceTimersByTime(61_000);
      await store.get("p:1");

      await expect(store.keys("p:*")).resolves.toEqual([]);
    });

    it("matches keys by prefix pattern", async () => {
      await store.set("mcp:session:one", 1);
      await store.set("mcp:session:two", 2);
      await store.set("mcp:client:one", 3);

      const keys = await store.keys("mcp:session:*");

      expect(keys.sort()).toEqual(["mcp:session:one", "mcp:session:two"]);
    });

    it("anchors the pattern rather than matching substrings", async () => {
      await store.set("prefix:one", 1);
      await store.set("other:prefix:two", 2);

      await expect(store.keys("prefix:*")).resolves.toEqual(["prefix:one"]);
    });

    it("returns an empty array when nothing matches", async () => {
      await store.set("a:1", 1);

      await expect(store.keys("b:*")).resolves.toEqual([]);
    });

    it("counts keys under a prefix with size()", async () => {
      await store.set("mcp:client:a", 1);
      await store.set("mcp:client:b", 2);
      await store.set("mcp:session:c", 3);

      await expect(store.size("mcp:client:")).resolves.toBe(2);
      await expect(store.size("mcp:session:")).resolves.toBe(1);
      await expect(store.size("mcp:nothing:")).resolves.toBe(0);
    });
  });

  describe("RedisStore", () => {
    let store: ReturnType<typeof SessionStoreModule.getStore>;
    let client: MockRedisInstance;

    beforeEach(() => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const { sessionStore, Redis } = freshModules();
      store = sessionStore.getStore();
      client = Redis.instances[0];
    });

    it("parses JSON values on get", async () => {
      client.get.mockResolvedValue(JSON.stringify({ hello: "world" }));

      await expect(store.get("a")).resolves.toEqual({ hello: "world" });
      expect(client.get).toHaveBeenCalledWith("a");
    });

    it("returns null when the key is missing", async () => {
      client.get.mockResolvedValue(null);

      await expect(store.get("a")).resolves.toBeNull();
    });

    it("returns null when the stored value is not valid JSON", async () => {
      client.get.mockResolvedValue("not-json{");

      await expect(store.get("a")).resolves.toBeNull();
    });

    it("uses setex when a TTL is given", async () => {
      await store.set("a", { v: 1 }, 60);

      expect(client.setex).toHaveBeenCalledWith("a", 60, '{"v":1}');
      expect(client.set).not.toHaveBeenCalled();
    });

    it("uses set when no TTL is given", async () => {
      await store.set("a", { v: 1 });

      expect(client.set).toHaveBeenCalledWith("a", '{"v":1}');
      expect(client.setex).not.toHaveBeenCalled();
    });

    it("delegates delete to del", async () => {
      await store.delete("a");

      expect(client.del).toHaveBeenCalledWith("a");
    });

    it("delegates keys to the Redis glob lookup", async () => {
      client.keys.mockResolvedValue(["mcp:client:a"]);

      await expect(store.keys("mcp:client:*")).resolves.toEqual([
        "mcp:client:a",
      ]);
      expect(client.keys).toHaveBeenCalledWith("mcp:client:*");
    });

    it("counts keys under a prefix with size()", async () => {
      client.keys.mockResolvedValue(["mcp:client:a", "mcp:client:b"]);

      await expect(store.size("mcp:client:")).resolves.toBe(2);
      expect(client.keys).toHaveBeenCalledWith("mcp:client:*");
    });
  });
});
