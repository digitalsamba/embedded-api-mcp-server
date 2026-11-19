/**
 * Bounds on the unauthenticated OAuth surface: what a registering client may
 * store, revocation, and per-IP rate limits.
 *
 * @group unit
 */

import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";

jest.mock("ioredis", () => {
  class MockRedis {
    constructor() {
      throw new Error("RedisStore must not be constructed in these tests");
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

import {
  isAcceptableRedirectUri,
  validateClientMetadata,
  revokeToken,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  getAccessTokenFromSession,
} from "../../src/oauth.js";
import { rateLimit } from "../../src/rate-limit.js";

describe("isAcceptableRedirectUri", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "http://localhost:33418/callback",
    "http://127.0.0.1:6274/oauth/callback",
    "http://[::1]:8080/cb",
    "cursor://anysphere.cursor-retrieval/oauth/callback",
    "com.example.app:/oauth2redirect",
  ])("accepts %s", (uri) => {
    expect(isAcceptableRedirectUri(uri)).toBe(true);
  });

  it.each([
    ["javascript:alert(1)", "executes"],
    ["data:text/html,<script>x</script>", "executes"],
    ["file:///etc/passwd", "local file"],
    ["http://attacker.example/cb", "plain http off this machine"],
    ["https://claude.ai/cb#frag", "fragment"],
    ["not a uri", "unparseable"],
    ["https://" + "a".repeat(2001), "too long"],
    [42, "not a string"],
  ])("rejects %p (%s)", (uri) => {
    expect(isAcceptableRedirectUri(uri)).toBe(false);
  });
});

describe("validateClientMetadata", () => {
  const ok = { redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] };

  it("accepts what Claude actually sends", () => {
    const result = validateClientMetadata({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
    expect(result.ok).toBe(true);
  });

  it("requires 1 to 10 redirect URIs", () => {
    expect(validateClientMetadata({}).ok).toBe(false);
    expect(validateClientMetadata({ redirect_uris: [] }).ok).toBe(false);
    expect(
      validateClientMetadata({
        redirect_uris: Array.from(
          { length: 11 },
          (_, i) => `https://a.example/${i}`,
        ),
      }).ok,
    ).toBe(false);
  });

  it("rejects the whole registration if any redirect URI is bad, as invalid_redirect_uri", () => {
    const result = validateClientMetadata({
      redirect_uris: ["https://claude.ai/cb", "javascript:void(0)"],
    });
    expect(result).toMatchObject({ ok: false, error: "invalid_redirect_uri" });
  });

  it("de-duplicates redirect URIs", () => {
    const result = validateClientMetadata({
      redirect_uris: ["https://a.example/cb", "https://a.example/cb"],
    });
    expect(result.ok && result.value.redirect_uris).toEqual([
      "https://a.example/cb",
    ]);
  });

  it("strips control characters from the display name and bounds its length", () => {
    const result = validateClientMetadata({
      ...ok,
      client_name: `Cl\u0000au\nde${"x".repeat(200)}`,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.client_name).toMatch(/^Claude/);
      expect(result.value.client_name!.length).toBe(100);
    }
  });

  it("rejects a non-string name, unknown grant types, response types or auth methods", () => {
    expect(validateClientMetadata({ ...ok, client_name: { x: 1 } }).ok).toBe(
      false,
    );
    expect(
      validateClientMetadata({ ...ok, grant_types: ["client_credentials"] }).ok,
    ).toBe(false);
    expect(
      validateClientMetadata({ ...ok, response_types: ["token"] }).ok,
    ).toBe(false);
    expect(
      validateClientMetadata({
        ...ok,
        token_endpoint_auth_method: "private_key_jwt",
      }).ok,
    ).toBe(false);
  });

  it("rejects a body that is not an object", () => {
    expect(validateClientMetadata(null).ok).toBe(false);
    expect(validateClientMetadata([ok]).ok).toBe(false);
    expect(validateClientMetadata("x").ok).toBe(false);
  });
});

describe("revokeToken", () => {
  async function newSession(): Promise<string> {
    const { createHash } = await import("node:crypto");
    const verifier = "revoke-test-".padEnd(43, "v");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const code = await createAuthorizationCode(
      "c",
      "https://claude.ai/cb",
      "ds-token",
      undefined,
      challenge,
      "S256",
    );
    const tokens = await exchangeAuthorizationCode(
      code,
      "c",
      "https://claude.ai/cb",
      verifier,
    );
    return tokens!.access_token;
  }

  it("ends the session", async () => {
    const token = await newSession();
    await revokeToken(token);
    expect(await getAccessTokenFromSession(token)).toBeNull();
  });

  it("accepts the oauth: prefixed form", async () => {
    const token = await newSession();
    await revokeToken(`oauth:${token}`);
    expect(await getAccessTokenFromSession(token)).toBeNull();
  });

  it("ignores anything that is not one of our session IDs", async () => {
    await expect(revokeToken(undefined)).resolves.toBeUndefined();
    await expect(revokeToken("a-developer-key-uuid")).resolves.toBeUndefined();
    await expect(revokeToken({ token: "x" })).resolves.toBeUndefined();
  });
});

describe("rateLimit", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = express();
    app.set("trust proxy", "loopback, linklocal, uniquelocal");
    app.get(
      "/limited",
      rateLimit({ name: "test", windowMs: 60_000, max: 3 }),
      (_req, res) => {
        res.send("ok");
      },
    );
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const hit = (ip: string) =>
    fetch(`${base}/limited`, { headers: { "x-forwarded-for": ip } });

  it("allows up to the limit, then answers 429 with Retry-After", async () => {
    const statuses = [];
    for (let i = 0; i < 4; i++)
      statuses.push((await hit("203.0.113.1")).status);
    expect(statuses).toEqual([200, 200, 200, 429]);

    const limited = await hit("203.0.113.1");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await limited.json()).toMatchObject({
      error: "temporarily_unavailable",
    });
  });

  it("counts each client IP separately, as seen through the trusted proxy", async () => {
    expect((await hit("198.51.100.7")).status).toBe(200);
  });

  it("uses the address the proxy saw, not one the client prepended", async () => {
    // nginx appends the real peer; a client-supplied entry sits to its left.
    for (let i = 0; i < 3; i++) await hit("192.0.2.50");
    const spoofed = await hit("10.9.9.9, 192.0.2.50");
    expect(spoofed.status).toBe(429);
  });
});
