/**
 * delete-session-resources calls DELETE /sessions/{id}/resources, which wipes
 * every stored artefact of the session (RoomResourcesService::removeBySession
 * in the API). It was described as removing "shared files/content", so a
 * request to clear a session's shared files destroyed its recordings and
 * transcripts as well. The description is what the model chooses by.
 */
import {
  registerCommunicationTools,
  executeCommunicationTool,
} from "../../src/tools/communication-management/index.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const WIPED = ["recordings", "transcripts", "summaries", "chat", "Q&A", "polls", "quizzes"];

describe("delete-session-resources", () => {
  const tool = registerCommunicationTools().find(
    (t) => t.name === "delete-session-resources",
  )!;

  it("says it deletes all session data, not only shared files", () => {
    for (const kind of WIPED) {
      expect(tool.description).toContain(kind);
    }
    expect(tool.description).toMatch(/no undo|cannot be undone/i);
  });

  it("does not advertise itself as a shared-files cleanup", () => {
    expect(tool.description).not.toMatch(/remove session files/i);
    expect(tool.description).not.toMatch(/clear session shared content/i);
    expect(tool.description).not.toMatch(/Permanently removes all shared files/i);
  });

  it("is annotated destructive", () => {
    expect(tool.annotations?.destructiveHint).toBe(true);
  });

  it("reports what was removed", async () => {
    const apiClient = { deleteSessionResources: jest.fn().mockResolvedValue(undefined) } as any;
    const result = await executeCommunicationTool(
      "delete-session-resources",
      { session_id: "s-1" },
      apiClient,
    );
    expect(apiClient.deleteSessionResources).toHaveBeenCalledWith("s-1");
    for (const kind of WIPED) {
      expect(result.content[0].text).toContain(kind);
    }
  });
});
