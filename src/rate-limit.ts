/**
 * Minimal per-client-IP rate limiting for the unauthenticated OAuth endpoints.
 *
 * In-memory and per process: each environment runs one container, and the
 * point is to bound what an anonymous caller can make this server store or
 * do, not to meter legitimate use. Limits are deliberately generous on the
 * server-to-server endpoints (registration, token, revocation): claude.ai
 * calls those from a small set of Anthropic IPs shared by every customer.
 *
 * The client IP is `req.ip`, which is only meaningful with Express's
 * `trust proxy` set for the reverse proxy in front (see http.ts).
 */

import type { NextFunction, Request, Response } from "express";
import logger from "./logger.js";

export interface RateLimitOptions {
  /** Shown in logs and used to keep separate counters per endpoint group. */
  name: string;
  windowMs: number;
  max: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/** Above this many tracked IPs, expired windows are swept on the next hit. */
const SWEEP_THRESHOLD = 10_000;

export function rateLimit({ name, windowMs, max }: RateLimitOptions) {
  const windows = new Map<string, Window>();

  function sweep(now: number): void {
    for (const [key, w] of windows) {
      if (w.resetAt <= now) windows.delete(key);
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (windows.size > SWEEP_THRESHOLD) sweep(now);

    const key = req.ip || req.socket.remoteAddress || "unknown";
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      windows.set(key, w);
    }
    w.count++;

    if (w.count > max) {
      const retryAfter = Math.max(1, Math.ceil((w.resetAt - now) / 1000));
      // Logged once per window and IP, so a limit hit by real traffic is
      // visible without a flood filling the log.
      if (w.count === max + 1) {
        logger.warn(
          `Rate limit '${name}' reached for ${key} (${max} per ${windowMs / 1000}s)`,
        );
      }
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "temporarily_unavailable",
        error_description: `Too many requests. Try again in ${retryAfter} seconds.`,
      });
      return;
    }
    next();
  };
}
