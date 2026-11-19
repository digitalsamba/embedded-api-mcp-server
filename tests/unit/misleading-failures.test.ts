/**
 * Failures must say what actually went wrong (#41).
 *
 * @group unit
 */
jest.mock("ioredis", () => {
  class MockRedis {
    constructor() {
      throw new Error("RedisStore must not be constructed in these tests");
    }
  }
  return { Redis: MockRedis };
});
jest.mock("../../src/logger", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock("../../src/version", () => ({
  VERSION: "0.0.0-test",
  VERSION_INFO: { version: "0.0.0-test" },
  PACKAGE_NAME: "test",
  BUILD_TIME: "",
  GIT_COMMIT: "",
  GIT_REF: "",
  COMMITS_AHEAD: 0,
  getDisplayVersion: () => "0.0.0-test",
  isDevBuild: () => false,
}));

import { DigitalSambaApiClient } from "../../src/digital-samba-api";
import { ExportResources } from "../../src/resources/exports/index";
import { missingRequiredArguments } from "../../src/server";
import * as oauth from "../../src/oauth";
import { getStore, PREFIXES, TTL } from "../../src/session-store";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  jest.useRealTimers();
});

function respond(status: number, body: unknown) {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
  })) as any;
}

describe("upstream 401 over OAuth", () => {
  it("explains the likely cause instead of a bare 'Unauthenticated.'", async () => {
    respond(401, { message: "Unauthenticated." });
    const client = new DigitalSambaApiClient(
      "tok",
      "https://api.test.invalid/oauth-api/v1",
    );
    await expect(client.listRooms()).rejects.toThrow(/team owner/);
  });

  it("keeps the plain message for developer keys", async () => {
    respond(401, { message: "Unauthenticated." });
    const client = new DigitalSambaApiClient(
      "key",
      "https://api.test.invalid/api/v1",
    );
    await expect(client.listRooms()).rejects.toThrow(
      "Authentication error: Unauthenticated.",
    );
  });
});

describe("upstream timeouts", () => {
  it("a stalled API becomes a clear error, and a write warns it may have applied", async () => {
    // Resolve only when aborted, like a hung connection.
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const fail = () => {
            const e = new Error("timed out");
            e.name = "TimeoutError";
            reject(e);
          };
          if (init.signal!.aborted) fail();
          else init.signal!.addEventListener("abort", fail);
        }),
    ) as any;
    const client = new DigitalSambaApiClient(
      "key",
      "https://api.test.invalid/api/v1",
    );
    // Trigger the abort directly rather than waiting two minutes.
    const timeout = jest
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() => AbortSignal.abort(new Error("x")));
    await expect(client.deleteRoom("r1")).rejects.toThrow(
      /did not respond within \d+ s \(DELETE \/rooms\/r1\)\. The change may still have been applied/,
    );
    timeout.mockRestore();
  });
});

describe("export resources", () => {
  const exportsFor = (status: number) => {
    respond(status, {
      message: status === 429 ? "Too Many Attempts." : "Not Found",
    });
    return new ExportResources(
      new DigitalSambaApiClient("key", "https://api.test.invalid/api/v1"),
    );
  };

  it("a 404 is 'not found'", async () => {
    await expect(
      exportsFor(404).handleResourceRequest(
        "digitalsamba://exports/sessions/s1/metadata",
      ),
    ).rejects.toThrow("Session s1 not found");
  });

  it("a rate limit is not reported as a missing session", async () => {
    const p = exportsFor(429).handleResourceRequest(
      "digitalsamba://exports/sessions/s1/metadata",
    );
    await expect(p).rejects.toThrow(/Too Many Attempts/);
    await expect(p).rejects.not.toThrow(/not found/);
  });

  it("an unknown export type says so", async () => {
    respond(200, { id: "s1" });
    const exportsRes = new ExportResources(
      new DigitalSambaApiClient("key", "https://api.test.invalid/api/v1"),
    );
    await expect(
      exportsRes.handleResourceRequest(
        "digitalsamba://exports/sessions/s1/bogus",
      ),
    ).rejects.toThrow(/Unknown session export type: bogus/);
  });
});

describe("required arguments", () => {
  it("names the missing argument and the other convention when that was sent", () => {
    expect(
      missingRequiredArguments("delete-poll", { roomId: "r", poll_id: "p" }),
    ).toBe(
      "Missing required argument(s) for delete-poll: room_id (you sent roomId; this tool uses room_id). Nothing was sent to the API.",
    );
  });

  it("treats empty strings as missing", () => {
    expect(
      missingRequiredArguments("get-room-details", { room_id: "  " }),
    ).toMatch(/room_id/);
  });

  it("enforces only ID arguments, so calls that always worked still do", () => {
    // create-room marks name required, but it is not an API field (#37) and
    // callers have always been able to omit it.
    expect(missingRequiredArguments("create-room", {})).toBeNull();
  });

  it("passes complete calls and tools with nothing required", () => {
    expect(
      missingRequiredArguments("get-room-details", { room_id: "r1" }),
    ).toBeNull();
    expect(missingRequiredArguments("list-rooms", {})).toBeNull();
  });
});

describe("client registrations follow their sessions", () => {
  it("a sliding session renews its client, so the client outlives the original 30 days", async () => {
    jest.useFakeTimers();
    const client = await oauth.registerClient({
      redirect_uris: ["https://claude.ai/cb"],
    });
    const verifier = "renew-test-".padEnd(43, "v");
    const { createHash } = await import("node:crypto");
    const code = await oauth.createAuthorizationCode(
      client.client_id,
      "https://claude.ai/cb",
      "ds",
      undefined,
      createHash("sha256").update(verifier).digest("base64url"),
      "S256",
    );
    const { access_token } = (await oauth.exchangeAuthorizationCode(
      code,
      client.client_id,
      "https://claude.ai/cb",
      verifier,
    ))!;

    // Use the connection every 20 days for 100 days.
    for (let day = 20; day <= 100; day += 20) {
      jest.advanceTimersByTime(20 * 24 * 60 * 60 * 1000);
      await oauth.touchSession(access_token);
    }
    expect(TTL.CLIENT).toBeGreaterThan(TTL.SESSION);
    await expect(
      getStore().get(PREFIXES.CLIENT + client.client_id),
    ).resolves.not.toBeNull();
  });
});
