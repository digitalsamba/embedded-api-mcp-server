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
const EXPECTED_TOOL_COUNT = 144;

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

const created = { roomId: null, libraryId: null, roleId: null, webhookId: null };
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
    const room = parseJson(
      await call("get-room-details", { room_id: created.roomId }),
    );
    must(
      room.polls?.some((p) => p.id === pollId),
      "poll absent from room after create",
    );
    return `poll ${pollId}`;
  });

  await check("update-poll persists (read back)", async () => {
    await call("update-poll", {
      room_id: created.roomId,
      poll_id: pollId,
      question: "smoke control poll EDITED",
    });
    const room = parseJson(
      await call("get-room-details", { room_id: created.roomId }),
    );
    const poll = room.polls?.find((p) => p.id === pollId);
    must(
      poll?.question === "smoke control poll EDITED",
      "question did not change",
    );
    return "question verified";
  });

  await knownIssue(
    "import-polls creates polls",
    "API defect: /rooms/{id}/polls/import accepts and discards",
    async () => {
      const before = parseJson(
        await call("get-room-details", { room_id: created.roomId }),
      ).polls?.length;
      const template = await call("get-poll-import-template", {
        room_id: created.roomId,
      });
      await call("import-polls", {
        room_id: created.roomId,
        csv_content: template,
      });
      const after = parseJson(
        await call("get-room-details", { room_id: created.roomId }),
      ).polls?.length;
      must(after > before, `poll count unchanged at ${after}`);
      return `${before} -> ${after}`;
    },
  );

  await check("delete-poll removes it", async () => {
    await call("delete-poll", { room_id: created.roomId, poll_id: pollId });
    const room = parseJson(
      await call("get-room-details", { room_id: created.roomId }),
    );
    must(!room.polls?.some((p) => p.id === pollId), "poll still present");
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
      must(folder.name === "smoke folder RENAMED", "folder rename did not land");
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
      must(!tree.hierarchy?.files?.some((f) => f.id === fileId), "file remains");
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
    ["send-chat-message", "API defect: delivers nothing (verified 2026-08-13)"],
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
    console.log(`\nLeaving resources in place (--keep): ${JSON.stringify(created)}`);
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
      console.log(
        `       MANUAL CLEANUP NEEDED: ${label} ${id}`,
      );
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
    for (const r of failed) console.log(`    - [${r.group}] ${r.name}: ${r.detail}`);
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
