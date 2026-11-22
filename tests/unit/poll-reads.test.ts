/**
 * get-poll and get-poll-results (#26 group 2).
 */
import { executePollTool } from "../../src/tools/poll-management/index";
import { ApiResponseError } from "../../src/errors";

jest.mock("../../src/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const textOf = (result: any) => result.content[0].text as string;
const notFound = () =>
  new ApiResponseError("Digital Samba API error (404): Not found", {
    statusCode: 404,
    apiErrorMessage: "Not found",
  });

describe("get-poll", () => {
  it("returns the poll with its options", async () => {
    const poll = {
      id: "p1",
      question: "Lunch?",
      type: "single",
      options: [{ id: "o1", text: "Yes", correct: false }],
    };
    const apiClient: any = { getPoll: jest.fn().mockResolvedValue(poll) };

    const result = await executePollTool(
      "get-poll",
      { room_id: "r1", poll_id: "p1" },
      apiClient,
    );

    expect(apiClient.getPoll).toHaveBeenCalledWith("r1", "p1");
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(textOf(result))).toEqual(poll);
  });

  it("reports a 404 as not found", async () => {
    const apiClient: any = { getPoll: jest.fn().mockRejectedValue(notFound()) };

    const result = await executePollTool(
      "get-poll",
      { room_id: "r1", poll_id: "gone" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("Poll gone not found in room r1.");
  });

  it("does not call another failure a missing poll", async () => {
    const apiClient: any = {
      getPoll: jest
        .fn()
        .mockRejectedValue(new Error("Digital Samba API error (429): slow down")),
    };

    const result = await executePollTool(
      "get-poll",
      { room_id: "r1", poll_id: "p1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("429");
    expect(textOf(result)).not.toMatch(/not found/i);
  });

  it("requires poll_id", async () => {
    const apiClient: any = { getPoll: jest.fn() };

    const result = await executePollTool(
      "get-poll",
      { room_id: "r1", poll_id: " " },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(apiClient.getPoll).not.toHaveBeenCalled();
  });
});

describe("get-poll-results", () => {
  const run = {
    id: "ps1",
    session_id: "s1",
    question: "Lunch?",
    status: "ended",
    started: "2026-11-22T10:00:00Z",
    ended: "2026-11-22T10:01:00Z",
    votes: 2,
    options: [
      { id: "o1", text: "Yes", correct: false, voted: 2, voters: [] },
    ],
  };

  it("returns each ended run and forwards session_id", async () => {
    const apiClient: any = { getPollResults: jest.fn().mockResolvedValue([run]) };

    const result = await executePollTool(
      "get-poll-results",
      { room_id: "r1", poll_id: "p1", session_id: "s1" },
      apiClient,
    );

    expect(apiClient.getPollResults).toHaveBeenCalledWith("r1", "p1", "s1");
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("results from 1 run(s)");
    expect(textOf(result)).toContain('"voted": 2');
  });

  it("omits an empty session_id", async () => {
    const apiClient: any = { getPollResults: jest.fn().mockResolvedValue([run]) };

    await executePollTool(
      "get-poll-results",
      { room_id: "r1", poll_id: "p1", session_id: "" },
      apiClient,
    );

    expect(apiClient.getPollResults).toHaveBeenCalledWith("r1", "p1", undefined);
  });

  it("explains why a poll has no results", async () => {
    const apiClient: any = { getPollResults: jest.fn().mockResolvedValue([]) };

    const result = await executePollTool(
      "get-poll-results",
      { room_id: "r1", poll_id: "p1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("Poll p1 has no results");
    expect(textOf(result)).toContain("run and ended");
  });

  it("reports a 404 as not found", async () => {
    const apiClient: any = {
      getPollResults: jest.fn().mockRejectedValue(notFound()),
    };

    const result = await executePollTool(
      "get-poll-results",
      { room_id: "r1", poll_id: "gone" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("Poll gone not found in room r1.");
  });
});
