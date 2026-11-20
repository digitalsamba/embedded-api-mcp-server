import { applyRoomName } from "../../src/tools/room-management/index.js";
import { registerRoomTools } from "../../src/tools/room-management/index.js";

describe("applyRoomName (#37)", () => {
  it("stores the name as the description when none is given", () => {
    const settings: Record<string, unknown> = { name: "Board Meeting" };
    const note = applyRoomName(settings);
    expect(settings).toEqual({ description: "Board Meeting" });
    expect(note).toMatch(/saved as the room's description/);
  });

  it("treats a blank description as missing", () => {
    const settings: Record<string, unknown> = {
      name: "Board Meeting",
      description: "  ",
    };
    applyRoomName(settings);
    expect(settings.description).toBe("Board Meeting");
  });

  it("keeps an explicit description and says the name was not saved", () => {
    const settings: Record<string, unknown> = {
      name: "Board Meeting",
      description: "Quarterly board review",
    };
    const note = applyRoomName(settings);
    expect(settings).toEqual({ description: "Quarterly board review" });
    expect(note).toMatch(/"Board Meeting" was not saved/);
  });

  it("leaves settings without a name alone", () => {
    const settings: Record<string, unknown> = { privacy: "public" };
    expect(applyRoomName(settings)).toBeUndefined();
    expect(settings).toEqual({ privacy: "public" });
  });

  it("drops an empty name without a note", () => {
    const settings: Record<string, unknown> = { name: "" };
    expect(applyRoomName(settings)).toBeUndefined();
    expect(settings).toEqual({});
  });
});

describe("create-room schema (#37)", () => {
  it("no longer requires name", () => {
    const tool = registerRoomTools().find((t) => t.name === "create-room")!;
    expect(tool.inputSchema.required ?? []).not.toContain("name");
  });
});
