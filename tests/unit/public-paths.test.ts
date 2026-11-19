/**
 * The auth exemption list. GET / with Accept: text/event-stream used to be
 * exempt because of the info-page rule, which let an unauthenticated request
 * reach the MCP GET handler.
 *
 * @group unit
 */
import { isPublicRequest } from "../../src/transports/public-paths.js";

describe("isPublicRequest", () => {
  it.each([
    ["/health", "GET"],
    ["/favicon.svg", "GET"],
    ["/.well-known/oauth-authorization-server", "GET"],
    ["/oauth/authorize", "GET"],
    ["/oauth/token", "POST"],
  ])("%s %s is public", (path, method) => {
    expect(isPublicRequest(path, method, undefined)).toBe(true);
  });

  it("GET / for the info page is public", () => {
    expect(isPublicRequest("/", "GET", "text/html")).toBe(true);
    expect(isPublicRequest("/", "GET", undefined)).toBe(true);
  });

  it("GET / asking for an event stream is the MCP endpoint and needs auth", () => {
    expect(isPublicRequest("/", "GET", "text/event-stream")).toBe(false);
    expect(
      isPublicRequest("/", "GET", "application/json, text/event-stream"),
    ).toBe(false);
  });

  it.each([
    ["/", "POST"],
    ["/", "DELETE"],
    ["/mcp", "GET"],
    ["/mcp", "POST"],
  ])("%s %s needs auth", (path, method) => {
    expect(isPublicRequest(path, method, "application/json")).toBe(false);
  });
});
