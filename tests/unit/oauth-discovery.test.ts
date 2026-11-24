/**
 * RFC 9728 discovery: the 401's resource_metadata must be an absolute URL,
 * and each MCP endpoint ("/" and "/mcp") gets the metadata document whose
 * `resource` is that endpoint's URL.
 *
 * @group unit
 */
import {
  protectedResourceMetadataUrl,
  protectedResourceMetadata,
  wwwAuthenticate,
} from "../../src/transports/oauth-discovery.js";
import { isPublicRequest } from "../../src/transports/public-paths.js";

const ISSUER = "https://mcp.example.com";

describe("protectedResourceMetadataUrl", () => {
  it.each([
    ["/", `${ISSUER}/.well-known/oauth-protected-resource`],
    ["/mcp", `${ISSUER}/.well-known/oauth-protected-resource/mcp`],
    ["/mcp/", `${ISSUER}/.well-known/oauth-protected-resource/mcp`],
    // Only the /mcp path itself, not anything that starts with the letters
    ["/mcpx", `${ISSUER}/.well-known/oauth-protected-resource`],
  ])("request to %s -> %s", (path, url) => {
    expect(protectedResourceMetadataUrl(ISSUER, path)).toBe(url);
  });
});

describe("protectedResourceMetadata", () => {
  it("root document names the root URL as the resource", () => {
    expect(protectedResourceMetadata(ISSUER, "")).toEqual({
      resource: ISSUER,
      authorization_servers: [ISSUER],
    });
  });

  it("/mcp document names the /mcp URL as the resource", () => {
    expect(protectedResourceMetadata(ISSUER, "/mcp")).toEqual({
      resource: `${ISSUER}/mcp`,
      authorization_servers: [ISSUER],
    });
  });
});

describe("wwwAuthenticate", () => {
  it("missing credentials: absolute resource_metadata for the root endpoint", () => {
    expect(wwwAuthenticate(ISSUER, "/")).toBe(
      `Bearer realm="mcp", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource"`,
    );
  });

  it("missing credentials on /mcp points at the /mcp document", () => {
    expect(wwwAuthenticate(ISSUER, "/mcp")).toBe(
      `Bearer realm="mcp", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/mcp"`,
    );
  });

  it("expired session carries the error and the metadata link", () => {
    expect(
      wwwAuthenticate(ISSUER, "/", {
        code: "invalid_token",
        description: "The OAuth session has expired",
      }),
    ).toBe(
      `Bearer realm="mcp", error="invalid_token", error_description="The OAuth session has expired", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource"`,
    );
  });

  it("without OAuth configured there is no metadata to point at", () => {
    expect(wwwAuthenticate(undefined, "/mcp")).toBe('Bearer realm="mcp"');
  });
});

describe("the /mcp metadata document is reachable without auth", () => {
  it("is public", () => {
    expect(
      isPublicRequest(
        "/.well-known/oauth-protected-resource/mcp",
        "GET",
        undefined,
      ),
    ).toBe(true);
  });
});
