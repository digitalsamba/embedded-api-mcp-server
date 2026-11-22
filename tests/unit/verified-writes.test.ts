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
import {
  executeCommunicationTool,
  registerCommunicationTools,
} from "../../src/tools/communication-management/index.js";
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
  // Required since the API's September 2026 re-release of chat (#36).
  const participant = { name: "Ada", external_id: "ada-1" };

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports an error when the message never reaches a persisted room", async () => {
    jest.useFakeTimers();
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: true }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      listChatMessages: jest.fn().mockResolvedValue({ data: [] }),
    };

    const pending = executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant },
      apiClient,
    );
    await jest.runAllTimersAsync();
    const result = await pending;

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("absent from the room's chat messages");
    // Polled a few times before calling it missing.
    expect(apiClient.listChatMessages.mock.calls.length).toBeGreaterThan(1);
  });

  it("confirms delivery, with the id, when the message is in the room's chat", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: true }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      listChatMessages: jest.fn().mockResolvedValue({
        data: [
          { id: "m-2", message: "hello there" },
          { id: "m-1", message: "hello" },
        ],
      }),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("confirmed by read-back");
    // Exact match, not substring: "hello there" is not the message sent.
    expect(textOf(result)).toContain("chat message id m-1");
    expect(apiClient.listChatMessages).toHaveBeenCalledWith("r1", {
      limit: 100,
      order: "desc",
    });
  });

  it("confirms a message that reaches the chat list on a later attempt", async () => {
    jest.useFakeTimers();
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: true }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      listChatMessages: jest
        .fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValue({ data: [{ id: "m-1", message: "hello" }] }),
    };

    const pending = executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant },
      apiClient,
    );
    await jest.runAllTimersAsync();
    const result = await pending;

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("confirmed by read-back");
  });

  it("says 'accepted, not verified' when the room offers no read-back", async () => {
    // Chat was undeliverable until the API's September 2026 fix, and this
    // tool used to report every such send as failed. The API now returns an
    // error when the signalling server refuses the message, so success here
    // is a real hand-over, just not one this server can confirm.
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
      listChatMessages: jest.fn().mockResolvedValue({ data: [] }),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("not verified");
    expect(textOf(result)).not.toContain("NOT delivered");
    expect(apiClient.listChatMessages).not.toHaveBeenCalled();
  });

  it("sends the participant and maps breakoutId to breakout_id", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn().mockResolvedValue({}),
    };

    await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant, breakoutId: "b1" },
      apiClient,
    );

    expect(apiClient.sendChatMessage).toHaveBeenCalledWith("r1", {
      message: "hello",
      participant,
      breakout_id: "b1",
    });
  });

  it("refuses to send without a participant", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest.fn(),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("participant is required");
    expect(apiClient.sendChatMessage).not.toHaveBeenCalled();
  });

  it("passes an API refusal through as an error", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ chat_persistence_enabled: false }),
      sendChatMessage: jest
        .fn()
        .mockRejectedValue(new Error("This room is not active")),
    };

    const result = await executeCommunicationTool(
      "send-chat-message",
      { roomId: "r1", message: "hello", participant },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("This room is not active");
  });

  it("requires participant in the schema", () => {
    const tool = registerCommunicationTools().find(
      (t) => t.name === "send-chat-message",
    )!;
    expect(tool.inputSchema.required).toEqual(
      expect.arrayContaining(["roomId", "message", "participant"]),
    );
    expect(tool.inputSchema.properties).toHaveProperty("breakoutId");
    expect(tool.description).not.toMatch(/KNOWN BROKEN/);
  });
});

describe("create-question", () => {
  const participant = { name: "Ada", external_id: "ada-1" };

  it("recovers the question id the create endpoint does not return", async () => {
    const apiClient: any = {
      createQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest.fn().mockResolvedValue({
        data: [{ id: "q-42", question: "Is this on?" }],
      }),
    };

    const result = await executeCommunicationTool(
      "create-question",
      { roomId: "r1", question: "Is this on?", participant },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("question id q-42");
  });

  it("pages past the first 100 questions", async () => {
    const filler = Array.from({ length: 100 }, (_, i) => ({
      id: `q-${i}`,
      question: `other ${i}`,
    }));
    const apiClient: any = {
      createQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest
        .fn()
        .mockResolvedValueOnce({ data: filler })
        .mockResolvedValue({
          data: [{ id: "q-old", question: "Is this on?" }],
        }),
    };

    const result = await executeCommunicationTool(
      "create-question",
      { roomId: "r1", question: "Is this on?", participant },
      apiClient,
    );

    expect(textOf(result)).toContain("question id q-old");
    expect(apiClient.listQuestions).toHaveBeenLastCalledWith("r1", {
      limit: 100,
      offset: 100,
      order: "desc",
    });
  });

  it("reports an error when the question never appears", async () => {
    const apiClient: any = {
      createQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest.fn().mockResolvedValue({ data: [] }),
    };

    const result = await executeCommunicationTool(
      "create-question",
      { roomId: "r1", question: "Is this on?", participant },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("absent from the room's questions");
    // A short page means the list is exhausted: no further calls.
    expect(apiClient.listQuestions).toHaveBeenCalledTimes(1);
  });
});

describe("answer-question", () => {
  const participant = { name: "Ada", external_id: "ada-1" };
  const args = { roomId: "r1", questionId: "q-1", answer: "Yes", participant };

  it("confirms the answer, with its id, under the question", async () => {
    const apiClient: any = {
      answerQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest.fn().mockResolvedValue({
        data: [
          { id: "q-2", question: "x", answers: [{ id: "a-9", answer: "Yes" }] },
          { id: "q-1", question: "y", answers: [{ id: "a-1", answer: "Yes" }] },
        ],
      }),
    };

    const result = await executeCommunicationTool(
      "answer-question",
      args,
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("answer id a-1");
  });

  it("reports an error when the answer is missing from the question", async () => {
    const apiClient: any = {
      answerQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest.fn().mockResolvedValue({
        data: [{ id: "q-1", question: "y", answers: [] }],
      }),
    };

    const result = await executeCommunicationTool(
      "answer-question",
      args,
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("absent from the question's answers");
  });

  it("reports an error when the question itself is not found", async () => {
    const apiClient: any = {
      answerQuestion: jest.fn().mockResolvedValue({}),
      listQuestions: jest.fn().mockResolvedValue({ data: [] }),
    };

    const result = await executeCommunicationTool(
      "answer-question",
      args,
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("q-1 is not among the room's questions");
  });
});

describe("list-chat-messages / list-questions", () => {
  it.each([
    ["list-chat-messages", "listChatMessages"],
    ["list-questions", "listQuestions"],
  ])("%s passes filters through and returns the page", async (tool, method) => {
    const page = { total_count: 1, data: [{ id: "x1" }] };
    const apiClient: any = { [method]: jest.fn().mockResolvedValue(page) };

    const result = await executeCommunicationTool(
      tool,
      { room_id: "r1", session_id: "s1", limit: 10, offset: 20, order: "asc" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(textOf(result))).toEqual(page);
    expect(apiClient[method]).toHaveBeenCalledWith("r1", {
      session_id: "s1",
      limit: 10,
      offset: 20,
      order: "asc",
    });
  });

  it.each(["list-chat-messages", "list-questions"])(
    "%s requires room_id",
    async (tool) => {
      const result = await executeCommunicationTool(tool, {}, {} as any);
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Room ID is required");
    },
  );

  it("surfaces API errors", async () => {
    const apiClient: any = {
      listQuestions: jest.fn().mockRejectedValue(new Error("Room not found")),
    };
    const result = await executeCommunicationTool(
      "list-questions",
      { room_id: "nope" },
      apiClient,
    );
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Error listing questions: Room not found");
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
