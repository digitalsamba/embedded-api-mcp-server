/**
 * Digital Samba MCP Server - Communication Management Tools
 *
 * This module implements tools for managing communications within Digital Samba sessions.
 * It provides MCP tools for managing chat messages, Q&A, transcripts, and summaries.
 *
 * Tools provided:
 * - delete-session-chats: Delete all chat messages for a session
 * - delete-room-chats: Delete all chat messages for a room
 * - delete-session-qa: Delete all Q&A for a session
 * - delete-room-qa: Delete all Q&A for a room
 * - delete-session-transcripts: Delete all transcripts for a session
 * - delete-room-transcripts: Delete all transcripts for a room
 * - delete-session-summaries: Delete all summaries for a session
 * - delete-room-summaries: Delete all summaries for a room
 *
 * @module tools/communication-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
// import { z } from "zod"; // Removed: unused

// MCP SDK imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // TODO: Direct MCP server integration
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

// Local modules
// import { getApiKeyFromRequest } from '../../auth.js'; // Removed: unused
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";
import { getToolAnnotations } from "../../tool-annotations.js";
import type { QuestionRecord } from "../../types/communication.js";
import { verifiedWrite } from "../verified-write.js";

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  annotations?: {
    audience?: string[];
    title?: string;
  };
}

/**
 * Shared schema for the Q&A participant identity object
 */
/**
 * Chat's participant schema: who the message appears from.
 *
 * Required by the API since the September 2026 re-release (`WithParticipant`).
 * An `id` must belong to the room's live session; a `{ name, external_id }`
 * pair reuses that external participant or creates one in the session.
 */
const chatParticipantSchema = {
  type: "object",
  description:
    'Who the message appears from: either { "id" } (UUID of a participant in the room\'s live session) or { "name", "external_id" } (reused if that external participant exists in the session, otherwise created).',
  properties: {
    id: {
      type: "string",
      description: "UUID of a participant in the live session",
    },
    name: {
      type: "string",
      description: "Sender display name (with external_id)",
    },
    external_id: {
      type: "string",
      description: "Your identifier for the sender (with name)",
    },
  },
};

const qaParticipantSchema = {
  type: "object",
  description:
    'Acting participant: either { "id" } (UUID of an existing participant) or { "name", "external_id" }',
  properties: {
    id: {
      type: "string",
      description: "UUID of an existing participant",
    },
    name: {
      type: "string",
      description: "Participant display name (used with external_id)",
    },
    external_id: {
      type: "string",
      description: "External participant ID (used with name)",
    },
  },
};

/**
 * Register communication management tools with the MCP SDK
 *
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerCommunicationTools(): ToolDefinition[] {
  return [
    // Chat Management
    {
      name: "delete-session-chats",
      description:
        '[Communication Management] Delete all chat messages for a session. Use when users say: "delete session chat", "remove chat messages", "clear session chat history", "delete chat from session", "wipe chat messages". Requires sessionId. This permanently removes all chat data.',
      annotations: getToolAnnotations(
        "delete-session-chats",
        "Delete Session Chats",
      ),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session (not supported)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-chats",
      description:
        '[Communication Management] Delete all chat messages from ALL sessions in a room. Use when users say: "delete all room chats", "clear room chat history", "remove all chat messages from room", "wipe room chats". Requires roomId. Affects all past and current sessions.',
      annotations: getToolAnnotations("delete-room-chats", "Delete Room Chats"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete chats from",
          },
        },
        required: ["roomId"],
      },
    },

    // Q&A Management
    {
      name: "delete-session-qa",
      description:
        '[Communication Management] Delete all Q&A (questions and answers) from a session. Use when users say: "delete session Q&A", "remove questions and answers", "clear Q&A history", "delete session questions", "wipe Q&A data". Requires sessionId. Removes all Q&A interactions.',
      annotations: getToolAnnotations(
        "delete-session-qa",
        "Delete Session Q&A",
      ),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session (not supported)",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-qa",
      description:
        '[Communication Management] Delete all Q&A from ALL sessions in a room. Use when users say: "delete all room Q&A", "clear room questions", "remove all Q&A from room", "wipe room Q&A history". Requires roomId. Affects all sessions\' Q&A data.',
      annotations: getToolAnnotations("delete-room-qa", "Delete Room Q&A"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete Q&A from",
          },
        },
        required: ["roomId"],
      },
    },

    // Transcript Management
    {
      name: "list-room-transcripts",
      description:
        '[Communication Management] Get closed captioning transcripts for a room. Use when users say: "get room transcripts", "show transcription", "list captions", "view closed captions", "get transcript history". Returns paginated list of transcript entries with participant info.',
      annotations: getToolAnnotations(
        "list-room-transcripts",
        "List Room Transcripts",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to get transcripts from",
          },
          session_id: {
            type: "string",
            description: "Optional: Filter transcripts by specific session ID",
          },
          limit: {
            type: "number",
            description:
              "Maximum number of transcripts to return (default 100)",
          },
          offset: {
            type: "number",
            description: "Number of transcripts to skip for pagination",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "list-session-transcripts",
      description:
        '[Communication Management] Get closed captioning transcripts for a specific session. Use when users say: "get session transcript", "show meeting captions", "view session transcription". Returns paginated transcript entries for a single session.',
      annotations: getToolAnnotations(
        "list-session-transcripts",
        "List Session Transcripts",
      ),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The ID of the session to get transcripts from",
          },
          limit: {
            type: "number",
            description:
              "Maximum number of transcripts to return (default 100)",
          },
          offset: {
            type: "number",
            description: "Number of transcripts to skip for pagination",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "export-room-transcripts",
      description:
        '[Communication Management] Export all room transcripts to a file format. Use when users say: "export room transcript", "download captions", "save transcript as text", "export closed captions". Supports txt or json format.',
      annotations: getToolAnnotations(
        "export-room-transcripts",
        "Export Room Transcripts",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to export transcripts from",
          },
          format: {
            type: "string",
            enum: ["txt", "json"],
            description:
              "Export format: txt (plain text) or json (default: txt)",
          },
          locale: {
            type: "string",
            enum: ["en", "it", "de", "es"],
            description: "Export language (default: en)",
          },
          session_id: {
            type: "string",
            description:
              "Only export the transcripts of this session of the room",
          },
          timezone: {
            type: "string",
            description:
              "IANA time zone for timestamps in the export, e.g. Europe/London (default: UTC)",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "delete-session-transcripts",
      description:
        '[Communication Management] Delete all transcription data from a session. Use when users say: "delete session transcript", "remove transcription", "clear transcript", "delete meeting transcript", "wipe transcription data". Requires sessionId. Permanently removes transcript records.',
      annotations: getToolAnnotations(
        "delete-session-transcripts",
        "Delete Session Transcripts",
      ),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The ID of the session to delete transcripts from",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "delete-room-transcripts",
      description:
        '[Communication Management] Delete all transcripts from a room. Use when users say: "delete all room transcripts", "clear room transcription history", "remove all transcripts from room", "wipe room transcripts". Requires roomId. Permanently removes all transcript records.',
      annotations: getToolAnnotations(
        "delete-room-transcripts",
        "Delete Room Transcripts",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to delete transcripts from",
          },
        },
        required: ["room_id"],
      },
    },

    // Summary Management
    {
      name: "delete-session-summaries",
      description:
        '[Communication Management] Delete AI-generated summaries from a session. Use when users say: "delete session summary", "remove AI summary", "clear meeting summary", "delete session notes", "wipe summary data". Requires sessionId. Removes all AI-generated session summaries.',
      annotations: getToolAnnotations(
        "delete-session-summaries",
        "Delete Session Summaries",
      ),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session to delete summaries from",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "delete-room-summaries",
      description:
        '[Communication Management] Delete all AI summaries from ALL sessions in a room. Use when users say: "delete all room summaries", "clear room AI summaries", "remove all summaries from room", "wipe room summary history". Requires roomId. Affects all sessions\' AI summaries.',
      annotations: getToolAnnotations(
        "delete-room-summaries",
        "Delete Room Summaries",
      ),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to delete summaries from",
          },
        },
        required: ["roomId"],
      },
    },

    // Session Data Cleanup
    {
      name: "delete-session-recordings",
      description:
        '[Communication Management] Delete all recordings from a session. Use when users say: "delete session recordings", "remove session videos", "clear session recordings". Requires session_id. Permanently removes all recording data for the session.',
      annotations: getToolAnnotations(
        "delete-session-recordings",
        "Delete Session Recordings",
      ),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The ID of the session to delete recordings from",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "delete-session-resources",
      description:
        '[Communication Management] Permanently delete ALL stored data for a session: recordings, transcripts, summaries, chat, Q&A, polls, quizzes, restream records, shared files and the banned-participant list. This is NOT a shared-files-only cleanup - it is the same operation as hard-delete-session-resources, and there is no undo. Use when users say: "delete session resources", "delete everything stored for this session", "wipe session data". To remove one kind of data only, use the specific tool instead (delete-session-chats, delete-session-recordings, delete-session-transcripts, ...). Requires session_id.',
      annotations: getToolAnnotations(
        "delete-session-resources",
        "Delete Session Resources",
      ),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description:
              "The ID of the session whose stored data (all of it) will be deleted",
          },
        },
        required: ["session_id"],
      },
    },

    // Live Chat / Q&A Interaction
    {
      name: "list-chat-messages",
      description:
        '[Communication Management] List a room\'s chat messages as JSON. Use when users say: "show the chat", "what was said in chat", "list chat messages", "read the room chat". Requires room_id; filter by session_id and page with limit/offset. Each message has its text, sender, breakout and reply parent, newest first. Only rooms with chat persistence enabled (chat_persistence_enabled) keep any messages; use export-chat-messages for a txt/json file instead.',
      annotations: getToolAnnotations(
        "list-chat-messages",
        "List Chat Messages",
      ),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          session_id: {
            type: "string",
            description: "Only return messages from this session of the room",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 100,
            description:
              "Maximum number of messages to return (1-100, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            description: "Number of messages to skip, for pagination",
          },
          order: {
            type: "string",
            enum: ["asc", "desc"],
            description:
              "Sort by creation time: desc (newest first, the default) or asc",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "list-questions",
      description:
        '[Q&A Management] List a room\'s Q&A questions as JSON, with their votes and answers. Use when users say: "show the questions", "list Q&A", "what questions were asked", "get the question id". Requires room_id; filter by session_id and page with limit/offset. Newest first. Gives the question ids that update-question, answer-question and the other Q&A tools need; use export-qa-data for a file instead.',
      annotations: getToolAnnotations("list-questions", "List Questions"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room",
          },
          session_id: {
            type: "string",
            description: "Only return questions from this session of the room",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 100,
            description:
              "Maximum number of questions to return (1-100, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            description: "Number of questions to skip, for pagination",
          },
          order: {
            type: "string",
            enum: ["asc", "desc"],
            description:
              "Sort by creation time: desc (newest first, the default) or asc",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "send-chat-message",
      description:
        '[Communication Management] Send a chat message into a room\'s live session, as a given participant. Use when users say: "send a message to the room", "post in chat", "send chat message". Requires roomId, message and participant. The room must have a live session: an idle room is refused with "room is not active", and end-to-end encrypted sessions are refused too. Where the room persists chat, the message is confirmed by reading the room chat back (see list-chat-messages); elsewhere the result says the API accepted it, which is all that can be checked.',
      annotations: getToolAnnotations("send-chat-message", "Send Chat Message"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room to send the message to",
          },
          message: {
            type: "string",
            minLength: 1,
            maxLength: 1024,
            description: "The chat message text (1-1024 characters)",
          },
          participant: chatParticipantSchema,
          breakoutId: {
            type: "string",
            description:
              "UUID of a breakout room in this room, to send the message there instead of the main room",
          },
        },
        required: ["roomId", "message", "participant"],
      },
    },
    {
      name: "create-question",
      description:
        '[Q&A Management] Create a question in a room. Use when users say: "ask a question", "post a question", "add a question to the Q&A". Requires roomId, question text, and participant identity.',
      annotations: getToolAnnotations("create-question", "Create Question"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "The ID of the room",
          },
          question: {
            type: "string",
            description: "The question text",
          },
          participant: qaParticipantSchema,
          anonymous: {
            type: "boolean",
            description: "Whether to show the question as anonymous",
          },
          breakoutId: {
            type: "string",
            description: "Optional UUID of a breakout room",
          },
        },
        required: ["roomId", "question", "participant"],
      },
    },
    {
      name: "update-question",
      description:
        "[Q&A Management] Update the text of an existing question. Requires roomId, questionId, new question text, and participant identity.",
      annotations: getToolAnnotations("update-question", "Update Question"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          question: { type: "string", description: "The new question text" },
          participant: qaParticipantSchema,
        },
        required: ["roomId", "questionId", "question", "participant"],
      },
    },
    {
      name: "delete-question",
      description:
        "[Q&A Management] Delete a single question from a room. Requires roomId, questionId, and participant identity. For deleting ALL Q&A use delete-room-qa.",
      annotations: getToolAnnotations("delete-question", "Delete Question"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          participant: qaParticipantSchema,
        },
        required: ["roomId", "questionId", "participant"],
      },
    },
    ...[
      {
        name: "dismiss-question",
        title: "Dismiss Question",
        desc: "Dismiss a question so it no longer appears in the active list.",
      },
      {
        name: "reopen-question",
        title: "Reopen Question",
        desc: "Reopen a previously dismissed question.",
      },
      {
        name: "upvote-question",
        title: "Upvote Question",
        desc: "Upvote a question on behalf of a participant.",
      },
      {
        name: "remove-question-vote",
        title: "Remove Question Vote",
        desc: "Remove a participant's vote from a question.",
      },
      {
        name: "start-question-live-answer",
        title: "Start Live Answer",
        desc: "Start a live (verbal) answer to a question.",
      },
      {
        name: "stop-question-live-answer",
        title: "Stop Live Answer",
        desc: "Stop a live answer, marking the question as answered.",
      },
      {
        name: "cancel-question-live-answer",
        title: "Cancel Live Answer",
        desc: "Cancel a live answer without marking the question as answered.",
      },
    ].map((t) => ({
      name: t.name,
      description: `[Q&A Management] ${t.desc} Requires roomId, questionId, and participant identity.`,
      annotations: getToolAnnotations(t.name, t.title),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          participant: qaParticipantSchema,
        },
        required: ["roomId", "questionId", "participant"],
      },
    })),
    {
      name: "answer-question",
      description:
        "[Q&A Management] Post a text answer to a question. Requires roomId, questionId, answer text, and participant identity. Set private to true for a private answer.",
      annotations: getToolAnnotations("answer-question", "Answer Question"),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          answer: { type: "string", description: "The answer text" },
          participant: qaParticipantSchema,
          private: {
            type: "boolean",
            description: "Whether the answer is private",
          },
        },
        required: ["roomId", "questionId", "answer", "participant"],
      },
    },
    {
      name: "update-question-answer",
      description:
        "[Q&A Management] Update the text of an existing answer. Requires roomId, questionId, answerId, new answer text, and participant identity.",
      annotations: getToolAnnotations(
        "update-question-answer",
        "Update Answer",
      ),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          answerId: { type: "string", description: "The ID of the answer" },
          answer: { type: "string", description: "The new answer text" },
          participant: qaParticipantSchema,
        },
        required: ["roomId", "questionId", "answerId", "answer", "participant"],
      },
    },
    {
      name: "delete-question-answer",
      description:
        "[Q&A Management] Delete an answer from a question. Requires roomId, questionId, answerId, and participant identity.",
      annotations: getToolAnnotations(
        "delete-question-answer",
        "Delete Answer",
      ),
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "The ID of the room" },
          questionId: {
            type: "string",
            description: "The ID of the question",
          },
          answerId: { type: "string", description: "The ID of the answer" },
          participant: qaParticipantSchema,
        },
        required: ["roomId", "questionId", "answerId", "participant"],
      },
    },
  ];
}

/**
 * Execute a communication management tool
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeCommunicationTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  switch (toolName) {
    // Chat Management
    case "delete-session-chats":
      return handleDeleteSessionChats(params, apiClient);
    case "delete-room-chats":
      return handleDeleteRoomChats(params, apiClient);

    // Q&A Management
    case "delete-session-qa":
      return handleDeleteSessionQA(params, apiClient);
    case "delete-room-qa":
      return handleDeleteRoomQA(params, apiClient);

    // Transcript Management
    case "list-room-transcripts":
      return handleListRoomTranscripts(params, apiClient);
    case "list-session-transcripts":
      return handleListSessionTranscripts(params, apiClient);
    case "export-room-transcripts":
      return handleExportRoomTranscripts(params, apiClient);
    case "delete-session-transcripts":
      return handleDeleteSessionTranscripts(params, apiClient);
    case "delete-room-transcripts":
      return handleDeleteRoomTranscripts(params, apiClient);

    // Summary Management
    case "delete-session-summaries":
      return handleDeleteSessionSummaries(params, apiClient);
    case "delete-room-summaries":
      return handleDeleteRoomSummaries(params, apiClient);

    // Session Data Cleanup
    case "delete-session-recordings":
      return handleDeleteSessionRecordings(params, apiClient);
    case "delete-session-resources":
      return handleDeleteSessionResources(params, apiClient);

    // Live Chat / Q&A Interaction
    case "list-chat-messages":
      return handleListRoomItems(params, "chat messages", (roomId, query) =>
        apiClient.listChatMessages(roomId, query),
      );
    case "list-questions":
      return handleListRoomItems(params, "questions", (roomId, query) =>
        apiClient.listQuestions(roomId, query),
      );
    case "send-chat-message":
      return handleSendChatMessage(params, apiClient);
    case "create-question":
      return handleCreateQuestion(params, apiClient);
    case "update-question":
      return handleUpdateQuestion(params, apiClient);
    case "delete-question":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.deleteQuestion(p.roomId, p.questionId, p.participant),
        "Deleted question",
      );
    case "dismiss-question":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.dismissQuestion(p.roomId, p.questionId, p.participant),
        "Dismissed",
      );
    case "reopen-question":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.reopenQuestion(p.roomId, p.questionId, p.participant),
        "Reopened",
      );
    case "upvote-question":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.upvoteQuestion(p.roomId, p.questionId, p.participant),
        "Upvoted",
      );
    case "remove-question-vote":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.removeQuestionVote(p.roomId, p.questionId, p.participant),
        "Removed vote from",
      );
    case "start-question-live-answer":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.startLiveAnswer(p.roomId, p.questionId, p.participant),
        "Started live answer for",
      );
    case "stop-question-live-answer":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.stopLiveAnswer(p.roomId, p.questionId, p.participant),
        "Stopped live answer for",
      );
    case "cancel-question-live-answer":
      return handleQuestionAction(
        params,
        apiClient,
        (c, p) => c.cancelLiveAnswer(p.roomId, p.questionId, p.participant),
        "Cancelled live answer for",
      );
    case "answer-question":
      return handleAnswerQuestion(params, apiClient);
    case "update-question-answer":
      return handleUpdateAnswer(params, apiClient);
    case "delete-question-answer":
      return handleDeleteAnswer(params, apiClient);

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle delete session chats
 */
async function handleDeleteSessionChats(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete chats.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session chats", { sessionId });

  try {
    await apiClient.deleteSessionChats(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all chat messages for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session chats", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session chats: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room chats
 */
async function handleDeleteRoomChats(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete chats.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room chats", { roomId });

  try {
    // Use the correct API endpoint for room chat deletion
    await apiClient.deleteChatMessages(roomId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all chat messages from room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room chats", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room chats: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session Q&A
 */
async function handleDeleteSessionQA(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete Q&A.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session Q&A", { sessionId });

  try {
    await apiClient.deleteSessionQA(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all questions and answers for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session Q&A", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session Q&A: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room Q&A
 */
async function handleDeleteRoomQA(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete Q&A.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room Q&A", { roomId });

  try {
    // Use the correct API endpoint for room Q&A deletion
    await apiClient.deleteQA(roomId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all Q&A from room ${roomId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room Q&A", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room Q&A: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list room transcripts
 */
async function handleListRoomTranscripts(
  params: {
    room_id: string;
    session_id?: string;
    limit?: number;
    offset?: number;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, session_id, limit, offset } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to list transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Listing room transcripts", { room_id, session_id });

  try {
    const transcripts = await apiClient.getRoomTranscripts(room_id, {
      session_id,
      limit,
      offset,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(transcripts, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing room transcripts", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error listing room transcripts: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list session transcripts
 */
async function handleListSessionTranscripts(
  params: { session_id: string; limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id, limit, offset } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to list transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Listing session transcripts", { session_id });

  try {
    const transcripts = await apiClient.getSessionTranscripts(session_id, {
      limit,
      offset,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(transcripts, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing session transcripts", {
      session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error listing session transcripts: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle export room transcripts
 */
async function handleExportRoomTranscripts(
  params: {
    room_id: string;
    format?: "txt" | "json";
    locale?: string;
    session_id?: string;
    timezone?: string;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, format, locale, session_id, timezone } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to export transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Exporting room transcripts", { room_id, format });

  try {
    const exportData = await apiClient.exportRoomTranscripts(room_id, {
      format,
      locale,
      session_id,
      timezone,
    });

    return {
      content: [
        {
          type: "text",
          text: exportData,
        },
      ],
    };
  } catch (error) {
    logger.error("Error exporting room transcripts", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error exporting room transcripts: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session transcripts
 */
async function handleDeleteSessionTranscripts(
  params: { session_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session transcripts", { session_id });

  try {
    await apiClient.deleteSessionData(session_id, "transcripts");

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all transcripts for session ${session_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session transcripts", {
      session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session transcripts: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${session_id} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room transcripts - uses direct API call
 */
async function handleDeleteRoomTranscripts(
  params: { room_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete transcripts.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room transcripts", { room_id });

  try {
    // Use direct API call instead of iterating through sessions
    await apiClient.deleteRoomTranscripts(room_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all transcripts for room ${room_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room transcripts", {
      room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting room transcripts: ${errorMessage}`;

    if (
      errorMessage.includes("Room not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Room with ID ${room_id} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session summaries
 */
async function handleDeleteSessionSummaries(
  params: { sessionId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { sessionId } = params;

  if (!sessionId || sessionId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete summaries.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session summaries", { sessionId });

  try {
    await apiClient.deleteSessionSummaries(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all AI-generated summaries for session ${sessionId}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session summaries", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session summaries: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${sessionId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete room summaries
 */
async function handleDeleteRoomSummaries(
  params: { roomId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId } = params;

  if (!roomId || roomId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete summaries.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room summaries", { roomId });

  try {
    // One room-level call. The earlier per-session loop stopped at the first
    // 100 sessions and reported a session count as if it were the result.
    await apiClient.deleteRoomSummaries(roomId);

    // There is no room-level read for summaries, so this cannot be read back.
    return {
      content: [
        {
          type: "text",
          text: `Deleted the AI summaries of all sessions in room ${roomId} (accepted by the API; there is no room-level summary listing to verify against).`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room summaries", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error deleting room summaries: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session recordings
 */
async function handleDeleteSessionRecordings(
  params: { session_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete recordings.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session recordings", { session_id });

  try {
    await apiClient.deleteSessionRecordings(session_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all recordings for session ${session_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session recordings", {
      session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session recordings: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${session_id} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle delete session resources
 */
async function handleDeleteSessionResources(
  params: { session_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete resources.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session resources", { session_id });

  try {
    await apiClient.deleteSessionResources(session_id);

    return {
      content: [
        {
          type: "text",
          text: `Permanently deleted all stored data for session ${session_id}: recordings, transcripts, summaries, chat, Q&A, polls, quizzes, restream records, shared files and the banned-participant list.`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session resources", {
      session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session resources: ${errorMessage}`;

    if (
      errorMessage.includes("Session not found") ||
      errorMessage.includes("404")
    ) {
      displayMessage = `Session with ID ${session_id} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list-chat-messages and list-questions: a room-scoped paginated read.
 */
async function handleListRoomItems(
  params: {
    room_id?: string;
    session_id?: string;
    limit?: number;
    offset?: number;
    order?: "asc" | "desc";
  },
  what: string,
  list: (roomId: string, query: Record<string, unknown>) => Promise<unknown>,
): Promise<any> {
  const { room_id, session_id, limit, offset, order } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [{ type: "text", text: `Room ID is required to list ${what}.` }],
      isError: true,
    };
  }

  try {
    logger.info(`Listing ${what}`, { room_id, session_id });
    const result = await list(room_id, { session_id, limit, offset, order });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error listing ${what}`, { room_id, error: message });
    return {
      content: [{ type: "text", text: `Error listing ${what}: ${message}` }],
      isError: true,
    };
  }
}

/**
 * Validation + error-handling wrapper shared by the Q&A interaction handlers
 */
async function runQaHandler(
  requiredFields: Record<string, any>,
  action: () => Promise<any>,
  verb: string,
  describe: string,
): Promise<any> {
  // No read-back for these: the question list carries no dismissed or
  // live-answer state, so it cannot tell "applied" from "accepted and ignored"
  // for most of them. verifiedWrite reports the response body's
  // evidence when there is any, and says plainly that it is unverified when
  // there is not.
  return verifiedWrite({
    required: requiredFields,
    describe,
    verb,
    errorLabel: `on ${describe}`,
    action,
  });
}

/**
 * Handle send chat message
 *
 * The API forwards the message to the signalling server and returns an error
 * when it is refused (no live session, E2EE, or a signalling failure), so a
 * success response means the message was handed over. The room's chat list is
 * the read-back, and it only holds anything when the room persists chat; it
 * decides the outcome there and is skipped elsewhere.
 */
async function handleSendChatMessage(
  params: {
    roomId: string;
    message: string;
    participant: any;
    breakoutId?: string;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, message, participant, breakoutId } = params;
  const persists = await roomPersistsChat(roomId, apiClient);

  return verifiedWrite({
    required: { roomId, message, participant },
    describe: `a chat message to room ${roomId}${breakoutId ? ` (breakout ${breakoutId})` : ""}`,
    verb: "Sent",
    errorLabel: "sending chat message",
    action: () => {
      logger.info("Sending chat message", { roomId, persists });
      return apiClient.sendChatMessage(roomId, {
        message,
        participant,
        ...(breakoutId ? { breakout_id: breakoutId } : {}),
      });
    },
    verify: persists
      ? async () => {
          // The signalling server stores the message after relaying it, so
          // give the chat list a few seconds before calling it missing.
          for (let attempt = 0; attempt < CHAT_READBACK_ATTEMPTS; attempt++) {
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, CHAT_READBACK_DELAY_MS));
            }
            const recent = await apiClient.listChatMessages(roomId, {
              limit: 100,
              order: "desc",
            });
            const found = recent?.data?.find((m) => m.message === message);
            if (found) {
              return { landed: true, evidence: `chat message id ${found.id}` };
            }
          }
          return {
            landed: false,
            evidence: "the message is absent from the room's chat messages",
          };
        }
      : undefined,
  });
}

const CHAT_READBACK_ATTEMPTS = 4;
const CHAT_READBACK_DELAY_MS = 1000;

/**
 * Whether a room persists chat, i.e. whether its chat list can serve as a
 * read-back. Returns false if the room cannot be read.
 */
async function roomPersistsChat(
  roomId: string,
  apiClient: DigitalSambaApiClient,
): Promise<boolean> {
  try {
    const room = await apiClient.getRoom(roomId);
    return room?.chat_persistence_enabled === true;
  } catch (error) {
    logger.warn("Could not read room settings to verify chat delivery", {
      roomId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Find a room's question by predicate, newest first, paging through the
 * question list (the API caps a page at 100). Stops after QUESTION_SCAN_PAGES
 * pages; rooms with more questions than that are not a realistic read-back
 * target.
 */
async function findQuestion(
  roomId: string,
  predicate: (q: QuestionRecord) => boolean,
  apiClient: DigitalSambaApiClient,
): Promise<QuestionRecord | undefined> {
  const limit = 100;
  for (let page = 0; page < QUESTION_SCAN_PAGES; page++) {
    const result = await apiClient.listQuestions(roomId, {
      limit,
      offset: page * limit,
      order: "desc",
    });
    const rows = result?.data ?? [];
    const found = rows.find(predicate);
    if (found) return found;
    if (rows.length < limit) return undefined;
  }
  return undefined;
}

const QUESTION_SCAN_PAGES = 10;

/**
 * Handle create question
 */
async function handleCreateQuestion(
  params: {
    roomId: string;
    question: string;
    participant: any;
    anonymous?: boolean;
    breakoutId?: string;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, question, participant, anonymous, breakoutId } = params;

  return verifiedWrite({
    required: { roomId, question, participant },
    describe: `a question in room ${roomId}`,
    verb: "Created",
    errorLabel: "creating question",
    action: () => {
      logger.info("Creating question", { roomId });
      return apiClient.createQuestion(roomId, {
        participant,
        question,
        ...(anonymous !== undefined && { anonymous }),
        ...(breakoutId !== undefined && { breakout_id: breakoutId }),
      });
    },
    // The create endpoint returns no id, so read the questions back both to
    // confirm the question exists and to recover the id the caller needs to
    // act on it. Newest first, so the first match is the one just created.
    verify: async () => {
      const found = await findQuestion(
        roomId,
        (q) => q.question === question,
        apiClient,
      );
      return found
        ? { landed: true, evidence: `question id ${found.id}` }
        : {
            landed: false,
            evidence: "the question is absent from the room's questions",
          };
    },
  });
}

/**
 * Handle update question
 */
async function handleUpdateQuestion(
  params: {
    roomId: string;
    questionId: string;
    question: string;
    participant: any;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, questionId, question, participant } = params;
  return runQaHandler(
    { roomId, questionId, question, participant },
    async () => {
      logger.info("Updating question", { roomId, questionId });
      return apiClient.updateQuestion(roomId, questionId, {
        participant,
        question,
      });
    },
    "Updated",
    `question ${questionId}`,
  );
}

/**
 * Handle the simple question actions (delete/dismiss/reopen/vote/live-answer)
 */
async function handleQuestionAction(
  params: { roomId: string; questionId: string; participant: any },
  apiClient: DigitalSambaApiClient,
  action: (
    client: DigitalSambaApiClient,
    params: { roomId: string; questionId: string; participant: any },
  ) => Promise<unknown>,
  verb: string,
): Promise<any> {
  const { roomId, questionId, participant } = params;
  return runQaHandler(
    { roomId, questionId, participant },
    async () => {
      logger.info(`${verb} question`, { roomId, questionId });
      return action(apiClient, params);
    },
    verb,
    `question ${questionId}`,
  );
}

/**
 * Handle answer question
 */
async function handleAnswerQuestion(
  params: {
    roomId: string;
    questionId: string;
    answer: string;
    participant: any;
    private?: boolean;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, questionId, answer, participant } = params;

  return verifiedWrite({
    required: { roomId, questionId, answer, participant },
    describe: `question ${questionId}`,
    verb: "Answered",
    errorLabel: "answering question",
    action: () => {
      logger.info("Answering question", { roomId, questionId });
      return apiClient.answerQuestion(roomId, questionId, {
        participant,
        answer,
        ...(params.private !== undefined && { private: params.private }),
      });
    },
    verify: async () => {
      const target = await findQuestion(
        roomId,
        (q) => q.id === questionId,
        apiClient,
      );
      if (!target) {
        return {
          landed: false,
          evidence: `question ${questionId} is not among the room's questions`,
        };
      }
      const match = (target.answers ?? []).find(
        (a: any) => a?.answer === answer,
      ) as { id?: string } | undefined;
      return match
        ? { landed: true, evidence: `answer id ${match.id}` }
        : {
            landed: false,
            evidence: "the answer is absent from the question's answers",
          };
    },
  });
}

/**
 * Handle update answer
 */
async function handleUpdateAnswer(
  params: {
    roomId: string;
    questionId: string;
    answerId: string;
    answer: string;
    participant: any;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, questionId, answerId, answer, participant } = params;
  return runQaHandler(
    { roomId, questionId, answerId, answer, participant },
    async () => {
      logger.info("Updating answer", { roomId, questionId, answerId });
      return apiClient.updateAnswer(roomId, questionId, answerId, {
        participant,
        answer,
      });
    },
    "Updated",
    `answer ${answerId}`,
  );
}

/**
 * Handle delete answer
 */
async function handleDeleteAnswer(
  params: {
    roomId: string;
    questionId: string;
    answerId: string;
    participant: any;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { roomId, questionId, answerId, participant } = params;
  return runQaHandler(
    { roomId, questionId, answerId, participant },
    async () => {
      logger.info("Deleting answer", { roomId, questionId, answerId });
      return apiClient.deleteAnswer(roomId, questionId, answerId, participant);
    },
    "Deleted",
    `answer ${answerId}`,
  );
}
