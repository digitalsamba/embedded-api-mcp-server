/**
 * Regression tests for the false-success bugs found on 2026-08-13.
 *
 * `import-polls` and `send-chat-message` both shipped in v1.1.0 reporting
 * "Successfully imported" / "Sent chat message" while the API accepted the
 * request and did nothing. The tools trusted any 2xx. These tests pin the rule
 * that replaced that: a write is only reported as done when something actually
 * substantiates it.
 */
import {
  countOf,
  describeWriteResult,
  extractEvidence,
  verifiedWrite,
} from "../../src/tools/verified-write.js";
import { executePollTool } from "../../src/tools/poll-management/index.js";
import { executeQuizTool } from "../../src/tools/quiz-management/index.js";
import { executeCommunicationTool } from "../../src/tools/communication-management/index.js";
import { executeLiveSessionTool } from "../../src/tools/live-session-controls/index.js";

const textOf = (result: any): string => result.content[0].text;

describe("verifiedWrite", () => {
  it("reports a no-op as an error when the read-back shows nothing changed", async () => {
    const result = await verifiedWrite({
      describe: "polls into room r1",
      verb: "Imported",
      errorLabel: "importing polls",
      // The API's no-op: 200 with an empty body.
      action: async () => ({}),
      verify: async () => ({ landed: false, evidence: "still 0 polls" }),
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("no effect");
    expect(textOf(result)).not.toMatch(/^Imported/);
  });

  it("confirms a write when the read-back proves it landed", async () => {
    const result = await verifiedWrite({
      describe: "polls into room r1",
      verb: "Imported",
      errorLabel: "importing polls",
      action: async () => ({}),
      verify: async () => ({ landed: true, evidence: "3 polls, up from 0" }),
    });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("confirmed by read-back");
    expect(textOf(result)).toContain("3 polls, up from 0");
  });

  it("does not claim success when there is no read-back and no response body", async () => {
    const result = await verifiedWrite({
      describe: "room r1",
      verb: "Connected the phone bridge for",
      errorLabel: "connecting phone",
      action: async () => ({}),
    });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("not verified");
    expect(textOf(result)).not.toContain("Successfully");
  });

  it("reports the response body's evidence when it carries any", async () => {
    const result = await verifiedWrite({
      describe: "a question in room r1",
      verb: "Created",
      errorLabel: "creating question",
      action: async () => ({ id: "q-77" }),
    });

    expect(textOf(result)).toContain("id q-77");
  });

  it("treats a failed read-back as unverified rather than as failure", async () => {
    const result = await verifiedWrite({
      describe: "a chat message to room r1",
      verb: "Sent",
      errorLabel: "sending chat message",
      action: async () => ({}),
      verify: async () => {
        throw new Error("export unavailable");
      },
    });

    // The write may well have landed — only the confirmation failed, so this
    // must not be reported as an error.
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("unverified");
  });

  it("surfaces a rejected write as an error", async () => {
    const result = await verifiedWrite({
      describe: "a question in room r1",
      verb: "Created",
      errorLabel: "creating question",
      action: async () => {
        throw new Error("This room is not active");
      },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("This room is not active");
  });

  it("rejects missing required fields before calling the API", async () => {
    const action = jest.fn();
    const result = await verifiedWrite({
      required: { roomId: "" },
      describe: "a question",
      verb: "Created",
      errorLabel: "creating question",
      action,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("roomId is required.");
    expect(action).not.toHaveBeenCalled();
  });
});

describe("countOf", () => {
  it("counts bare arrays and paginated envelopes alike", () => {
    expect(countOf([1, 2, 3])).toBe(3);
    expect(countOf({ data: [1, 2] })).toBe(2);
    expect(countOf([])).toBe(0);
  });

  it("returns undefined for shapes it cannot count", () => {
    expect(countOf(undefined)).toBeUndefined();
    expect(countOf({ total: 5 })).toBeUndefined();
  });
});

describe("extractEvidence", () => {
  it("finds an id when the body carries one", () => {
    expect(extractEvidence({ id: "abc" })).toBe("id abc");
    expect(extractEvidence({ uuid: 12 })).toBe("id 12");
  });

  it("finds nothing in an empty body", () => {
    expect(extractEvidence({})).toBeUndefined();
    expect(extractEvidence(undefined)).toBeUndefined();
  });
});

describe("describeWriteResult", () => {
  it("never claims success for an empty body", () => {
    const text = describeWriteResult({}, "Connected", "room r1");
    expect(text).toContain("not verified");
    expect(text).not.toContain("Successfully");
  });
});

describe("import-polls", () => {
  const csv = "question,option1\nA,B\n";

  it("reports an error when the API accepts the CSV but creates nothing", async () => {
    // Exactly the reproduced bug: 2xx, empty body, poll count unchanged.
    const apiClient: any = {
      getPolls: jest.fn().mockResolvedValue([]),
      importPolls: jest.fn().mockResolvedValue({}),
    };

    const result = await executePollTool(
      "import-polls",
      { room_id: "r1", csv_content: csv },
      apiClient,
    );

    expect(apiClient.importPolls).toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("no effect");
    expect(textOf(result)).not.toContain("Successfully imported");
  });

  it("confirms the import with the actual count delta", async () => {
    const apiClient: any = {
      getPolls: jest
        .fn()
        .mockResolvedValueOnce([{ id: "p1" }])
        .mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }, { id: "p3" }]),
      importPolls: jest.fn().mockResolvedValue({}),
    };

    const result = await executePollTool(
      "import-polls",
      { room_id: "r1", csv_content: csv },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("3 poll(s), up from 1");
  });

  it("does not claim failure when the polls cannot be listed", async () => {
    const apiClient: any = {
      getPolls: jest.fn().mockRejectedValue(new Error("forbidden")),
      importPolls: jest.fn().mockResolvedValue({}),
    };

    const result = await executePollTool(
      "import-polls",
      { room_id: "r1", csv_content: csv },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("unverified");
  });
});

describe("import-quizzes", () => {
  it("reports an error when the API accepts the CSV but creates nothing", async () => {
    const apiClient: any = {
      listQuizzes: jest.fn().mockResolvedValue({ data: [] }),
      importQuizzes: jest.fn().mockResolvedValue({}),
    };

    const result = await executeQuizTool(
      "import-quizzes",
      { room_id: "r1", csv_content: "a,b\n1,2\n" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("no effect");
  });

  it("confirms the import with the actual count delta", async () => {
    const apiClient: any = {
      listQuizzes: jest
        .fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ id: "q1" }] }),
      importQuizzes: jest.fn().mockResolvedValue({}),
    };

    const result = await executeQuizTool(
      "import-quizzes",
      { room_id: "r1", csv_content: "a,b\n1,2\n" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("1 quiz(zes), up from 0");
  });
});

describe("send-chat-message", () => {
  it("reports an error when the message never reaches a persisted room", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: true }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      exportChatMessages: jest.fn().mockResolvedValue("[]"),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("absent from the room's chat export");
  });

  it("confirms delivery when the message appears in the export", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: true }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      exportChatMessages: jest
        .fn()
        .mockResolvedValue(JSON.stringify([{ message: "hello" }])),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("confirmed by read-back");
  });

  it("reports failure when the room offers no read-back, rather than 'unverified'", async () => {
    // Without persistence there is no export to check. That used to mean the
    // tool said "accepted, effect not verified" — a reassurance that cannot be
    // true, since the platform delivers no chat at all (the signalling server
    // has no chat endpoint; proven live 2026-08-14). Report the known failure.
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      exportChatMessages: jest.fn().mockResolvedValue("[]"),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("NOT delivered");
    expect(apiClient.exportChatMessages).not.toHaveBeenCalled();
  });

  it("still issues the request when it cannot verify", async () => {
    // So the message lands the day the backend fix ships, rather than being
    // dropped by us on the way out.
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
    };

    await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(apiClient.sendChatMessage).toHaveBeenCalledWith("r1", {
      message: "hello",
      participant: undefined,
    });
  });

  it("reports a transport error distinctly from an undeliverable message", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn().mockRejectedValue(new Error("boom")),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("boom");
  });
});

describe("create-question", () => {
  const participant = { name: "Ada", external_id: "ada-1" };

  it("recovers the question id the create endpoint does not return", async () => {
    const apiClient: any = {
      createQuestion: jest.fn().mockResolvedValue({}),
      exportQA: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify([{ id: "q-42", question: "Is this on?" }]),
        ),
    };

    const result = await executeCommunicationTool(
      "create-question",
      { roomId: "r1", question: "Is this on?", participant },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("question id q-42");
  });

  it("reports an error when the question never appears", async () => {
    const apiClient: any = {
      createQuestion: jest.fn().mockResolvedValue({}),
      exportQA: jest.fn().mockResolvedValue("[]"),
    };

    const result = await executeCommunicationTool(
      "create-question",
      { roomId: "r1", question: "Is this on?", participant },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("absent from the room's Q&A export");
  });
});

describe("live session controls", () => {
  it("does not claim a hand was raised when the API confirms nothing", async () => {
    const apiClient: any = {
      raiseParticipantHand: jest.fn().mockResolvedValue({}),
    };

    const result = await executeLiveSessionTool(
      "raise-participant-hand",
      { room_id: "r1", participant_id: "p1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("not verified");
    expect(textOf(result)).not.toContain("Successfully");
  });

  it("still surfaces API errors", async () => {
    const apiClient: any = {
      raiseParticipantHand: jest
        .fn()
        .mockRejectedValue(new Error("participant not found")),
    };

    const result = await executeLiveSessionTool(
      "raise-participant-hand",
      { room_id: "r1", participant_id: "p1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("participant not found");
  });
});
