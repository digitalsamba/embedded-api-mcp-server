/**
 * Tests for the fixes made after the 2026-08-13 smoke sweep, before tagging.
 *
 * Each of these was a tool telling the caller something that was not true:
 * a bulk delete reporting confirmed deletion of an asynchronous, uncounted
 * operation; a phone bridge reporting a connection the account cannot make.
 */
import { executePollTool } from "../../src/tools/poll-management/index.js";
import { executeRoomTool } from "../../src/tools/room-management/index.js";
import { executeLiveSessionTool } from "../../src/tools/live-session-controls/index.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";
import { getApiKeyFromRequest } from "../../src/auth.js";

// executeRoomTool builds its own client from the request, so the class has to
// be mocked rather than injected.
jest.mock("../../src/digital-samba-api");
jest.mock("../../src/auth");

const textOf = (result: any): string => result.content[0].text;

const roomToolCtx = {
  request: { sessionId: "test-session" },
  options: { apiUrl: "https://api.example.test/api/v1" },
};

describe("list-polls", () => {
  it("lists a room's polls", async () => {
    const apiClient: any = {
      getPolls: jest.fn().mockResolvedValue([{ id: "p1", question: "Q?" }]),
    };

    const result = await executePollTool(
      "list-polls",
      { room_id: "r1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("p1");
    expect(textOf(result)).toContain("1 poll(s)");
  });

  it("handles the paginated envelope as well as a bare array", async () => {
    const apiClient: any = {
      getPolls: jest.fn().mockResolvedValue({ data: [{ id: "p1" }] }),
    };

    const result = await executePollTool(
      "list-polls",
      { room_id: "r1" },
      apiClient,
    );

    expect(textOf(result)).toContain("p1");
  });

  it("says so when there are none", async () => {
    const apiClient: any = { getPolls: jest.fn().mockResolvedValue([]) };

    const result = await executePollTool(
      "list-polls",
      { room_id: "r1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("No polls found");
  });
});

describe("delete-rooms-by-tag", () => {
  let mockApiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = { deleteRoomsByTag: jest.fn().mockResolvedValue({}) };
    (
      DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>
    ).mockImplementation(() => mockApiClient);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue("test-api-key");
  });

  it("does not claim rooms were deleted", async () => {
    // The endpoint answers 202 with an empty body: asynchronous, no count, and
    // an unmatched tag looks identical to a matched one.
    const result = await executeRoomTool(
      "delete-rooms-by-tag",
      { tags: ["obsolete"] },
      roomToolCtx.request,
      roomToolCtx.options,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("accepted");
    expect(textOf(result)).toContain("does not confirm");
    expect(textOf(result)).not.toMatch(/Successfully deleted/i);
  });

  it("still requires at least one tag", async () => {
    const result = await executeRoomTool(
      "delete-rooms-by-tag",
      { tags: [] },
      roomToolCtx.request,
      roomToolCtx.options,
    );

    expect(result.isError).toBe(true);
    expect(mockApiClient.deleteRoomsByTag).not.toHaveBeenCalled();
  });

  it("exposes tags on create-room, the only way to set them", async () => {
    const { registerRoomTools } = await import(
      "../../src/tools/room-management/index.js"
    );
    const createRoom = registerRoomTools().find(
      (t) => t.name === "create-room",
    );
    expect(createRoom?.inputSchema.properties).toHaveProperty("tags");
  });
});

describe("connect-phone", () => {
  it("refuses when the room has no telephony, instead of the API's false success", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ telephony_enabled: false }),
      connectPhone: jest.fn().mockResolvedValue({}),
    };

    const result = await executeLiveSessionTool(
      "connect-phone",
      { room_id: "r1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Telephony is not enabled");
    // The point of the guard: don't make a call the API will wrongly bless.
    expect(apiClient.connectPhone).not.toHaveBeenCalled();
  });

  it("proceeds when telephony is enabled", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockResolvedValue({ telephony_enabled: true }),
      connectPhone: jest.fn().mockResolvedValue({}),
    };

    const result = await executeLiveSessionTool(
      "connect-phone",
      { room_id: "r1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(apiClient.connectPhone).toHaveBeenCalledWith("r1");
  });

  it("proceeds when the room cannot be read, rather than blocking on the check", async () => {
    const apiClient: any = {
      getRoom: jest.fn().mockRejectedValue(new Error("forbidden")),
      connectPhone: jest.fn().mockResolvedValue({}),
    };

    const result = await executeLiveSessionTool(
      "connect-phone",
      { room_id: "r1" },
      apiClient,
    );

    expect(apiClient.connectPhone).toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });
});
