/**
 * Unit tests for session-registry.ts
 *
 * The registry exists because most MCP clients never send DELETE /mcp, so
 * abandoned sessions used to accumulate in memory forever. These tests pin the
 * eviction behaviour, and in particular the cases where a session must NOT be
 * evicted (recent traffic, open SSE stream).
 *
 * Time is passed in explicitly rather than faked, so nothing here depends on
 * timers or wall-clock.
 *
 * @module tests/unit/session-registry
 */

import { SessionRegistry } from "../../src/session-registry.js";

const MINUTE = 60 * 1000;

/** Minimal transport double; records whether close() was called. */
function makeTransport(): { close: jest.Mock; closed: () => boolean } {
  const close = jest.fn().mockResolvedValue(undefined);
  return { close, closed: () => close.mock.calls.length > 0 };
}

describe("SessionRegistry", () => {
  describe("basic bookkeeping", () => {
    it("adds, retrieves and removes sessions", () => {
      const registry = new SessionRegistry();
      const transport = makeTransport();

      registry.add("s1", transport);
      expect(registry.has("s1")).toBe(true);
      expect(registry.get("s1")).toBe(transport);
      expect(registry.size).toBe(1);

      registry.remove("s1");
      expect(registry.has("s1")).toBe(false);
      expect(registry.size).toBe(0);
    });

    it("does not close the transport on remove()", () => {
      const registry = new SessionRegistry();
      const transport = makeTransport();

      registry.add("s1", transport);
      registry.remove("s1");

      // remove() is bookkeeping only - it is called *from* onclose handlers,
      // so closing here would recurse.
      expect(transport.closed()).toBe(false);
    });

    it("ignores touch() for unknown sessions", () => {
      const registry = new SessionRegistry();
      registry.touch("never-existed");
      expect(registry.size).toBe(0);
    });
  });

  describe("idle sweeping", () => {
    it("evicts and closes a session idle beyond the timeout", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = makeTransport();
      registry.add("stale", transport, 0);

      const swept = await registry.sweep(31 * MINUTE);

      expect(swept).toBe(1);
      expect(registry.has("stale")).toBe(false);
      expect(registry.size).toBe(0);
      expect(transport.closed()).toBe(true);
    });

    it("keeps a session that is idle but within the timeout", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = makeTransport();
      registry.add("fresh", transport, 0);

      const swept = await registry.sweep(29 * MINUTE);

      expect(swept).toBe(0);
      expect(registry.has("fresh")).toBe(true);
      expect(transport.closed()).toBe(false);
    });

    it("keeps a session whose idle clock was reset by traffic", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = makeTransport();
      registry.add("busy", transport, 0);

      // A request arrives at t=29min, well before the session goes stale.
      registry.touch("busy", 29 * MINUTE);

      // At t=31min it is only 2 minutes idle, so it must survive.
      expect(await registry.sweep(31 * MINUTE)).toBe(0);
      expect(registry.has("busy")).toBe(true);
    });

    it("sweeps only the stale sessions, leaving active ones alone", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const stale = makeTransport();
      const active = makeTransport();

      registry.add("stale", stale, 0);
      registry.add("active", active, 0);
      registry.touch("active", 30 * MINUTE);

      const swept = await registry.sweep(31 * MINUTE);

      expect(swept).toBe(1);
      expect(registry.has("stale")).toBe(false);
      expect(registry.has("active")).toBe(true);
      expect(stale.closed()).toBe(true);
      expect(active.closed()).toBe(false);
    });

    it("accumulates sweptCount across sweeps", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      registry.add("a", makeTransport(), 0);
      registry.add("b", makeTransport(), 0);

      await registry.sweep(31 * MINUTE);
      expect(registry.sweptCount).toBe(2);

      registry.add("c", makeTransport(), 31 * MINUTE);
      await registry.sweep(62 * MINUTE);
      expect(registry.sweptCount).toBe(3);
    });

    it("is disabled when idleTimeoutMs is 0", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 0 });
      const transport = makeTransport();
      registry.add("ancient", transport, 0);

      const swept = await registry.sweep(1000 * MINUTE);

      expect(swept).toBe(0);
      expect(registry.has("ancient")).toBe(true);
      expect(transport.closed()).toBe(false);
    });

    it("evicts the session even if close() rejects", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = {
        close: jest.fn().mockRejectedValue(new Error("socket already gone")),
      };
      registry.add("broken", transport, 0);

      const swept = await registry.sweep(31 * MINUTE);

      // A failing close() must not leave the entry behind - that is the exact
      // leak this registry exists to prevent.
      expect(swept).toBe(1);
      expect(registry.has("broken")).toBe(false);
      expect(registry.size).toBe(0);
    });
  });

  describe("open SSE streams", () => {
    it("never sweeps a session with an open stream, however old", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = makeTransport();
      registry.add("streaming", transport, 0);
      registry.openStream("streaming", 0);

      const swept = await registry.sweep(600 * MINUTE);

      expect(swept).toBe(0);
      expect(registry.has("streaming")).toBe(true);
      expect(transport.closed()).toBe(false);
    });

    it("restarts the idle clock when the stream closes", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      const transport = makeTransport();
      registry.add("streamed", transport, 0);

      registry.openStream("streamed", 0);
      registry.closeStream("streamed", 100 * MINUTE);

      // Idle is measured from stream close (100min), not session start.
      expect(await registry.sweep(120 * MINUTE)).toBe(0);
      expect(registry.has("streamed")).toBe(true);

      expect(await registry.sweep(131 * MINUTE)).toBe(1);
      expect(registry.has("streamed")).toBe(false);
    });

    it("stays protected until the last of several streams closes", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });
      registry.add("multi", makeTransport(), 0);

      registry.openStream("multi", 0);
      registry.openStream("multi", 0);
      expect(registry.streamingCount).toBe(1);

      // One stream ends; the other is still open, so it must survive.
      registry.closeStream("multi", 0);
      expect(await registry.sweep(600 * MINUTE)).toBe(0);
      expect(registry.has("multi")).toBe(true);

      // Now the last one ends and the idle clock applies again.
      registry.closeStream("multi", 600 * MINUTE);
      expect(registry.streamingCount).toBe(0);
      expect(await registry.sweep(631 * MINUTE)).toBe(1);
    });

    it("clears stream state when the session is removed", () => {
      const registry = new SessionRegistry();
      registry.add("s1", makeTransport());
      registry.openStream("s1");
      expect(registry.streamingCount).toBe(1);

      registry.remove("s1");
      expect(registry.streamingCount).toBe(0);
    });
  });

  describe("the leak this prevents", () => {
    it("drains sessions abandoned without DELETE", async () => {
      const registry = new SessionRegistry({ idleTimeoutMs: 30 * MINUTE });

      // 449 sessions initialized and never closed - the state observed on the
      // dev host, where every session leaked because clients never send DELETE.
      for (let i = 0; i < 449; i++) {
        registry.add(`abandoned-${i}`, makeTransport(), 0);
      }
      expect(registry.size).toBe(449);

      await registry.sweep(31 * MINUTE);

      expect(registry.size).toBe(0);
      expect(registry.sweptCount).toBe(449);
    });
  });
});
