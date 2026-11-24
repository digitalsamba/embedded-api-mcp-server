/**
 * User-Agent the API client sends, so the API side can count MCP traffic
 * apart from other API clients (Node's fetch default is just "node").
 *
 * The version is set by createServer rather than imported here: version.ts
 * reads import.meta, which the unit-test setup cannot load, and the API
 * client is imported by most tests.
 */
let userAgent = "ds-mcp-server";

export function setUserAgentVersion(version: string): void {
  userAgent = `ds-mcp-server/${version}`;
}

export function getUserAgent(): string {
  return userAgent;
}
