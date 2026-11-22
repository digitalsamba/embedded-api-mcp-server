/**
 * #26 group 6: alert recipients and system check results.
 *
 * Runs through the real API client with fetch mocked, so methods, paths and
 * bodies are the ones the API receives. Each write must be confirmed by
 * reading the recipient list back.
 *
 * @group unit
 */
import {
  executeAccountTool,
  registerAccountTools,
  ACCOUNT_TOOL_NAMES,
} from "../../src/tools/account-management/index.js";
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
type Reply = { status: number; body?: unknown };

describe("account tools", () => {
  const realFetch = global.fetch;
  let calls: string[];
  let replies: Reply[];
  let client: DigitalSambaApiClient;

  beforeEach(() => {
    calls = [];
    replies = [];
    global.fetch = jest.fn(async (input: any, init: any = {}) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      const method = init.method ?? "GET";
      calls.push(
        `${method} ${url.pathname.replace("/api/v1", "")}${init.body ? ` ${init.body}` : ""}`,
      );
      const reply = replies.shift() ?? { status: 200, body: {} };
      const text = reply.body === undefined ? "" : JSON.stringify(reply.body);
      return {
        ok: reply.status < 400,
        status: reply.status,
        statusText: String(reply.status),
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => text,
        json: async () => reply.body,
      } as any;
    }) as any;
    client = new DigitalSambaApiClient("key", API);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  const run = (tool: string, args: Record<string, unknown> = {}) =>
    executeAccountTool(tool, args, client);
  const list = (...rows: { id: string; email: string }[]) => ({
    status: 200,
    body: { total_count: rows.length, data: rows },
  });
  const ops = { id: "r-1", email: "ops@example.com" };

  it("registers five tools; only the delete is destructive", () => {
    const tools = registerAccountTools();
    expect(tools.map((t) => t.name)).toEqual([...ACCOUNT_TOOL_NAMES]);
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName["list-alert-recipients"].annotations?.readOnlyHint).toBe(
      true,
    );
    expect(byName["get-system-check-results"].annotations?.readOnlyHint).toBe(
      true,
    );
    expect(byName["delete-alert-recipient"].annotations?.destructiveHint).toBe(
      true,
    );
    expect(byName["create-alert-recipient"].annotations?.readOnlyHint).toBe(
      false,
    );
  });

  describe("list-alert-recipients", () => {
    it("lists them and notes the owner is not included", async () => {
      replies = [list(ops)];
      const result = await run("list-alert-recipients");
      expect(calls).toEqual(["GET /alert-recipients"]);
      expect(result.content[0].text).toContain("1 alert recipient(s)");
      expect(result.content[0].text).toContain("ops@example.com");
      expect(result.content[0].text).toContain("team owner");
    });

    it("says when there are none", async () => {
      replies = [list()];
      const result = await run("list-alert-recipients");
      expect(result.content[0].text).toContain("No extra alert recipients");
    });
  });

  describe("create-alert-recipient", () => {
    it("posts the email and confirms it in the list", async () => {
      replies = [{ status: 200, body: ops }, list(ops)];
      const result = await run("create-alert-recipient", {
        email: " ops@example.com ",
      });
      expect(calls).toEqual([
        'POST /alert-recipients {"email":"ops@example.com"}',
        "GET /alert-recipients",
      ]);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("confirmed");
      expect(result.content[0].text).toContain("r-1");
    });

    it("fails when the read-back does not show it", async () => {
      replies = [{ status: 200, body: ops }, list()];
      const result = await run("create-alert-recipient", { email: ops.email });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not in the recipient list");
    });

    it("surfaces the duplicate refusal", async () => {
      replies = [
        {
          status: 422,
          body: { message: "The email has already been taken." },
        },
      ];
      const result = await run("create-alert-recipient", { email: ops.email });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("already been taken");
    });

    it("refuses a blank email without calling the API", async () => {
      const result = await run("create-alert-recipient", { email: "  " });
      expect(result.isError).toBe(true);
      expect(calls).toEqual([]);
    });
  });

  describe("update-alert-recipient", () => {
    it("patches and confirms the new address", async () => {
      const changed = { id: "r-1", email: "alerts@example.com" };
      replies = [{ status: 200, body: changed }, list(changed)];
      const result = await run("update-alert-recipient", {
        recipient_id: "r-1",
        email: "alerts@example.com",
      });
      expect(calls).toEqual([
        'PATCH /alert-recipients/r-1 {"email":"alerts@example.com"}',
        "GET /alert-recipients",
      ]);
      expect(result.content[0].text).toContain("now alerts@example.com");
    });

    it("fails when the old address reads back", async () => {
      replies = [{ status: 200, body: ops }, list(ops)];
      const result = await run("update-alert-recipient", {
        recipient_id: "r-1",
        email: "alerts@example.com",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("reads back as ops@example.com");
    });

    it("explains an unknown recipient", async () => {
      replies = [{ status: 404, body: { message: "Not Found" } }];
      const result = await run("update-alert-recipient", {
        recipient_id: "nope",
        email: "a@example.com",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("no alert recipient nope");
    });
  });

  describe("delete-alert-recipient", () => {
    it("deletes and confirms it is gone", async () => {
      replies = [{ status: 204 }, list()];
      const result = await run("delete-alert-recipient", {
        recipient_id: "r-1",
      });
      expect(calls).toEqual([
        "DELETE /alert-recipients/r-1",
        "GET /alert-recipients",
      ]);
      expect(result.content[0].text).toContain("confirmed gone");
    });

    it("fails when it is still listed", async () => {
      replies = [{ status: 204 }, list(ops)];
      const result = await run("delete-alert-recipient", {
        recipient_id: "r-1",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("still in the recipient list");
    });
  });

  describe("get-system-check-results", () => {
    it("returns the report", async () => {
      replies = [{ status: 200, body: { schemaVersion: 1, verdict: "good" } }];
      const result = await run("get-system-check-results", {
        support_id: "SC-7K2M-Q9XD",
      });
      expect(calls).toEqual(["GET /system-checks/SC-7K2M-Q9XD"]);
      expect(result.content[0].text).toContain('"verdict": "good"');
    });

    it("tells an unknown ID from a run without results", async () => {
      replies = [
        { status: 404, body: { message: "Not Found", error: "not-found" } },
        {
          status: 404,
          body: {
            message:
              "The results of this system check have not been uploaded yet.",
            type: "no_results",
          },
        },
      ];
      const unknown = await run("get-system-check-results", {
        support_id: "SC-A",
      });
      const pending = await run("get-system-check-results", {
        support_id: "SC-B",
      });
      expect(unknown.isError).toBe(true);
      expect(unknown.content[0].text).toContain("No system check SC-A");
      expect(pending.isError).toBe(true);
      expect(pending.content[0].text).toContain("not uploaded its results yet");
    });

    it("encodes the ID into the path", async () => {
      replies = [{ status: 200, body: {} }];
      await run("get-system-check-results", { support_id: "SC/../x" });
      expect(calls).toEqual(["GET /system-checks/SC%2F..%2Fx"]);
    });
  });
});
