/**
 * Recording Tools Adapter
 * Temporary adapter to bridge old and new patterns
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../digital-samba-api.js";

export function registerRecordingTools(): Tool[] {
  return [
    {
      name: "delete-recording",
      description:
        '[Recording Management] Permanently delete a recording. Use when users say: "delete recording", "remove recording", "delete video", "remove video recording", "delete meeting recording". Requires recordingId. This action cannot be undone.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording to delete",
          },
        },
        required: ["recordingId"],
      },
    },
    {
      name: "update-recording",
      description:
        '[Recording Management] Update recording metadata like name or description. Use when users say: "rename recording", "update recording name", "change recording title", "edit recording details". Requires recordingId. Currently limited to name updates.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording",
          },
          name: { type: "string", description: "New name for the recording" },
        },
        required: ["recordingId"],
      },
    },
    {
      name: "get-recordings",
      description:
        '[Recording Management - TOOL] Filter and search recordings with specific criteria. Use when users need to: "filter recordings by room", "search recordings", "find recordings from date", "get recordings with limit". NOT for simply listing all recordings - use digitalsamba://recordings resource instead. NOT for listing rooms. Returns filtered recording results.',
      inputSchema: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "Filter by room ID" },
          limit: {
            type: "number",
            description: "Maximum number of recordings to return",
          },
          offset: { type: "number", description: "Offset for pagination" },
        },
        required: [],
      },
    },
    {
      name: "start-recording",
      description:
        '[Recording Management] Start recording an active room session. Use when users say: "start recording", "begin recording", "record this meeting", "start recording the room", "record session". Requires room_id. Room must have an active session.',
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to record",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "stop-recording",
      description:
        '[Recording Management] Stop an ongoing room recording. Use when users say: "stop recording", "end recording", "finish recording", "stop recording the room", "halt recording". Requires room_id. Only works if recording is currently active.',
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to stop recording",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "archive-recording",
      description:
        '[Recording Management] Move a recording to archived status for long-term storage. Use when users say: "archive recording", "archive video", "move to archive", "store recording", "archive old recording". Requires recordingId. Archived recordings can be unarchived later.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording to archive",
          },
        },
        required: ["recordingId"],
      },
    },
    {
      name: "get-recording",
      description:
        '[Recording Management] Get detailed information about a specific recording. Use when users say: "show recording details", "get recording info", "recording information", "details about recording", "show video details". Requires recordingId. Returns full recording metadata including status, duration, and URLs.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording",
          },
        },
        required: ["recordingId"],
      },
    },
    {
      name: "get-recording-download-link",
      description:
        '[Recording Management] Generate a temporary download link for a recording. Use when users say: "download recording", "get download link", "export recording", "download video", "get recording URL". Requires recordingId. Returns a time-limited download URL. Recording must be in READY status.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording",
          },
          validForMinutes: {
            type: "number",
            description: "How long the link should be valid (1-1440 minutes)",
          },
        },
        required: ["recordingId"],
      },
    },
    {
      name: "unarchive-recording",
      description:
        '[Recording Management] Restore an archived recording back to active status. Use when users say: "unarchive recording", "restore recording", "unarchive video", "bring back from archive", "restore archived recording". Requires recordingId. Only works on archived recordings.',
      inputSchema: {
        type: "object",
        properties: {
          recordingId: {
            type: "string",
            description: "The ID of the recording to unarchive",
          },
        },
        required: ["recordingId"],
      },
    },
  ];
}

export async function executeRecordingTool(
  name: string,
  args: any,
  client: DigitalSambaApiClient,
) {
  switch (name) {
    case "delete-recording":
      await client.deleteRecording(args.recordingId);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recordingId} deleted successfully`,
          },
        ],
      };

    case "update-recording":
      // Update recording not supported in base API
      return {
        content: [
          {
            type: "text",
            text: `Recording update not supported`,
          },
        ],
      };

    case "get-recordings": {
      const recordings = await client.listRecordings(args);
      return {
        content: [
          {
            type: "text",
            text: `Found ${recordings.data?.length || 0} recording(s):\n${JSON.stringify(recordings, null, 2)}`,
          },
        ],
      };
    }

    case "start-recording":
      await client.startRecording(args.room_id);
      return {
        content: [
          {
            type: "text",
            text: `Recording started successfully in room ${args.room_id}`,
          },
        ],
      };

    case "stop-recording":
      await client.stopRecording(args.room_id);
      return {
        content: [
          {
            type: "text",
            text: `Recording stopped successfully in room ${args.room_id}`,
          },
        ],
      };

    case "archive-recording":
      await client.archiveRecording(args.recordingId);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recordingId} archived successfully`,
          },
        ],
      };

    case "unarchive-recording":
      await client.unarchiveRecording(args.recordingId);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recordingId} unarchived successfully`,
          },
        ],
      };

    case "get-recording": {
      const recording = await client.getRecording(args.recordingId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recording, null, 2),
          },
        ],
      };
    }

    case "get-recording-download-link": {
      const downloadLink = await client.getRecordingDownloadLink(
        args.recordingId,
        args.validForMinutes
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(downloadLink, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown recording tool: ${name}`);
  }
}
