/**
 * delete-room-polls and delete-room-summaries must use the room-level
 * endpoints.
 *
 * Both used to list the room's sessions and delete per session. For polls
 * that deleted nothing created through the API or dashboard (the session
 * endpoint only removes polls created by that session's participants) and
 * answered a non-error "No sessions found" for a room that had polls; both
 * stopped at the API's 100-session page. Found by read-back on dev: create
 * room, create poll, delete-room-polls -> "No sessions found", poll still
 * listed.
 */
import { executePollTool } from "../../src/tools/poll-management/index.js";
import { executeCommunicationTool } from "../../src/tools/communication-management/index.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe("delete-room-polls", () => {
  const makeClient = (afterDelete: unknown) =>
    ({
      deleteRoomPolls: jest.fn().mockResolvedValue(undefined),
      getPolls: jest.fn().mockResolvedValue(afterDelete),
      listSessions: jest.fn(),
      deleteSessionPolls: jest.fn(),
    }) as any;

  it("calls the room-level delete once and never walks sessions", async () => {
    const client = makeClient({ total_count: 0, data: [] });
    const result = await executePollTool("delete-room-polls", { room_id: "room-1" }, client);

    expect(client.deleteRoomPolls).toHaveBeenCalledWith("room-1");
    expect(client.listSessions).not.toHaveBeenCalled();
    expect(client.deleteSessionPolls).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("verified");
  });

  it("is an error when polls are still listed after the delete", async () => {
    const client = makeClient({ total_count: 2, data: [{ id: "p1" }] });
    const result = await executePollTool("delete-room-polls", { room_id: "room-1" }, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("2 poll(s) are still listed");
  });

  it("accepts a bare array from the list endpoint", async () => {
    const client = makeClient([]);
    const result = await executePollTool("delete-room-polls", { room_id: "room-1" }, client);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("verified");
  });

  it("does not claim verification when the read-back fails", async () => {
    const client = makeClient(undefined);
    client.getPolls.mockRejectedValue(new Error("Too Many Attempts."));
    const result = await executePollTool("delete-room-polls", { room_id: "room-1" }, client);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("could not be verified");
    expect(result.content[0].text).not.toContain("(verified");
  });

  it("surfaces an API failure", async () => {
    const client = makeClient([]);
    client.deleteRoomPolls.mockRejectedValue(new Error("Room not found"));
    const result = await executePollTool("delete-room-polls", { room_id: "room-1" }, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Room not found");
    expect(client.getPolls).not.toHaveBeenCalled();
  });
});

describe("delete-room-summaries", () => {
  it("calls the room-level delete once and never walks sessions", async () => {
    const client = {
      deleteRoomSummaries: jest.fn().mockResolvedValue(undefined),
      listSessions: jest.fn(),
      deleteSessionSummaries: jest.fn(),
    } as any;
    const result = await executeCommunicationTool(
      "delete-room-summaries",
      { roomId: "room-1" },
      client,
    );

    expect(client.deleteRoomSummaries).toHaveBeenCalledWith("room-1");
    expect(client.listSessions).not.toHaveBeenCalled();
    expect(client.deleteSessionSummaries).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });

  it("surfaces an API failure", async () => {
    const client = {
      deleteRoomSummaries: jest.fn().mockRejectedValue(new Error("Room not found")),
    } as any;
    const result = await executeCommunicationTool(
      "delete-room-summaries",
      { roomId: "room-1" },
      client,
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Room not found");
  });
});

describe("client room-level deletes", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it.each([
    ["deleteRoomPolls", "/rooms/room-1/polls"],
    ["deleteRoomSummaries", "/rooms/room-1/summaries"],
  ] as const)("%s sends DELETE %s", async (method, path) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => "",
    }) as any;
    const client = new DigitalSambaApiClient("key", "https://api.test.invalid/api/v1");
    await client[method]("room-1");

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.test.invalid/api/v1${path}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
