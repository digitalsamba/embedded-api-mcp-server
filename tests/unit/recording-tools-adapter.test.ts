/**
 * Tests for recording tools adapter
 */

import {
  registerRecordingTools,
  executeRecordingTool,
} from "../../src/tools/recording-tools-adapter.js";
import { DigitalSambaApiClient } from "../../src/digital-samba-api.js";

describe("Recording Tools Adapter", () => {
  describe("registerRecordingTools", () => {
    it("should register all recording tools", () => {
      const tools = registerRecordingTools();
      
      expect(tools).toHaveLength(9);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain("delete-recording");
      expect(toolNames).toContain("update-recording");
      expect(toolNames).toContain("get-recordings");
      expect(toolNames).toContain("start-recording");
      expect(toolNames).toContain("stop-recording");
      expect(toolNames).toContain("archive-recording");
      expect(toolNames).toContain("get-recording");
      expect(toolNames).toContain("get-recording-download-link");
      expect(toolNames).toContain("unarchive-recording");
      
      // Check that tools have proper structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
        expect(tool.inputSchema).toHaveProperty("properties");
        expect(tool.inputSchema).toHaveProperty("required");
      });
    });
  });

  describe("executeRecordingTool", () => {
    let mockClient: jest.Mocked<DigitalSambaApiClient>;

    beforeEach(() => {
      mockClient = {
        deleteRecording: jest.fn().mockResolvedValue(undefined),
        listRecordings: jest.fn().mockResolvedValue({ data: [{ id: "1" }, { id: "2" }] }),
        startRecording: jest.fn().mockResolvedValue(undefined),
        stopRecording: jest.fn().mockResolvedValue(undefined),
        archiveRecording: jest.fn().mockResolvedValue(undefined),
        unarchiveRecording: jest.fn().mockResolvedValue(undefined),
        getRecording: jest.fn().mockResolvedValue({ id: "rec123", name: "Test Recording" }),
        getRecordingDownloadLink: jest.fn().mockResolvedValue({ url: "https://download.example.com" }),
      } as any;
    });

    it("should delete a recording", async () => {
      const result = await executeRecordingTool(
        "delete-recording",
        { recordingId: "rec123" },
        mockClient
      );

      expect(mockClient.deleteRecording).toHaveBeenCalledWith("rec123");
      expect(result.content[0].text).toBe("Recording rec123 deleted successfully");
    });

    it("should handle update-recording (not supported)", async () => {
      const result = await executeRecordingTool(
        "update-recording",
        { recordingId: "rec123", name: "New Name" },
        mockClient
      );

      expect(result.content[0].text).toBe("Recording update not supported");
    });

    it("should get recordings", async () => {
      const result = await executeRecordingTool(
        "get-recordings",
        { room_id: "room123", limit: 10 },
        mockClient
      );

      expect(mockClient.listRecordings).toHaveBeenCalledWith({ room_id: "room123", limit: 10 });
      expect(result.content[0].text).toContain("Found 2 recording(s)");
      expect(result.content[0].text).toContain('"id": "1"');
    });

    it("should handle get recordings with no results", async () => {
      mockClient.listRecordings.mockResolvedValue({ data: undefined });
      
      const result = await executeRecordingTool(
        "get-recordings",
        {},
        mockClient
      );

      expect(result.content[0].text).toContain("Found 0 recording(s)");
    });

    it("should start recording", async () => {
      const result = await executeRecordingTool(
        "start-recording",
        { room_id: "room123" },
        mockClient
      );

      expect(mockClient.startRecording).toHaveBeenCalledWith("room123");
      expect(result.content[0].text).toBe("Recording started successfully in room room123");
    });

    it("should stop recording", async () => {
      const result = await executeRecordingTool(
        "stop-recording",
        { room_id: "room123" },
        mockClient
      );

      expect(mockClient.stopRecording).toHaveBeenCalledWith("room123");
      expect(result.content[0].text).toBe("Recording stopped successfully in room room123");
    });

    it("should archive recording", async () => {
      const result = await executeRecordingTool(
        "archive-recording",
        { recordingId: "rec123" },
        mockClient
      );

      expect(mockClient.archiveRecording).toHaveBeenCalledWith("rec123");
      expect(result.content[0].text).toBe("Recording rec123 archived successfully");
    });

    it("should unarchive recording", async () => {
      const result = await executeRecordingTool(
        "unarchive-recording",
        { recordingId: "rec123" },
        mockClient
      );

      expect(mockClient.unarchiveRecording).toHaveBeenCalledWith("rec123");
      expect(result.content[0].text).toBe("Recording rec123 unarchived successfully");
    });

    it("should get recording details", async () => {
      const result = await executeRecordingTool(
        "get-recording",
        { recordingId: "rec123" },
        mockClient
      );

      expect(mockClient.getRecording).toHaveBeenCalledWith("rec123");
      expect(result.content[0].text).toContain('"id": "rec123"');
      expect(result.content[0].text).toContain('"name": "Test Recording"');
    });

    it("should get recording download link", async () => {
      const result = await executeRecordingTool(
        "get-recording-download-link",
        { recordingId: "rec123", validForMinutes: 60 },
        mockClient
      );

      expect(mockClient.getRecordingDownloadLink).toHaveBeenCalledWith("rec123", 60);
      expect(result.content[0].text).toContain('"url": "https://download.example.com"');
    });

    it("should throw error for unknown tool", async () => {
      await expect(
        executeRecordingTool("unknown-tool", {}, mockClient)
      ).rejects.toThrow("Unknown recording tool: unknown-tool");
    });
  });
});