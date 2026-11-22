/**
 * #26 group 5: the statistics operations.
 *
 * - currentPeriod on get-usage-statistics, get-usage-analytics and
 *   get-room-analytics -> /statistics/team/current, /rooms/{id}/statistics/current
 * - get-plan-usage -> /usage
 * - get-current-period-statistics -> /statistics/current
 * - get-usage-by-tag -> /statistics/totals
 * - list-started-sessions -> /statistics/participants/started-sessions
 *
 * Runs through the real API client with fetch mocked, so the paths and query
 * strings are the ones the API receives.
 *
 * @group unit
 */
import {
  executeAnalyticsTool,
  registerAnalyticsTools,
} from "../../src/tools/analytics-tools/index.js";
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

describe("statistics tools", () => {
  const realFetch = global.fetch;
  let calls: string[];
  let body: unknown;
  let client: DigitalSambaApiClient;

  beforeEach(() => {
    calls = [];
    body = {};
    global.fetch = jest.fn(async (input: any) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      calls.push(`${url.pathname.replace("/api/v1", "")}${url.search}`);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify(body),
        json: async () => body,
      } as any;
    }) as any;
    client = new DigitalSambaApiClient("key", API);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  const run = (tool: string, args: Record<string, unknown> = {}) =>
    executeAnalyticsTool(tool, args, client);

  it("registers the four new tools with input schemas", () => {
    const tools = registerAnalyticsTools();
    for (const name of [
      "get-plan-usage",
      "get-current-period-statistics",
      "get-usage-by-tag",
      "list-started-sessions",
    ]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.type).toBe("object");
      expect(tool!.annotations?.readOnlyHint).toBe(true);
    }
    for (const name of [
      "get-usage-statistics",
      "get-usage-analytics",
      "get-room-analytics",
    ]) {
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.inputSchema.properties).toHaveProperty("currentPeriod");
    }
  });

  describe("currentPeriod", () => {
    it("sends the team tools to /statistics/team/current", async () => {
      body = { participation_minutes: 10, sessions: 4 };
      const a = await run("get-usage-statistics", { currentPeriod: true });
      const b = await run("get-usage-analytics", { currentPeriod: "true" });
      expect(a.isError).toBeUndefined();
      expect(b.isError).toBeUndefined();
      expect(calls).toEqual([
        "/statistics/team/current",
        "/statistics/team/current",
      ]);
      expect(a.content[0].text).toContain('"sessions": 4');
    });

    it("sends get-room-analytics to the room's current period, or the team's without a room", async () => {
      await run("get-room-analytics", { roomId: "r-1", currentPeriod: true });
      await run("get-room-analytics", { currentPeriod: true });
      expect(calls).toEqual([
        "/rooms/r-1/statistics/current",
        "/statistics/team/current",
      ]);
    });

    it("rejects dates alongside it instead of silently dropping them", async () => {
      for (const tool of [
        "get-usage-statistics",
        "get-usage-analytics",
        "get-room-analytics",
      ]) {
        const result = await run(tool, {
          roomId: "r-1",
          currentPeriod: true,
          dateStart: "2026-01-01",
          period: "week",
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("dateStart, period");
      }
      expect(calls).toEqual([]);
    });

    it("false or absent keeps the date-range endpoints", async () => {
      await run("get-usage-statistics", {
        currentPeriod: "false",
        dateStart: "2026-11-01",
      });
      await run("get-room-analytics", { roomId: "r-1", currentPeriod: false });
      expect(calls).toEqual([
        "/statistics?date_start=2026-11-01",
        // room_id is a long-standing redundant extra; the API ignores it.
        "/rooms/r-1/statistics?room_id=r-1",
      ]);
    });
  });

  it("get-plan-usage -> /usage", async () => {
    body = {
      participation_minutes_used: 10,
      participation_minutes_limit: null,
      participation_minutes_percentage: null,
      period_start: "2026-11-14",
      period_end: "2026-12-14",
    };
    const result = await run("get-plan-usage");
    expect(calls).toEqual(["/usage"]);
    expect(result.content[0].text).toContain(
      '"participation_minutes_limit": null',
    );
  });

  it("get-current-period-statistics -> /statistics/current", async () => {
    body = { live_sessions: 2, date_start: "2026-11-14" };
    const result = await run("get-current-period-statistics");
    expect(calls).toEqual(["/statistics/current"]);
    expect(result.content[0].text).toContain('"live_sessions": 2');
  });

  describe("get-usage-by-tag", () => {
    it("calls /statistics/totals with dates, or none for all time", async () => {
      body = [{ tag: "common", rooms: 65 }];
      const result = await run("get-usage-by-tag", {
        dateStart: "2026-11-01",
        dateEnd: "2026-11-21",
      });
      await run("get-usage-by-tag");
      expect(calls).toEqual([
        "/statistics/totals?date_start=2026-11-01&date_end=2026-11-21",
        "/statistics/totals",
      ]);
      expect(result.content[0].text).toContain('"tag": "common"');
    });

    it("translates period into a date range", async () => {
      await run("get-usage-by-tag", { period: "week" });
      expect(calls[0]).toMatch(
        /^\/statistics\/totals\?date_start=\d{4}-\d{2}-\d{2}&date_end=\d{4}-\d{2}-\d{2}$/,
      );
    });
  });

  describe("list-started-sessions", () => {
    it("forwards dates and pagination", async () => {
      body = {
        total_count: 47,
        data: [{ browser_id: "b-1", sessions_started: 34 }],
      };
      const result = await run("list-started-sessions", {
        dateStart: "2026-11-01",
        limit: 3,
        offset: "6",
        order: "ASC",
      });
      await run("list-started-sessions");
      expect(calls).toEqual([
        "/statistics/participants/started-sessions?date_start=2026-11-01&limit=3&offset=6&order=asc",
        "/statistics/participants/started-sessions",
      ]);
      expect(result.content[0].text).toContain('"sessions_started": 34');
    });

    it.each([
      [{ limit: 0 }, "limit"],
      [{ limit: 101 }, "limit"],
      [{ limit: 2.5 }, "limit"],
      [{ offset: -1 }, "offset"],
      [{ offset: "abc" }, "offset"],
      [{ order: "newest" }, "order"],
    ])("rejects %j before calling the API", async (args, field) => {
      const result = await run("list-started-sessions", args);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(field);
      expect(calls).toEqual([]);
    });
  });
});
