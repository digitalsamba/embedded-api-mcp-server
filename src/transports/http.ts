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

import { createServer, VERSION, VERSION_INFO } from "../server.js";
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
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for health check, server info, and OAuth endpoints
    if (
      req.path === "/health" ||
      req.path === "/" ||
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
        const directSession = getAccessTokenFromSession(token);
        if (directSession) {
          sessionId = token;
        }
      }

      if (sessionId) {
        const accessToken = getAccessTokenFromSession(sessionId);

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
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: VERSION,
      transport: "http",
      activeSessions: transports.size,
      oauthSessions: getActiveSessionCount(),
      registeredClients: getRegisteredClientCount(),
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
    app.post("/oauth/register", (req, res) => {
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
        const client = registerClient({
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
    app.get("/oauth/authorize", (req, res) => {
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
      const client = getRegisteredClient(client_id as string);
      if (!client) {
        res.status(400).json({
          error: "invalid_client",
          error_description: "Unknown client_id. Register via /oauth/register first.",
        });
        return;
      }

      // Validate redirect_uri is registered for this client
      if (!validateRedirectUri(client_id as string, redirect_uri as string)) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "redirect_uri not registered for this client",
        });
        return;
      }

      // Generate our state for DS Passport flow
      const ourState = generateState();

      // Store the client's request so we can redirect back after DS auth
      storePendingClientAuth(
        ourState,
        client_id as string,
        redirect_uri as string,
        code_challenge as string | undefined,
        code_challenge_method as string | undefined,
        clientState as string | undefined
      );

      // Redirect to DS Passport for actual authentication
      const authUrl = buildAuthorizationUrl(oauthConfig, ourState);

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
      const pendingClient = getPendingClientAuth(state as string);

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
        const clientCode = createAuthorizationCode(
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
    app.post("/oauth/token", (req, res) => {
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

      const tokens = exchangeAuthorizationCode(
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
    // Otherwise return server info (existing behavior)
    res.json({
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
    });
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
