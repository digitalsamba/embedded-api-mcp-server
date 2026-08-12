/**
 * Unit tests for isOAuthSessionId (src/oauth.ts)
 *
 * This predicate decides whether an unrecognised bearer token is treated as an
 * expired OAuth session (401 + WWW-Authenticate, so the client re-authorises)
 * or as a legacy direct developer key (passed to the API as-is).
 *
 * Getting it wrong in either direction is user-visible:
 *  - too narrow: expired sessions are sent to the API as developer keys, the
 *    client sees "Unauthenticated" instead of a 401, and can never recover.
 *  - too broad: legacy developer keys are rejected as expired sessions.
 *
 * @module tests/unit/oauth-session-id-shape
 */

import { randomBytes } from "node:crypto";
import { isOAuthSessionId } from "../../src/oauth.js";

describe("isOAuthSessionId", () => {
  it("accepts session IDs generated the way oauth.ts generates them", () => {
    for (let i = 0; i < 20; i++) {
      const sessionId = randomBytes(32).toString("hex");
      expect(isOAuthSessionId(sessionId)).toBe(true);
    }
  });

  it("rejects Digital Samba developer keys, which are UUIDs", () => {
    // Real-world shape, from docs/digital-samba-api.md
    expect(isOAuthSessionId("fc16892a-556b-4c2d-a522-82e6b3e884cc")).toBe(
      false,
    );
    expect(isOAuthSessionId("57670ebd-0de2-4f92-8bce-661bec142dde")).toBe(
      false,
    );
  });

  it("rejects tokens of the wrong length", () => {
    expect(isOAuthSessionId("a".repeat(63))).toBe(false);
    expect(isOAuthSessionId("a".repeat(65))).toBe(false);
    expect(isOAuthSessionId(randomBytes(16).toString("hex"))).toBe(false);
  });

  it("rejects non-hex characters", () => {
    // 64 chars but 'g' is not hex
    expect(isOAuthSessionId("g".repeat(64))).toBe(false);
    expect(isOAuthSessionId(`${"a".repeat(63)}Z`)).toBe(false);
  });

  it("rejects uppercase hex, which we never emit", () => {
    const upper = randomBytes(32).toString("hex").toUpperCase();
    expect(isOAuthSessionId(upper)).toBe(false);
  });

  it("rejects empty and whitespace-padded tokens", () => {
    expect(isOAuthSessionId("")).toBe(false);
    expect(isOAuthSessionId(` ${"a".repeat(64)}`)).toBe(false);
    expect(isOAuthSessionId(`${"a".repeat(64)}\n`)).toBe(false);
  });

  it("rejects the oauth: prefixed form, which is handled separately", () => {
    expect(isOAuthSessionId(`oauth:${randomBytes(32).toString("hex")}`)).toBe(
      false,
    );
  });
});
