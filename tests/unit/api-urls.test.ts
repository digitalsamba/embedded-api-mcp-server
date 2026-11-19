/**
 * HTTP mode used to fall back to production for developer-key sessions when
 * DIGITAL_SAMBA_API_URL was unset, even on a host whose OAuth traffic went to
 * another environment (#42).
 *
 * @group unit
 */
import {
  resolveApiUrls,
  PRODUCTION_API_URL,
  PRODUCTION_OAUTH_API_URL,
} from "../../src/api-urls.js";

const DEV_OAUTH = "https://api-dev.example.test/oauth-api/v1";

describe("resolveApiUrls", () => {
  it("derives the developer-key URL from OAUTH_API_URL instead of using production", () => {
    const r = resolveApiUrls({ OAUTH_API_URL: DEV_OAUTH });
    expect(r.keyApiUrl).toBe("https://api-dev.example.test/api/v1");
    expect(r.keySource).toBe("derived from OAUTH_API_URL");
    expect(r.warnings).toEqual([]);
  });

  it("uses DIGITAL_SAMBA_API_URL when set", () => {
    const r = resolveApiUrls({
      DIGITAL_SAMBA_API_URL: "https://api-dev.example.test/api/v1",
      OAUTH_API_URL: DEV_OAUTH,
    });
    expect(r.keySource).toBe("DIGITAL_SAMBA_API_URL");
    expect(r.warnings).toEqual([]);
  });

  it("warns when the two point at different hosts", () => {
    const r = resolveApiUrls({
      DIGITAL_SAMBA_API_URL: PRODUCTION_API_URL,
      OAUTH_API_URL: DEV_OAUTH,
    });
    expect(r.warnings.join(" ")).toMatch(
      /api\.digitalsamba\.com.*api-dev\.example\.test/,
    );
  });

  it("warns when the key URL cannot be derived", () => {
    const r = resolveApiUrls({
      OAUTH_API_URL: "https://odd.example.test/custom",
    });
    expect(r.warnings.join(" ")).toMatch(/could not be derived/);
  });

  it("defaults both to production when nothing is set", () => {
    const r = resolveApiUrls({});
    expect(r).toMatchObject({
      keyApiUrl: PRODUCTION_API_URL,
      oauthApiUrl: PRODUCTION_OAUTH_API_URL,
      keySource: "production default",
      warnings: [],
    });
  });
});
