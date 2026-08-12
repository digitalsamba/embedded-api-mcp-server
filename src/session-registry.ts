/**
 * Tracking of active HTTP transport sessions.
 *
 * Most MCP clients never send `DELETE /mcp`, and a transport's `onclose` only
 * fires on an explicit close, so a client that simply goes away would otherwise
 * leave its entry — and the Server instance behind it — in memory forever.
 * This registry adds last-seen tracking and an idle sweep on top of the map.
 *
 * Sessions holding an open SSE stream are never swept, however long they have
 * been quiet: streaming is activity.
 *
 * @module session-registry
 */

import logger from "./logger.js";

/** The subset of a transport this registry needs. */
export interface ClosableTransport {
  close(): Promise<void> | void;
}

export interface SessionRegistryOptions {
  /** Evict sessions idle for longer than this. 0 disables sweeping. */
  idleTimeoutMs?: number;
}

export class SessionRegistry<T extends ClosableTransport> {
  private readonly transports = new Map<string, T>();
  private readonly lastActivity = new Map<string, number>();
  private readonly openStreams = new Map<string, number>();

  readonly idleTimeoutMs: number;

  /** Cumulative count of swept sessions, surfaced via /health. */
  sweptCount = 0;

  constructor(options: SessionRegistryOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? 30 * 60 * 1000;
  }

  get size(): number {
    return this.transports.size;
  }

  /** Number of sessions currently holding at least one open stream. */
  get streamingCount(): number {
    return this.openStreams.size;
  }

  has(sessionId: string): boolean {
    return this.transports.has(sessionId);
  }

  get(sessionId: string): T | undefined {
    return this.transports.get(sessionId);
  }

  values(): IterableIterator<T> {
    return this.transports.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.transports.entries();
  }

  add(sessionId: string, transport: T, now: number = Date.now()): void {
    this.transports.set(sessionId, transport);
    this.lastActivity.set(sessionId, now);
  }

  /** Record traffic on a session, resetting its idle clock. */
  touch(sessionId: string, now: number = Date.now()): void {
    if (this.transports.has(sessionId)) {
      this.lastActivity.set(sessionId, now);
    }
  }

  /** Drop a session and all its bookkeeping. Does not close the transport. */
  remove(sessionId: string): void {
    this.transports.delete(sessionId);
    this.lastActivity.delete(sessionId);
    this.openStreams.delete(sessionId);
  }

  /** Mark an SSE stream as opened; the session can't be swept while open. */
  openStream(sessionId: string, now: number = Date.now()): void {
    this.openStreams.set(sessionId, (this.openStreams.get(sessionId) ?? 0) + 1);
    this.touch(sessionId, now);
  }

  /** Mark an SSE stream as closed; the idle clock restarts from now. */
  closeStream(sessionId: string, now: number = Date.now()): void {
    const remaining = (this.openStreams.get(sessionId) ?? 1) - 1;
    if (remaining > 0) {
      this.openStreams.set(sessionId, remaining);
    } else {
      this.openStreams.delete(sessionId);
    }
    this.touch(sessionId, now);
  }

  /**
   * Close and evict every session idle beyond the timeout.
   *
   * @returns the number of sessions swept
   */
  async sweep(now: number = Date.now()): Promise<number> {
    if (this.idleTimeoutMs <= 0) return 0;

    let swept = 0;
    for (const [id, transport] of [...this.transports]) {
      if ((this.openStreams.get(id) ?? 0) > 0) continue; // streaming = active

      const seen = this.lastActivity.get(id) ?? 0;
      if (now - seen < this.idleTimeoutMs) continue;

      // Remove first: close() triggers onclose, and a throwing close() must not
      // leave the entry behind — that would defeat the whole point of the sweep.
      this.remove(id);
      try {
        await transport.close();
      } catch (err: any) {
        logger.warn(`Error closing idle session ${id}: ${err?.message}`);
      }
      swept++;
      logger.info(`Swept idle session: ${id}`);
    }

    if (swept > 0) {
      this.sweptCount += swept;
      logger.info(`Swept ${swept} idle session(s), ${this.size} remaining`);
    }
    return swept;
  }
}
