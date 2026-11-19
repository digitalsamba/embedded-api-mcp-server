/**
 * Which requests the HTTP transport serves without authentication.
 *
 * Kept separate so the rule can be tested on its own: getting it wrong
 * exposes the MCP endpoint.
 */
export function isPublicRequest(
  path: string,
  method: string,
  accept: string | undefined,
): boolean {
  if (
    path === "/health" ||
    path === "/favicon.svg" ||
    path === "/favicon.ico" ||
    path.startsWith("/.well-known/") ||
    path.startsWith("/oauth/")
  ) {
    return true;
  }
  // GET / is the public info page, but GET / asking for an event stream is
  // the MCP endpoint (the "/" route hands it to the MCP GET handler), and
  // POST/DELETE / are MCP too.
  return (
    path === "/" && method === "GET" && !accept?.includes("text/event-stream")
  );
}
