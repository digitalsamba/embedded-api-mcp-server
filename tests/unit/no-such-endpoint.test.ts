/**
 * Tools whose backing API endpoint does not exist.
 *
 * Reading the API's own source (webapp-api-laravel) after the 2026-08-13 smoke
 * sweep turned up two tools that could never have worked, and said otherwise:
 *
 * - `publish-poll-results` posts to /sessions/{s}/polls/{p}/publish-results,
 *   which is not routed at all — no `publish` action exists in the backend. The
 *   "Session ID is required" refusal callers saw was this server's own guard, so
 *   the request was never actually sent and the 404 never surfaced.
 * - `copy-library-content` had no copy endpoint to call, so for a file it built
 *   a placeholder with createLibraryFile and reported "Successfully copied file".
 *   Nothing was copied, for any file type. A webapp is the one case that can be
 *   genuinely duplicated, because its URL fully describes it.
 *
 * Both now report the truth. These tests pin that, so a future refactor cannot
 * quietly restore the false success.
 */
import { executePollTool } from "../../src/tools/poll-management/index.js";
import { executeLibraryTool } from "../../src/tools/library-management/index.js";

jest.mock("../../src/logger.js");

const textOf = (result: any): string => result.content[0].text;

describe("publish-poll-results", () => {
  it("reports failure instead of pretending to publish", async () => {
    const apiClient: any = {
      publishPollResults: jest.fn(),
    };

    const result = await executePollTool(
      "publish-poll-results",
      { room_id: "r1", poll_id: "p1", session_id: "s1" },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("not supported");
    expect(textOf(result)).toContain("p1");
    // Never call the dead path — a 404 would be reported as a transport error
    // rather than as the missing feature it is.
    expect(apiClient.publishPollResults).not.toHaveBeenCalled();
  });

  it("still validates its inputs first", async () => {
    const result = await executePollTool(
      "publish-poll-results",
      { room_id: "r1", poll_id: "", session_id: "s1" },
      {} as any,
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Poll ID is required");
  });
});

describe("copy-library-content", () => {
  const copy = (params: Record<string, unknown>, apiClient: any) =>
    executeLibraryTool(
      "copy-library-content",
      {
        sourceLibraryId: "lib-a",
        targetLibraryId: "lib-b",
        contentType: "file",
        contentId: "f1",
        ...params,
      },
      apiClient,
    );

  it("refuses to 'copy' a stored file rather than creating an empty placeholder", async () => {
    const apiClient: any = {
      getLibraryFile: jest.fn().mockResolvedValue({
        id: "f1",
        name: "slides.pdf",
        type: "application/pdf",
        size: 1024,
      }),
      createLibraryFile: jest.fn(),
    };

    const result = await copy({}, apiClient);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("slides.pdf");
    expect(textOf(result)).toContain("not supported");
    expect(apiClient.createLibraryFile).not.toHaveBeenCalled();
  });

  it("genuinely duplicates a webapp, preserving its type and url", async () => {
    const apiClient: any = {
      getLibraryFile: jest.fn().mockResolvedValue({
        id: "f1",
        name: "Intro video",
        type: "youtube",
        size: 0,
        url: "https://www.youtube.com/watch?v=abc123",
      }),
      createWebapp: jest.fn().mockResolvedValue({
        id: "f2",
        name: "Intro video copy",
        type: "youtube",
        url: "https://www.youtube.com/watch?v=abc123",
        status: "completed",
        created_at: "2026-08-14T00:00:00Z",
      }),
    };

    const result = await copy({ newName: "Intro video copy" }, apiClient);

    expect(result.isError).toBeUndefined();
    expect(apiClient.createWebapp).toHaveBeenCalledWith("lib-b", {
      url: "https://www.youtube.com/watch?v=abc123",
      name: "Intro video copy",
    });
    expect(textOf(result)).toContain("youtube");
    expect(textOf(result)).toContain("https://www.youtube.com/watch?v=abc123");
  });

  it("passes the target folder through when duplicating a webapp", async () => {
    const apiClient: any = {
      getLibraryFile: jest.fn().mockResolvedValue({
        id: "f1",
        name: "Intro video",
        type: "youtube",
        size: 0,
        url: "https://example.test/v",
      }),
      createWebapp: jest.fn().mockResolvedValue({
        id: "f2",
        name: "Intro video",
        type: "youtube",
        url: "https://example.test/v",
        status: "completed",
        created_at: "2026-08-14T00:00:00Z",
      }),
    };

    await copy({ targetFolderId: "fold-1" }, apiClient);

    expect(apiClient.createWebapp).toHaveBeenCalledWith("lib-b", {
      url: "https://example.test/v",
      name: "Intro video",
      folder_id: "fold-1",
    });
  });

  it("does not call a folder copy a copy", async () => {
    const apiClient: any = {
      getLibraryFolder: jest.fn().mockResolvedValue({
        id: "fold-1",
        name: "Decks",
        created_at: "2026-08-14T00:00:00Z",
      }),
      createLibraryFolder: jest.fn().mockResolvedValue({
        id: "fold-2",
        name: "Decks copy",
        created_at: "2026-08-14T00:00:00Z",
      }),
    };

    const result = await copy(
      { contentType: "folder", contentId: "fold-1", newName: "Decks copy" },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("empty folder");
    expect(textOf(result)).toContain("NOT copied");
  });
});
