/**
 * Recording Tools Adapter
 * Temporary adapter to bridge old and new patterns
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../digital-samba-api.js";
import { getToolAnnotations } from "../tool-annotations.js";
import { countOf, verifiedWrite } from "./verified-write.js";

export function registerRecordingTools(): Tool[] {
  return [
    {
      name: "delete-recording",
      description:
        '[Recording Management] Permanently delete a recording. Use when users say: "delete recording", "remove recording", "delete video", "remove video recording", "delete meeting recording". Requires recording_id. This action cannot be undone.',
      annotations: getToolAnnotations("delete-recording", "Delete Recording"),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording to delete",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "update-recording",
      description:
        '[Recording Management] Update recording metadata like name or description. Use when users say: "rename recording", "update recording name", "change recording title", "edit recording details". Requires recording_id. Currently limited to name updates.',
      annotations: getToolAnnotations("update-recording", "Update Recording"),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
          name: { type: "string", description: "New name for the recording" },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "get-recordings",
      description:
        '[Recording Management - TOOL] Filter and search recordings with specific criteria. Use when users need to: "filter recordings by room", "search recordings", "find recordings from date", "get recordings with limit". NOT for simply listing all recordings - use digitalsamba://recordings resource instead. NOT for listing rooms. Returns filtered recording results.',
      annotations: getToolAnnotations("get-recordings", "Get Recordings"),
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
      annotations: getToolAnnotations("start-recording", "Start Recording"),
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
      annotations: getToolAnnotations("stop-recording", "Stop Recording"),
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
        '[Recording Management] Move a recording to archived status for long-term storage. Use when users say: "archive recording", "archive video", "move to archive", "store recording", "archive old recording". Requires recording_id. Archived recordings can be unarchived later.',
      annotations: getToolAnnotations("archive-recording", "Archive Recording"),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording to archive",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "get-recording",
      description:
        '[Recording Management] Get detailed information about a specific recording. Use when users say: "show recording details", "get recording info", "recording information", "details about recording", "show video details". Requires recording_id. Returns full recording metadata including status, duration, and URLs.',
      annotations: getToolAnnotations("get-recording", "Get Recording Details"),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "get-recording-download-link",
      description:
        '[Recording Management] Generate a temporary download link for a recording. Use when users say: "download recording", "get download link", "export recording", "download video", "get recording URL". Requires recording_id. Returns a time-limited download URL. Recording must be in READY status.',
      annotations: getToolAnnotations(
        "get-recording-download-link",
        "Get Recording Download Link",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
          valid_for_minutes: {
            type: "number",
            description: "How long the link should be valid (1-1440 minutes)",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "unarchive-recording",
      description:
        '[Recording Management] Restore an archived recording back to active status. Use when users say: "unarchive recording", "restore recording", "unarchive video", "bring back from archive", "restore archived recording". Requires recording_id. Only works on archived recordings.',
      annotations: getToolAnnotations(
        "unarchive-recording",
        "Unarchive Recording",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording to unarchive",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "get-recording-bookmarks",
      description:
        '[Recording Management] Get bookmarks for a recording. Use when users say: "get recording bookmarks", "show bookmarks", "list recording markers", "get recording highlights". Requires recording_id. Returns the text, time in seconds, session and participant of each bookmark.',
      annotations: getToolAnnotations(
        "get-recording-bookmarks",
        "Get Recording Bookmarks",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "get-recording-captions",
      description:
        '[Recording Management] Get a captions/subtitles file for a recording, built from the recorded session\'s transcripts. Use when users say: "get captions for the recording", "download subtitles", "make a VTT/SRT file", "caption this recording". Requires recording_id. Returns WebVTT (default) or SRT text timed from the start of the recording. The file has no cues unless the room stores transcripts (transcription_store_enabled); breakout-room recordings are not supported.',
      annotations: getToolAnnotations(
        "get-recording-captions",
        "Get Recording Captions",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
          format: {
            type: "string",
            enum: ["vtt", "srt"],
            description: "Captions format: vtt (WebVTT, default) or srt",
          },
        },
        required: ["recording_id"],
      },
    },
    {
      name: "delete-room-recordings",
      description:
        '[Recording Management] Permanently delete EVERY recording of a room, from all its sessions. Use when users say: "delete all recordings of this room", "remove the room\'s recordings", "wipe room recordings". Requires room_id. Cannot be undone; to delete one recording use delete-recording.',
      annotations: getToolAnnotations(
        "delete-room-recordings",
        "Delete Room Recordings",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room whose recordings to delete",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "add-recording-bookmark",
      description:
        '[Recording Management] Add a bookmark (a labelled point in time) to a recording. Use when users say: "bookmark this recording at", "add a marker at 5 minutes", "mark the moment when". Requires recording_id, bookmark (text, max 255), time (seconds from the start, up to the recording length) and the participant who adds it: participant_id from the recorded session, or participant_name + participant_external_id matching one. The room must have recording_bookmarks_enabled.',
      annotations: getToolAnnotations(
        "add-recording-bookmark",
        "Add Recording Bookmark",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recording_id: {
            type: "string",
            description: "The ID of the recording",
          },
          bookmark: {
            type: "string",
            description: "Bookmark text (1-255 characters)",
          },
          time: {
            type: "integer",
            minimum: 0,
            description: "Seconds from the start of the recording",
          },
          participant_id: {
            type: "string",
            description:
              "ID of a participant of the recorded session (see list-session-participants)",
          },
          participant_name: {
            type: "string",
            description:
              "Participant name, with participant_external_id, instead of participant_id",
          },
          participant_external_id: {
            type: "string",
            description:
              "Participant external ID, with participant_name, instead of participant_id",
          },
        },
        required: ["recording_id", "bookmark", "time"],
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
      await client.deleteRecording(args.recording_id);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recording_id} deleted successfully`,
          },
        ],
      };

    case "update-recording":
      // The API has no recording-update endpoint. This has always returned a
      // plain message, which a client reads as a successful call — so a rename
      // looked like it worked. Mark it as the failure it is.
      return {
        content: [
          {
            type: "text",
            text:
              `Renaming recordings is not supported: the Digital Samba API has no ` +
              `recording-update endpoint. Recording ${args.recording_id} was not changed.`,
          },
        ],
        isError: true,
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
      await client.archiveRecording(args.recording_id);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recording_id} archived successfully`,
          },
        ],
      };

    case "unarchive-recording":
      await client.unarchiveRecording(args.recording_id);
      return {
        content: [
          {
            type: "text",
            text: `Recording ${args.recording_id} unarchived successfully`,
          },
        ],
      };

    case "get-recording": {
      const recording = await client.getRecording(args.recording_id);
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
        args.recording_id,
        args.valid_for_minutes,
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

    case "get-recording-bookmarks": {
      const bookmarks = await client.getRecordingBookmarks(args.recording_id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(bookmarks, null, 2),
          },
        ],
      };
    }

    case "get-recording-captions": {
      const captions = await client.getRecordingCaptions(
        args.recording_id,
        args.format,
      );
      // A file with a header and no cues means the session's transcripts were
      // not stored, which is easy to mistake for a broken download.
      const hasCues = /-->/.test(captions);
      return {
        content: [
          {
            type: "text",
            text: hasCues
              ? captions
              : `The captions file for recording ${args.recording_id} has no cues. ` +
                `Captions are built from stored transcripts, so the room probably ` +
                `did not store them (transcription_store_enabled) or nothing was ` +
                `transcribed.\n\n${captions}`,
          },
        ],
      };
    }

    case "delete-room-recordings": {
      const roomId = args.room_id;
      return verifiedWrite({
        required: { room_id: roomId?.trim?.() },
        describe: `all recordings of room ${roomId}`,
        verb: "Deleted",
        errorLabel: "deleting room recordings",
        action: () => client.deleteRoomRecordings(roomId),
        verify: async () => {
          const page = await client.listRecordings({
            room_id: roomId,
            limit: 1,
          });
          const total = Number(page?.total_count ?? countOf(page));
          if (!Number.isFinite(total)) {
            throw new Error("could not count the room's recordings");
          }
          return {
            landed: total === 0,
            evidence:
              total === 0
                ? "the room now lists no recordings"
                : `the room still lists ${total} recording(s)`,
          };
        },
      });
    }

    case "add-recording-bookmark": {
      const {
        recording_id,
        bookmark,
        time,
        participant_id,
        participant_name,
        participant_external_id,
      } = args;
      if (!participant_id && !(participant_name && participant_external_id)) {
        return {
          content: [
            {
              type: "text",
              text: "Give participant_id, or both participant_name and participant_external_id.",
            },
          ],
          isError: true,
        };
      }
      const participant = participant_id
        ? { id: participant_id }
        : { name: participant_name, external_id: participant_external_id };

      return verifiedWrite({
        required: { recording_id, bookmark, time },
        describe: `a bookmark on recording ${recording_id}`,
        verb: "Added",
        errorLabel: "adding recording bookmark",
        action: () =>
          client.createRecordingBookmark(recording_id, {
            participant,
            bookmark,
            time: Number(time),
          }),
        verify: async (created) => {
          const list = await client.getRecordingBookmarks(recording_id);
          // A bare array today; accept the paginated envelope too.
          const rows = Array.isArray(list)
            ? list
            : ((list as { data?: typeof list }).data ?? []);
          const found = rows.find((b) => b.id === created?.id);
          return {
            landed: !!found,
            evidence: found
              ? `bookmark ${found.id} "${found.bookmark}" at ${found.time}s`
              : "the new bookmark is not in the recording's bookmarks",
          };
        },
      });
    }

    default:
      throw new Error(`Unknown recording tool: ${name}`);
  }
}
