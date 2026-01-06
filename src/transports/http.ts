/**
 * HTTP Transport for Digital Samba MCP Server
 *
 * Implements StreamableHTTPServerTransport for remote MCP connections.
 * Supports session management and Bearer token authentication.
 */

import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import {
  createServer,
  VERSION,
  VERSION_INFO,
  COMMITS_AHEAD,
  getDisplayVersion,
  isDevBuild,
} from "../server.js";
import logger from "../logger.js";
import apiKeyContext from "../auth.js";
import {
  loadOAuthConfig,
  generateState,
  buildAuthorizationUrl,
  completeOAuthFlow,
  getAuthorizationServerMetadata,
  getAccessTokenFromSession,
  getActiveSessionCount,
  // DCR functions
  registerClient,
  getRegisteredClient,
  validateRedirectUri,
  storePendingClientAuth,
  getPendingClientAuth,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  exchangeCodeForTokens,
  getRegisteredClientCount,
  type OAuthConfig,
} from "../oauth.js";

export interface HttpTransportConfig {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Host to bind to (default: 0.0.0.0) */
  host?: string;
  /** Enable CORS (default: true) */
  cors?: boolean;
  /** Require authentication (default: true in production) */
  requireAuth?: boolean;
}

// Active transport sessions
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

/**
 * Authentication middleware
 * Validates Bearer token and extracts API key
 * Supports both direct API keys and OAuth session tokens
 */
function authMiddleware(requireAuth: boolean) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip auth for health check, server info (GET only), and OAuth endpoints
    // POST/DELETE to "/" is the MCP endpoint and requires auth
    if (
      req.path === "/health" ||
      (req.path === "/" && req.method === "GET") ||
      req.path.startsWith("/.well-known/") ||
      req.path.startsWith("/oauth/")
    ) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader && requireAuth) {
      // Include WWW-Authenticate header for OAuth discovery
      res.setHeader(
        "WWW-Authenticate",
        'Bearer realm="mcp", resource_metadata="/.well-known/oauth-protected-resource"'
      );
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Authentication required. Provide Bearer token.",
        },
        id: null,
      });
      return;
    }

    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !token) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Invalid authorization header. Use: Bearer <api-key>",
          },
          id: null,
        });
        return;
      }

      // Check if this is an OAuth session token
      // Support both prefixed (oauth:xxx) and direct session IDs (from Claude Desktop DCR flow)
      let sessionId: string | null = null;
      if (token.startsWith("oauth:")) {
        sessionId = token.substring(6);
      } else {
        // Try to use token directly as session ID (Claude Desktop DCR flow)
        const directSession = await getAccessTokenFromSession(token);
        if (directSession) {
          sessionId = token;
        }
      }

      if (sessionId) {
        const accessToken = await getAccessTokenFromSession(sessionId);

        if (!accessToken) {
          res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Invalid or expired OAuth session. Please re-authenticate.",
            },
            id: null,
          });
          return;
        }

        // Use the OAuth access token directly with /oauth-api/v1/* endpoints
        (req as any).apiKey = accessToken;
        (req as any).isOAuthSession = true; // Flag to use OAuth API URL
        (req as any).oauthSessionId = sessionId;
        logger.debug(`OAuth session authenticated: ${sessionId.substring(0, 8)}...`);
      } else {
        // Direct API key (legacy mode) - uses /api/v1/*
        (req as any).apiKey = token;
        (req as any).isOAuthSession = false;
      }
    }

    next();
  };
}

/**
 * CORS middleware
 */
function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

/**
 * Start the HTTP transport server
 */
export async function startHttpServer(config: HttpTransportConfig = {}): Promise<void> {
  const port = config.port || parseInt(process.env.PORT || "3000", 10);
  const host = config.host || process.env.HOST || "0.0.0.0";
  const cors = config.cors ?? true;
  const requireAuth = config.requireAuth ?? process.env.NODE_ENV === "production";

  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // For OAuth token endpoint (form data)
  if (cors) {
    app.use(corsMiddleware);
  }
  app.use(authMiddleware(requireAuth));

  // Health check endpoint
  app.get("/health", async (_req, res) => {
    res.json({
      status: "ok",
      version: VERSION,
      transport: "http",
      activeSessions: transports.size,
      oauthSessions: await getActiveSessionCount(),
      registeredClients: await getRegisteredClientCount(),
    });
  });

  // Load OAuth configuration
  const oauthConfig = loadOAuthConfig();

  // OAuth endpoints (only if configured)
  if (oauthConfig) {
    // RFC 8414 - OAuth Authorization Server Metadata
    app.get("/.well-known/oauth-authorization-server", (_req, res) => {
      res.json(getAuthorizationServerMetadata(oauthConfig));
    });

    // Also support the alternative path used by some clients
    app.get("/.well-known/oauth-protected-resource", (_req, res) => {
      res.json({
        resource: oauthConfig.issuer,
        authorization_servers: [oauthConfig.issuer],
      });
    });

    // =========================================================================
    // Dynamic Client Registration (DCR) - RFC 7591
    // Claude Desktop registers itself as an OAuth client
    // =========================================================================
    app.post("/oauth/register", async (req, res) => {
      const { client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method } =
        req.body;

      if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        res.status(400).json({
          error: "invalid_client_metadata",
          error_description: "redirect_uris is required and must be a non-empty array",
        });
        return;
      }

      try {
        const client = await registerClient({
          client_name,
          redirect_uris,
          grant_types,
          response_types,
          token_endpoint_auth_method,
        });

        logger.info(`DCR: Client registered - ${client.client_name}`);

        // Return client credentials per RFC 7591
        res.status(201).json({
          client_id: client.client_id,
          client_secret: client.client_secret,
          client_name: client.client_name,
          redirect_uris: client.redirect_uris,
          grant_types: client.grant_types,
          response_types: client.response_types,
          token_endpoint_auth_method: client.token_endpoint_auth_method,
        });
      } catch (err: any) {
        logger.error(`DCR error: ${err.message}`);
        res.status(500).json({
          error: "server_error",
          error_description: err.message,
        });
      }
    });

    // =========================================================================
    // OAuth authorize - Accept client request, redirect to DS Passport
    // Claude calls this with its client_id and redirect_uri
    // =========================================================================
    app.get("/oauth/authorize", async (req, res) => {
      const {
        client_id,
        redirect_uri,
        response_type,
        state: clientState,
        code_challenge,
        code_challenge_method,
      } = req.query;

      // Validate required parameters
      if (!client_id || !redirect_uri || response_type !== "code") {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required parameters: client_id, redirect_uri, response_type=code",
        });
        return;
      }

      // Validate the client exists
      const client = await getRegisteredClient(client_id as string);
      if (!client) {
        res.status(400).json({
          error: "invalid_client",
          error_description: "Unknown client_id. Register via /oauth/register first.",
        });
        return;
      }

      // Validate redirect_uri is registered for this client
      if (!(await validateRedirectUri(client_id as string, redirect_uri as string))) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "redirect_uri not registered for this client",
        });
        return;
      }

      // Generate our state for DS Passport flow
      const ourState = generateState();

      // Store the client's request so we can redirect back after DS auth
      await storePendingClientAuth(
        ourState,
        client_id as string,
        redirect_uri as string,
        code_challenge as string | undefined,
        code_challenge_method as string | undefined,
        clientState as string | undefined
      );

      // Redirect to DS Passport for actual authentication
      const authUrl = await buildAuthorizationUrl(oauthConfig, ourState);

      logger.info(
        `OAuth: Client ${(client_id as string).substring(0, 8)}... -> DS Passport (state: ${ourState.substring(0, 8)}...)`
      );
      res.redirect(authUrl);
    });

    // =========================================================================
    // OAuth callback - Handle DS Passport return, redirect to client (Claude)
    // =========================================================================
    app.get("/oauth/callback", async (req, res) => {
      const { code, state, error, error_description } = req.query;

      if (error) {
        logger.error(`OAuth DS error: ${error} - ${error_description}`);
        res.status(400).json({
          error: error as string,
          error_description: error_description as string,
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing code or state parameter from DS Passport",
        });
        return;
      }

      // Get the pending client authorization
      const pendingClient = await getPendingClientAuth(state as string);

      if (!pendingClient) {
        // No pending client auth - this might be a direct/legacy flow
        // Fall back to the old behavior for backwards compatibility
        try {
          const { sessionId } = await completeOAuthFlow(oauthConfig, code as string, state as string);

          logger.info(`OAuth (legacy): Session created (${sessionId.substring(0, 8)}...)`);

          res.json({
            success: true,
            message: "Authentication successful",
            session_id: sessionId,
            usage: {
              header: "Authorization",
              format: `Bearer oauth:${sessionId}`,
              example: `curl -H "Authorization: Bearer oauth:${sessionId}" ${oauthConfig.issuer}/mcp`,
            },
          });
        } catch (err: any) {
          logger.error(`OAuth callback error: ${err.message}`);
          res.status(400).json({
            error: "oauth_error",
            error_description: err.message,
          });
        }
        return;
      }

      // Exchange DS code for DS tokens
      try {
        const dsTokens = await exchangeCodeForTokens(oauthConfig, code as string, state as string);

        // Create an authorization code for the client (Claude)
        const clientCode = await createAuthorizationCode(
          pendingClient.clientId,
          pendingClient.redirectUri,
          dsTokens.access_token,
          dsTokens.refresh_token,
          pendingClient.codeChallenge,
          pendingClient.codeChallengeMethod
        );

        // Build redirect URL back to client (Claude)
        const redirectUrl = new URL(pendingClient.redirectUri);
        redirectUrl.searchParams.set("code", clientCode);
        if (pendingClient.state) {
          redirectUrl.searchParams.set("state", pendingClient.state);
        }

        logger.info(
          `OAuth: DS auth complete, redirecting to client (${pendingClient.clientId.substring(0, 8)}...)`
        );
        res.redirect(redirectUrl.toString());
      } catch (err: any) {
        logger.error(`OAuth callback error: ${err.message}`);

        // Redirect to client with error
        const redirectUrl = new URL(pendingClient.redirectUri);
        redirectUrl.searchParams.set("error", "server_error");
        redirectUrl.searchParams.set("error_description", err.message);
        if (pendingClient.state) {
          redirectUrl.searchParams.set("state", pendingClient.state);
        }
        res.redirect(redirectUrl.toString());
      }
    });

    // =========================================================================
    // OAuth token endpoint - Exchange authorization code for access token
    // Claude calls this after receiving the code at its callback
    // =========================================================================
    app.post("/oauth/token", async (req, res) => {
      const { grant_type, code, client_id, redirect_uri, code_verifier } = req.body;

      if (grant_type !== "authorization_code") {
        res.status(400).json({
          error: "unsupported_grant_type",
          error_description: "Only authorization_code grant is supported",
        });
        return;
      }

      if (!code || !client_id || !redirect_uri) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required parameters: code, client_id, redirect_uri",
        });
        return;
      }

      const tokens = await exchangeAuthorizationCode(
        code as string,
        client_id as string,
        redirect_uri as string,
        code_verifier as string | undefined
      );

      if (!tokens) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid, expired, or already-used authorization code",
        });
        return;
      }

      logger.info(`OAuth: Token issued for client ${(client_id as string).substring(0, 8)}...`);

      // Return tokens per OAuth 2.0 spec
      res.json(tokens);
    });

    logger.info("OAuth endpoints enabled (with DCR support)");
  }

  // MCP handler function (shared between /mcp and / routes)
  const handleMcpPost = async (req: Request, res: Response) => {
    const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;
    const authHeader = req.headers.authorization;

    logger.info(`MCP POST: path=${req.path}, mcp-session-id=${mcpSessionId?.substring(0, 8) || 'none'}, auth=${authHeader ? 'present' : 'missing'}`);

    let transport: StreamableHTTPServerTransport;

    try {
      if (mcpSessionId && transports.has(mcpSessionId)) {
        // Reuse existing session
        transport = transports.get(mcpSessionId)!;
        logger.debug(`Reusing session: ${mcpSessionId}`);
      } else if (!mcpSessionId && isInitializeRequest(req.body)) {
        // New session initialization
        logger.info("Initializing new MCP session");

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            logger.info(`Session initialized: ${id}`);
          },
          onsessionclosed: (id) => {
            transports.delete(id);
            logger.info(`Session closed: ${id}`);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
            logger.debug(`Transport closed, session cleaned up: ${transport.sessionId}`);
          }
        };

        // Create server with API key from auth header if present
        const apiKey = (req as any).apiKey;
        const isOAuthSession = (req as any).isOAuthSession;

        // OAuth sessions use /oauth-api/v1/*, direct API keys use /api/v1/*
        const defaultApiUrl = "https://api.digitalsamba.com/api/v1";
        const oauthApiUrl = process.env.OAUTH_API_URL || "https://api.digitalsamba.com/oauth-api/v1";
        const apiUrl = isOAuthSession
          ? oauthApiUrl
          : (process.env.DIGITAL_SAMBA_API_URL || defaultApiUrl);

        logger.debug(`Creating server with API URL: ${apiUrl} (OAuth: ${isOAuthSession})`);

        const server = createServer({
          apiKey,
          apiUrl,
        });

        await server.connect(transport);
        logger.debug("Server connected to transport");
      } else {
        // Invalid request - no session ID and not an initialize request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: mcpSessionId
              ? "Session not found. Session may have expired."
              : "Invalid request. First request must be an initialize request.",
          },
          id: null,
        });
        return;
      }

      // Run the request in the API key context so tools can access it
      const apiKey = (req as any).apiKey;
      if (apiKey) {
        await apiKeyContext.run(apiKey, async () => {
          await transport.handleRequest(req, res, req.body);
        });
      } else {
        await transport.handleRequest(req, res, req.body);
      }
    } catch (error: any) {
      logger.error(`MCP request error: ${error.message}`, error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
        },
        id: null,
      });
    }
  };

  // MCP GET handler function (for SSE streaming)
  const handleMcpGet = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Invalid or missing session ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    const apiKey = (req as any).apiKey;
    if (apiKey) {
      await apiKeyContext.run(apiKey, async () => {
        await transport.handleRequest(req, res);
      });
    } else {
      await transport.handleRequest(req, res);
    }
  };

  // MCP DELETE handler function
  const handleMcpDelete = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Invalid or missing session ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    const apiKey = (req as any).apiKey;
    if (apiKey) {
      await apiKeyContext.run(apiKey, async () => {
        await transport.handleRequest(req, res);
      });
    } else {
      await transport.handleRequest(req, res);
    }
  };

  // Register MCP handlers on both /mcp and / (root) paths
  // Claude Desktop may POST to root URL when connecting
  app.post("/mcp", handleMcpPost);
  app.get("/mcp", handleMcpGet);
  app.delete("/mcp", handleMcpDelete);

  // Also handle MCP on root path for Claude Desktop compatibility
  app.post("/", handleMcpPost);
  app.get("/", (req, res, next) => {
    // If Accept header includes event-stream, treat as MCP SSE request
    if (req.headers.accept?.includes("text/event-stream")) {
      return handleMcpGet(req, res);
    }

    const serverInfo = {
      name: "@digitalsamba/embedded-api-mcp-server",
      version: VERSION,
      transport: "StreamableHTTP",
      protocol: "MCP",
      endpoints: {
        mcp: "/mcp",
        health: "/health",
        ...(oauthConfig && {
          oauth_metadata: "/.well-known/oauth-authorization-server",
          oauth_authorize: "/oauth/authorize",
          oauth_register: "/oauth/register",
          oauth_token: "/oauth/token",
        }),
      },
      oauth_enabled: !!oauthConfig,
      ...VERSION_INFO,
    };

    // Return JSON if explicitly requested
    if (req.headers.accept?.includes("application/json")) {
      return res.json(serverInfo);
    }

    // Return branded HTML landing page for browsers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Samba MCP Server</title>
  <link rel="icon" href="https://digitalsamba.com/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --ds-blue: #3771e0;
      --ds-blue-dark: #264f9c;
      --ds-coral: #f06859;
      --ds-navy: #323e66;
      --ds-text: #222326;
      --ds-gray: #6a6d77;
      --ds-light: #fafafa;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', -apple-system, sans-serif;
      background: var(--ds-light);
      min-height: 100vh;
      color: var(--ds-text);
      overflow-x: hidden;
    }
    .hero {
      background: linear-gradient(165deg, var(--ds-navy) 0%, #1a2340 100%);
      padding: 60px 24px 80px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(55, 113, 224, 0.15) 0%, transparent 70%);
      animation: float 20s ease-in-out infinite;
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(240, 104, 89, 0.1) 0%, transparent 70%);
      animation: float 15s ease-in-out infinite reverse;
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(30px, -20px) scale(1.1); }
    }
    .hero-content {
      max-width: 680px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }
    .logo {
      height: 32px;
      width: auto;
    }
    .badge {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      letter-spacing: 0.02em;
    }
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      color: white;
      line-height: 1.15;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }
    .hero h1 span {
      background: linear-gradient(135deg, var(--ds-blue) 0%, #5a9aff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero p {
      font-size: 1.125rem;
      color: rgba(255,255,255,0.7);
      line-height: 1.7;
      max-width: 520px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 8px 16px;
      border-radius: 100px;
      margin-top: 24px;
      font-size: 14px;
      color: #4ade80;
      font-weight: 500;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }
    .main {
      max-width: 680px;
      margin: -40px auto 0;
      padding: 0 24px 60px;
      position: relative;
      z-index: 2;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(50, 62, 102, 0.12);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid #eef1f6;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-header h2 {
      font-size: 15px;
      font-weight: 600;
      color: var(--ds-text);
      letter-spacing: -0.01em;
    }
    .card-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--ds-blue) 0%, var(--ds-blue-dark) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
    }
    .card-body {
      padding: 24px;
    }
    .url-box {
      background: var(--ds-navy);
      border-radius: 10px;
      padding: 16px 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #a8c7fa;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .url-box code {
      overflow-x: auto;
      white-space: nowrap;
    }
    .copy-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .copy-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .platforms {
      display: grid;
      gap: 12px;
    }
    .platform-link {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--ds-light);
      border-radius: 12px;
      text-decoration: none;
      color: var(--ds-text);
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .platform-link:hover {
      background: white;
      border-color: #e5e8ed;
      transform: translateX(4px);
    }
    .platform-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .platform-icon.claude { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); }
    .platform-icon.chatgpt { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
    .platform-icon.other { background: linear-gradient(135deg, var(--ds-gray) 0%, #8b8f99 100%); }
    .platform-info h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .platform-info p {
      font-size: 13px;
      color: var(--ds-gray);
    }
    .platform-arrow {
      margin-left: auto;
      color: var(--ds-gray);
      opacity: 0;
      transform: translateX(-8px);
      transition: all 0.2s;
    }
    .platform-link:hover .platform-arrow {
      opacity: 1;
      transform: translateX(0);
    }
    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .quick-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--ds-light);
      border-radius: 8px;
      text-decoration: none;
      color: var(--ds-text);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .quick-link:hover {
      background: white;
      border-color: #e5e8ed;
      color: var(--ds-blue);
    }
    .quick-link.primary {
      background: var(--ds-blue);
      color: white;
    }
    .quick-link.primary:hover {
      background: var(--ds-blue-dark);
      border-color: transparent;
      color: white;
    }
    .footer {
      text-align: center;
      padding: 24px;
      color: var(--ds-gray);
      font-size: 13px;
    }
    .footer a {
      color: var(--ds-blue);
      text-decoration: none;
    }
    .version-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(55, 113, 224, 0.1);
      color: var(--ds-blue);
      padding: 4px 10px;
      border-radius: 6px;
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dev-badge {
      background: var(--ds-coral);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .commits-ahead {
      color: var(--ds-gray);
      font-size: 11px;
      font-weight: 400;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="hero-content">
      <div class="logo-row">
        <img src="https://dashboard.digitalsamba.com/logo-light.svg" alt="Digital Samba" class="logo">
        <span class="badge">MCP Server</span>
      </div>
      <h1>Manage your video platform<br>with <span>natural language</span></h1>
      <p>Connect your Digital Samba account to AI assistants like Claude and ChatGPT. Create rooms, manage recordings, and control your video infrastructure—just by asking.</p>
      <div class="status-pill">
        <span class="status-dot"></span>
        Server operational
      </div>
    </div>
  </div>

  <div class="main">
    <div class="card">
      <div class="card-header">
        <div class="card-icon">⚡</div>
        <h2>Quick Connect</h2>
        <span class="version-tag">${isDevBuild() ? '<span class="dev-badge">Dev</span>' : ""}v${getDisplayVersion()}${COMMITS_AHEAD > 0 ? ` <span class="commits-ahead">+${COMMITS_AHEAD} commits</span>` : ""}</span>
      </div>
      <div class="card-body">
        <div class="url-box">
          <code id="serverUrl">${req.protocol}://${req.get("host")}</code>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('serverUrl').textContent);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)">Copy</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon">🔌</div>
        <h2>Setup Guides</h2>
      </div>
      <div class="card-body">
        <div class="platforms">
          <a href="https://digitalsamba.com/blog/mcp-claude-desktop" class="platform-link">
            <div class="platform-icon claude">🤖</div>
            <div class="platform-info">
              <h3>Claude Desktop</h3>
              <p>Connect via Custom Connectors with OAuth</p>
            </div>
            <span class="platform-arrow">→</span>
          </a>
          <a href="https://digitalsamba.com/blog/mcp-chatgpt" class="platform-link">
            <div class="platform-icon chatgpt">💬</div>
            <div class="platform-info">
              <h3>ChatGPT</h3>
              <p>Use with OpenAI's MCP integration</p>
            </div>
            <span class="platform-arrow">→</span>
          </a>
          <a href="https://digitalsamba.com/blog/mcp-other-clients" class="platform-link">
            <div class="platform-icon other">🔧</div>
            <div class="platform-info">
              <h3>Other MCP Clients</h3>
              <p>Cursor, Windsurf, and more</p>
            </div>
            <span class="platform-arrow">→</span>
          </a>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon">📚</div>
        <h2>Resources</h2>
      </div>
      <div class="card-body">
        <div class="quick-links">
          <a href="https://developer.digitalsamba.com" class="quick-link primary">API Docs</a>
          <a href="https://github.com/digitalsamba/embedded-api-mcp-server" class="quick-link">GitHub</a>
          <a href="/health" class="quick-link">Health Check</a>
          <a href="/.well-known/oauth-authorization-server" class="quick-link">OAuth Info</a>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    &copy; ${new Date().getFullYear()} <a href="https://digitalsamba.com">Digital Samba</a> · Model Context Protocol Server
  </div>
</body>
</html>`;
    res.type("html").send(html);
  });
  app.delete("/", handleMcpDelete);

  // Start listening
  app.listen(port, host, () => {
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info(`Digital Samba MCP Server (HTTP)`);
    logger.info(`Version: ${VERSION}`);
    logger.info(`Transport: StreamableHTTP`);
    logger.info(`Listening: http://${host}:${port}`);
    logger.info(`MCP Endpoint: http://${host}:${port}/mcp`);
    logger.info(`Auth: ${requireAuth ? "Required" : "Optional"}`);
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down HTTP server...");
    for (const [id, transport] of transports) {
      logger.debug(`Closing session: ${id}`);
      await transport.close();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down...");
    for (const transport of transports.values()) {
      await transport.close();
    }
    process.exit(0);
  });
}
