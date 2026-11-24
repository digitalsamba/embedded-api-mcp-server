/**
 * Call Diagnostics Tools
 *
 * Triage "I couldn't hear / see / connect" complaints from the participant's
 * own data: their client-side logs and their WebRTC statistics dump
 * (rtcstats). Both are the same data a team can already download from the
 * dashboard; these tools fetch them through the API and return a short
 * summary instead of the raw files.
 *
 * @module tools/diagnostics-tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import {
  ClientLogSummary,
  summarizeClientLogs,
} from "../../diagnostics/client-log-summary.js";
import { parseDump } from "../../diagnostics/rtcstats-decoder.js";
import {
  RtcstatsSummary,
  summarizeDump,
} from "../../diagnostics/rtcstats-summary.js";
import logger from "../../logger.js";
import { getToolAnnotations } from "../../tool-annotations.js";
import type { Participant } from "../../types/participant.js";

/**
 * Session variant: participants examined per call, and fetched in parallel.
 * Each participant costs two requests (logs + rtcstats) against the API's
 * diagnostics throttle, 30 per minute per team by default. 12 participants
 * (24 requests) fit inside one minute's budget with room for a follow-up
 * get-participant-diagnostics; larger sessions are walked with offset.
 */
const SESSION_BATCH_SIZE = 12;
const SESSION_CONCURRENCY = 4;

/** Findings that say "nothing wrong" rather than name a problem. */
const NO_PROBLEM = /^No (problems found|known problem patterns)/;

export const DIAGNOSTICS_TOOL_NAMES = [
  "get-participant-diagnostics",
  "get-session-diagnostics",
] as const;

export function registerDiagnosticsTools(): Tool[] {
  return [
    {
      name: "get-participant-diagnostics",
      description:
        '[Diagnostics - TOOL] Diagnose one participant\'s call problems from their client logs and WebRTC stats. Use when users say: "couldn\'t hear", "no audio", "camera not working", "video froze", "couldn\'t connect", "bad quality", "why did they drop", "troubleshoot participant". Requires participantId (from list-session-participants). Returns findings in plain language (camera/microphone permission errors, never connected, TURN relay / UDP blocked, poor sending or receiving quality with time spent bad, CPU vs bandwidth limits, freezes, page asleep) plus the detail behind them. WebRTC stats exist only after the participant has left and are kept for 30 days.',
      annotations: getToolAnnotations(
        "get-participant-diagnostics",
        "Get Participant Diagnostics",
      ),
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "Participant ID (required)",
          },
          includeDetail: {
            type: "boolean",
            description:
              "Include the full structured detail (connections, quality, log milestones). Default true.",
          },
        },
        required: ["participantId"],
      },
    },
    {
      name: "get-session-diagnostics",
      description: `[Diagnostics - TOOL] Diagnose call problems for every participant of a session. Use when users say: "what went wrong in this session", "who had problems in the meeting", "session quality issues", "troubleshoot session". Requires sessionId. Returns per participant the main findings from their client logs and WebRTC stats; follow up on one participant with get-participant-diagnostics. Checks ${SESSION_BATCH_SIZE} participants per call because the diagnostics endpoints are rate limited; when nextOffset is returned, call again with that offset (after retryAfterSeconds, if given) for the rest.`,
      annotations: getToolAnnotations(
        "get-session-diagnostics",
        "Get Session Diagnostics",
      ),
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID (required)",
          },
          offset: {
            type: "integer",
            minimum: 0,
            description: `Skip this many participants (the nextOffset of the previous call). Default 0. Each call checks up to ${SESSION_BATCH_SIZE}.`,
          },
        },
        required: ["sessionId"],
      },
    },
  ];
}

interface ParticipantDiagnostics {
  participantId: string;
  findings: string[];
  /** True when the stats or logs name at least one problem. */
  problems: boolean;
  /** Set when the API throttled us: the data was not checked, it is not a finding. */
  rateLimited?: { retryAfterSeconds?: number };
  rtcstats?: RtcstatsSummary;
  rtcstatsUnavailable?: string;
  logs?: ClientLogSummary;
  logsUnavailable?: string;
}

function rateLimitOf(
  error: unknown,
): { retryAfterSeconds?: number } | undefined {
  if ((error as { statusCode?: number })?.statusCode !== 429) return undefined;
  const message = error instanceof Error ? error.message : String(error);
  const seconds = Number(message.match(/try again in (\d+) second/i)?.[1]);
  return Number.isFinite(seconds) ? { retryAfterSeconds: seconds } : {};
}

function unavailableReason(error: unknown, what: "rtcstats" | "logs"): string {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 404) {
    return what === "rtcstats"
      ? "No WebRTC stats for this participant: they may still be in the session (stats are uploaded when they leave), never got as far as connecting, or the stats are older than 30 days."
      : "No client logs for this participant.";
  }
  return `Could not fetch ${what}: ${error instanceof Error ? error.message : String(error)}`;
}

export async function diagnoseParticipant(
  apiClient: DigitalSambaApiClient,
  participantId: string,
): Promise<ParticipantDiagnostics> {
  const result: ParticipantDiagnostics = {
    participantId,
    findings: [],
    problems: false,
  };

  const [dump, logs] = await Promise.allSettled([
    apiClient.getParticipantRtcstats(participantId),
    apiClient.getParticipantLogs(participantId),
  ]);

  // Throttled: nothing was checked, so say that and nothing else.
  const limited = [dump, logs]
    .map((r) => (r.status === "rejected" ? rateLimitOf(r.reason) : undefined))
    .find(Boolean);
  if (limited) {
    result.rateLimited = limited;
    result.findings.push(
      "Not checked: the API's diagnostics rate limit was reached." +
        (limited.retryAfterSeconds !== undefined
          ? ` Try again in ${limited.retryAfterSeconds} seconds.`
          : ""),
    );
    return result;
  }

  if (dump.status === "fulfilled") {
    try {
      result.rtcstats = summarizeDump(parseDump(dump.value));
    } catch (error) {
      result.rtcstatsUnavailable = `The WebRTC stats could not be read (${error instanceof Error ? error.message : String(error)}).`;
    }
  } else {
    result.rtcstatsUnavailable = unavailableReason(dump.reason, "rtcstats");
  }

  if (logs.status === "fulfilled") {
    result.logs = summarizeClientLogs(logs.value);
  } else {
    result.logsUnavailable = unavailableReason(logs.reason, "logs");
  }

  // Stats findings first: they are measured, the log ones are what the client said.
  const ok = (f: string) => !NO_PROBLEM.test(f);
  result.findings = [
    ...(result.rtcstats?.findings.filter(ok) ?? []),
    ...(result.logs?.findings.filter(ok) ?? []),
  ];
  result.problems = result.findings.length > 0;
  if (result.rtcstatsUnavailable)
    result.findings.push(result.rtcstatsUnavailable);
  if (result.logsUnavailable) result.findings.push(result.logsUnavailable);
  if (!result.findings.length) {
    result.findings.push(
      "No problems found in the client logs or WebRTC stats.",
    );
  }
  return result;
}

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

const text = (value: unknown) => ({
  content: [
    {
      type: "text",
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

export async function executeDiagnosticsTool(
  toolName: string,
  args: any,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  try {
    switch (toolName) {
      case "get-participant-diagnostics": {
        logger.info("Diagnosing participant", {
          participantId: args.participantId,
        });
        const result = await diagnoseParticipant(apiClient, args.participantId);
        if (args.includeDetail === false) {
          return text({
            participantId: result.participantId,
            findings: result.findings,
          });
        }
        return text(result);
      }

      case "get-session-diagnostics": {
        logger.info("Diagnosing session", { sessionId: args.sessionId });
        const offset =
          Number.isInteger(args.offset) && args.offset > 0 ? args.offset : 0;
        const list = await apiClient.listSessionParticipants(args.sessionId, {
          limit: SESSION_BATCH_SIZE,
          offset,
        });
        const participants: Participant[] = Array.isArray(list?.data)
          ? list.data
          : [];
        const total =
          (list as any)?.total_count ?? offset + participants.length;

        // Once the throttle answers 429, every further request in this call
        // would too: stop asking and hand back where to resume.
        let throttled: { retryAfterSeconds?: number } | undefined;
        const rows = await mapLimited(
          participants,
          SESSION_CONCURRENCY,
          async (p) => {
            const base = {
              participantId: p.id,
              name: p.name,
              role: p.role,
              joined: p.join_time,
              left: p.leave_time,
            };
            if (throttled) return { ...base, checked: false as const };
            const d = await diagnoseParticipant(apiClient, p.id);
            if (d.rateLimited) {
              throttled ??= d.rateLimited;
              return { ...base, checked: false as const };
            }
            return {
              ...base,
              checked: true as const,
              problems: d.problems,
              device: d.rtcstats
                ? [d.rtcstats.device.browser, d.rtcstats.device.os]
                    .filter(Boolean)
                    .join(" / ")
                : undefined,
              findings: d.findings,
            };
          },
        );

        const checked = rows.filter((r) => r.checked);
        const notChecked = rows.length - checked.length;
        // Resume at the first participant not checked, else after this batch.
        const firstSkipped = rows.findIndex((r) => !r.checked);
        const resumeAt =
          offset + (firstSkipped === -1 ? rows.length : firstSkipped);

        return text({
          sessionId: args.sessionId,
          totalParticipants: total,
          checked: checked.length,
          withProblems: checked.filter((r) => r.checked && r.problems).length,
          ...(notChecked
            ? {
                notChecked,
                note: "Some participants were not checked because the API's diagnostics rate limit was reached. They are listed with checked: false; that says nothing about their call.",
              }
            : {}),
          ...(resumeAt < total ? { nextOffset: resumeAt } : {}),
          ...(throttled?.retryAfterSeconds !== undefined
            ? { retryAfterSeconds: throttled.retryAfterSeconds }
            : {}),
          results: rows,
        });
      }

      default:
        throw new Error(`Unknown diagnostics tool: ${toolName}`);
    }
  } catch (error) {
    logger.error(`Error executing diagnostics tool ${toolName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
