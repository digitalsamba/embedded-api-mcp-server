/**
 * The browser half of the OAuth flow, through the real routes over HTTP.
 *
 * The server fronts Digital Samba with one upstream OAuth client and lets any
 * MCP client register itself. Digital Samba's approval page cannot tell those
 * clients apart, so these tests pin down the two things that stop a
 * self-registered client from collecting someone else's access:
 *
 *   1. the user approves on OUR page, which names the client and the
 *      destination, and only a same-browser submission counts;
 *   2. the callback is accepted only in the browser that approved.
 *
 * Only Digital Samba's token endpoint is stubbed; everything else is real
 * (express, the routes, the in-memory session store).
 *
 * @group unit
 */

import { createHash, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";

import type { OAuthConfig } from "../../src/oauth.js";

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

const DS_TOKEN_URL = "https://ds.test.invalid/oauth/token";
const DS_AUTHORIZE_URL = "https://ds.test.invalid/oauth/authorize";

const config: OAuthConfig = {
  clientId: "static-upstream-client",
  clientSecret: "upstream-secret-for-tests",
  authorizeUrl: DS_AUTHORIZE_URL,
  tokenUrl: DS_TOKEN_URL,
  redirectUri: "https://mcp.test.invalid/oauth/callback",
  issuer: "https://mcp.test.invalid",
};

const CLIENT_REDIRECT = "https://claude.ai/api/mcp/auth_callback";

describe("OAuth consent flow", () => {
  let server: Server;
  let base: string;
  let oauth: typeof import("../../src/oauth.js");
  let dsTokenCalls: number;
  const realFetch = global.fetch;

  beforeAll(async () => {
    delete process.env.REDIS_URL;
    oauth = await import("../../src/oauth.js");
    const { registerAuthorizeRoutes } = await import(
      "../../src/transports/oauth-routes.js"
    );

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    registerAuthorizeRoutes(app, config);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    // Stub only Digital Samba's token endpoint.
    global.fetch = (async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === DS_TOKEN_URL) {
        dsTokenCalls++;
        return new Response(
          JSON.stringify({
            access_token: "ds-access-token",
            token_type: "Bearer",
            expires_in: 31536000,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return realFetch(input, init);
    }) as typeof fetch;
  });

  afterAll(async () => {
    global.fetch = realFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    dsTokenCalls = 0;
  });

  // --- helpers --------------------------------------------------------------

  async function registerClient(name = "Claude", redirect = CLIENT_REDIRECT) {
    return oauth.registerClient({
      client_name: name,
      redirect_uris: [redirect],
    });
  }

  function pkce() {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }

  /** Cookie name=value pairs from a response, as a Cookie request header. */
  function cookiesFrom(res: Response): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    return out;
  }

  function cookieHeader(cookies: Record<string, string>): string {
    return Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async function openConsent(
    clientId: string,
    challenge: string,
    state = "client-state",
  ) {
    const url = new URL(`${base}/oauth/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", CLIENT_REDIRECT);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    const res = await fetch(url, { redirect: "manual" });
    const html = await res.text();
    const consentId = /name="consent_id" value="([0-9a-f]{64})"/.exec(
      html,
    )?.[1];
    return { res, html, consentId, cookies: cookiesFrom(res) };
  }

  async function decide(
    consentId: string,
    decision: "approve" | "deny",
    cookie?: string,
  ) {
    return fetch(`${base}/oauth/authorize`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(cookie ? { cookie } : {}),
      },
      body: new URLSearchParams({ consent_id: consentId, decision }).toString(),
    });
  }

  async function callback(state: string, cookie?: string) {
    return fetch(`${base}/oauth/callback?code=ds-code&state=${state}`, {
      redirect: "manual",
      headers: cookie ? { cookie } : {},
    });
  }

  /** Run the flow up to Digital Samba, in one browser. */
  async function approveInBrowser(clientId: string, challenge: string) {
    const consent = await openConsent(clientId, challenge);
    const approve = await decide(
      consent.consentId!,
      "approve",
      cookieHeader(consent.cookies),
    );
    const upstream = new URL(approve.headers.get("location")!);
    return { approve, upstream, flowCookies: cookiesFrom(approve) };
  }

  // --- the consent page -----------------------------------------------------

  it("shows a consent page instead of redirecting straight to Digital Samba", async () => {
    const client = await registerClient();
    const { res, html, consentId, cookies } = await openConsent(
      client.client_id,
      pkce().challenge,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(html).toContain("<strong>Claude</strong> wants access");
    expect(html).toContain('<span class="dest">claude.ai</span>');
    expect(consentId).toMatch(/^[0-9a-f]{64}$/);
    expect(cookies.mcp_oauth_consent).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cannot be framed, cached or scripted", async () => {
    const client = await registerClient();
    const { res } = await openConsent(client.client_id, pkce().challenge);

    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sets the browser cookie HttpOnly, SameSite=Lax, Secure, scoped to /oauth", async () => {
    const client = await registerClient();
    const { res } = await openConsent(client.client_id, pkce().challenge);
    const line = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("mcp_oauth_consent="))!;

    expect(line).toContain("HttpOnly");
    expect(line).toContain("SameSite=Lax");
    expect(line).toContain("Secure");
    expect(line).toContain("Path=/oauth");
  });

  it("escapes a hostile client name", async () => {
    const client = await registerClient(
      '<script>alert(1)</script>"><img src=x>',
    );
    const { html } = await openConsent(client.client_id, pkce().challenge);

    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;&lt;img src=x&gt;",
    );
  });

  it("names the real destination, not the name the client chose", async () => {
    const client = await registerClient(
      "Claude",
      "https://attacker.example/cb",
    );
    const url = new URL(`${base}/oauth/authorize`);
    url.searchParams.set("client_id", client.client_id);
    url.searchParams.set("redirect_uri", "https://attacker.example/cb");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge", pkce().challenge);
    url.searchParams.set("code_challenge_method", "S256");
    const html = await (await fetch(url)).text();

    expect(html).toContain('<span class="dest">attacker.example</span>');
  });

  it("rejects an unknown client or unregistered redirect without setting cookies", async () => {
    const unknown = await fetch(
      `${base}/oauth/authorize?client_id=nope&redirect_uri=${encodeURIComponent(CLIENT_REDIRECT)}&response_type=code`,
      { redirect: "manual" },
    );
    expect(unknown.status).toBe(400);
    expect(unknown.headers.getSetCookie()).toEqual([]);

    const client = await registerClient();
    const wrongRedirect = await fetch(
      `${base}/oauth/authorize?client_id=${client.client_id}&redirect_uri=${encodeURIComponent("https://elsewhere.example/cb")}&response_type=code`,
      { redirect: "manual" },
    );
    expect(wrongRedirect.status).toBe(400);
    expect(wrongRedirect.headers.get("location")).toBeNull();
  });

  it.each([
    ["no challenge", {}],
    [
      "plain method",
      { code_challenge: "a".repeat(43), code_challenge_method: "plain" },
    ],
    ["no method", { code_challenge: "a".repeat(43) }],
    [
      "malformed challenge",
      { code_challenge: "short", code_challenge_method: "S256" },
    ],
  ])(
    "refuses an authorization request without S256 PKCE (%s)",
    async (_label, extra) => {
      const client = await registerClient();
      const url = new URL(`${base}/oauth/authorize`);
      url.searchParams.set("client_id", client.client_id);
      url.searchParams.set("redirect_uri", CLIENT_REDIRECT);
      url.searchParams.set("response_type", "code");
      for (const [k, v] of Object.entries(extra))
        url.searchParams.set(k, v as string);
      const res = await fetch(url, { redirect: "manual" });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "invalid_request" });
      expect(res.headers.getSetCookie()).toEqual([]);
    },
  );

  // --- the decision ---------------------------------------------------------

  it("approval in the same browser goes to Digital Samba with the static upstream client", async () => {
    const client = await registerClient();
    const { approve, upstream, flowCookies } = await approveInBrowser(
      client.client_id,
      pkce().challenge,
    );

    expect(approve.status).toBe(303);
    expect(`${upstream.origin}${upstream.pathname}`).toBe(DS_AUTHORIZE_URL);
    expect(upstream.searchParams.get("client_id")).toBe(config.clientId);
    expect(upstream.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(flowCookies.mcp_oauth_flow).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses a decision posted without the browser cookie (cross-site form post)", async () => {
    const client = await registerClient();
    const { consentId } = await openConsent(client.client_id, pkce().challenge);

    const res = await decide(consentId!, "approve");
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
    expect(await res.text()).toContain("did not come from the browser");
  });

  it("refuses a decision carrying a different browser's cookie", async () => {
    const client = await registerClient();
    const attacker = await openConsent(client.client_id, pkce().challenge);
    const victim = await openConsent(client.client_id, pkce().challenge);

    const res = await decide(
      attacker.consentId!,
      "approve",
      cookieHeader(victim.cookies),
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });

  it("a consent ID works once, even after a rejected attempt", async () => {
    const client = await registerClient();
    const { consentId, cookies } = await openConsent(
      client.client_id,
      pkce().challenge,
    );

    expect((await decide(consentId!, "approve")).status).toBe(400);
    const retry = await decide(consentId!, "approve", cookieHeader(cookies));
    expect(retry.status).toBe(400);
    expect(await retry.text()).toContain("expired");
  });

  it("cancel returns access_denied to the client with its state, and no code", async () => {
    const client = await registerClient();
    const { consentId, cookies } = await openConsent(
      client.client_id,
      pkce().challenge,
      "s-123",
    );

    const res = await decide(consentId!, "deny", cookieHeader(cookies));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(`${location.origin}${location.pathname}`).toBe(CLIENT_REDIRECT);
    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("state")).toBe("s-123");
    expect(location.searchParams.get("code")).toBeNull();
  });

  // --- the callback ---------------------------------------------------------

  it("completes the flow in the approving browser, and the code redeems with PKCE", async () => {
    const client = await registerClient();
    const { verifier, challenge } = pkce();
    const { upstream, flowCookies } = await approveInBrowser(
      client.client_id,
      challenge,
    );
    const state = upstream.searchParams.get("state")!;

    const res = await callback(state, cookieHeader(flowCookies));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(`${location.origin}${location.pathname}`).toBe(CLIENT_REDIRECT);
    expect(location.searchParams.get("state")).toBe("client-state");
    expect(dsTokenCalls).toBe(1);

    const tokens = await oauth.exchangeAuthorizationCode(
      location.searchParams.get("code")!,
      client.client_id,
      CLIENT_REDIRECT,
      verifier,
    );
    expect(tokens?.token_type).toBe("Bearer");
    expect(await oauth.getAccessTokenFromSession(tokens!.access_token)).toBe(
      "ds-access-token",
    );
  });

  it("refuses a callback in a browser that did not approve (forwarded sign-in link)", async () => {
    const client = await registerClient();
    const { upstream, flowCookies } = await approveInBrowser(
      client.client_id,
      pkce().challenge,
    );
    const state = upstream.searchParams.get("state")!;

    // The victim signs in from a link the attacker forwarded: no flow cookie.
    const res = await callback(state);
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
    expect(dsTokenCalls).toBe(0);

    // And the pending request is spent: the attacker cannot replay it.
    const replay = await callback(state, cookieHeader(flowCookies));
    expect(replay.status).toBe(400);
    expect(replay.headers.get("location")).toBeNull();
    expect(dsTokenCalls).toBe(0);
  });

  it("refuses a callback with a different flow's cookie", async () => {
    const client = await registerClient();
    const first = await approveInBrowser(client.client_id, pkce().challenge);
    const second = await approveInBrowser(client.client_id, pkce().challenge);

    const res = await callback(
      first.upstream.searchParams.get("state")!,
      cookieHeader(second.flowCookies),
    );
    expect(res.status).toBe(400);
    expect(dsTokenCalls).toBe(0);
  });

  it("an unknown state is an error page, never a session (the old legacy branch)", async () => {
    const res = await callback("0".repeat(32));
    const body = await res.text();

    expect(res.status).toBe(400);
    expect(body).not.toMatch(/session_id/);
    expect(dsTokenCalls).toBe(0);
  });
});
