/**
 * OAuth 2.0 Integration for Digital Samba MCP Server
 *
 * Implements OAuth authorization code flow with PKCE for MCP authentication.
 * Uses Digital Samba Passport as the OAuth provider.
 * Sessions persisted in Redis (or in-memory for local dev).
 */

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import logger from "./logger.js";
import { getStore, PREFIXES, TTL } from "./session-store.js";

/**
 * Only slide a session's expiry once it has drifted by this much, so a busy
 * session writes to the store roughly once an hour rather than once a request.
 */
const SESSION_SLIDE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

// OAuth Configuration - loaded from environment
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  redirectUri: string;
  issuer: string;
}

// Token response from DS Passport
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

// Session data stored after OAuth
export interface OAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  /** The registered client the session was issued to; renewed with it. */
  clientId?: string;
}

// Pending authorization requests (state -> client request info)
interface PendingClientAuth {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  state?: string;
  /**
   * SHA-256 of the random value in the browser-binding cookie set when the
   * user approved. The callback only accepts the flow in a browser that
   * presents the matching cookie (see bindingMatches).
   */
  browserBindingHash?: string;
  createdAt: number;
}

/**
 * An authorization request waiting for the user to approve or cancel it on
 * our consent page. Stored under a one-time ID that is only ever written into
 * that page, and bound to the browser it was shown to.
 */
export interface ConsentRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  clientState?: string;
  browserBindingHash: string;
  createdAt: number;
}

// Registered OAuth client (DCR - RFC 7591)
export interface RegisteredClient {
  client_id: string;
  client_secret?: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: number;
}

// Authorization codes pending exchange
interface PendingAuth {
  clientId: string;
  redirectUri: string;
  dsAccessToken: string;
  dsRefreshToken?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}

/**
 * Store pending client authorization (before DS redirect)
 */
export async function storePendingClientAuth(
  ourState: string,
  clientId: string,
  redirectUri: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
  clientState?: string,
  browserBindingHash?: string,
): Promise<void> {
  const store = getStore();
  const data: PendingClientAuth = {
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state: clientState,
    browserBindingHash,
    createdAt: Date.now(),
  };
  await store.set(PREFIXES.PENDING_CLIENT + ourState, data, TTL.PENDING_AUTH);
}

/**
 * Get and remove pending client authorization
 */
export async function getPendingClientAuth(
  ourState: string,
): Promise<PendingClientAuth | null> {
  const store = getStore();
  const key = PREFIXES.PENDING_CLIENT + ourState;
  const pending = await store.get<PendingClientAuth>(key);
  if (pending) {
    await store.delete(key);
  }
  return pending;
}

/**
 * A fresh random value for a browser-binding cookie, and the hash to store
 * server-side. Only the hash is stored, so a leaked store entry cannot be
 * turned into a valid cookie.
 */
export function createBrowserBinding(): { value: string; hash: string } {
  const value = randomBytes(32).toString("hex");
  return { value, hash: hashBinding(value) };
}

function hashBinding(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Does a cookie value match a stored binding hash? Constant-time, and false
 * for anything missing.
 */
export function bindingMatches(
  cookieValue: string | undefined,
  storedHash: string | undefined,
): boolean {
  if (!cookieValue || !storedHash) return false;
  const a = Buffer.from(hashBinding(cookieValue), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Store an authorization request until the user decides on the consent page.
 * @returns the one-time consent ID to embed in that page
 */
export async function storeConsentRequest(
  request: Omit<ConsentRequest, "createdAt">,
): Promise<string> {
  const store = getStore();
  const consentId = randomBytes(32).toString("hex");
  await store.set(
    PREFIXES.CONSENT + consentId,
    { ...request, createdAt: Date.now() },
    TTL.CONSENT,
  );
  return consentId;
}

/**
 * Get and remove a consent request. One-time: a second submission of the same
 * page finds nothing.
 */
export async function takeConsentRequest(
  consentId: string,
): Promise<ConsentRequest | null> {
  if (!/^[0-9a-f]{64}$/.test(consentId)) return null;
  const store = getStore();
  const key = PREFIXES.CONSENT + consentId;
  const request = await store.get<ConsentRequest>(key);
  if (request) {
    await store.delete(key);
  }
  return request;
}

/** Grant types a client may register; only authorization_code is issued. */
const REGISTRABLE_GRANT_TYPES = new Set([
  "authorization_code",
  "refresh_token",
]);
const REGISTRABLE_AUTH_METHODS = new Set([
  "none",
  "client_secret_post",
  "client_secret_basic",
]);
/** Schemes that must never be a redirect target. */
const FORBIDDEN_REDIRECT_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
  "ws:",
  "wss:",
  "ftp:",
]);
const MAX_REDIRECT_URIS = 10;
const MAX_REDIRECT_URI_LENGTH = 2000;
const MAX_CLIENT_NAME_LENGTH = 100;

export type ClientMetadataResult =
  | {
      ok: true;
      value: {
        client_name?: string;
        redirect_uris: string[];
        grant_types?: string[];
        response_types?: string[];
        token_endpoint_auth_method?: string;
      };
    }
  | { ok: false; error: string; description: string };

/**
 * Is this an acceptable redirect URI for a registering client?
 *
 * https anywhere; http only to this machine (native apps, RFC 8252 7.3);
 * private-use schemes for desktop apps (RFC 8252 7.1), except schemes that
 * execute or read locally. No fragments (RFC 6749 3.1.2).
 */
export function isAcceptableRedirectUri(uri: unknown): boolean {
  if (typeof uri !== "string" || uri.length > MAX_REDIRECT_URI_LENGTH) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash || uri.includes("#")) return false;
  if (url.protocol === "https:") return url.hostname !== "";
  if (url.protocol === "http:") {
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  }
  return !FORBIDDEN_REDIRECT_SCHEMES.has(url.protocol);
}

/**
 * Validate a Dynamic Client Registration request (RFC 7591).
 *
 * Registration is unauthenticated, so everything stored from it is bounded:
 * a few redirect URIs of sane length and scheme, a short display name (shown
 * on the consent page), and only the grant types and auth methods this server
 * understands.
 */
export function validateClientMetadata(body: unknown): ClientMetadataResult {
  const fail = (description: string): ClientMetadataResult => ({
    ok: false,
    error: description.startsWith("redirect_uris")
      ? "invalid_redirect_uri"
      : "invalid_client_metadata",
    description,
  });

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("the request body must be a JSON object");
  }
  const {
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    token_endpoint_auth_method,
  } = body as Record<string, unknown>;

  if (
    !Array.isArray(redirect_uris) ||
    redirect_uris.length === 0 ||
    redirect_uris.length > MAX_REDIRECT_URIS
  ) {
    return fail(
      `redirect_uris is required and must be an array of 1 to ${MAX_REDIRECT_URIS} URIs`,
    );
  }
  const badUri = redirect_uris.find((uri) => !isAcceptableRedirectUri(uri));
  if (badUri !== undefined) {
    return fail(
      "redirect_uris must be https, http to localhost, or a private-use app scheme, without a fragment",
    );
  }

  let name: string | undefined;
  if (client_name !== undefined && client_name !== null) {
    if (typeof client_name !== "string") {
      return fail("client_name must be a string");
    }
    // Shown on the consent page: no control characters, bounded length.
    // eslint-disable-next-line no-control-regex
    name = client_name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    name = name.slice(0, MAX_CLIENT_NAME_LENGTH) || undefined;
  }

  const stringList = (value: unknown) =>
    Array.isArray(value) && value.every((v) => typeof v === "string");

  if (grant_types !== undefined) {
    if (
      !stringList(grant_types) ||
      !(grant_types as string[]).every((g) => REGISTRABLE_GRANT_TYPES.has(g))
    ) {
      return fail(
        "grant_types may only contain authorization_code and refresh_token",
      );
    }
  }
  if (response_types !== undefined) {
    if (
      !stringList(response_types) ||
      !(response_types as string[]).every((r) => r === "code")
    ) {
      return fail('response_types may only contain "code"');
    }
  }
  if (
    token_endpoint_auth_method !== undefined &&
    (typeof token_endpoint_auth_method !== "string" ||
      !REGISTRABLE_AUTH_METHODS.has(token_endpoint_auth_method))
  ) {
    return fail(
      "token_endpoint_auth_method must be none, client_secret_post or client_secret_basic",
    );
  }

  return {
    ok: true,
    value: {
      client_name: name,
      redirect_uris: [...new Set(redirect_uris as string[])],
      grant_types: grant_types as string[] | undefined,
      response_types: response_types as string[] | undefined,
      token_endpoint_auth_method: token_endpoint_auth_method as
        | string
        | undefined,
    },
  };
}

/**
 * Revoke a session token this server issued (RFC 7009). Anything else is
 * ignored: per the RFC the endpoint answers the same either way, so it
 * cannot be used to test whether a token exists.
 *
 * This ends the MCP session. The Digital Samba access token behind it stays
 * valid upstream until it expires; revoking that needs a Digital Samba API.
 */
export async function revokeToken(token: unknown): Promise<void> {
  if (typeof token !== "string") return;
  const sessionId = token.startsWith("oauth:") ? token.slice(6) : token;
  if (!isOAuthSessionId(sessionId)) return;
  await deleteSession(sessionId);
  logger.info(`OAuth: session revoked (${sessionId.substring(0, 8)}...)`);
}

/**
 * Register a new OAuth client (DCR - RFC 7591)
 */
export async function registerClient(request: {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}): Promise<RegisteredClient> {
  const store = getStore();
  const clientId = randomBytes(16).toString("hex");
  const clientSecret = randomBytes(32).toString("hex");

  const client: RegisteredClient = {
    client_id: clientId,
    client_secret: clientSecret,
    client_name: request.client_name || "Unknown Client",
    redirect_uris: request.redirect_uris || [],
    grant_types: request.grant_types || ["authorization_code"],
    response_types: request.response_types || ["code"],
    token_endpoint_auth_method: request.token_endpoint_auth_method || "none",
    created_at: Date.now(),
  };

  await store.set(PREFIXES.CLIENT + clientId, client, TTL.CLIENT);
  logger.info(
    `DCR: Registered new client '${client.client_name}' (${clientId.substring(0, 8)}...)`,
  );

  return client;
}

/**
 * Get a registered client by ID
 */
export async function getRegisteredClient(
  clientId: string,
): Promise<RegisteredClient | null> {
  const store = getStore();
  return store.get<RegisteredClient>(PREFIXES.CLIENT + clientId);
}

/**
 * Validate redirect URI for a client
 */
export async function validateRedirectUri(
  clientId: string,
  redirectUri: string,
): Promise<boolean> {
  const client = await getRegisteredClient(clientId);
  if (!client) return false;
  return client.redirect_uris.includes(redirectUri);
}

/**
 * Create an authorization code for later exchange
 */
export async function createAuthorizationCode(
  clientId: string,
  redirectUri: string,
  dsAccessToken: string,
  dsRefreshToken?: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
): Promise<string> {
  const store = getStore();
  const code = randomBytes(32).toString("hex");

  const pending: PendingAuth = {
    clientId,
    redirectUri,
    dsAccessToken,
    dsRefreshToken,
    codeChallenge,
    codeChallengeMethod,
    expiresAt: Date.now() + TTL.AUTH_CODE * 1000,
  };

  await store.set(PREFIXES.AUTH_CODE + code, pending, TTL.AUTH_CODE);
  return code;
}

/**
 * Exchange authorization code for tokens (called by Claude)
 */
export async function exchangeAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
} | null> {
  const store = getStore();
  const key = PREFIXES.AUTH_CODE + code;
  const pending = await store.get<PendingAuth>(key);

  if (!pending) {
    logger.warn("Token exchange: Invalid or expired code");
    return null;
  }

  if (pending.expiresAt < Date.now()) {
    await store.delete(key);
    logger.warn("Token exchange: Code expired");
    return null;
  }

  // RFC 6749 4.1.2: a code presented with wrong credentials has likely
  // leaked - revoke it immediately rather than leaving it redeemable
  if (pending.clientId !== clientId) {
    await store.delete(key);
    logger.warn("Token exchange: Client ID mismatch");
    return null;
  }

  if (pending.redirectUri !== redirectUri) {
    await store.delete(key);
    logger.warn("Token exchange: Redirect URI mismatch");
    return null;
  }

  // PKCE is mandatory (S256 only, as advertised in server metadata). The
  // authorize endpoint already refuses requests without a challenge; a code
  // stored without one is refused here too rather than redeemed unverified.
  if (!pending.codeChallenge) {
    await store.delete(key);
    logger.warn("Token exchange: code was issued without a PKCE challenge");
    return null;
  }
  if (pending.codeChallengeMethod !== "S256") {
    await store.delete(key);
    logger.warn(
      `Token exchange: Unsupported code_challenge_method: ${pending.codeChallengeMethod}`,
    );
    return null;
  }
  if (!codeVerifier) {
    await store.delete(key);
    logger.warn("Token exchange: Missing code_verifier");
    return null;
  }
  const expectedChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  if (expectedChallenge !== pending.codeChallenge) {
    await store.delete(key);
    logger.warn("Token exchange: PKCE verification failed");
    return null;
  }

  // Clean up used code
  await store.delete(key);

  // Create session with DS token
  const sessionId = randomBytes(32).toString("hex");
  const session: OAuthSession = {
    accessToken: pending.dsAccessToken,
    refreshToken: pending.dsRefreshToken,
    expiresAt: Date.now() + TTL.SESSION * 1000,
    clientId: pending.clientId,
  };
  await store.set(PREFIXES.SESSION + sessionId, session, TTL.SESSION);
  await renewClient(pending.clientId);

  logger.info(
    `Token exchange successful, session: ${sessionId.substring(0, 8)}...`,
  );

  return {
    access_token: sessionId,
    token_type: "Bearer",
    expires_in: TTL.SESSION,
  };
}

/**
 * Load OAuth configuration from environment
 */
export function loadOAuthConfig(): OAuthConfig | null {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.warn(
      "OAuth not configured (missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET)",
    );
    return null;
  }

  return {
    clientId,
    clientSecret,
    authorizeUrl:
      process.env.OAUTH_AUTHORIZE_URL ||
      "https://api.digitalsamba.com/oauth/authorize",
    tokenUrl:
      process.env.OAUTH_TOKEN_URL || "https://api.digitalsamba.com/oauth/token",
    redirectUri:
      process.env.OAUTH_REDIRECT_URI ||
      "https://mcp.digitalsamba.com/oauth/callback",
    issuer: process.env.OAUTH_ISSUER || "https://mcp.digitalsamba.com",
  };
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/**
 * Generate OAuth state parameter
 */
export function generateState(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Build authorization URL for OAuth flow
 */
export async function buildAuthorizationUrl(
  config: OAuthConfig,
  state: string,
): Promise<string> {
  const store = getStore();
  const pkce = generatePKCE();

  // Store code verifier for later token exchange
  await store.set(
    PREFIXES.CODE_VERIFIER + state,
    pkce.verifier,
    TTL.CODE_VERIFIER,
  );

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "",
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens (with DS Passport)
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  state: string,
): Promise<TokenResponse> {
  const store = getStore();
  const key = PREFIXES.CODE_VERIFIER + state;
  const codeVerifier = await store.get<string>(key);

  if (!codeVerifier) {
    throw new Error("Invalid state or expired code verifier");
  }

  // Clean up used verifier
  await store.delete(key);

  const response = await fetch(config.tokenUrl, {
    // Users are waiting in a browser on this call.
    signal: AbortSignal.timeout(30_000),
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Token exchange failed: ${response.status} - ${error}`);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * Complete OAuth flow and create session
 */
export async function completeOAuthFlow(
  config: OAuthConfig,
  code: string,
  state: string,
): Promise<{ sessionId: string; session: OAuthSession }> {
  const store = getStore();

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(config, code, state);

  // Create session with the access token
  const sessionId = randomBytes(32).toString("hex");
  const session: OAuthSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  await store.set(PREFIXES.SESSION + sessionId, session, TTL.SESSION);

  logger.info(
    `OAuth session created (session: ${sessionId.substring(0, 8)}...)`,
  );

  return { sessionId, session };
}

/**
 * Does this bearer token have the shape of a session ID we issued?
 *
 * Session IDs are `randomBytes(32).toString("hex")` - 64 lowercase hex chars,
 * no dashes. Digital Samba developer keys are UUIDs, so the two never collide.
 *
 * The HTTP transport uses this to tell "expired OAuth session, tell the client
 * to re-authenticate" apart from "legacy developer key, pass it through". Get
 * it wrong and an expired session is sent to the API as if it were a key, so
 * the client sees the API's "Unauthenticated" rather than a 401 and never
 * learns to re-authorise.
 */
export function isOAuthSessionId(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}

/**
 * Get session by ID
 */
export async function getSession(
  sessionId: string,
): Promise<OAuthSession | null> {
  const store = getStore();
  const session = await store.get<OAuthSession>(PREFIXES.SESSION + sessionId);

  if (session && session.expiresAt < Date.now()) {
    // Session expired
    await store.delete(PREFIXES.SESSION + sessionId);
    return null;
  }
  return session;
}

/**
 * Slide a session's expiry forward by a full TTL.
 *
 * Called on each authenticated request so an actively used session never
 * expires out from under the user. Only writes when the expiry has moved by
 * more than SESSION_SLIDE_THRESHOLD, so a busy session doesn't write to the
 * store on every single request.
 *
 * @returns true if the session was extended
 */
export async function touchSession(sessionId: string): Promise<boolean> {
  const store = getStore();
  const key = PREFIXES.SESSION + sessionId;
  const session = await store.get<OAuthSession>(key);
  if (!session) return false;

  const newExpiresAt = Date.now() + TTL.SESSION * 1000;
  if (newExpiresAt - session.expiresAt < SESSION_SLIDE_THRESHOLD_MS) {
    return false;
  }

  await store.set(key, { ...session, expiresAt: newExpiresAt }, TTL.SESSION);
  if (session.clientId) {
    await renewClient(session.clientId);
  }
  return true;
}

/**
 * Push a registered client's expiry out by a full TTL.CLIENT. Sessions issued
 * before clientId was recorded cannot renew their client; those clients keep
 * their original expiry.
 */
export async function renewClient(clientId: string): Promise<void> {
  const store = getStore();
  const key = PREFIXES.CLIENT + clientId;
  const client = await store.get<RegisteredClient>(key);
  if (client) {
    await store.set(key, client, TTL.CLIENT);
  }
}

/**
 * Get access token from session (used for /oauth-api/v1/* calls)
 */
export async function getAccessTokenFromSession(
  sessionId: string,
): Promise<string | null> {
  const session = await getSession(sessionId);
  return session?.accessToken ?? null;
}

/**
 * Delete session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const store = getStore();
  await store.delete(PREFIXES.SESSION + sessionId);
}

/**
 * Get OAuth Authorization Server Metadata (RFC 8414)
 */
export function getAuthorizationServerMetadata(config: OAuthConfig): object {
  return {
    issuer: config.issuer,
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    token_endpoint: `${config.issuer}/oauth/token`,
    registration_endpoint: `${config.issuer}/oauth/register`,
    revocation_endpoint: `${config.issuer}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ["none"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    service_documentation:
      "https://github.com/digitalsamba/embedded-api-mcp-server",
  };
}

/**
 * Get registered client count
 */
export async function getRegisteredClientCount(): Promise<number> {
  const store = getStore();
  return store.size(PREFIXES.CLIENT);
}

/**
 * Get active session count
 */
export async function getActiveSessionCount(): Promise<number> {
  const store = getStore();
  return store.size(PREFIXES.SESSION);
}
