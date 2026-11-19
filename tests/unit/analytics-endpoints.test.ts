/**
 * Which API endpoint each analytics tool calls, through the real API client.
 *
 * Four tools used to call GET /statistics (or /rooms/{id}/statistics) with
 * participant/room/session/live filters the API ignores there, so they
 * returned team-wide or historical totals as the answer to "stats for
 * participant X" or "what is live now". These pin the paths.
 *
 * @group unit
 */
import { executeAnalyticsTool } from "../../src/tools/analytics-tools/index.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const API = "https://api.test.invalid/api/v1";

describe("analytics tools call the endpoint that answers their question", () => {
  const realFetch = global.fetch;
  let calls: string[];
  let client: DigitalSambaApiClient;

  beforeEach(() => {
    calls = [];
    global.fetch = jest.fn(async (input: any) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      calls.push(`${url.pathname.replace("/api/v1", "")}${url.search}`);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ data: [], total_count: 0 }),
        json: async () => ({ data: [], total_count: 0 }),
      } as any;
    }) as any;
    client = new DigitalSambaApiClient("key", API);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  async function run(tool: string, args: Record<string, unknown>) {
    return executeAnalyticsTool(tool, args, client);
  }

  it("get-participant-statistics with a participant -> /participants/{id}/statistics", async () => {
    const result = await run("get-participant-statistics", {
      participantId: "p-1",
    });
    expect(result.isError).toBeUndefined();
    expect(calls).toEqual(["/participants/p-1/statistics"]);
  });

  it("get-participant-statistics by room or session -> the participant list, filtered", async () => {
    await run("get-participant-statistics", { roomId: "r-1" });
    await run("get-participant-statistics", { sessionId: "s-1" });
    expect(calls).toEqual([
      "/participants?room_id=r-1",
      "/participants?session_id=s-1",
    ]);
  });

  it("get-participant-analytics -> /participants/{id}", async () => {
    await run("get-participant-analytics", { participantId: "p-1" });
    expect(calls).toEqual(["/participants/p-1"]);
  });

  it("get-live-analytics -> /rooms/live (or /rooms/live/participants)", async () => {
    await run("get-live-analytics", {});
    await run("get-live-analytics", { includeParticipants: true });
    expect(calls).toEqual(["/rooms/live", "/rooms/live/participants"]);
  });

  it("get-live-room-analytics -> /rooms/{id}/live", async () => {
    await run("get-live-room-analytics", { roomId: "r-1" });
    expect(calls).toEqual(["/rooms/r-1/live"]);
  });

  it("none of them falls back to team statistics", async () => {
    await run("get-participant-statistics", { participantId: "p-1" });
    await run("get-participant-analytics", { participantId: "p-1" });
    await run("get-live-analytics", {});
    await run("get-live-room-analytics", { roomId: "r-1" });
    expect(calls.some((c) => c.startsWith("/statistics"))).toBe(false);
    expect(calls.some((c) => /\/rooms\/[^/]+\/statistics/.test(c))).toBe(false);
  });

  it.each([
    [{ participantId: "p-1", dateStart: "2026-01-01" }, "dateStart"],
    [{ participantId: "p-1", roomId: "r-1" }, "roomId"],
    [{ roomId: "r-1", dateEnd: "2026-02-01" }, "dateEnd"],
  ])(
    "refuses filters the endpoint cannot apply (%p) instead of ignoring them",
    async (args, name) => {
      const result = await run("get-participant-statistics", args);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(name);
      expect(calls).toEqual([]);
    },
  );
});
