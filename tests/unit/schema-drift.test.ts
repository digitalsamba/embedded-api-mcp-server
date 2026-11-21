/**
 * Tool schemas and requests follow the API (#40). Each value below was checked
 * against the API's form requests (Rooms/CreateUpdateRequest, ExportRequest,
 * CreateWebappRequest, Quizzes/CreateUpdateRequest, PhoneParticipants/*) and
 * routes (POST .../move).
 *
 * @group unit
 */
import { registerRoomTools } from "../../src/tools/room-management/index.js";
import { registerSessionTools } from "../../src/tools/session-management/index.js";
import { registerQuizTools } from "../../src/tools/quiz-management/index.js";
import { registerExportTools } from "../../src/tools/export-tools/index.js";
import {
  registerCommunicationTools,
  executeCommunicationTool,
} from "../../src/tools/communication-management/index.js";
import { executeLibraryTool } from "../../src/tools/library-management/index.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const tool = (list: any[], name: string) => list.find((t) => t.name === name)!;
const props = (t: any) => t.inputSchema.properties;

describe("room schemas", () => {
  const rooms = registerRoomTools();

  it.each(["create-room", "update-room"])(
    "%s accepts all 18 API languages",
    (name) => {
      expect(props(tool(rooms, name)).languages.items.enum).toHaveLength(18);
      expect(props(tool(rooms, name)).languages.items.enum).toEqual(
        expect.arrayContaining(["fr-FR", "nl-NL", "sv-SE", "tr-TR", "bg-BG"]),
      );
    },
  );

  it.each(["create-room", "update-room"])(
    "%s caps watermark_text at the API's 50",
    (name) => {
      expect(props(tool(rooms, name)).watermark_text.maxLength).toBe(50);
    },
  );

  it.each(["create-room", "update-room"])(
    "%s has the settings added since July",
    (name) => {
      for (const key of [
        "local_mute_enabled",
        "global_lock_enabled",
        "toolbar_lock_icon_enabled",
        "hide_tiles_in_recordings_enabled",
        "hide_tiles_in_recordings_roles",
        "telephony_enabled",
        "e2ee_enabled",
        "breakout_rooms_enabled",
        "session_length",
        "expires_at",
        "always_show_names_on_tiles_enabled",
      ]) {
        expect(props(tool(rooms, name))).toHaveProperty(key);
      }
      expect(props(tool(rooms, name)).session_length).toMatchObject({
        minimum: 1,
        maximum: 1440,
      });
    },
  );

  it("update-room can set external_id", () => {
    expect(props(tool(rooms, "update-room"))).toHaveProperty("external_id");
  });
});

it("bulk-delete-session-data can delete quizzes", () => {
  const t = tool(registerSessionTools(), "bulk-delete-session-data");
  expect(props(t).dataTypes.items.enum).toContain("quizzes");
});

it("quiz questions can allow several correct choices", () => {
  for (const name of ["create-quiz", "update-quiz"]) {
    expect(
      props(tool(registerQuizTools(), name)).questions.items.properties,
    ).toHaveProperty("multiple");
  }
});

it("every export tool with a locale also takes a timezone", () => {
  const all = [...registerExportTools(), ...registerCommunicationTools()];
  const withLocale = all.filter((t) => props(t)?.locale);
  expect(withLocale.length).toBeGreaterThan(3);
  for (const t of withLocale) expect(props(t)).toHaveProperty("timezone");
});

describe("requests", () => {
  const realFetch = global.fetch;
  let calls: { method: string; url: string; body?: string }[];

  beforeEach(() => {
    calls = [];
    global.fetch = jest.fn(async (url: any, init: any = {}) => {
      calls.push({
        method: init.method || "GET",
        url: String(url),
        body: init.body,
      });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ id: "x", name: "n" }),
      } as any;
    }) as any;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });
  const client = () =>
    new DigitalSambaApiClient("key", "https://api.test.invalid/api/v1");

  it("move-library-file uses POST .../move, which checks the target is in the same library", async () => {
    await executeLibraryTool(
      "move-library-file",
      { libraryId: "l1", fileId: "f1", targetFolderId: "d2" },
      client(),
    );
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "https://api.test.invalid/api/v1/libraries/l1/files/f1/move",
      body: JSON.stringify({ folder_id: "d2" }),
    });
  });

  it("move-library-folder to the root sends parent_id null", async () => {
    await executeLibraryTool(
      "move-library-folder",
      { libraryId: "l1", folderId: "d1" },
      client(),
    );
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "https://api.test.invalid/api/v1/libraries/l1/folders/d1/move",
      body: JSON.stringify({ parent_id: null }),
    });
  });

  it("create-webapp without a name uses the URL's host, since the API requires one", async () => {
    await executeLibraryTool(
      "create-webapp",
      { libraryId: "l1", url: "https://www.youtube.com/embed/x" },
      client(),
    );
    expect(JSON.parse(calls[0].body!)).toMatchObject({
      name: "www.youtube.com",
    });
  });

  it("export-room-transcripts passes session_id and timezone", async () => {
    global.fetch = jest.fn(async (url: any) => {
      calls.push({ method: "GET", url: String(url) });
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "transcript",
      } as any;
    }) as any;
    await executeCommunicationTool(
      "export-room-transcripts",
      { room_id: "r1", session_id: "s1", timezone: "Europe/London" },
      client(),
    );
    const url = new URL(calls[0].url);
    expect(url.searchParams.get("session_id")).toBe("s1");
    expect(url.searchParams.get("timezone")).toBe("Europe/London");
  });
});
