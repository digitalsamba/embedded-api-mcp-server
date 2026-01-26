/**
 * Digital Samba MCP Server - Quiz Management Tools
 *
 * This module implements tools for managing quizzes within Digital Samba rooms.
 * It provides MCP tools for creating, updating, deleting, and managing quiz results.
 *
 * Tools provided:
 * - list-room-quizzes: List all quizzes in a room
 * - create-quiz: Create a new quiz in a room
 * - get-quiz: Get details of a specific quiz
 * - update-quiz: Update an existing quiz
 * - delete-quiz: Delete a specific quiz
 * - delete-room-quizzes: Delete all quizzes in a room
 * - delete-session-quizzes: Delete all quizzes for a session
 * - get-quiz-results: Get quiz results
 *
 * @module tools/quiz-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// MCP SDK imports
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

// Local modules
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";
import { getToolAnnotations } from "../../tool-annotations.js";

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
 * Register quiz management tools with the MCP SDK
 *
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerQuizTools(): ToolDefinition[] {
  return [
    {
      name: "list-room-quizzes",
      description:
        '[Quiz Management] List all quizzes in a room. Use when users say: "list quizzes", "show quizzes", "get all quizzes", "what quizzes exist". Returns paginated list of quizzes with their questions and settings.',
      annotations: getToolAnnotations("list-room-quizzes", "List Room Quizzes"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to list quizzes for",
          },
          limit: {
            type: "number",
            description: "Maximum number of quizzes to return (default: 10)",
          },
          offset: {
            type: "number",
            description: "Number of quizzes to skip for pagination",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "create-quiz",
      description:
        '[Quiz Management] Create a new quiz in a room. Use when users say: "create a quiz", "add a quiz", "make a quiz", "create assessment", "add test questions". Requires room_id, title, and questions with choices. Each question must have at least one correct answer.',
      annotations: getToolAnnotations("create-quiz", "Create Quiz"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to create the quiz in",
          },
          title: {
            type: "string",
            description: "The title of the quiz",
          },
          time_limit_minutes: {
            type: "number",
            description: "Optional time limit in minutes for completing the quiz",
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The question text",
                },
                choices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: {
                        type: "string",
                        description: "The choice text",
                      },
                      correct: {
                        type: "boolean",
                        description: "Whether this choice is correct",
                      },
                    },
                    required: ["text", "correct"],
                  },
                  minItems: 2,
                  description: "Array of choices (minimum 2)",
                },
              },
              required: ["text", "choices"],
            },
            minItems: 1,
            description: "Array of questions with choices (minimum 1)",
          },
        },
        required: ["room_id", "title", "questions"],
      },
    },
    {
      name: "get-quiz",
      description:
        '[Quiz Management] Get details of a specific quiz. Use when users say: "show quiz details", "get quiz", "view quiz", "quiz information". Requires room_id and quiz_id. Returns quiz with all questions and choices.',
      annotations: getToolAnnotations("get-quiz", "Get Quiz"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the quiz",
          },
          quiz_id: {
            type: "string",
            description: "The ID of the quiz to retrieve",
          },
        },
        required: ["room_id", "quiz_id"],
      },
    },
    {
      name: "update-quiz",
      description:
        '[Quiz Management] Update an existing quiz. Use when users say: "update quiz", "edit quiz", "change quiz", "modify quiz questions". Requires room_id and quiz_id. Can update title, time limit, or questions.',
      annotations: getToolAnnotations("update-quiz", "Update Quiz"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the quiz",
          },
          quiz_id: {
            type: "string",
            description: "The ID of the quiz to update",
          },
          title: {
            type: "string",
            description: "Updated quiz title",
          },
          time_limit_minutes: {
            type: "number",
            description: "Updated time limit in minutes",
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The question text",
                },
                choices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: {
                        type: "string",
                        description: "The choice text",
                      },
                      correct: {
                        type: "boolean",
                        description: "Whether this choice is correct",
                      },
                    },
                    required: ["text", "correct"],
                  },
                  description: "Array of choices",
                },
              },
              required: ["text", "choices"],
            },
            description: "Updated array of questions",
          },
        },
        required: ["room_id", "quiz_id"],
      },
    },
    {
      name: "delete-quiz",
      description:
        '[Quiz Management] Delete a specific quiz from a room. Use when users say: "delete quiz", "remove quiz", "delete assessment". Requires room_id and quiz_id. This action cannot be undone.',
      annotations: getToolAnnotations("delete-quiz", "Delete Quiz"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the quiz",
          },
          quiz_id: {
            type: "string",
            description: "The ID of the quiz to delete",
          },
        },
        required: ["room_id", "quiz_id"],
      },
    },
    {
      name: "delete-room-quizzes",
      description:
        '[Quiz Management] Delete ALL quizzes from a room. Use when users say: "delete all quizzes", "remove all quizzes from room", "clear room quizzes". Requires room_id. This action cannot be undone.',
      annotations: getToolAnnotations("delete-room-quizzes", "Delete Room Quizzes"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room to delete quizzes from",
          },
        },
        required: ["room_id"],
      },
    },
    {
      name: "delete-session-quizzes",
      description:
        '[Quiz Management] Delete ALL quizzes from a specific session. Use when users say: "delete session quizzes", "remove quizzes from session", "clear session quiz data". Requires session_id.',
      annotations: getToolAnnotations("delete-session-quizzes", "Delete Session Quizzes"),
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The ID of the session to delete quizzes from",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "get-quiz-results",
      description:
        '[Quiz Management] Get quiz results and participant scores. Use when users say: "show quiz results", "get quiz scores", "view quiz answers", "who passed the quiz". Requires room_id and quiz_id. Optionally filter by session_id.',
      annotations: getToolAnnotations("get-quiz-results", "Get Quiz Results"),
      inputSchema: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "The ID of the room containing the quiz",
          },
          quiz_id: {
            type: "string",
            description: "The ID of the quiz to get results for",
          },
          session_id: {
            type: "string",
            description: "Optional session ID to filter results",
          },
        },
        required: ["room_id", "quiz_id"],
      },
    },
  ];
}

/**
 * Execute a quiz management tool
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeQuizTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  switch (toolName) {
    case "list-room-quizzes":
      return handleListRoomQuizzes(params, apiClient);
    case "create-quiz":
      return handleCreateQuiz(params, apiClient);
    case "get-quiz":
      return handleGetQuiz(params, apiClient);
    case "update-quiz":
      return handleUpdateQuiz(params, apiClient);
    case "delete-quiz":
      return handleDeleteQuiz(params, apiClient);
    case "delete-room-quizzes":
      return handleDeleteRoomQuizzes(params, apiClient);
    case "delete-session-quizzes":
      return handleDeleteSessionQuizzes(params, apiClient);
    case "get-quiz-results":
      return handleGetQuizResults(params, apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle list room quizzes
 */
async function handleListRoomQuizzes(
  params: { room_id: string; limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, limit, offset } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to list quizzes.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Listing room quizzes", { roomId: room_id });

  try {
    const result = await apiClient.listQuizzes(room_id, { limit, offset });

    const quizzes = result.data || [];
    if (quizzes.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No quizzes found for room ${room_id}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Found ${quizzes.length} quiz(es) in room ${room_id}:\n\n${JSON.stringify(quizzes, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing room quizzes", {
      roomId: room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error listing quizzes: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle create quiz
 */
async function handleCreateQuiz(
  params: {
    room_id: string;
    title: string;
    time_limit_minutes?: number;
    questions: Array<{
      text: string;
      choices: Array<{ text: string; correct: boolean }>;
    }>;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, title, time_limit_minutes, questions } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to create a quiz.",
        },
      ],
      isError: true,
    };
  }

  if (!title || title.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Quiz title is required.",
        },
      ],
      isError: true,
    };
  }

  if (!questions || questions.length < 1) {
    return {
      content: [
        {
          type: "text",
          text: "At least 1 question is required.",
        },
      ],
      isError: true,
    };
  }

  // Validate each question has at least one correct answer
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.choices || q.choices.length < 2) {
      return {
        content: [
          {
            type: "text",
            text: `Question ${i + 1} must have at least 2 choices.`,
          },
        ],
        isError: true,
      };
    }
    const hasCorrect = q.choices.some((c) => c.correct);
    if (!hasCorrect) {
      return {
        content: [
          {
            type: "text",
            text: `Question ${i + 1} must have at least one correct answer.`,
          },
        ],
        isError: true,
      };
    }
  }

  logger.info("Creating quiz", {
    roomId: room_id,
    title,
    questionCount: questions.length,
  });

  try {
    const quizData = {
      title,
      time_limit_minutes,
      questions,
    };

    const result = await apiClient.createQuiz(room_id, quizData);

    return {
      content: [
        {
          type: "text",
          text: `Successfully created quiz "${title}" with ${questions.length} question(s) in room ${room_id}. Quiz ID: ${result.id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error creating quiz", {
      roomId: room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating quiz: ${errorMessage}`;

    if (errorMessage.includes("Room not found") || errorMessage.includes("404")) {
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
 * Handle get quiz
 */
async function handleGetQuiz(
  params: { room_id: string; quiz_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, quiz_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required.",
        },
      ],
      isError: true,
    };
  }

  if (!quiz_id || quiz_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Quiz ID is required.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting quiz", { roomId: room_id, quizId: quiz_id });

  try {
    const result = await apiClient.getQuiz(room_id, quiz_id);

    return {
      content: [
        {
          type: "text",
          text: `Quiz details:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting quiz", {
      roomId: room_id,
      quizId: quiz_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting quiz: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Quiz with ID ${quiz_id} not found in room ${room_id}`;
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
 * Handle update quiz
 */
async function handleUpdateQuiz(
  params: {
    room_id: string;
    quiz_id: string;
    title?: string;
    time_limit_minutes?: number;
    questions?: Array<{
      text: string;
      choices: Array<{ text: string; correct: boolean }>;
    }>;
  },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, quiz_id, ...updateData } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to update a quiz.",
        },
      ],
      isError: true,
    };
  }

  if (!quiz_id || quiz_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Quiz ID is required to update a quiz.",
        },
      ],
      isError: true,
    };
  }

  const hasUpdates = Object.keys(updateData).length > 0;
  if (!hasUpdates) {
    return {
      content: [
        {
          type: "text",
          text: "No updates provided for the quiz.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Updating quiz", { quizId: quiz_id, updates: Object.keys(updateData) });

  try {
    await apiClient.updateQuiz(room_id, quiz_id, updateData);

    const updateSummary = Object.keys(updateData).join(", ");

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated quiz ${quiz_id}. Updated fields: ${updateSummary}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error updating quiz", {
      quizId: quiz_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating quiz: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Quiz with ID ${quiz_id} not found`;
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
 * Handle delete quiz
 */
async function handleDeleteQuiz(
  params: { room_id: string; quiz_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, quiz_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete a quiz.",
        },
      ],
      isError: true,
    };
  }

  if (!quiz_id || quiz_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Quiz ID is required to delete a quiz.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting quiz", { roomId: room_id, quizId: quiz_id });

  try {
    await apiClient.deleteQuiz(room_id, quiz_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted quiz ${quiz_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting quiz", {
      quizId: quiz_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting quiz: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Quiz with ID ${quiz_id} not found`;
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
 * Handle delete room quizzes
 */
async function handleDeleteRoomQuizzes(
  params: { room_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to delete quizzes.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting room quizzes", { roomId: room_id });

  try {
    await apiClient.deleteRoomQuizzes(room_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all quizzes for room ${room_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting room quizzes", {
      roomId: room_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting room quizzes: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
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
 * Handle delete session quizzes
 */
async function handleDeleteSessionQuizzes(
  params: { session_id: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { session_id } = params;

  if (!session_id || session_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Session ID is required to delete quizzes.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Deleting session quizzes", { sessionId: session_id });

  try {
    await apiClient.deleteSessionQuizzes(session_id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted all quizzes for session ${session_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error deleting session quizzes", {
      sessionId: session_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting session quizzes: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
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
 * Handle get quiz results
 */
async function handleGetQuizResults(
  params: { room_id: string; quiz_id: string; session_id?: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { room_id, quiz_id, session_id } = params;

  if (!room_id || room_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Room ID is required to get quiz results.",
        },
      ],
      isError: true,
    };
  }

  if (!quiz_id || quiz_id.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Quiz ID is required to get quiz results.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting quiz results", { roomId: room_id, quizId: quiz_id, sessionId: session_id });

  try {
    const results = await apiClient.getQuizResults(room_id, quiz_id, session_id);

    if (!results || results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for quiz ${quiz_id}${session_id ? ` in session ${session_id}` : ""}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Quiz results (${results.length} submission(s)):\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting quiz results", {
      roomId: room_id,
      quizId: quiz_id,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting quiz results: ${errorMessage}`;

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      displayMessage = `Quiz with ID ${quiz_id} not found`;
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
