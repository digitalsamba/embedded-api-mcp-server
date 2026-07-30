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

// Export the context for backwards compatibility
export default apiKeyContext;
