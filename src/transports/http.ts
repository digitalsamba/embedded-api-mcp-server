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
      if (token.startsWith("oauth:")) {
        const oauthSessionId = token.substring(6);
        const accessToken = getAccessTokenFromSession(oauthSessionId);

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
        (req as any).oauthSessionId = oauthSessionId;
        logger.debug(`OAuth session authenticated: ${oauthSessionId.substring(0, 8)}...`);
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
    });
  });

  // Load OAuth configuration
  const oauthConfig = loadOAuthConfig();

  // Server info endpoint
  app.get("/", (_req, res) => {
    res.json({
      name: "Digital Samba MCP Server",
      version: VERSION,
      transport: "StreamableHTTP",
      protocol: "MCP",
      endpoints: {
        mcp: "/mcp",
        health: "/health",
        ...(oauthConfig && {
          oauth_metadata: "/.well-known/oauth-authorization-server",
          oauth_authorize: "/oauth/authorize",
          oauth_callback: "/oauth/callback",
        }),
      },
      oauth_enabled: !!oauthConfig,
      ...VERSION_INFO,
    });
  });

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

    // OAuth authorize - redirect to DS Passport
    app.get("/oauth/authorize", (req, res) => {
      const state = generateState();
      const authUrl = buildAuthorizationUrl(oauthConfig, state);

      logger.info(`OAuth: Redirecting to DS Passport (state: ${state.substring(0, 8)}...)`);
      res.redirect(authUrl);
    });

    // OAuth callback - handle code exchange
    app.get("/oauth/callback", async (req, res) => {
      const { code, state, error, error_description } = req.query;

      if (error) {
        logger.error(`OAuth error: ${error} - ${error_description}`);
        res.status(400).json({
          error: error as string,
          error_description: error_description as string,
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing code or state parameter",
        });
        return;
      }

      try {
        const { sessionId } = await completeOAuthFlow(
          oauthConfig,
          code as string,
          state as string
        );

        logger.info(`OAuth: Session created (${sessionId.substring(0, 8)}...)`);

        // Return session info to the client
        // The access token will be used directly with /oauth-api/v1/* endpoints
        res.json({
          success: true,
          message: "Authentication successful",
          session_id: sessionId,
          // Include instructions for using the session
          usage: {
            header: "Authorization",
            format: `Bearer oauth:${sessionId}`,
            example: `curl -H "Authorization: Bearer oauth:${sessionId}" https://mcp.digitalsamba.com/mcp`,
            note: "Your OAuth token will be used with /oauth-api/v1/* endpoints",
          },
        });
      } catch (err: any) {
        logger.error(`OAuth callback error: ${err.message}`);
        res.status(400).json({
          error: "oauth_error",
          error_description: err.message,
        });
      }
    });

    logger.info("OAuth endpoints enabled");
  }

  // MCP POST handler - main request handler
  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    try {
      if (sessionId && transports.has(sessionId)) {
        // Reuse existing session
        transport = transports.get(sessionId)!;
        logger.debug(`Reusing session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
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
            message: sessionId
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
  });

  // MCP GET handler - for SSE streaming (if client requests it)
  app.get("/mcp", async (req: Request, res: Response) => {
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
  });

  // MCP DELETE handler - close session
  app.delete("/mcp", async (req: Request, res: Response) => {
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
  });

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
