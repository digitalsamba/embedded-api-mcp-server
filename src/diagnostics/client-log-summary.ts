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

export interface ClientLogLine {
  message?: string | null;
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
  findings: string[];
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
    // A failed getUserMedia is only logged to the browser console, so its
    // error name never reaches these logs: the evidence is a request with no
    // track after it.
    if (
      has("mediaRequested") &&
      !has("audioObtained") &&
      !has("videoObtained")
    ) {
      findings.push(
        `Camera/microphone were requested ${milestones.get("mediaRequested")!.count}x but no track was ever obtained: access failed (permission denied, device in use, or no device). The browser's error name is not sent to these logs.`,
      );
    }
    if (has("mediaRequested") && !has("iceConnected") && !has("iceFailed")) {
      findings.push(
        "Requested media but the client logs never record a media connection being established.",
      );
    }
    if (has("iceFailed"))
      findings.push("The client logged a failed media connection.");
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
      findings.push("No problems found in the client logs.");
  }

  return {
    lines: logs.length,
    firstAt,
    lastAt,
    byLevel,
    milestones: orderedMilestones,
    topProblems,
    findings,
  };
}
