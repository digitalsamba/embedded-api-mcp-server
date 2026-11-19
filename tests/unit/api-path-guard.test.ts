/**
 * IDs are interpolated into API paths, and fetch() resolves dot segments
 * before sending. On the dev API, delete-poll with poll_id "." deleted every
 * poll in the room and poll_id ".." deleted the room itself. The client must
 * refuse such paths before any request is made.
 */
import { DigitalSambaApiClient, assertSafeApiPath } from "../../src/digital-samba-api.js";
import { ValidationError } from "../../src/errors.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe("assertSafeApiPath", () => {
  it.each([
    "/",
    "/rooms",
    "/rooms/a853d608-e6cf-48eb-a3c9-7d089bbc09b0",
    "/rooms/my-friendly-url/polls/123",
    "/rooms?limit=10&order=desc",
    "/rooms/r1/polls/export?format=csv&x=../y",
    "/libraries/lib.v2/files/report.final.pdf",
    "/rooms/r1/polls/...",
  ])("accepts %s", (path) => {
    expect(() => assertSafeApiPath(path)).not.toThrow();
  });

  it.each([
    ["/rooms/r1/polls/.", "collapses to the collection: DELETE would remove every poll"],
    ["/rooms/r1/polls/..", "collapses to the room: DELETE would remove the room"],
    ["/rooms/r1/polls/%2e%2e", "percent-encoded dot segments are resolved too"],
    ["/rooms/r1/polls/%2E", "case-insensitive encoding"],
    ["/rooms/../roles/x", "dot segment mid-path"],
    ["/rooms/r1/polls/", "empty ID leaves a trailing slash, which the API ignores"],
    ["/rooms//polls/p1", "empty ID mid-path"],
    ["/rooms/r1/polls/?x=1", "an ID starting with ? truncates the path"],
    ["/rooms/r1/polls/#frag", "an ID starting with # truncates the path"],
    ["rooms/r1", "not absolute"],
  ])("rejects %s (%s)", (path) => {
    expect(() => assertSafeApiPath(path)).toThrow(ValidationError);
  });
});

describe("DigitalSambaApiClient refuses unsafe paths before calling the API", () => {
  const realFetch = global.fetch;
  let client: DigitalSambaApiClient;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => "",
    }) as any;
    client = new DigitalSambaApiClient("key", "https://api.test.invalid/api/v1");
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it.each([".", "..", "", "%2e%2e", "?"])(
    "deletePoll with poll id %p sends nothing",
    async (pollId) => {
      await expect(client.deletePoll("room-1", pollId)).rejects.toThrow(ValidationError);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("deleteRoom with room id '..' sends nothing", async () => {
    await expect(client.deleteRoom("..")).rejects.toThrow(ValidationError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("the raw-fetch export helpers are guarded as well", async () => {
    await expect(client.exportPolls("..")).rejects.toThrow(ValidationError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("an ordinary delete still goes through", async () => {
    await client.deletePoll("room-1", "poll-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.invalid/api/v1/rooms/room-1/polls/poll-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("team settings at the API root still work", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => "{}",
    });
    await client.getDefaultRoomSettings();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.invalid/api/v1/",
      expect.anything(),
    );
  });
});
