/**
 * OAuth 2.0 Integration for Digital Samba MCP Server
 *
 * Implements OAuth authorization code flow with PKCE for MCP authentication.
 * Uses Digital Samba Passport as the OAuth provider.
 * Sessions persisted in Redis (or in-memory for local dev).
 */

import { randomBytes, createHash } from "node:crypto";
import logger from "./logger.js";
import { getStore, PREFIXES, TTL } from "./session-store.js";

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
}

// Pending authorization requests (state -> client request info)
interface PendingClientAuth {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  state?: string;
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
  clientState?: string
): Promise<void> {
  const store = getStore();
  const data: PendingClientAuth = {
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state: clientState,
    createdAt: Date.now(),
  };
  await store.set(PREFIXES.PENDING_CLIENT + ourState, data, TTL.PENDING_AUTH);
}

/**
 * Get and remove pending client authorization
 */
export async function getPendingClientAuth(ourState: string): Promise<PendingClientAuth | null> {
  const store = getStore();
  const key = PREFIXES.PENDING_CLIENT + ourState;
  const pending = await store.get<PendingClientAuth>(key);
  if (pending) {
    await store.delete(key);
  }
  return pending;
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
  logger.info(`DCR: Registered new client '${client.client_name}' (${clientId.substring(0, 8)}...)`);

  return client;
}

/**
 * Get a registered client by ID
 */
export async function getRegisteredClient(clientId: string): Promise<RegisteredClient | null> {
  const store = getStore();
  return store.get<RegisteredClient>(PREFIXES.CLIENT + clientId);
}

/**
 * Validate redirect URI for a client
 */
export async function validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
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
  codeChallengeMethod?: string
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
  codeVerifier?: string
): Promise<{ access_token: string; token_type: string; expires_in: number } | null> {
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

  if (pending.clientId !== clientId) {
    logger.warn("Token exchange: Client ID mismatch");
    return null;
  }

  if (pending.redirectUri !== redirectUri) {
    logger.warn("Token exchange: Redirect URI mismatch");
    return null;
  }

  // Verify PKCE if code_challenge was provided
  if (pending.codeChallenge && pending.codeChallengeMethod === "S256") {
    if (!codeVerifier) {
      logger.warn("Token exchange: Missing code_verifier");
      return null;
    }
    const expectedChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    if (expectedChallenge !== pending.codeChallenge) {
      logger.warn("Token exchange: PKCE verification failed");
      return null;
    }
  }

  // Clean up used code
  await store.delete(key);

  // Create session with DS token
  const sessionId = randomBytes(32).toString("hex");
  const session: OAuthSession = {
    accessToken: pending.dsAccessToken,
    refreshToken: pending.dsRefreshToken,
    expiresAt: Date.now() + TTL.SESSION * 1000,
  };
  await store.set(PREFIXES.SESSION + sessionId, session, TTL.SESSION);

  logger.info(`Token exchange successful, session: ${sessionId.substring(0, 8)}...`);

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
    logger.warn("OAuth not configured (missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET)");
    return null;
  }

  return {
    clientId,
    clientSecret,
    authorizeUrl:
      process.env.OAUTH_AUTHORIZE_URL || "https://api.digitalsamba.com/oauth/authorize",
    tokenUrl: process.env.OAUTH_TOKEN_URL || "https://api.digitalsamba.com/oauth/token",
    redirectUri:
      process.env.OAUTH_REDIRECT_URI || "https://mcp.digitalsamba.com/oauth/callback",
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
export async function buildAuthorizationUrl(config: OAuthConfig, state: string): Promise<string> {
  const store = getStore();
  const pkce = generatePKCE();

  // Store code verifier for later token exchange
  await store.set(PREFIXES.CODE_VERIFIER + state, pkce.verifier, TTL.CODE_VERIFIER);

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
  state: string
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
  state: string
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

  logger.info(`OAuth session created (session: ${sessionId.substring(0, 8)}...)`);

  return { sessionId, session };
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<OAuthSession | null> {
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
 * Get access token from session (used for /oauth-api/v1/* calls)
 */
export async function getAccessTokenFromSession(sessionId: string): Promise<string | null> {
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
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    service_documentation: "https://github.com/digitalsamba/embedded-api-mcp-server",
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
