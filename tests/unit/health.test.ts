import { healthProblems, HealthInputs } from "../../src/health.js";

const healthy: HealthInputs = {
  oauthConfigured: true,
  store: { backend: "redis", connected: true },
  storeCountsFailed: false,
  apiUrlWarnings: [],
};

describe("healthProblems", () => {
  it("reports nothing for a configured host with a reachable Redis", () => {
    expect(healthProblems(healthy)).toEqual([]);
  });

  it("flags missing OAuth configuration", () => {
    expect(healthProblems({ ...healthy, oauthConfigured: false })).toEqual([
      "oauth_not_configured",
    ]);
  });

  it("flags the in-memory fallback store", () => {
    expect(
      healthProblems({
        ...healthy,
        store: { backend: "memory", connected: true },
      }),
    ).toEqual(["session_store_in_memory"]);
  });

  it("flags a disconnected Redis once, not also as unreadable", () => {
    expect(
      healthProblems({
        ...healthy,
        store: { backend: "redis", connected: false },
        storeCountsFailed: true,
      }),
    ).toEqual(["session_store_disconnected"]);
  });

  it("flags a connected store whose counts failed", () => {
    expect(healthProblems({ ...healthy, storeCountsFailed: true })).toEqual([
      "session_store_unreadable",
    ]);
  });

  it("flags API URL warnings without exposing their text", () => {
    expect(
      healthProblems({ ...healthy, apiUrlWarnings: ["hosts differ"] }),
    ).toEqual(["api_url_config"]);
  });

  it("lists every problem when several apply", () => {
    expect(
      healthProblems({
        oauthConfigured: false,
        store: { backend: "memory", connected: true },
        storeCountsFailed: false,
        apiUrlWarnings: ["x"],
      }),
    ).toEqual([
      "oauth_not_configured",
      "session_store_in_memory",
      "api_url_config",
    ]);
  });
});
