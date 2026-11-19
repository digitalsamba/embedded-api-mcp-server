/**
 * Library upload and link output (#39).
 *
 * On presigned storage POST /libraries/{id}/files returns no `token`, but a
 * presigned URL plus a callback that must be called before
 * the file leaves "uploading" (LibraryFilesController::storeFile,
 * ScalewayPresignedUpload::getPayload). The tool printed "Upload Token:
 * undefined" and dropped the callback. get-file-links printed "No pages" for
 * every non-document file, whose link is in `url` (LibraryFileLinksResource).
 *
 * @group unit
 */
import { executeLibraryTool } from "../../src/tools/library-management/index.js";

jest.mock("../../src/logger.js", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const text = (r: any) => r.content.map((c: any) => c.text).join("\n");
const EXP = 1_900_000_000;

describe("create-library-file", () => {
  it("default storage: shows the token", async () => {
    const client = {
      createLibraryFile: jest.fn().mockResolvedValue({
        file_id: "f1",
        storage: "default",
        external_storage_url: "https://storage.example/upload",
        token: "tok-1",
        expiration_timestamp: EXP,
      }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "create-library-file",
        { libraryId: "l1", name: "a.pdf" },
        client,
      ),
    );
    expect(out).toContain("Upload Token: tok-1");
    expect(out).not.toContain("undefined");
  });

  it("presigned storage: PUT with the signed Content-Type, then the callback; sends content_type", async () => {
    const client = {
      createLibraryFile: jest.fn().mockResolvedValue({
        file_id: "f2",
        storage: "scaleway",
        external_storage_url: "https://s3.example/presigned?sig=1",
        callback_url:
          "https://api.example/api/v1/libraries/l1/files/f2/uploaded",
        callback_token: "cb-1",
        expiration_timestamp: EXP,
      }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "create-library-file",
        {
          libraryId: "l1",
          name: "talk.mp4",
          fileSize: 1000,
          contentType: "video/mp4",
        },
        client,
      ),
    );
    expect(client.createLibraryFile).toHaveBeenCalledWith("l1", {
      name: "talk.mp4",
      file_size: 1000,
      content_type: "video/mp4",
    });
    expect(out).toContain(
      "PUT the file bytes to: https://s3.example/presigned?sig=1",
    );
    expect(out).toContain("Content-Type: video/mp4");
    expect(out).toContain(
      "POST https://api.example/api/v1/libraries/l1/files/f2/uploaded",
    );
    expect(out).toContain('{"size": <bytes>}');
    expect(out).toContain("cb-1");
    expect(out).toContain('stays in status "uploading"');
    expect(out).not.toContain("undefined");
  });

  it("presigned multipart: lists every part and the completion body", async () => {
    const client = {
      createLibraryFile: jest.fn().mockResolvedValue({
        file_id: "f3",
        storage: "scaleway",
        external_storage_url: "https://s3.example/x",
        callback_url: "https://api.example/cb",
        callback_token: "cb-2",
        expiration_timestamp: EXP,
        upload_id: "up-9",
        part_size: 104857600,
        parts: [
          { part_number: 1, url: "https://s3.example/p1" },
          { part_number: 2, url: "https://s3.example/p2" },
        ],
      }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "create-library-file",
        {
          libraryId: "l1",
          name: "big.mp4",
          fileSize: 150000000,
          contentType: "video/mp4",
        },
        client,
      ),
    );
    expect(out).toContain("multipart (2 part(s) of 104857600 bytes");
    expect(out).toContain("part 1: https://s3.example/p1");
    expect(out).toContain("part 2: https://s3.example/p2");
    expect(out).toContain('"upload_id": "up-9"');
    expect(out).toContain("ETag");
  });
});

describe("bulk-upload-library-files", () => {
  it("sends the field names the API reads, and the full upload instructions per file", async () => {
    const client = {
      createLibraryFile: jest.fn().mockResolvedValue({
        file_id: "f4",
        storage: "scaleway",
        external_storage_url: "https://s3.example/y",
        callback_url: "https://api.example/cb4",
        callback_token: "cb-4",
        expiration_timestamp: EXP,
      }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "bulk-upload-library-files",
        {
          libraryId: "l1",
          files: [{ name: "v.mp4", size: 500, mimeType: "video/mp4" }],
        },
        client,
      ),
    );
    expect(client.createLibraryFile).toHaveBeenCalledWith("l1", {
      name: "v.mp4",
      file_size: 500,
      content_type: "video/mp4",
    });
    expect(out).toContain("POST https://api.example/cb4");
    expect(out).toContain("Content-Type: video/mp4");
  });
});

describe("get-file-links", () => {
  it("prints the url for non-document files instead of 'No pages'", async () => {
    const client = {
      getFileLinks: jest
        .fn()
        .mockResolvedValue({ url: "https://cdn.example/video.mp4" }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "get-file-links",
        { libraryId: "l1", fileId: "f1" },
        client,
      ),
    );
    expect(out).toContain("URL: https://cdn.example/video.mp4");
    expect(out).not.toMatch(/No pages/);
  });

  it("still lists document pages", async () => {
    const client = {
      getFileLinks: jest.fn().mockResolvedValue({
        pages: [
          {
            url: "https://cdn.example/p1",
            thumbnail_url: "https://cdn.example/t1",
          },
        ],
      }),
    } as any;
    const out = text(
      await executeLibraryTool(
        "get-file-links",
        { libraryId: "l1", fileId: "f1" },
        client,
      ),
    );
    expect(out).toContain("Page 1:");
    expect(out).toContain("View URL: https://cdn.example/p1");
  });
});
