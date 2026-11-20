#!/usr/bin/env node
/**
 * Live smoke test against a real Digital Samba account.
 *
 * Drives the built MCP server over stdio as a real client would, so this covers
 * the whole stack — tool schemas, the CallTool dispatch (which matches on name
 * substrings, where ordering matters), the handlers, and the API.
 *
 * THE RULE THIS SCRIPT EXISTS TO ENFORCE: a tool's success message is not
 * evidence. Every write is verified by reading the state back. Two tools
 * shipped in v1.1.0 reporting success while doing nothing, and no amount of
 * reading their output would have revealed it.
 *
 * Usage:
 *   DIGITAL_SAMBA_API_URL=https://<dev-host>/api/v1 node scripts/smoke-test.mjs
 *
 * Requires a built server (npm run build) and DIGITAL_SAMBA_DEVELOPER_KEY,
 * which is read from the environment or .env.local — never passed on the
 * command line, where it would be visible in the process list.
 *
 * Exit code 0 = all checks passed (known API defects excepted), 1 = failure.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_TOOL_COUNT = 145;

// .env.local first (local dev secrets), then .env. Neither overrides a value
// already exported in the environment.
loadEnv({ path: resolve(ROOT, ".env.local") });
loadEnv({ path: resolve(ROOT, ".env") });

const KEY = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
const API_URL = process.env.DIGITAL_SAMBA_API_URL;
const KEEP = process.argv.includes("--keep");
const ALLOW_PROD = process.argv.includes("--i-know-this-is-production");

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

function refuse(message) {
  console.error(`\n  REFUSING TO RUN\n\n${message}\n`);
  process.exit(2);
}

if (!KEY) {
  refuse(
    `DIGITAL_SAMBA_DEVELOPER_KEY is not set.\n` +
      `Add it to .env.local (gitignored) or export it before running.`,
  );
}

if (!API_URL) {
  // Deliberately no default. The client's built-in default is production, and
  // this script creates and deletes rooms.
  refuse(
    `DIGITAL_SAMBA_API_URL is not set, and this script will not guess.\n\n` +
      `The API client defaults to production (https://api.digitalsamba.com/api/v1),\n` +
      `and this script creates and deletes rooms, libraries, roles and webhooks.\n` +
      `Set it explicitly to the environment you mean to test, e.g.\n\n` +
      `  DIGITAL_SAMBA_API_URL=https://<dev-host>/api/v1 node scripts/smoke-test.mjs`,
  );
}

if (/(^|\/\/)api\.digitalsamba\.com/.test(API_URL) && !ALLOW_PROD) {
  refuse(
    `DIGITAL_SAMBA_API_URL points at PRODUCTION:\n  ${API_URL}\n\n` +
      `This script creates and deletes real resources. If you genuinely mean to\n` +
      `run it against production, pass --i-know-this-is-production.`,
  );
}

if (!existsSync(resolve(ROOT, "dist/src/index.js"))) {
  refuse(`dist/src/index.js not found. Run "npm run build" first.`);
}

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

const results = [];
let currentGroup = "general";

const group = (name) => {
  currentGroup = name;
  console.log(`\n── ${name} ${"─".repeat(Math.max(0, 58 - name.length))}`);
};

function record(status, name, detail) {
  results.push({ status, name, detail, group: currentGroup });
  const mark = {
    PASS: "  ok  ",
    FAIL: " FAIL ",
    KNOWN: " known",
    FIXED: " FIXED",
    SKIP: " skip ",
  }[status];
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Run a check. `fn` must return a string describing the evidence that proves
 * the operation happened, or throw.
 */
async function check(name, fn) {
  try {
    record("PASS", name, await fn());
  } catch (error) {
    record("FAIL", name, error.message);
  }
}

/**
 * A check that is currently expected to fail because of a defect outside this
 * codebase. Keeps the gate green while staying visible — and shouts if the
 * defect is ever fixed, so the exception can be removed.
 */
async function knownIssue(name, note, fn) {
  try {
    const evidence = await fn();
    record("FIXED", name, `${note} — but it PASSED now (${evidence})`);
  } catch (error) {
    record("KNOWN", name, `${note} [${error.message}]`);
  }
}

const skip = (name, why) => record("SKIP", name, why);

// ---------------------------------------------------------------------------
// MCP plumbing
// ---------------------------------------------------------------------------

let client;
let transport;

async function connect() {
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(ROOT, "dist/src/index.js")],
    // The key goes in the environment, never argv — argv is world-readable
    // via the process list.
    env: {
      ...process.env,
      DIGITAL_SAMBA_DEVELOPER_KEY: KEY,
      DIGITAL_SAMBA_API_URL: API_URL,
      TRANSPORT: "stdio",
      DS_SHOW_VERSION_ON_START: "false",
      DS_LOG_LEVEL: "error",
    },
    stderr: "ignore",
  });

  client = new Client(
    { name: "smoke-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * How long to wait before retrying, or null if this is not a rate-limit error.
 * The API says "Too Many Attempts. You may try again in N seconds" — honour
 * that rather than guessing a backoff.
 */
function rateLimitDelay(message) {
  if (!/429|Too Many Attempts/i.test(message)) return null;
  const seconds = Number(message.match(/try again in (\d+) second/i)?.[1]);
  return Math.min((Number.isFinite(seconds) ? seconds : 30) + 2, 90);
}

async function callOnce(tool, args) {
  const result = await client.callTool({ name: tool, arguments: args });
  const text = (result.content ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (result.isError) throw new Error(`${tool} errored: ${redact(text)}`);
  return text;
}

/**
 * Call a tool and return its text output. Throws if the tool reports an error.
 *
 * Retries on rate limiting: this script makes a burst of writes, which is
 * exactly the shape the API throttles, and a 429 midway would otherwise be
 * indistinguishable from a real failure — and would strand created resources.
 */
async function call(tool, args = {}, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callOnce(tool, args);
    } catch (error) {
      const delay = rateLimitDelay(error.message);
      if (delay === null || attempt >= retries) throw error;
      console.log(`       rate limited, waiting ${delay}s (${tool})`);
      await sleep(delay * 1000);
    }
  }
}

/** Call a tool expecting it to fail; returns the error text. */
async function callExpectingError(tool, args = {}) {
  try {
    const text = await call(tool, args);
    throw new Error(`expected an error, got success: ${text.slice(0, 120)}`);
  } catch (error) {
    return error.message;
  }
}

/** Parse the first JSON object or array embedded in a tool's text output. */
/** Count the records in a list tool's output, whatever shape it uses. */
function countIn(text) {
  if (/^No \w+ found/i.test(text.trim())) return 0;
  const body = parseJson(text);
  if (Array.isArray(body)) return body.length;
  for (const key of [
    "data",
    "quizzes",
    "polls",
    "files",
    "folders",
    "libraries",
  ]) {
    if (Array.isArray(body?.[key])) return body[key].length;
  }
  if (typeof body?.total_count === "number") return body.total_count;
  throw new Error(`cannot count records in: ${text.slice(0, 120)}`);
}

/**
 * Read a resource, retrying on rate limits like call() does. Collection
 * resources return one content item per record, so `allowEmpty` is for
 * collections that are legitimately empty (a room created minutes ago).
 */
async function read(uri, { retries = 4, allowEmpty = false } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await client.readResource({ uri });
      const text = (result.contents ?? []).map((c) => c.text ?? "").join("\n");
      must(Array.isArray(result.contents), `${uri} returned no contents array`);
      if (allowEmpty && result.contents.length === 0) return "";
      must(result.contents.length, `${uri} returned no contents`);
      must(text.trim(), `${uri} returned empty text`);
      return text;
    } catch (error) {
      const delay = rateLimitDelay(error.message);
      if (delay === null || attempt >= retries) throw error;
      console.log(`       rate limited, waiting ${delay}s (${uri})`);
      await sleep(delay * 1000);
    }
  }
}

function parseJson(text) {
  const start = text.search(/[[{]/);
  if (start === -1) throw new Error("no JSON found in tool output");
  const candidate = text.slice(start).replace(/```[\s\S]*$/, "");
  for (let end = candidate.length; end > 0; end--) {
    try {
      return JSON.parse(candidate.slice(0, end));
    } catch {
      /* keep shrinking */
    }
  }
  throw new Error("could not parse JSON from tool output");
}

/** Never let a key reach the console, including via error text. */
function redact(text) {
  return KEY ? String(text).split(KEY).join("<redacted>") : String(text);
}

const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const created = {
  roomId: null,
  libraryId: null,
  roleId: null,
  webhookId: null,
};
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
// Role names are capped at 30 characters by the API, so identifiers that go
// into a name field use this compact form rather than the ISO stamp.
const shortId = Date.now().toString(36);
const tag = `smoke-${stamp}`;

async function run() {
  group("connection");

  const { tools } = await client.listTools();
  await check("tool count", async () => {
    must(
      tools.length === EXPECTED_TOOL_COUNT,
      `expected ${EXPECTED_TOOL_COUNT} tools, got ${tools.length}`,
    );
    return `${tools.length} tools`;
  });

  await check("every tool has annotations", async () => {
    const missing = tools.filter((t) => !t.annotations).map((t) => t.name);
    must(missing.length === 0, `missing annotations: ${missing.join(", ")}`);
    return "all annotated";
  });

  // -- rooms ---------------------------------------------------------------
  group("rooms");

  await check("create-room", async () => {
    const room = parseJson(
      await call("create-room", {
        name: tag,
        // The account default is de-DE; tests that read text back need en.
        language: "en",
        // Must be on from creation: enabling it later makes an empty chat
        // export meaningless as evidence.
        chat_persistence_enabled: true,
        chat_enabled: true,
        qa_enabled: true,
        polls_enabled: true,
        description: "smoke test - safe to delete",
      }),
    );
    created.roomId = room.id;
    must(room.id, "no room id returned");
    must(room.language === "en", `language is ${room.language}, not en`);
    must(room.chat_persistence_enabled === true, "chat persistence not set");
    return `room ${room.id}`;
  });

  must(created.roomId, "cannot continue without a room");

  await check("update-room persists (read back)", async () => {
    await call("update-room", {
      room_id: created.roomId,
      max_participants: 42,
      toolbar_position: "left",
      video_tile_layout_mode: "bottom",
    });
    const room = parseJson(
      await call("get-room-details", { room_id: created.roomId }),
    );
    must(room.max_participants === 42, "max_participants did not persist");
    must(room.toolbar_position === "left", "toolbar_position did not persist");
    must(
      room.video_tile_layout_mode === "bottom",
      "video_tile_layout_mode did not persist",
    );
    return "3 fields verified by read-back";
  });

  await check(
    "update-room name is saved as the description (#37)",
    async () => {
      const renamed = `${tag} renamed`;
      await call("update-room", { room_id: created.roomId, name: renamed });
      const room = parseJson(
        await call("get-room-details", { room_id: created.roomId }),
      );
      must(
        room.description === renamed,
        `description is ${JSON.stringify(room.description)}, not the new name`,
      );
      return "name read back as description";
    },
  );

  // -- polls ---------------------------------------------------------------
  group("polls");

  let pollId;
  await check("create-poll appears in the room", async () => {
    const text = await call("create-poll", {
      room_id: created.roomId,
      question: "smoke control poll",
      options: [{ text: "Alpha" }, { text: "Beta" }],
    });
    pollId = text.match(/Poll ID: ([0-9a-f-]+)/i)?.[1];
    must(pollId, "no poll id in output");
    const polls = parseJson(
      await call("list-polls", { room_id: created.roomId }),
    );
    must(
      polls.some((p) => p.id === pollId),
      "poll absent from list-polls after create",
    );
    return `poll ${pollId}`;
  });

  await check("update-poll persists (read back)", async () => {
    await call("update-poll", {
      room_id: created.roomId,
      poll_id: pollId,
      question: "smoke control poll EDITED",
    });
    const polls = parseJson(
      await call("list-polls", { room_id: created.roomId }),
    );
    const poll = polls.find((p) => p.id === pollId);
    must(
      poll?.question === "smoke control poll EDITED",
      "question did not change",
    );
    return "question verified";
  });

  await knownIssue(
    "import-polls creates polls",
    "API defect: PollsController@import hardcodes preview mode, never saves",
    async () => {
      const countPolls = async () => {
        const text = await call("list-polls", { room_id: created.roomId });
        return text.startsWith("No polls") ? 0 : parseJson(text).length;
      };
      const before = await countPolls();
      const template = await call("get-poll-import-template", {
        room_id: created.roomId,
      });
      await call("import-polls", {
        room_id: created.roomId,
        csv_content: template,
      });
      const after = await countPolls();
      must(after > before, `poll count unchanged at ${after}`);
      return `${before} -> ${after}`;
    },
  );

  await check("publish-poll-results refuses (no such endpoint)", async () => {
    const error = await callExpectingError("publish-poll-results", {
      room_id: created.roomId,
      poll_id: pollId,
      session_id: "00000000-0000-0000-0000-000000000000",
    });
    must(
      /not supported/i.test(error),
      `expected an unsupported-endpoint refusal, got: ${error.slice(0, 120)}`,
    );
    return "refused, as it must";
  });

  await check("delete-poll removes it", async () => {
    await call("delete-poll", { room_id: created.roomId, poll_id: pollId });
    const remaining = await call("list-polls", { room_id: created.roomId });
    must(!remaining.includes(pollId), "poll still present");
    return "poll gone";
  });

  // -- quizzes -------------------------------------------------------------
  group("quizzes");

  let quizId;
  await check("import-quizzes creates a quiz", async () => {
    const template = await call("get-quiz-import-template", {
      room_id: created.roomId,
    });
    await call("import-quizzes", {
      room_id: created.roomId,
      csv_content: template,
    });
    const list = await call("list-room-quizzes", { room_id: created.roomId });
    const quizzes = parseJson(list);
    must(quizzes.length > 0, "no quizzes after import");
    quizId = quizzes[0].id;
    return `quiz ${quizId}`;
  });

  if (quizId) {
    await check("update-quiz persists (read back)", async () => {
      await call("update-quiz", {
        room_id: created.roomId,
        quiz_id: quizId,
        title: "smoke quiz EDITED",
        passing_score: 55,
      });
      const quiz = parseJson(
        await call("get-quiz", { room_id: created.roomId, quiz_id: quizId }),
      );
      must(quiz.title === "smoke quiz EDITED", "title did not change");
      must(quiz.passing_score === 55, "passing_score did not change");
      return "title + passing_score verified";
    });

    await check("delete-quiz removes it", async () => {
      await call("delete-quiz", { room_id: created.roomId, quiz_id: quizId });
      const list = await call("list-room-quizzes", { room_id: created.roomId });
      must(!list.includes(quizId), "quiz still listed");
      return "quiz gone";
    });
  }

  // -- libraries -----------------------------------------------------------
  group("libraries");

  let folderId;
  let fileId;

  await check("create-library", async () => {
    const text = await call("create-library", {
      externalId: tag,
      name: `${tag} library`,
    });
    created.libraryId = text.match(/ID: ([0-9a-f-]+)/i)?.[1];
    must(created.libraryId, "no library id in output");
    const verified = parseJson(
      await call("verify-library-id", { libraryId: created.libraryId }),
    );
    must(
      verified.library?.id === created.libraryId,
      "library not readable back",
    );
    return `library ${created.libraryId}`;
  });

  if (created.libraryId) {
    await check("create + rename folder (read back)", async () => {
      const text = await call("create-library-folder", {
        libraryId: created.libraryId,
        name: "smoke folder",
      });
      folderId = text.match(/Folder ID: ([0-9a-f-]+)/i)?.[1];
      must(folderId, "no folder id in output");
      await call("update-library-folder", {
        libraryId: created.libraryId,
        folderId,
        name: "smoke folder RENAMED",
      });
      const tree = parseJson(
        await call("get-library-hierarchy", { libraryId: created.libraryId }),
      );
      const folder = tree.hierarchy?.folders?.find((f) => f.id === folderId);
      must(folder, "folder missing from hierarchy");
      must(
        folder.name === "smoke folder RENAMED",
        "folder rename did not land",
      );
      return "folder created and renamed";
    });

    await check("create + move file (read back)", async () => {
      const text = await call("create-library-file", {
        libraryId: created.libraryId,
        name: "smoke.pdf",
        folderId,
        fileSize: 1024,
      });
      fileId = text.match(/File ID: ([0-9a-f-]+)/i)?.[1];
      must(fileId, "no file id in output");
      await call("move-library-file", { libraryId: created.libraryId, fileId });
      const tree = parseJson(
        await call("get-library-hierarchy", { libraryId: created.libraryId }),
      );
      must(
        tree.hierarchy?.files?.some((f) => f.id === fileId),
        "file not at library root after move",
      );
      return "file created and moved to root";
    });

    await check("delete file + folder (read back)", async () => {
      // Without the prerequisite ids this would call the tool with undefined
      // and fail on validation, which reads as a delete bug rather than a
      // skipped setup step.
      must(fileId && folderId, "skipped: file or folder was never created");
      await call("delete-library-file", {
        libraryId: created.libraryId,
        fileId,
      });
      await call("delete-library-folder", {
        libraryId: created.libraryId,
        folderId,
      });
      const tree = parseJson(
        await call("get-library-hierarchy", { libraryId: created.libraryId }),
      );
      must(
        !tree.hierarchy?.files?.some((f) => f.id === fileId),
        "file remains",
      );
      must(
        !tree.hierarchy?.folders?.some((f) => f.id === folderId),
        "folder remains",
      );
      return "both removed";
    });
  }

  // -- roles ---------------------------------------------------------------
  group("roles");

  await check("create-role", async () => {
    const text = await call("create-role", {
      name: `smoke-role-${shortId}`,
      displayName: "Smoke Role",
      permissions: { broadcast: true, screenshare: false },
    });
    created.roleId = text.match(/ID: ([0-9a-f-]+)/i)?.[1];
    must(created.roleId, "no role id in output");
    return `role ${created.roleId}`;
  });

  if (created.roleId) {
    // This is the regression that shipped: update-role sent camelCase
    // displayName to a snake_case API, so the rename was silently dropped
    // while permissions in the same call applied.
    await check("update-role rename actually applies", async () => {
      await call("update-role", {
        roleId: created.roleId,
        displayName: "Smoke Role RENAMED",
        permissions: { broadcast: false, screenshare: true },
      });
      const role = await call("get-role", { roleId: created.roleId });
      must(
        role.includes("Smoke Role RENAMED"),
        "displayName was NOT applied (the v1.1.0 silent-drop bug)",
      );
      must(role.includes("screenshare"), "permissions did not apply");
      return "rename and permissions both verified";
    });

    await check("delete-role removes it", async () => {
      await call("delete-role", { roleId: created.roleId });
      created.roleId = null;
      const roles = await call("get-roles", { limit: 50 });
      must(!roles.includes("Smoke Role"), "role still listed");
      return "role gone";
    });
  }

  // -- webhooks ------------------------------------------------------------
  group("webhooks");

  await check("create + update webhook (read back)", async () => {
    const text = await call("create-webhook", {
      name: `smoke-hook-${shortId}`,
      endpoint: "https://example.com/smoke",
      events: ["session_started"],
    });
    created.webhookId = text.match(/ID: ([0-9a-f-]+)/i)?.[1];
    must(created.webhookId, "no webhook id in output");
    await call("update-webhook", {
      webhookId: created.webhookId,
      endpoint: "https://example.com/smoke-UPDATED",
    });
    const list = await call("list-webhooks", { limit: 50 });
    must(
      list.includes("https://example.com/smoke-UPDATED"),
      "endpoint update did not land",
    );
    return "created and updated";
  });

  // -- no-session write tools, previously untested (#44) --------------------
  group("room-level");

  await check("generate-token returns a join link", async () => {
    const text = await call("generate-token", {
      room_id: created.roomId,
      user_name: "Smoke Test",
      external_id: `smoke-${shortId}`,
    });
    must(/https?:\/\/\S+/.test(text), `no link: ${text.slice(0, 120)}`);
    must(/eyJ[\w-]+\.[\w-]+\./.test(text), "no JWT in the output");
    return "link with token";
  });

  await check("create-quiz stores minutes as seconds (read back)", async () => {
    const text = await call("create-quiz", {
      room_id: created.roomId,
      title: `${tag} quiz`,
      time_limit_minutes: 2,
      questions: [
        {
          text: "1 + 1?",
          choices: [
            { text: "2", correct: true },
            { text: "3", correct: false },
          ],
        },
      ],
    });
    must(
      /2 min \(120 s\)/.test(text),
      `time limit not stored as 120 s: ${text}`,
    );
    return "120 s";
  });

  await check("delete-room-quizzes removes them (read back)", async () => {
    const before = countIn(
      await call("list-room-quizzes", { room_id: created.roomId }),
    );
    must(before > 0, "no quiz to delete");
    await call("delete-room-quizzes", { room_id: created.roomId });
    const after = countIn(
      await call("list-room-quizzes", { room_id: created.roomId }),
    );
    must(after === 0, `${after} quiz(zes) still listed`);
    return `${before} -> 0`;
  });

  for (const [tool, args] of [
    ["delete-room-chats", { roomId: created.roomId }],
    ["delete-room-qa", { roomId: created.roomId }],
    ["delete-room-transcripts", { room_id: created.roomId }],
    ["delete-room-summaries", { roomId: created.roomId }],
  ]) {
    // Nothing to read back on a room nobody has joined; this proves the
    // routing and the endpoint, which is what broke before (#30, #33).
    await check(`${tool} is accepted`, async () => {
      await call(tool, args);
      return "accepted";
    });
  }

  if (created.libraryId) {
    group("library-extras");

    await check("create-webapp without a name uses the URL host", async () => {
      await call("create-webapp", {
        libraryId: created.libraryId,
        url: "https://www.example.com/embed",
      });
      const files = await call("list-library-files", {
        libraryId: created.libraryId,
      });
      must(
        /www\.example\.com/.test(files),
        "webapp not listed by its host name",
      );
      return "listed as www.example.com";
    });

    await check("create-whiteboard appears in the library", async () => {
      const before = countIn(
        await call("list-library-files", { libraryId: created.libraryId }),
      );
      await call("create-whiteboard", { libraryId: created.libraryId });
      const after = countIn(
        await call("list-library-files", { libraryId: created.libraryId }),
      );
      must(after === before + 1, `files ${before} -> ${after}`);
      return `files ${before} -> ${after}`;
    });

    await check("update-library rename persists (read back)", async () => {
      const name = `${tag} renamed`;
      await call("update-library", { libraryId: created.libraryId, name });
      const details = await call("get-library-details", {
        libraryId: created.libraryId,
      });
      must(details.includes(name), "new name not read back");
      return "name verified";
    });

    await check("move-library-folder nests a folder (read back)", async () => {
      const idOf = (text) =>
        text.match(/ID: ([0-9a-f-]{36})/i)?.[1] ?? parseJson(text)?.id;
      const parent = idOf(
        await call("create-library-folder", {
          libraryId: created.libraryId,
          name: `parent-${shortId}`,
        }),
      );
      const child = idOf(
        await call("create-library-folder", {
          libraryId: created.libraryId,
          name: `child-${shortId}`,
        }),
      );
      must(parent && child, "folders not created");
      await call("move-library-folder", {
        libraryId: created.libraryId,
        folderId: child,
        targetParentId: parent,
      });
      const details = await call("get-library-folder-details", {
        libraryId: created.libraryId,
        folderId: child,
      });
      must(details.includes(parent), "child does not name the new parent");
      return "nested";
    });
  }

  // -- tools fixed in #28 / #29, against an existing session ----------------
  group("sessions");
  let sessionId;
  try {
    const listed = parseJson(await call("list-sessions", { limit: 1 }));
    sessionId = (Array.isArray(listed) ? listed : listed?.data)?.[0]?.id;
  } catch {
    sessionId = undefined;
  }
  if (!sessionId) {
    skip(
      "get-session-details / get-session-analytics",
      "no session on the account",
    );
  } else {
    await check(
      "get-session-details is the session, not the AI summary",
      async () => {
        const body = parseJson(
          await call("get-session-details", { sessionId }),
        );
        must(
          body?.session_id === sessionId ||
            body?.id === sessionId ||
            body?.room_id,
          "no session data",
        );
        must(!("summary" in (body ?? {})), "looks like the AI summary payload");
        return "session data";
      },
    );
    await check("get-session-analytics is not empty", async () => {
      const text = await call("get-session-analytics", { sessionId });
      must(text.trim() !== "[]", "empty array (the #28 bug)");
      return "data returned";
    });
  }

  // -- one read per resource family ------------------------------------------
  group("resources");
  const resourceUris = [
    "digitalsamba://rooms",
    `digitalsamba://rooms/${created.roomId}`,
    // The new room has none of these; reading them proves the routing (#30
    // sent both to the room object).
    [`digitalsamba://rooms/${created.roomId}/sessions`, { allowEmpty: true }],
    [`digitalsamba://rooms/${created.roomId}/recordings`, { allowEmpty: true }],
    `digitalsamba://rooms/${created.roomId}/live`,
    "digitalsamba://sessions",
    "digitalsamba://recordings",
    "digitalsamba://analytics/team",
    "digitalsamba://analytics/live",
    `digitalsamba://exports/polls/${created.roomId}`,
    "digitalsamba://libraries",
    ...(created.libraryId
      ? [
          `digitalsamba://libraries/${created.libraryId}`,
          `digitalsamba://libraries/${created.libraryId}/files`,
        ]
      : []),
    ...(sessionId ? [`digitalsamba://sessions/${sessionId}`] : []),
  ];
  for (const entry of resourceUris) {
    const [uri, opts] = Array.isArray(entry) ? entry : [entry, {}];
    await check(
      `read ${uri.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "{id}")}`,
      async () => {
        const text = await read(uri, opts);
        return text ? `${text.length} chars` : "empty collection";
      },
    );
  }

  // -- analytics: each tool answers its own question ------------------------
  // Four tools used to return team-wide totals (GET /statistics) whatever was
  // asked. Compare against those totals so a regression shows up here.
  group("analytics");

  const teamTotals = await call("get-usage-statistics", {}).catch(() => null);

  await check("get-live-analytics is live rooms, not team totals", async () => {
    const text = await call("get-live-analytics", {});
    must(text !== teamTotals, "identical to get-usage-statistics output");
    const body = parseJson(text);
    must(
      Array.isArray(body) || Array.isArray(body?.data),
      `not a room list: ${text.slice(0, 120)}`,
    );
    return `${(Array.isArray(body) ? body : body.data).length} live room(s)`;
  });

  await check("get-live-room-analytics is the room's live state", async () => {
    const text = await call("get-live-room-analytics", {
      roomId: created.roomId,
    });
    must(text !== teamTotals, "identical to get-usage-statistics output");
    const history = await call("get-room-analytics", {
      roomId: created.roomId,
    });
    must(text !== history, "identical to the room's historical statistics");
    return "differs from team and room history";
  });

  await check(
    "get-participant-statistics by room is that room's participants",
    async () => {
      const text = await call("get-participant-statistics", {
        roomId: created.roomId,
      });
      must(text !== teamTotals, "identical to get-usage-statistics output");
      const body = parseJson(text);
      must(
        Array.isArray(body?.data),
        `not a participant list: ${text.slice(0, 120)}`,
      );
      // A room created minutes ago has had nobody in it.
      must(
        body.data.length === 0,
        `expected no participants, got ${body.data.length}`,
      );
      return "empty list for a new room";
    },
  );

  await check(
    "get-participant-statistics refuses filters it cannot apply",
    async () => {
      const message = await callExpectingError("get-participant-statistics", {
        roomId: created.roomId,
        dateStart: "2026-01-01",
      });
      must(/dateStart/.test(message), `unexpected message: ${message}`);
      return "dateStart refused";
    },
  );

  // -- honest failures -----------------------------------------------------
  group("must-fail-honestly");

  await check("update-recording reports failure", async () => {
    // The API has no update endpoint. This must be an error, not a bare
    // message a client would read as success.
    const message = await callExpectingError("update-recording", {
      recording_id: "00000000-0000-0000-0000-000000000000",
      name: "nope",
    });
    must(/not supported/i.test(message), `unexpected message: ${message}`);
    return "errors as it should";
  });

  await check("get-room-details on a deleted room 404s", async () => {
    const message = await callExpectingError("get-room-details", {
      room_id: "00000000-0000-0000-0000-000000000000",
    });
    must(/404|not found/i.test(message), `unexpected message: ${message}`);
    return "404 surfaced";
  });

  // -- needs a live session ------------------------------------------------
  group("session-dependent");

  const liveOnly = [
    [
      "send-chat-message",
      "signalling server has no chat endpoint; backend fix scheduled (proven 2026-08-14)",
    ],
    ["create-question", "needs an active session"],
    ["raise-participant-hand", "needs a live participant"],
    ["start-transcription", "needs an active session"],
    ["connect-phone", "needs telephony on the account"],
  ];
  for (const [tool, why] of liveOnly) skip(tool, why);
}

// ---------------------------------------------------------------------------
// Cleanup — must run even when checks fail
// ---------------------------------------------------------------------------

async function cleanup() {
  if (KEEP) {
    console.log(
      `\nLeaving resources in place (--keep): ${JSON.stringify(created)}`,
    );
    return;
  }
  group("cleanup");

  // Cleanup retries harder than the checks do: a stranded room or library on a
  // shared account is worse than a slow run.
  const opts = { retries: 8 };
  const removals = [
    [
      "room",
      created.roomId,
      () =>
        call(
          "delete-room",
          { room_id: created.roomId, delete_resources: true },
          opts,
        ),
    ],
    [
      "library",
      created.libraryId,
      () => call("delete-library", { libraryId: created.libraryId }, opts),
    ],
    [
      "role",
      created.roleId,
      () => call("delete-role", { roleId: created.roleId }, opts),
    ],
    [
      "webhook",
      created.webhookId,
      () => call("delete-webhook", { webhookId: created.webhookId }, opts),
    ],
  ];

  for (const [label, id, remove] of removals) {
    if (!id) continue;
    try {
      await remove();
      record("PASS", `cleanup ${label}`, id);
    } catch (error) {
      record("FAIL", `cleanup ${label}`, `${id} left behind: ${error.message}`);
      console.log(`       MANUAL CLEANUP NEEDED: ${label} ${id}`);
    }
  }
}

// ---------------------------------------------------------------------------

function summarise() {
  const count = (status) => results.filter((r) => r.status === status).length;
  const failed = results.filter((r) => r.status === "FAIL");
  const fixed = results.filter((r) => r.status === "FIXED");

  console.log(`\n${"═".repeat(64)}`);
  console.log(
    `  ${count("PASS")} passed   ${count("FAIL")} failed   ` +
      `${count("KNOWN")} known-issue   ${count("FIXED")} newly-fixed   ` +
      `${count("SKIP")} skipped`,
  );
  console.log("═".repeat(64));

  if (fixed.length) {
    console.log(`\n  A known defect now passes — remove its exception:`);
    for (const r of fixed) console.log(`    - ${r.name}`);
  }

  if (failed.length) {
    console.log(`\n  Failures:`);
    for (const r of failed)
      console.log(`    - [${r.group}] ${r.name}: ${r.detail}`);
  }

  return failed.length === 0;
}

let ok = false;
try {
  await connect();
  await run();
} catch (error) {
  record("FAIL", "run aborted", redact(error.message));
} finally {
  try {
    await cleanup();
  } catch (error) {
    record("FAIL", "cleanup aborted", redact(error.message));
  }
  ok = summarise();
  await transport?.close().catch(() => {});
}

process.exit(ok ? 0 : 1);
