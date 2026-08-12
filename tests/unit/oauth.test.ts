/**
 * Unit tests for oauth.ts
 *
 * Exercises the OAuth layer against the in-memory session store: config
 * loading, PKCE/state generation, dynamic client registration, authorization
 * codes and session lookup. Every call that would reach Digital Samba Passport
 * goes through a mocked global fetch - no network traffic is ever made.
 *
 * @module tests/unit/oauth
 */

import { createHash } from "node:crypto";

import type * as OAuthModule from "../../src/oauth.js";
import type * as SessionStoreModule from "../../src/session-store.js";

// oauth -> session-store -> ioredis. Mocked so a stray REDIS_URL in the
// developer environment can never open a socket during these tests.
jest.mock("ioredis", () => {
  class MockRedis {
    constructor() {
      throw new Error("RedisStore must not be constructed in oauth tests");
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

const HEX_32 = /^[0-9a-f]{32}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

interface JsonResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

function jsonResponse(body: unknown, status = 200): JsonResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function testConfig(
  overrides: Partial<OAuthModule.OAuthConfig> = {},
): OAuthModule.OAuthConfig {
  return {
    clientId: "ds-client-id",
    clientSecret: "ds-client-secret",
    authorizeUrl: "https://passport.example.com/oauth/authorize",
    tokenUrl: "https://passport.example.com/oauth/token",
    redirectUri: "https://mcp.example.com/oauth/callback",
    issuer: "https://mcp.example.com",
    ...overrides,
  };
}

describe("oauth", () => {
  const ORIGINAL_ENV = process.env;
  const ORIGINAL_FETCH = global.fetch;

  let oauth: typeof OAuthModule;
  let sessionStore: typeof SessionStoreModule;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    // The in-memory store is what these tests exercise.
    delete process.env.REDIS_URL;
    delete process.env.OAUTH_CLIENT_ID;
    delete process.env.OAUTH_CLIENT_SECRET;
    delete process.env.OAUTH_AUTHORIZE_URL;
    delete process.env.OAUTH_TOKEN_URL;
    delete process.env.OAUTH_REDIRECT_URI;
    delete process.env.OAUTH_ISSUER;

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Fresh module registry per test so the store singleton starts empty.
    jest.resetModules();
    /* eslint-disable @typescript-eslint/no-var-requires */
    oauth = require("../../src/oauth.js");
    sessionStore = require("../../src/session-store.js");
    /* eslint-enable @typescript-eslint/no-var-requires */
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
    jest.useRealTimers();
  });

  describe("loadOAuthConfig", () => {
    it("returns null when no OAuth credentials are configured", () => {
      expect(oauth.loadOAuthConfig()).toBeNull();
    });

    it("returns null when only the client id is set", () => {
      process.env.OAUTH_CLIENT_ID = "id-only";

      expect(oauth.loadOAuthConfig()).toBeNull();
    });

    it("returns null when only the client secret is set", () => {
      process.env.OAUTH_CLIENT_SECRET = "secret-only";

      expect(oauth.loadOAuthConfig()).toBeNull();
    });

    it("treats empty-string credentials as unconfigured", () => {
      process.env.OAUTH_CLIENT_ID = "";
      process.env.OAUTH_CLIENT_SECRET = "";

      expect(oauth.loadOAuthConfig()).toBeNull();
    });

    it("falls back to Digital Samba production URLs", () => {
      process.env.OAUTH_CLIENT_ID = "abc";
      process.env.OAUTH_CLIENT_SECRET = "shh";

      expect(oauth.loadOAuthConfig()).toEqual({
        clientId: "abc",
        clientSecret: "shh",
        authorizeUrl: "https://api.digitalsamba.com/oauth/authorize",
        tokenUrl: "https://api.digitalsamba.com/oauth/token",
        redirectUri: "https://mcp.digitalsamba.com/oauth/callback",
        issuer: "https://mcp.digitalsamba.com",
      });
    });

    it("honours every URL override from the environment", () => {
      process.env.OAUTH_CLIENT_ID = "abc";
      process.env.OAUTH_CLIENT_SECRET = "shh";
      process.env.OAUTH_AUTHORIZE_URL = "https://staging.example.com/authorize";
      process.env.OAUTH_TOKEN_URL = "https://staging.example.com/token";
      process.env.OAUTH_REDIRECT_URI = "http://localhost:3000/oauth/callback";
      process.env.OAUTH_ISSUER = "http://localhost:3000";

      expect(oauth.loadOAuthConfig()).toEqual({
        clientId: "abc",
        clientSecret: "shh",
        authorizeUrl: "https://staging.example.com/authorize",
        tokenUrl: "https://staging.example.com/token",
        redirectUri: "http://localhost:3000/oauth/callback",
        issuer: "http://localhost:3000",
      });
    });
  });

  describe("generateState", () => {
    it("returns 32 hex characters", () => {
      expect(oauth.generateState()).toMatch(HEX_32);
    });

    it("returns a different value on every call", () => {
      const states = new Set(
        Array.from({ length: 50 }, () => oauth.generateState()),
      );

      expect(states.size).toBe(50);
    });
  });

  describe("generatePKCE", () => {
    it("derives the challenge as the base64url SHA-256 of the verifier", () => {
      const { verifier, challenge } = oauth.generatePKCE();

      expect(challenge).toBe(
        createHash("sha256").update(verifier).digest("base64url"),
      );
    });

    it("produces URL-safe values within the RFC 7636 length limits", () => {
      const { verifier, challenge } = oauth.generatePKCE();

      expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
      expect(challenge).toHaveLength(43);
    });

    it("returns a fresh verifier on every call", () => {
      expect(oauth.generatePKCE().verifier).not.toBe(
        oauth.generatePKCE().verifier,
      );
    });
  });

  describe("buildAuthorizationUrl", () => {
    it("builds an authorize URL carrying the PKCE challenge", async () => {
      const config = testConfig();
      const state = oauth.generateState();

      const url = new URL(await oauth.buildAuthorizationUrl(config, state));

      expect(`${url.origin}${url.pathname}`).toBe(config.authorizeUrl);
      expect(url.searchParams.get("client_id")).toBe(config.clientId);
      expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBe(state);
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("code_challenge")).toMatch(
        /^[A-Za-z0-9\-_]{43}$/,
      );
    });

    it("never leaks the client secret into the URL", async () => {
      const config = testConfig();

      const url = await oauth.buildAuthorizationUrl(config, "state-1");

      expect(url).not.toContain(config.clientSecret);
    });

    it("stores the code verifier under the state for later exchange", async () => {
      const config = testConfig();
      const url = new URL(
        await oauth.buildAuthorizationUrl(config, "state-abc"),
      );

      const verifier = await sessionStore
        .getStore()
        .get<string>(sessionStore.PREFIXES.CODE_VERIFIER + "state-abc");

      expect(verifier).toBeTruthy();
      expect(
        createHash("sha256")
          .update(verifier as string)
          .digest("base64url"),
      ).toBe(url.searchParams.get("code_challenge"));
    });

    it("issues an independent challenge per authorization request", async () => {
      const config = testConfig();

      const first = new URL(await oauth.buildAuthorizationUrl(config, "s1"));
      const second = new URL(await oauth.buildAuthorizationUrl(config, "s2"));

      expect(first.searchParams.get("code_challenge")).not.toBe(
        second.searchParams.get("code_challenge"),
      );
    });
  });

  describe("client registration", () => {
    it("registers a client with generated credentials", async () => {
      const client = await oauth.registerClient({
        client_name: "Claude Desktop",
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      });

      expect(client.client_id).toMatch(HEX_32);
      expect(client.client_secret).toMatch(HEX_64);
      expect(client.client_name).toBe("Claude Desktop");
      expect(client.redirect_uris).toEqual([
        "https://claude.ai/api/mcp/auth_callback",
      ]);
      expect(client.created_at).toBeLessThanOrEqual(Date.now());
    });

    it("applies RFC 7591 defaults for omitted metadata", async () => {
      const client = await oauth.registerClient({
        redirect_uris: ["https://a"],
      });

      expect(client.client_name).toBe("Unknown Client");
      expect(client.grant_types).toEqual(["authorization_code"]);
      expect(client.response_types).toEqual(["code"]);
      expect(client.token_endpoint_auth_method).toBe("none");
    });

    it("keeps caller-supplied metadata", async () => {
      const client = await oauth.registerClient({
        client_name: "Custom",
        redirect_uris: ["https://a", "https://b"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
      });

      expect(client.grant_types).toEqual([
        "authorization_code",
        "refresh_token",
      ]);
      expect(client.token_endpoint_auth_method).toBe("client_secret_post");
    });

    it("issues a unique client id per registration", async () => {
      const a = await oauth.registerClient({ redirect_uris: ["https://a"] });
      const b = await oauth.registerClient({ redirect_uris: ["https://a"] });

      expect(a.client_id).not.toBe(b.client_id);
      expect(a.client_secret).not.toBe(b.client_secret);
    });

    it("retrieves a registered client by id", async () => {
      const created = await oauth.registerClient({
        client_name: "Lookup",
        redirect_uris: ["https://a"],
      });

      await expect(
        oauth.getRegisteredClient(created.client_id),
      ).resolves.toEqual(created);
    });

    it("returns null for an unknown client id", async () => {
      await expect(oauth.getRegisteredClient("nope")).resolves.toBeNull();
    });

    it("counts registered clients", async () => {
      await expect(oauth.getRegisteredClientCount()).resolves.toBe(0);

      await oauth.registerClient({ redirect_uris: ["https://a"] });
      await oauth.registerClient({ redirect_uris: ["https://b"] });

      await expect(oauth.getRegisteredClientCount()).resolves.toBe(2);
    });
  });

  describe("validateRedirectUri", () => {
    it("accepts a redirect URI the client registered", async () => {
      const client = await oauth.registerClient({
        redirect_uris: ["https://claude.ai/cb", "http://localhost:9000/cb"],
      });

      await expect(
        oauth.validateRedirectUri(client.client_id, "http://localhost:9000/cb"),
      ).resolves.toBe(true);
    });

    it("rejects a redirect URI the client did not register", async () => {
      const client = await oauth.registerClient({
        redirect_uris: ["https://claude.ai/cb"],
      });

      await expect(
        oauth.validateRedirectUri(client.client_id, "https://evil.example/cb"),
      ).resolves.toBe(false);
    });

    it("requires an exact match rather than a prefix match", async () => {
      const client = await oauth.registerClient({
        redirect_uris: ["https://claude.ai/cb"],
      });

      await expect(
        oauth.validateRedirectUri(client.client_id, "https://claude.ai/cb/sub"),
      ).resolves.toBe(false);
    });

    it("rejects any redirect URI for an unknown client", async () => {
      await expect(
        oauth.validateRedirectUri("unknown", "https://claude.ai/cb"),
      ).resolves.toBe(false);
    });
  });

  describe("pending client authorization", () => {
    it("stores and returns the pending request", async () => {
      await oauth.storePendingClientAuth(
        "our-state",
        "client-1",
        "https://claude.ai/cb",
        "challenge-value",
        "S256",
        "client-state",
      );

      const pending = await oauth.getPendingClientAuth("our-state");

      expect(pending).toMatchObject({
        clientId: "client-1",
        redirectUri: "https://claude.ai/cb",
        codeChallenge: "challenge-value",
        codeChallengeMethod: "S256",
        state: "client-state",
      });
    });

    it("consumes the pending request so it cannot be replayed", async () => {
      await oauth.storePendingClientAuth(
        "our-state",
        "client-1",
        "https://claude.ai/cb",
      );

      await expect(
        oauth.getPendingClientAuth("our-state"),
      ).resolves.not.toBeNull();
      await expect(oauth.getPendingClientAuth("our-state")).resolves.toBeNull();
    });

    it("returns null for an unknown state", async () => {
      await expect(
        oauth.getPendingClientAuth("never-stored"),
      ).resolves.toBeNull();
    });

    it("expires after the pending-auth TTL", async () => {
      jest.useFakeTimers();
      await oauth.storePendingClientAuth(
        "s",
        "client-1",
        "https://claude.ai/cb",
      );

      jest.advanceTimersByTime((sessionStore.TTL.PENDING_AUTH + 1) * 1000);

      await expect(oauth.getPendingClientAuth("s")).resolves.toBeNull();
    });
  });

  describe("authorization codes", () => {
    const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

    it("issues an opaque code", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      expect(code).toMatch(HEX_64);
    });

    it("exchanges a valid code for a bearer session token", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      const result = await oauth.exchangeAuthorizationCode(
        code,
        "client-1",
        REDIRECT,
      );

      expect(result).toMatchObject({
        token_type: "Bearer",
        expires_in: sessionStore.TTL.SESSION,
      });
      expect(result?.access_token).toMatch(HEX_64);
    });

    it("binds the issued session to the Digital Samba access token", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        "ds-refresh-token",
      );

      const result = await oauth.exchangeAuthorizationCode(
        code,
        "client-1",
        REDIRECT,
      );
      const session = await oauth.getSession(result!.access_token);

      expect(session).toMatchObject({
        accessToken: "ds-access-token",
        refreshToken: "ds-refresh-token",
      });
      expect(await oauth.getAccessTokenFromSession(result!.access_token)).toBe(
        "ds-access-token",
      );
    });

    it("does not hand back the Digital Samba token as the client token", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      const result = await oauth.exchangeAuthorizationCode(
        code,
        "client-1",
        REDIRECT,
      );

      expect(result?.access_token).not.toBe("ds-access-token");
    });

    it("rejects an unknown code", async () => {
      await expect(
        oauth.exchangeAuthorizationCode("no-such-code", "client-1", REDIRECT),
      ).resolves.toBeNull();
    });

    it("allows a code to be redeemed only once", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.not.toBeNull();
      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.toBeNull();
    });

    it("rejects a code redeemed by a different client", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      await expect(
        oauth.exchangeAuthorizationCode(code, "other-client", REDIRECT),
      ).resolves.toBeNull();
    });

    it("rejects a code redeemed against a different redirect URI", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      await expect(
        oauth.exchangeAuthorizationCode(
          code,
          "client-1",
          "https://evil.example/cb",
        ),
      ).resolves.toBeNull();
    });

    it("revokes the code after a failed client-id check", async () => {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      await oauth.exchangeAuthorizationCode(code, "other-client", REDIRECT);

      // RFC 6749 4.1.2: a code presented with wrong credentials has likely
      // leaked, so even the rightful client can no longer redeem it.
      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.toBeNull();
    });

    it("expires a code once the auth-code TTL has elapsed", async () => {
      jest.useFakeTimers();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );

      jest.advanceTimersByTime((sessionStore.TTL.AUTH_CODE + 1) * 1000);

      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.toBeNull();
    });

    it("accepts the matching PKCE verifier", async () => {
      const { verifier, challenge } = oauth.generatePKCE();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        undefined,
        challenge,
        "S256",
      );

      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT, verifier),
      ).resolves.not.toBeNull();
    });

    it("rejects a mismatched PKCE verifier", async () => {
      const { challenge } = oauth.generatePKCE();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        undefined,
        challenge,
        "S256",
      );

      await expect(
        oauth.exchangeAuthorizationCode(
          code,
          "client-1",
          REDIRECT,
          oauth.generatePKCE().verifier,
        ),
      ).resolves.toBeNull();
    });

    it("rejects an exchange that omits the PKCE verifier", async () => {
      const { challenge } = oauth.generatePKCE();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        undefined,
        challenge,
        "S256",
      );

      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.toBeNull();
    });

    it("revokes the code when PKCE verification fails", async () => {
      const { verifier, challenge } = oauth.generatePKCE();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        undefined,
        challenge,
        "S256",
      );

      await oauth.exchangeAuthorizationCode(
        code,
        "client-1",
        REDIRECT,
        "wrong",
      );

      // A failed PKCE attempt burns the code entirely.
      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT, verifier),
      ).resolves.toBeNull();
    });

    it("rejects a challenge with any method other than S256", async () => {
      // Only S256 is advertised in server metadata; a challenge stored with
      // another method must fail closed instead of skipping verification.
      const { challenge } = oauth.generatePKCE();
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
        undefined,
        challenge,
        "plain",
      );

      await expect(
        oauth.exchangeAuthorizationCode(code, "client-1", REDIRECT),
      ).resolves.toBeNull();
    });
  });

  describe("sessions", () => {
    const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

    async function newSession(): Promise<string> {
      const code = await oauth.createAuthorizationCode(
        "client-1",
        REDIRECT,
        "ds-access-token",
      );
      const result = await oauth.exchangeAuthorizationCode(
        code,
        "client-1",
        REDIRECT,
      );
      return result!.access_token;
    }

    it("returns null for an unknown session id", async () => {
      await expect(oauth.getSession("no-such-session")).resolves.toBeNull();
      await expect(
        oauth.getAccessTokenFromSession("no-such-session"),
      ).resolves.toBeNull();
    });

    it("returns null for an empty session id", async () => {
      await expect(oauth.getAccessTokenFromSession("")).resolves.toBeNull();
    });

    it("returns the access token for a live session", async () => {
      const sessionId = await newSession();

      await expect(oauth.getAccessTokenFromSession(sessionId)).resolves.toBe(
        "ds-access-token",
      );
    });

    it("returns null once the session has expired", async () => {
      jest.useFakeTimers();
      const sessionId = await newSession();

      jest.advanceTimersByTime((sessionStore.TTL.SESSION + 1) * 1000);

      await expect(oauth.getSession(sessionId)).resolves.toBeNull();
      await expect(
        oauth.getAccessTokenFromSession(sessionId),
      ).resolves.toBeNull();
    });

    describe("sliding expiry (touchSession)", () => {
      // The DS access token behind a session is valid for a year, so our TTL
      // is what forces re-authentication. Sliding it on use means an active
      // user never gets logged out; only genuine inactivity expires a session.

      it("extends an active session beyond the original TTL", async () => {
        jest.useFakeTimers();
        const sessionId = await newSession();

        // Use the session every 10 days for 50 days - five times the old 24h
        // TTL and well past a static 30 day one.
        for (let day = 10; day <= 50; day += 10) {
          jest.advanceTimersByTime(10 * 24 * 60 * 60 * 1000);
          await oauth.touchSession(sessionId);
          await expect(
            oauth.getAccessTokenFromSession(sessionId),
          ).resolves.toBe("ds-access-token");
        }
      });

      it("still expires a session that is never used", async () => {
        jest.useFakeTimers();
        const sessionId = await newSession();

        jest.advanceTimersByTime((sessionStore.TTL.SESSION + 1) * 1000);

        await expect(oauth.getSession(sessionId)).resolves.toBeNull();
      });

      it("reports whether it extended the session", async () => {
        jest.useFakeTimers();
        const sessionId = await newSession();

        // Immediately after creation the expiry has barely moved, so the
        // write is skipped rather than repeated on every request.
        await expect(oauth.touchSession(sessionId)).resolves.toBe(false);

        // Past the slide threshold it does extend.
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
        await expect(oauth.touchSession(sessionId)).resolves.toBe(true);
      });

      it("does not resurrect an expired session", async () => {
        jest.useFakeTimers();
        const sessionId = await newSession();

        jest.advanceTimersByTime((sessionStore.TTL.SESSION + 1) * 1000);

        await expect(oauth.touchSession(sessionId)).resolves.toBe(false);
        await expect(oauth.getSession(sessionId)).resolves.toBeNull();
      });

      it("returns false for an unknown session", async () => {
        await expect(oauth.touchSession("no-such-session")).resolves.toBe(
          false,
        );
      });
    });

    it("drops the session on logout", async () => {
      const sessionId = await newSession();

      await oauth.deleteSession(sessionId);

      await expect(oauth.getSession(sessionId)).resolves.toBeNull();
    });

    it("treats deleting an unknown session as a no-op", async () => {
      await expect(oauth.deleteSession("unknown")).resolves.toBeUndefined();
    });

    it("counts active sessions", async () => {
      await expect(oauth.getActiveSessionCount()).resolves.toBe(0);

      await newSession();
      await newSession();

      await expect(oauth.getActiveSessionCount()).resolves.toBe(2);
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("posts the stored verifier to the token endpoint", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: "ds-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "ds-refresh",
        }),
      );

      const tokens = await oauth.exchangeCodeForTokens(
        config,
        "ds-code",
        "state-1",
      );

      expect(tokens).toEqual({
        access_token: "ds-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "ds-refresh",
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(config.tokenUrl);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded",
      );

      const body = new URLSearchParams(init.body.toString());
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("client_id")).toBe(config.clientId);
      expect(body.get("client_secret")).toBe(config.clientSecret);
      expect(body.get("redirect_uri")).toBe(config.redirectUri);
      expect(body.get("code")).toBe("ds-code");
      expect(body.get("code_verifier")).toBeTruthy();
    });

    it("throws when the state has no stored verifier", async () => {
      await expect(
        oauth.exchangeCodeForTokens(testConfig(), "ds-code", "unknown-state"),
      ).rejects.toThrow("Invalid state or expired code verifier");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("consumes the verifier so the state cannot be reused", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: "ds-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );

      await oauth.exchangeCodeForTokens(config, "ds-code", "state-1");

      await expect(
        oauth.exchangeCodeForTokens(config, "ds-code", "state-1"),
      ).rejects.toThrow("Invalid state or expired code verifier");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws when the verifier has expired", async () => {
      jest.useFakeTimers();
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");

      jest.advanceTimersByTime((sessionStore.TTL.CODE_VERIFIER + 1) * 1000);

      await expect(
        oauth.exchangeCodeForTokens(config, "ds-code", "state-1"),
      ).rejects.toThrow("Invalid state or expired code verifier");
    });

    it("throws with the upstream status when Passport rejects the exchange", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({ error: "invalid_grant" }, 400),
      );

      await expect(
        oauth.exchangeCodeForTokens(config, "ds-code", "state-1"),
      ).rejects.toThrow("Token exchange failed: 400");
    });

    it("propagates network failures", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        oauth.exchangeCodeForTokens(config, "ds-code", "state-1"),
      ).rejects.toThrow("ECONNREFUSED");
    });
  });

  describe("completeOAuthFlow", () => {
    it("creates a session from the Passport token response", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: "ds-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "ds-refresh",
        }),
      );

      const { sessionId, session } = await oauth.completeOAuthFlow(
        config,
        "ds-code",
        "state-1",
      );

      expect(sessionId).toMatch(HEX_64);
      expect(session.accessToken).toBe("ds-token");
      expect(session.refreshToken).toBe("ds-refresh");
      expect(session.expiresAt).toBeGreaterThan(Date.now());
      await expect(oauth.getAccessTokenFromSession(sessionId)).resolves.toBe(
        "ds-token",
      );
    });

    it("handles a token response without a refresh token", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: "ds-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );

      const { session } = await oauth.completeOAuthFlow(
        config,
        "ds-code",
        "state-1",
      );

      expect(session.refreshToken).toBeUndefined();
    });

    it("does not create a session when the exchange fails", async () => {
      const config = testConfig();
      await oauth.buildAuthorizationUrl(config, "state-1");
      fetchMock.mockResolvedValue(
        jsonResponse({ error: "invalid_grant" }, 401),
      );

      await expect(
        oauth.completeOAuthFlow(config, "ds-code", "state-1"),
      ).rejects.toThrow("Token exchange failed: 401");
      await expect(oauth.getActiveSessionCount()).resolves.toBe(0);
    });
  });

  describe("getAuthorizationServerMetadata", () => {
    it("advertises endpoints derived from the issuer", () => {
      const config = testConfig({ issuer: "https://mcp.example.com" });

      expect(oauth.getAuthorizationServerMetadata(config)).toEqual({
        issuer: "https://mcp.example.com",
        authorization_endpoint: "https://mcp.example.com/oauth/authorize",
        token_endpoint: "https://mcp.example.com/oauth/token",
        registration_endpoint: "https://mcp.example.com/oauth/register",
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
        service_documentation:
          "https://github.com/digitalsamba/embedded-api-mcp-server",
      });
    });

    it("never exposes the upstream client secret", () => {
      const config = testConfig();

      expect(
        JSON.stringify(oauth.getAuthorizationServerMetadata(config)),
      ).not.toContain(config.clientSecret);
    });
  });
});
