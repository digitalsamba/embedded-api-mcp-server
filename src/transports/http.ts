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
 */
function authMiddleware(requireAuth: boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for health check
    if (req.path === "/health") {
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

      // Store API key in request for use by server
      // In production, this would be validated against DS auth service
      (req as any).apiKey = token;
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
    });
  });

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
      },
      ...VERSION_INFO,
    });
  });

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
        const server = createServer({
          apiKey,
          apiUrl: process.env.DIGITAL_SAMBA_API_URL,
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

      await transport.handleRequest(req, res, req.body);
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
    await transport.handleRequest(req, res);
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
    await transport.handleRequest(req, res);
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
