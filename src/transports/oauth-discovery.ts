/**
 * OAuth protected-resource discovery (RFC 9728) for the HTTP transport.
 *
 * MCP is served at both "/" (the URL customers are given) and "/mcp", and
 * each is its own protected resource. RFC 9728 derives a resource's metadata
 * URL by inserting the well-known segment between host and path, so:
 *
 *   https://host      -> https://host/.well-known/oauth-protected-resource
 *   https://host/mcp  -> https://host/.well-known/oauth-protected-resource/mcp
 *
 * and the document's `resource` must equal the URL the client connected to.
 * Strict clients check both, so the 401 points each path at its own document.
 */

export const PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource";

/** The MCP path a request belongs to: "/mcp" or "" (the root endpoint). */
function resourcePath(requestPath: string): "" | "/mcp" {
  return requestPath === "/mcp" || requestPath.startsWith("/mcp/")
    ? "/mcp"
    : "";
}

/** Absolute metadata URL for the resource the request was made to. */
export function protectedResourceMetadataUrl(
  issuer: string,
  requestPath: string,
): string {
  return `${issuer}${PROTECTED_RESOURCE_METADATA_PATH}${resourcePath(requestPath)}`;
}

/** The protected-resource metadata document for "" (root) or "/mcp". */
export function protectedResourceMetadata(
  issuer: string,
  path: "" | "/mcp",
): { resource: string; authorization_servers: string[] } {
  return {
    resource: `${issuer}${path}`,
    authorization_servers: [issuer],
  };
}

/**
 * WWW-Authenticate value for a 401. Without OAuth configured there is no
 * metadata to point at, so resource_metadata is left out.
 */
export function wwwAuthenticate(
  issuer: string | undefined,
  requestPath: string,
  error?: { code: string; description: string },
): string {
  const parts = ['Bearer realm="mcp"'];
  if (error) {
    parts.push(`error="${error.code}"`);
    parts.push(`error_description="${error.description}"`);
  }
  if (issuer) {
    parts.push(
      `resource_metadata="${protectedResourceMetadataUrl(issuer, requestPath)}"`,
    );
  }
  return parts.join(", ");
}
