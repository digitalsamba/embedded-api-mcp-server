/**
 * Tools must not report success for parameters the API silently drops (#38).
 *
 * Each case below used to return 2xx from the API, have no effect, and be
 * reported by the tool as applied. Checked against the API's form requests:
 * Polls/CreateUpdateRequest (no show_results), Quizzes/CreateUpdateRequest
 * (time_limit_seconds only), Teams/UpdateRequest (no max_participants), and
 * RoleService::savePermissions (skips unknown names).
 *
 * @group unit
 */
import { executePollTool } from "../../src/tools/poll-management/index.js";
import { executeQuizTool } from "../../src/tools/quiz-management/index.js";
import { executeRoleTool } from "../../src/tools/role-management/index.js";
import { executeRoomTool } from "../../src/tools/room-management/index.js";
import { executeLiveSessionTool } from "../../src/tools/live-session-controls/index.js";
import { compareApplied } from "../../src/tools/verified-write.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const text = (r: any) => r.content.map((c: any) => c.text).join("\n");

describe("polls: show_results is not an API field", () => {
  it("create-poll does not send it, and says so", async () => {
    const client = {
      createPoll: jest.fn().mockResolvedValue({ id: "p1" }),
    } as any;
    const result = await executePollTool(
      "create-poll",
      {
        room_id: "r1",
        question: "Q?",
        options: [{ text: "a" }, { text: "b" }],
        show_results: false,
      },
      client,
    );
    expect(client.createPoll.mock.calls[0][1]).not.toHaveProperty(
      "show_results",
    );
    expect(text(result)).toMatch(/show_results has no effect/);
  });

  it("update-poll never lists it as updated", async () => {
    const client = { updatePoll: jest.fn().mockResolvedValue({}) } as any;
    const result = await executePollTool(
      "update-poll",
      { room_id: "r1", poll_id: "p1", question: "New?", show_results: true },
      client,
    );
    expect(client.updatePoll.mock.calls[0][2]).toEqual({ question: "New?" });
    expect(text(result)).toMatch(/Updated fields: question\b/);
    expect(text(result)).not.toMatch(/Updated fields:.*show_results/);
  });

  it("update-poll with only show_results is nothing to update", async () => {
    const client = { updatePoll: jest.fn() } as any;
    const result = await executePollTool(
      "update-poll",
      { room_id: "r1", poll_id: "p1", show_results: true },
      client,
    );
    expect(result.isError).toBe(true);
    expect(client.updatePoll).not.toHaveBeenCalled();
  });

  it("accepts a free-text poll without options, and sends none", async () => {
    const client = {
      createPoll: jest.fn().mockResolvedValue({ id: "p2" }),
    } as any;
    const result = await executePollTool(
      "create-poll",
      { room_id: "r1", question: "Thoughts?", type: "free" },
      client,
    );
    expect(result.isError).toBeUndefined();
    expect(client.createPoll.mock.calls[0][1]).toEqual({
      question: "Thoughts?",
      type: "free",
      anonymous: false,
    });
  });
});

describe("quizzes: the API stores time_limit_seconds only", () => {
  const questions = [
    {
      text: "1+1?",
      choices: [
        { text: "2", correct: true },
        { text: "3", correct: false },
      ],
    },
  ];

  it("create-quiz converts minutes to seconds and reports what was stored", async () => {
    const client = {
      createQuiz: jest
        .fn()
        .mockResolvedValue({ id: "q1", time_limit_seconds: 300 }),
    } as any;
    const result = await executeQuizTool(
      "create-quiz",
      { room_id: "r1", title: "T", questions, time_limit_minutes: 5 },
      client,
    );
    const sent = client.createQuiz.mock.calls[0][1];
    expect(sent.time_limit_seconds).toBe(300);
    expect(sent).not.toHaveProperty("time_limit_minutes");
    expect(text(result)).toMatch(/Time limit \(as stored\): 5 min \(300 s\)/);
  });

  it("refuses minutes and seconds that disagree", async () => {
    const client = { createQuiz: jest.fn() } as any;
    const result = await executeQuizTool(
      "create-quiz",
      {
        room_id: "r1",
        title: "T",
        questions,
        time_limit_minutes: 5,
        time_limit_seconds: 60,
      },
      client,
    );
    expect(result.isError).toBe(true);
    expect(client.createQuiz).not.toHaveBeenCalled();
  });

  it("refuses a limit outside the API's 1 s to 86399 s range", async () => {
    const client = { createQuiz: jest.fn() } as any;
    const result = await executeQuizTool(
      "create-quiz",
      { room_id: "r1", title: "T", questions, time_limit_minutes: 24 * 60 },
      client,
    );
    expect(result.isError).toBe(true);
    expect(client.createQuiz).not.toHaveBeenCalled();
  });

  it("update-quiz sends seconds and lists time_limit_seconds, not minutes", async () => {
    const client = {
      updateQuiz: jest.fn().mockResolvedValue({ time_limit_seconds: 120 }),
    } as any;
    const result = await executeQuizTool(
      "update-quiz",
      { room_id: "r1", quiz_id: "q1", time_limit_minutes: 2 },
      client,
    );
    expect(client.updateQuiz.mock.calls[0][2]).toEqual({
      time_limit_seconds: 120,
    });
    expect(text(result)).toMatch(/Updated fields: time_limit_seconds/);
    expect(text(result)).toMatch(/2 min \(120 s\)/);
  });
});

describe("update-default-room-settings reports keys the API dropped", () => {
  const realFetch = global.fetch;
  const realKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;

  beforeEach(() => {
    process.env.DIGITAL_SAMBA_DEVELOPER_KEY = "test-key";
    // The PATCH response is the full team settings object; it has no
    // max_participants because that is not a team default setting.
    const settings = {
      chat_enabled: false,
      primary_color: "#E343FD",
      languages: ["en", "de-DE"],
    };
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(settings),
      json: async () => settings,
    })) as any;
  });

  afterEach(() => {
    global.fetch = realFetch;
    if (realKey === undefined) delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
    else process.env.DIGITAL_SAMBA_DEVELOPER_KEY = realKey;
  });

  it("lists a dropped key as not applied, and is an error", async () => {
    const result = await executeRoomTool(
      "update-default-room-settings",
      { settings: { chat_enabled: false, max_participants: 50 } },
      {},
      { apiUrl: "https://api.test.invalid/api/v1" },
    );
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/Applied: chat_enabled/);
    expect(text(result)).toMatch(
      /NOT applied, not a team default setting: max_participants/,
    );
  });

  it("a normalised echo (case, array order) is not reported as a difference", async () => {
    const result = await executeRoomTool(
      "update-default-room-settings",
      { settings: { primary_color: "#e343fd", languages: ["de-DE", "en"] } },
      {},
      { apiUrl: "https://api.test.invalid/api/v1" },
    );
    expect(result.isError).toBeUndefined();
    expect(text(result)).toMatch(/Applied: primary_color, languages/);
    expect(text(result)).not.toMatch(/differs/);
  });
});

describe("roles report unknown permission names", () => {
  const role = {
    id: "role-1",
    display_name: "Helper",
    permissions: { manage_polls: true, start_recording: false },
  };

  it("create-role names the unknown permission and is an error", async () => {
    const client = { createRole: jest.fn().mockResolvedValue(role) } as any;
    const result = await executeRoleTool(
      "create-role",
      {
        name: "helper",
        displayName: "Helper",
        permissions: { manage_polls: true, make_coffee: true },
      },
      client,
    );
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/unknown permission name\(s\): make_coffee/);
  });

  it("update-role with only known names is not an error", async () => {
    const client = { updateRole: jest.fn().mockResolvedValue(role) } as any;
    const result = await executeRoleTool(
      "update-role",
      { roleId: "role-1", permissions: { manage_polls: true } },
      client,
    );
    expect(result.isError).toBeUndefined();
    expect(text(result)).not.toMatch(/NOT applied/);
  });
});

describe("phone-participants-joined / -left do not claim success", () => {
  it.each([
    [
      "phone-participants-joined",
      { roomId: "r1", participants: [{ callId: "c1", name: "Ann" }] },
    ],
    ["phone-participants-left", { roomId: "r1", callIds: ["c1"] }],
  ])(
    "%s says the request was accepted, not that it worked",
    async (tool, args) => {
      const client = {
        phoneParticipantsJoined: jest.fn().mockResolvedValue(undefined),
        phoneParticipantsLeft: jest.fn().mockResolvedValue(undefined),
      } as any;
      const result = await executeLiveSessionTool(tool, args, client);
      expect(text(result)).not.toMatch(/^Successfully/);
      expect(text(result)).toMatch(/accepted the request/);
    },
  );
});

describe("compareApplied", () => {
  it("separates applied, dropped and changed keys", () => {
    expect(
      compareApplied({ a: 1, b: "x", c: true }, { a: "1", c: false }),
    ).toEqual({
      applied: ["a"],
      ignored: ["b"],
      differs: [{ key: "c", requested: true, stored: false }],
    });
  });
});
