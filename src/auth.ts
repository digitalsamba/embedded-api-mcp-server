/**
 * Authentication utilities for Digital Samba MCP Server
 *
 * In MCP stdio mode, we use environment variables for developer key configuration
 * since there's no HTTP request context.
 */

import { AsyncLocalStorage } from "async_hooks";

// Context storage for developer key (mainly for backwards compatibility)
const apiKeyContext = new AsyncLocalStorage<string>();

/**
 * Get developer key from environment or request context
 * Checks AsyncLocalStorage context first (for HTTP mode),
 * then falls back to environment variable (for stdio mode)
 */
export function getApiKeyFromRequest(_request: any): string | null {
  // Check AsyncLocalStorage context first (set by HTTP transport)
  const contextKey = apiKeyContext.getStore();
  if (contextKey) {
    return contextKey;
  }

  // Fall back to environment variable (stdio mode)
  return process.env.DIGITAL_SAMBA_DEVELOPER_KEY || null;
}

/**
 * Extract developer key from various sources
 * For MCP stdio mode, this will always use environment variables
 */
export function extractApiKey(_source?: any): string | null {
  // Check environment variable first (primary method for MCP)
  const envKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  if (envKey) {
    return envKey;
  }

  // Check context (for backwards compatibility)
  const contextKey = apiKeyContext.getStore();
  if (contextKey) {
    return contextKey;
  }

  return null;
}

// Export the context for backwards compatibility
export default apiKeyContext;
