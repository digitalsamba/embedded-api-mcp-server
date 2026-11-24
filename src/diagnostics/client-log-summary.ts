/**
 * Summarize one participant's client-side logs (the JSON export of
 * GET /participants/{id}/logs): what happened when, and which warnings and
 * errors repeated, without returning the full log.
 *
 * The milestone patterns are taken from the log calls in react-frontend's
 * source, not from customer data. A milestone that never appears is reported
 * as missing only where its absence means something.
 *
 * @module diagnostics/client-log-summary
 */

import { MEDIA_ERROR_MEANING } from "./rtcstats-summary.js";

export interface ClientLogLine {
  message?: string | null;
  payload?: Record<string, unknown> | null;
  level?: string | null;
  action?: string | null;
  timestamp?: string | null;
}

interface Milestone {
  key: string;
  label: string;
  pattern: RegExp;
}

/** In call order. Sources: react-frontend src/ (logger.remote(...) calls). */
export const MILESTONES: Milestone[] = [
  {
    key: "mediaRequested",
    label: "Requested camera/microphone",
    pattern: /^Requesting user media/,
  },
  {
    key: "audioObtained",
    label: "Got a microphone track",
    pattern: /^audio track settings:/,
  },
  {
    key: "videoObtained",
    label: "Got a camera track",
    pattern: /^video track settings:/,
  },
  {
    key: "loginRejected",
    label: "Login rejected by server",
    pattern: /^Login rejected by server/,
  },
  {
    key: "noAudioDevice",
    label: "No microphone found",
    pattern: /No audio device found/,
  },
  {
    key: "noVideoDevice",
    label: "No camera found",
    pattern: /No video device found/,
  },
  {
    key: "iceConnected",
    label: "Media connection established",
    pattern: /^ICE connection established/,
  },
  {
    key: "iceFailed",
    label: "Media connection failed",
    pattern: /^ICE connection failed/,
  },
  {
    key: "e2eeEnabled",
    label: "End-to-end encryption enabled",
    pattern: /^Enabling end-to-end encryption/,
  },
  {
    key: "e2eeDecryptFailed",
    label: "E2EE decryption failed",
    pattern: /^\[E2EE\] Decryption failed/,
  },
  {
    key: "audioStalled",
    label: "Received audio stalled",
    pattern: /^\[AUDIO-HEALTH\] Audio stalled/,
  },
  {
    key: "signalingDropped",
    label: "Signalling message dropped (socket not open)",
    pattern: /^Signaling send dropped/,
  },
  {
    key: "noMediaPermission",
    label: "Tried to use mic/camera without device permission",
    pattern: /without media device permission/,
  },
  {
    key: "noBroadcastPermission",
    label: "Mic/camera blocked by role (no broadcast permission)",
    pattern: /no broadcast permission|without broadcast permission/,
  },
  {
    key: "gumPending",
    label: "Camera/microphone request hung waiting for the browser",
    pattern: /^\[GUM\] request still pending/,
  },
  {
    key: "gumGranted",
    label: "Hung camera/microphone request was granted",
    pattern: /^\[GUM\] permission granted while pending/,
  },
  {
    key: "weakConnection",
    label: "Client warned of a weak connection",
    pattern: /^Connection is weak\./,
  },
  {
    key: "audioPlayBlocked",
    label: "Browser blocked audio playback until a click (autoplay)",
    pattern: /^\[AUDIO-PLAYBACK\] play\(\) blocked, awaiting user gesture/,
  },
  {
    key: "audioNotPlaying",
    label: "Received audio attached but not playing",
    pattern: /^\[AUDIO-HEALTH\] audio attached but not playing/,
  },
  {
    key: "audioRecovered",
    label: "Stuck audio recovered",
    pattern: /^\[AUDIO-PLAYBACK\] audio stuck — recovered/,
  },
  {
    key: "audioNeverDelivered",
    label: "Received audio never delivered",
    pattern: /^\[AUDIO-HEALTH\] audio never delivered/,
  },
  {
    key: "audioElementError",
    label: "Audio playback error",
    pattern:
      /^\[AUDIO-HEALTH\] Audio element error|^\[AUDIO-PLAYBACK\] (play\(\) failed|failed to set srcObject)/,
  },
  {
    key: "speakerSelectFailed",
    label: "Selecting the speaker/output device failed",
    pattern:
      /^\[AUDIO-PLAYBACK\] (setSinkId failed|audio output device mismatch)/,
  },
  {
    key: "dyingWords",
    label: "Page unloaded/crashed (dying words)",
    pattern: /^dying words/,
  },
];

export interface ClientLogSummary {
  lines: number;
  firstAt?: string;
  lastAt?: string;
  byLevel: Record<string, number>;
  milestones: Array<{ label: string; first: string; count: number }>;
  /** Warnings and errors grouped by message shape, most frequent first. */
  topProblems: Array<{
    level: string;
    message: string;
    count: number;
    first: string;
  }>;
  /** Camera/microphone errors the client reported, by DOMException name. */
  mediaErrors: Array<{
    error: string;
    count: number;
    first: string;
    context: string;
  }>;
  findings: string[];
}

const MEDIA_ERROR_NAME_IN_TEXT =
  /\b((?:NotAllowed|NotFound|NotReadable|TrackStart|Overconstrained|Abort|Security|DevicesNotFound)Error)\b/;
const MEDIA_ERROR_NAME =
  /^(NotAllowed|NotFound|NotReadable|TrackStart|Overconstrained|Abort|Security|DevicesNotFound)Error$/;

/**
 * The remote log lines that carry a camera/microphone error name
 * (react-frontend): reportMediaCaptureFailure ("Media capture failed: <Name>:
 * ...", in-call unmute / device switch), GENERIC_JANUS_ERROR ("WebRTC client
 * error in <source>: <Name> | ...", publishing), and logSwitchCaptureFailure
 * ("<op> capture failed; keeping current stream", name in the payload).
 * The join screen's own handler logs to the browser console only.
 */
function mediaErrorOf(
  message: string,
  payload: unknown,
): { error: string; context: string } | null {
  // The client sends every argument after the message as a JSON array in
  // payload, so the name can be in either; search both as text.
  const nameIn = (text: string) => text.match(MEDIA_ERROR_NAME_IN_TEXT)?.[1];
  let payloadText: string;
  try {
    payloadText = payload ? JSON.stringify(payload) : "";
  } catch {
    payloadText = "";
  }

  let m = message.match(/^\[GUM\] late settle — rejected:(\w+)/);
  if (m && MEDIA_ERROR_NAME.test(m[1])) {
    return {
      error: m[1],
      context: "answering a camera/microphone request that had hung",
    };
  }
  m = message.match(/^Media capture failed: (\w+):/);
  if (m && MEDIA_ERROR_NAME.test(m[1])) {
    return {
      error: m[1],
      context: "turning on or switching a device in the call",
    };
  }
  m = message.match(/^WebRTC client error in ([^:]+):(.*)$/);
  if (m) {
    const name = nameIn(m[2]) ?? nameIn(payloadText);
    if (name) return { error: name, context: `publishing (${m[1]})` };
  }
  m = message.match(/^(.+) capture failed; keeping current stream/);
  if (m) {
    const name = nameIn(payloadText);
    if (name)
      return {
        error: name,
        context: `${m[1]} (the previous stream kept working)`,
      };
  }
  return null;
}

/** Collapse ids and numbers so repeats of one message group together. */
function shape(message: string): string {
  return message
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "<id>",
    )
    .replace(/\d+(\.\d+)?/g, "<n>")
    .slice(0, 160);
}

export function summarizeClientLogs(
  logs: ClientLogLine[],
  maxProblems = 12,
): ClientLogSummary {
  const byLevel: Record<string, number> = {};
  const mediaErrors = new Map<
    string,
    { error: string; count: number; first: string; context: string }
  >();
  const milestones = new Map<
    string,
    { label: string; first: string; count: number }
  >();
  const problems = new Map<
    string,
    { level: string; message: string; count: number; first: string }
  >();
  let firstAt: string | undefined;
  let lastAt: string | undefined;

  for (const line of logs) {
    const message = String(line.message ?? "");
    const level = String(line.level ?? "info").toLowerCase();
    const mediaError = mediaErrorOf(message, line.payload);
    if (mediaError) {
      const key = `${mediaError.error}|${mediaError.context}`;
      const hit = mediaErrors.get(key);
      if (hit) hit.count += 1;
      else
        mediaErrors.set(key, {
          ...mediaError,
          count: 1,
          first: String(line.timestamp ?? ""),
        });
    }
    const at = String(line.timestamp ?? "");
    byLevel[level] = (byLevel[level] ?? 0) + 1;
    if (at) {
      if (!firstAt || at < firstAt) firstAt = at;
      if (!lastAt || at > lastAt) lastAt = at;
    }

    for (const m of MILESTONES) {
      if (!m.pattern.test(message)) continue;
      const hit = milestones.get(m.key);
      if (hit) hit.count += 1;
      else milestones.set(m.key, { label: m.label, first: at, count: 1 });
    }

    if (level === "warn" || level === "warning" || level === "error") {
      const key = `${level}|${shape(message)}`;
      const hit = problems.get(key);
      if (hit) hit.count += 1;
      else
        problems.set(key, {
          level,
          message: message.slice(0, 200),
          count: 1,
          first: at,
        });
    }
  }

  // Keep call order for milestones.
  const orderedMilestones = MILESTONES.filter((m) => milestones.has(m.key)).map(
    (m) => milestones.get(m.key)!,
  );
  const topProblems = [...problems.values()]
    .sort((a, b) => b.count - a.count || a.first.localeCompare(b.first))
    .slice(0, maxProblems);

  const has = (k: string) => milestones.has(k);
  const findings: string[] = [];
  if (!logs.length) {
    findings.push("No client logs were received from this participant.");
  } else {
    if (has("loginRejected"))
      findings.push("The server rejected the participant's login to the room.");
    if (has("noAudioDevice") || has("noVideoDevice")) {
      findings.push(
        `No ${[has("noAudioDevice") && "microphone", has("noVideoDevice") && "camera"].filter(Boolean).join(" or ")} was found on the device.`,
      );
    }
    if (has("noMediaPermission"))
      findings.push(
        "The participant tried to use the mic/camera without browser permission for it.",
      );
    if (has("noBroadcastPermission"))
      findings.push(
        "Mic/camera were blocked by the participant's role (no broadcast permission), not by the browser.",
      );
    for (const e of mediaErrors.values()) {
      const meaning = MEDIA_ERROR_MEANING[e.error];
      findings.push(
        `Camera/microphone access failed ${e.count}x while ${e.context}: ${e.error}${meaning ? ` - ${meaning}` : ""}.`,
      );
    }
    // A denial on the join screen is logged to the browser console only, so
    // there the evidence is a request with no track after it.
    if (
      !mediaErrors.size &&
      has("mediaRequested") &&
      !has("audioObtained") &&
      !has("videoObtained")
    ) {
      findings.push(
        `Camera/microphone were requested ${milestones.get("mediaRequested")!.count}x but no track was ever obtained: access failed (permission denied, device in use, or no device). The error name is not in the logs for this case.`,
      );
    }
    if (has("mediaRequested") && !has("iceConnected") && !has("iceFailed")) {
      findings.push(
        "Requested media but the client logs never record a media connection being established.",
      );
    }
    if (has("iceFailed"))
      findings.push("The client logged a failed media connection.");
    const n = (k: string) => milestones.get(k)?.count ?? 0;
    if (has("gumPending"))
      findings.push(
        `The camera/microphone request hung waiting for the browser ${n("gumPending")}x (usually a permission prompt nobody answered, or one hidden behind another window)` +
          (has("gumGranted") ? "; permission was granted later." : "."),
      );
    if (has("weakConnection"))
      findings.push(
        `The client warned ${n("weakConnection")}x that this participant's connection was weak (their own sending quality).`,
      );
    if (has("audioPlayBlocked"))
      findings.push(
        "The browser blocked audio playback until the user clicked on the page (autoplay policy): they would hear nothing until then.",
      );
    if (has("audioNotPlaying"))
      findings.push(
        `Received audio was attached but not playing ${n("audioNotPlaying")}x; the client re-attached it` +
          (has("audioRecovered")
            ? ` (recovered ${n("audioRecovered")}x).`
            : "."),
      );
    if (has("audioNeverDelivered"))
      findings.push(
        `Received audio never arrived ${n("audioNeverDelivered")}x (track stayed muted past the delivery deadline).`,
      );
    if (has("audioElementError"))
      findings.push(
        `Audio playback failed ${n("audioElementError")}x in the browser.`,
      );
    if (has("speakerSelectFailed"))
      findings.push(
        `Selecting the speaker/output device failed ${n("speakerSelectFailed")}x: audio may have played on a different device than the one chosen.`,
      );
    if (has("e2eeDecryptFailed"))
      findings.push(
        `E2EE decryption failed ${milestones.get("e2eeDecryptFailed")!.count}x.`,
      );
    if (has("audioStalled"))
      findings.push(
        `Received audio stalled ${milestones.get("audioStalled")!.count}x.`,
      );
    if (has("signalingDropped"))
      findings.push(
        "Signalling messages were dropped while the socket was not open (network interruption).",
      );
    if (!findings.length)
      findings.push(
        topProblems.length
          ? "No known problem patterns in the client logs; the most frequent warnings and errors are under topProblems."
          : "No problems found in the client logs.",
      );
  }

  return {
    lines: logs.length,
    firstAt,
    lastAt,
    byLevel,
    milestones: orderedMilestones,
    topProblems,
    mediaErrors: [...mediaErrors.values()],
    findings,
  };
}
