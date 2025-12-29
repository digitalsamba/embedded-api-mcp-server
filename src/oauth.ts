/**
 * OAuth 2.0 Integration for Digital Samba MCP Server
 *
 * Implements OAuth authorization code flow with PKCE for MCP authentication.
 * Uses Digital Samba Passport as the OAuth provider.
 */

import { randomBytes, createHash } from "node:crypto";
import logger from "./logger.js";

// OAuth Configuration - loaded from environment
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  redirectUri: string;
  issuer: string;
  // Note: stateUrl removed - we no longer fetch from /dashboard-api/state
  // Instead we use the access_token directly with /oauth-api/v1/* endpoints
}

// Token response from DS Passport
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

// Note: We no longer need to fetch user state from /dashboard-api/state
// Instead, we use the OAuth access_token directly with /oauth-api/v1/* endpoints
// which provide the same API but with OAuth token authentication

// Session data stored after OAuth
export interface OAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  // Note: We no longer store developerKey - the accessToken is used directly
  // with /oauth-api/v1/* endpoints which handle auth via OAuth tokens
}

// In-memory session storage (replace with Redis in production)
const sessions: Map<string, OAuthSession> = new Map();

// PKCE code verifiers (temporary storage during auth flow)
const codeVerifiers: Map<string, string> = new Map();

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
export function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const pkce = generatePKCE();

  // Store code verifier for later token exchange
  codeVerifiers.set(state, pkce.verifier);

  // Clean up old verifiers after 10 minutes
  setTimeout(() => codeVerifiers.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "", // DS Passport may not require scopes
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  state: string
): Promise<TokenResponse> {
  const codeVerifier = codeVerifiers.get(state);
  if (!codeVerifier) {
    throw new Error("Invalid state or expired code verifier");
  }

  // Clean up used verifier
  codeVerifiers.delete(state);

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

// fetchUserState removed - no longer needed
// We use the OAuth access_token directly with /oauth-api/v1/* endpoints

/**
 * Complete OAuth flow and create session
 *
 * Note: We no longer fetch user state or developer_key.
 * The OAuth access_token is used directly with /oauth-api/v1/* endpoints.
 */
export async function completeOAuthFlow(
  config: OAuthConfig,
  code: string,
  state: string
): Promise<{ sessionId: string; session: OAuthSession }> {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(config, code, state);

  // Create session with the access token
  // No need to fetch developer_key - we use the token directly with /oauth-api/v1/*
  const sessionId = randomBytes(32).toString("hex");
  const session: OAuthSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  sessions.set(sessionId, session);

  logger.info(`OAuth session created (session: ${sessionId.substring(0, 8)}...)`);

  return { sessionId, session };
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): OAuthSession | undefined {
  const session = sessions.get(sessionId);
  if (session && session.expiresAt < Date.now()) {
    // Session expired
    sessions.delete(sessionId);
    return undefined;
  }
  return session;
}

/**
 * Get access token from session (used for /oauth-api/v1/* calls)
 */
export function getAccessTokenFromSession(sessionId: string): string | undefined {
  return getSession(sessionId)?.accessToken;
}

/**
 * Delete session (logout)
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get OAuth Authorization Server Metadata (RFC 8414)
 */
export function getAuthorizationServerMetadata(config: OAuthConfig): object {
  return {
    issuer: config.issuer,
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    token_endpoint: `${config.issuer}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    // MCP-specific metadata (RFC 9728)
    service_documentation: "https://github.com/digitalsamba/embedded-api-mcp-server",
  };
}

/**
 * Get active session count
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}
