/**
 * delete-room-shared-notes (#26 group 3). The API answers 204 even when the
 * notes service failed, so success rests on the has_shared_notes read-back.
 */
import { executeCommunicationTool } from "../../src/tools/communication-management/index";

jest.mock("../../src/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const textOf = (result: any) => result.content[0].text as string;

describe("delete-room-shared-notes", () => {
  it("confirms by read-back when the room reports no notes", async () => {
    const apiClient: any = {
      deleteRoomSharedNotes: jest.fn().mockResolvedValue(undefined),
      getRoomResources: jest.fn().mockResolvedValue({ has_shared_notes: false }),
    };

    const result = await executeCommunicationTool(
      "delete-room-shared-notes",
      { roomId: "r1" },
      apiClient,
    );

    expect(apiClient.deleteRoomSharedNotes).toHaveBeenCalledWith("r1");
    expect(apiClient.getRoomResources).toHaveBeenCalledWith("r1");
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("confirmed by read-back");
  });

  it("fails when the room still reports notes", async () => {
    const apiClient: any = {
      deleteRoomSharedNotes: jest.fn().mockResolvedValue(undefined),
      getRoomResources: jest.fn().mockResolvedValue({ has_shared_notes: true }),
    };

    const result = await executeCommunicationTool(
      "delete-room-shared-notes",
      { roomId: "r1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("still reports shared notes");
  });

  it("calls the write unverified when the read-back has no flag", async () => {
    const apiClient: any = {
      deleteRoomSharedNotes: jest.fn().mockResolvedValue(undefined),
      getRoomResources: jest.fn().mockResolvedValue({}),
    };

    const result = await executeCommunicationTool(
      "delete-room-shared-notes",
      { roomId: "r1" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("unverified");
  });

  it("surfaces the live-session refusal", async () => {
    const apiClient: any = {
      deleteRoomSharedNotes: jest
        .fn()
        .mockRejectedValue(
          new Error(
            "Digital Samba API error (400): Cannot delete resources from a room that has an active session.",
          ),
        ),
      getRoomResources: jest.fn(),
    };

    const result = await executeCommunicationTool(
      "delete-room-shared-notes",
      { roomId: "r1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("active session");
    expect(apiClient.getRoomResources).not.toHaveBeenCalled();
  });

  it("requires roomId", async () => {
    const apiClient: any = { deleteRoomSharedNotes: jest.fn() };

    const result = await executeCommunicationTool(
      "delete-room-shared-notes",
      { roomId: " " },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(apiClient.deleteRoomSharedNotes).not.toHaveBeenCalled();
  });
});
