/**
 * #26 group 4: list-room-participants, delete-room-resources,
 * delete-room-recordings, add-recording-bookmark, update-participant.
 */
import { executeRoomTool } from "../../src/tools/room-management/index.js";
import { executeRecordingTool } from "../../src/tools/recording-tools-adapter.js";
import {
  executeLiveSessionTool,
  ROLE_READBACK,
} from "../../src/tools/live-session-controls/index.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";
import { getApiKeyFromRequest } from "../../src/auth.js";

// executeRoomTool builds its own client, so the class is mocked.
jest.mock("../../src/digital-samba-api");
jest.mock("../../src/auth");
jest.mock("../../src/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const textOf = (result: any): string => result.content[0].text;
const ctx = {
  request: { sessionId: "s" },
  options: { apiUrl: "https://api.example.test/api/v1" },
};
const noRecordings = { data: [], total_count: 0 };

describe("room tools", () => {
  let client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    client = {
      listRoomParticipants: jest.fn(),
      deleteRoomResources: jest.fn().mockResolvedValue(undefined),
      getRoomResources: jest.fn(),
      listRecordings: jest.fn().mockResolvedValue(noRecordings),
      deleteRoom: jest.fn().mockResolvedValue({}),
    };
    (
      DigitalSambaApiClient as jest.MockedClass<typeof DigitalSambaApiClient>
    ).mockImplementation(() => client);
    (getApiKeyFromRequest as jest.Mock).mockReturnValue("key");
  });

  describe("list-room-participants", () => {
    it("forwards filters and normalises live", async () => {
      client.listRoomParticipants.mockResolvedValue({
        data: [{ id: "p1", name: "Ann", role: "moderator", live: true }],
        total_count: 3,
      });

      const result = await executeRoomTool(
        "list-room-participants",
        { room_id: "r1", live: "true", session_id: "s1", limit: 1, order: "asc" },
        ctx.request,
        ctx.options,
      );

      expect(client.listRoomParticipants).toHaveBeenCalledWith("r1", {
        session_id: "s1",
        live: true,
        limit: 1,
        order: "asc",
      });
      expect(textOf(result)).toContain("Showing 1 of 3 participant(s)");
      expect(textOf(result)).toContain('"name": "Ann"');
    });

    it("says when there are none", async () => {
      client.listRoomParticipants.mockResolvedValue({ data: [], total_count: 0 });

      const result = await executeRoomTool(
        "list-room-participants",
        { room_id: "r1" },
        ctx.request,
        ctx.options,
      );

      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("No participants found in room r1");
    });

    it("reports an API failure as an error", async () => {
      client.listRoomParticipants.mockRejectedValue(new Error("boom"));

      const result = await executeRoomTool(
        "list-room-participants",
        { room_id: "r1" },
        ctx.request,
        ctx.options,
      );

      expect(result.isError).toBe(true);
    });
  });

  describe("delete-room flags", () => {
    // The API tests these with PHP truthiness, where "false" is true, so a
    // string must never reach it.
    it('converts "false" strings to booleans', async () => {
      await executeRoomTool(
        "delete-room",
        { room_id: "r1", delete_resources: "false", delete_history: "0", delete_library: "true" },
        ctx.request,
        ctx.options,
      );

      expect(client.deleteRoom).toHaveBeenCalledWith("r1", {
        delete_resources: false,
        delete_history: false,
        delete_library: true,
      });
    });
  });

  describe("delete-room-resources", () => {
    const empty = {
      has_transcripts: false,
      has_chat_messages: false,
      has_qa: false,
      has_polls: false,
      has_quizzes: false,
      has_shared_notes: false,
    };

    it("sends the flags and confirms by read-back", async () => {
      client.getRoomResources.mockResolvedValue(empty);

      const result = await executeRoomTool(
        "delete-room-resources",
        { room_id: "r1", delete_history: "true", delete_library: false },
        ctx.request,
        ctx.options,
      );

      expect(client.deleteRoomResources).toHaveBeenCalledWith("r1", {
        delete_history: true,
        delete_library: false,
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("confirmed by read-back");
    });

    it("sends no body without flags", async () => {
      client.getRoomResources.mockResolvedValue(empty);

      await executeRoomTool(
        "delete-room-resources",
        { room_id: "r1" },
        ctx.request,
        ctx.options,
      );

      expect(client.deleteRoomResources).toHaveBeenCalledWith("r1", undefined);
    });

    it("fails when content or recordings remain", async () => {
      client.getRoomResources.mockResolvedValue({
        ...empty,
        has_chat_messages: true,
      });
      client.listRecordings.mockResolvedValue({ data: [{}], total_count: 2 });

      const result = await executeRoomTool(
        "delete-room-resources",
        { room_id: "r1" },
        ctx.request,
        ctx.options,
      );

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("chat_messages");
      expect(textOf(result)).toContain("2 recording(s)");
    });

    it("passes the live-session refusal through without reading back", async () => {
      client.deleteRoomResources.mockRejectedValue(
        new Error(
          "Validation error: Cannot delete resources from a room that has an active session.",
        ),
      );

      const result = await executeRoomTool(
        "delete-room-resources",
        { room_id: "r1" },
        ctx.request,
        ctx.options,
      );

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("active session");
      expect(client.getRoomResources).not.toHaveBeenCalled();
    });
  });
});

describe("recording tools", () => {
  describe("delete-room-recordings", () => {
    it("confirms when the room lists no recordings", async () => {
      const client: any = {
        deleteRoomRecordings: jest.fn().mockResolvedValue(undefined),
        listRecordings: jest.fn().mockResolvedValue(noRecordings),
      };

      const result = await executeRecordingTool(
        "delete-room-recordings",
        { room_id: "r1" },
        client,
      );

      expect(client.deleteRoomRecordings).toHaveBeenCalledWith("r1");
      expect(client.listRecordings).toHaveBeenCalledWith({
        room_id: "r1",
        limit: 1,
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("the room now lists no recordings");
    });

    it("fails when recordings remain", async () => {
      const client: any = {
        deleteRoomRecordings: jest.fn().mockResolvedValue(undefined),
        listRecordings: jest
          .fn()
          .mockResolvedValue({ data: [{ id: "x" }], total_count: 4 }),
      };

      const result = await executeRecordingTool(
        "delete-room-recordings",
        { room_id: "r1" },
        client,
      );

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("still lists 4 recording(s)");
    });
  });

  describe("add-recording-bookmark", () => {
    const bookmark = {
      id: "b1",
      bookmark: "Intro",
      time: 10,
      session_id: "s1",
      participant_id: "p1",
      created_at: "2026-11-22T10:00:00Z",
    };

    it("sends a participant id and confirms by read-back", async () => {
      const client: any = {
        createRecordingBookmark: jest.fn().mockResolvedValue(bookmark),
        getRecordingBookmarks: jest.fn().mockResolvedValue([bookmark]),
      };

      const result = await executeRecordingTool(
        "add-recording-bookmark",
        { recording_id: "rec1", bookmark: "Intro", time: "10", participant_id: "p1" },
        client,
      );

      expect(client.createRecordingBookmark).toHaveBeenCalledWith("rec1", {
        participant: { id: "p1" },
        bookmark: "Intro",
        time: 10,
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain('bookmark b1 "Intro" at 10s');
    });

    it("sends name and external id instead", async () => {
      const client: any = {
        createRecordingBookmark: jest.fn().mockResolvedValue(bookmark),
        getRecordingBookmarks: jest.fn().mockResolvedValue({ data: [bookmark] }),
      };

      const result = await executeRecordingTool(
        "add-recording-bookmark",
        {
          recording_id: "rec1",
          bookmark: "Intro",
          time: 0,
          participant_name: "Ann",
          participant_external_id: "ext-1",
        },
        client,
      );

      expect(client.createRecordingBookmark).toHaveBeenCalledWith("rec1", {
        participant: { name: "Ann", external_id: "ext-1" },
        bookmark: "Intro",
        time: 0,
      });
      expect(result.isError).toBeUndefined();
    });

    it("refuses without a participant, before any call", async () => {
      const client: any = { createRecordingBookmark: jest.fn() };

      const result = await executeRecordingTool(
        "add-recording-bookmark",
        { recording_id: "rec1", bookmark: "Intro", time: 5, participant_name: "Ann" },
        client,
      );

      expect(result.isError).toBe(true);
      expect(client.createRecordingBookmark).not.toHaveBeenCalled();
    });

    it("fails when the bookmark is not listed afterwards", async () => {
      const client: any = {
        createRecordingBookmark: jest.fn().mockResolvedValue(bookmark),
        getRecordingBookmarks: jest.fn().mockResolvedValue([]),
      };

      const result = await executeRecordingTool(
        "add-recording-bookmark",
        { recording_id: "rec1", bookmark: "Intro", time: 10, participant_id: "p1" },
        client,
      );

      expect(result.isError).toBe(true);
    });
  });
});

describe("update-participant", () => {
  const saved = { ...ROLE_READBACK };
  beforeAll(() => {
    ROLE_READBACK.delayMs = 1;
  });
  afterAll(() => Object.assign(ROLE_READBACK, saved));

  const live = (role: string) => ({
    data: [{ id: "p1", role, live: true }],
    total_count: 1,
  });

  it("sends the role and confirms once the list shows it", async () => {
    const client: any = {
      updateParticipant: jest.fn().mockResolvedValue({}),
      listRoomParticipants: jest
        .fn()
        .mockResolvedValueOnce(live("moderator"))
        .mockResolvedValueOnce(live("attendee")),
    };

    const result = await executeLiveSessionTool(
      "update-participant",
      { room_id: "r1", participant_id: "p1", role: "attendee" },
      client,
    );

    expect(client.updateParticipant).toHaveBeenCalledWith("r1", "p1", "attendee");
    expect(client.listRoomParticipants).toHaveBeenCalledWith("r1", { live: true });
    expect(client.listRoomParticipants).toHaveBeenCalledTimes(2);
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("now has role attendee");
  });

  it("resolves a role given by id to its name", async () => {
    const roleId = "1418195f-668d-4896-8a64-35b1b6f34851";
    const client: any = {
      updateParticipant: jest.fn().mockResolvedValue({}),
      getRole: jest.fn().mockResolvedValue({ id: roleId, name: "speaker" }),
      listRoomParticipants: jest.fn().mockResolvedValue(live("speaker")),
    };

    const result = await executeLiveSessionTool(
      "update-participant",
      { room_id: "r1", participant_id: "p1", role: roleId },
      client,
    );

    expect(client.getRole).toHaveBeenCalledWith(roleId);
    expect(result.isError).toBeUndefined();
  });

  it("fails when the role never changes", async () => {
    const client: any = {
      updateParticipant: jest.fn().mockResolvedValue({}),
      listRoomParticipants: jest.fn().mockResolvedValue(live("moderator")),
    };

    const result = await executeLiveSessionTool(
      "update-participant",
      { room_id: "r1", participant_id: "p1", role: "attendee" },
      client,
    );

    expect(client.listRoomParticipants).toHaveBeenCalledTimes(
      ROLE_READBACK.attempts,
    );
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("still has role moderator");
  });

  it("passes an invalid role refusal through", async () => {
    const client: any = {
      updateParticipant: jest
        .fn()
        .mockRejectedValue(new Error("Validation error: The selected role is invalid.")),
      listRoomParticipants: jest.fn(),
    };

    const result = await executeLiveSessionTool(
      "update-participant",
      { room_id: "r1", participant_id: "p1", role: "nope" },
      client,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("role is invalid");
    expect(client.listRoomParticipants).not.toHaveBeenCalled();
  });

  it("requires a role", async () => {
    const client: any = { updateParticipant: jest.fn() };

    const result = await executeLiveSessionTool(
      "update-participant",
      { room_id: "r1", participant_id: "p1", role: " " },
      client,
    );

    expect(result.isError).toBe(true);
    expect(client.updateParticipant).not.toHaveBeenCalled();
  });
});
