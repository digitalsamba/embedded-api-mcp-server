/**
 * Turn one participant's rtcstats dump into a short, readable triage summary:
 * device, camera/microphone access, how (and whether) the media connection was
 * established, and how good the call quality was in each direction.
 *
 * Quality is reported as TIME in a bad state, sending and receiving held
 * apart, never as a median: a median scores a connection with eleven minutes
 * at MOS 2 as a clean 5.0. "Bad" is our client's own track score below 3,
 * the same line the dashboard draws between "warn" and "serious".
 *
 * @module diagnostics/rtcstats-summary
 */

import { ParsedDump, RtcEvent } from "./rtcstats-decoder.js";

/** Our track score below this is a bad sample. */
export const BAD_MOS = 3;
/** Scores arrive every ~2 s; a longer gap means the page was not running. */
const MAX_SCORE_GAP_S = 10;
/** ICE connected but DTLS still not connected this long after is a stall. */
const DTLS_STALL_S = 10;

const GUM = "navigator.mediaDevices.getUserMedia";
const GDM = "navigator.mediaDevices.getDisplayMedia";

/** What a getUserMedia error name means for the person on the call. */
const MEDIA_ERROR_MEANING: Record<string, string> = {
  NotAllowedError:
    "permission denied: the user, the browser or an OS privacy setting blocked camera/microphone access",
  NotFoundError: "no camera or microphone was found",
  NotReadableError:
    "the device could not be opened: usually another application is using it, or the OS blocked it",
  TrackStartError:
    "the device could not be opened: usually another application is using it",
  OverconstrainedError:
    "no device matches the requested settings (often a previously chosen device that is now unplugged)",
  AbortError: "the browser aborted the device request",
  SecurityError:
    "media access is disabled for this page (iframe permissions or browser policy)",
  TypeError: "the request was invalid (no audio or video requested)",
};

export interface MediaAccessSummary {
  /**
   * Whether this dump records getUserMedia at all. Our client's rtcstats
   * trace does not wrap navigator.mediaDevices, so usually it does not:
   * camera/microphone access then has to come from the client logs.
   */
  recorded: boolean;
  requests: number;
  successes: number;
  failures: Array<{ error: string; meaning?: string; at: string }>;
  /** Track kinds obtained on the last success, e.g. ["audio", "video"]. */
  lastObtained: string[];
  screenshareRequests: number;
  screenshareFailures: string[];
  tracksEnded: number;
}

export interface ConnectionSummary {
  id: string;
  iceConnected: boolean;
  /** ms from ICE checking to connected. */
  iceConnectMs?: number;
  dtlsConnected: boolean;
  /** ICE connected but DTLS never connected within DTLS_STALL_S. */
  dtlsStalled: boolean;
  finalState?: string;
  disconnects: number;
  failures: number;
  iceRestarts: number;
  candidateErrors: number;
  path?: {
    local: string;
    remote?: string;
    relayProtocol?: string;
    rttMs?: number;
  };
  qualityLimitation?: {
    /** Share of sending time the encoder was limited, by reason (Chromium only). */
    bandwidthPct: number;
    cpuPct: number;
    otherPct: number;
  };
}

export interface DirectionQuality {
  sampledS: number;
  badS: number;
  badPct: number;
  longestBadRunS: number;
  worst: number | null;
  p50: number | null;
  /** limitingFactor counts over bad samples (sending only). */
  limitingFactors?: Record<string, number>;
}

export interface RtcstatsSummary {
  startedAt?: string;
  endedAt?: string;
  durationS?: number;
  device: {
    userAgent?: string;
    browser?: string;
    os?: string;
    cores?: number;
    memoryGb?: number;
  };
  media: MediaAccessSummary;
  connections: ConnectionSummary[];
  quality: {
    sending: DirectionQuality;
    /** Per sample the median of received tracks: the participant's own downlink. */
    receiving: DirectionQuality;
    /** Time the page was not running (hidden tab, sleeping device). */
    pausedS: number;
  };
  rtp: {
    audioInLossPct?: number;
    audioConcealedPct?: number;
    videoInLossPct?: number;
    videoFreezes?: number;
    /** Received video streams the freeze figures are summed over. */
    videoStreams?: number;
    videoFreezeS?: number;
    maxRttMs?: number;
  };
  /** Plain-language findings, most important first. */
  findings: string[];
}

const iso = (ms: number | undefined): string | undefined =>
  ms && ms > 1e12 ? new Date(ms).toISOString() : undefined;

const round = (n: number, d = 1): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const i = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(q * (sorted.length - 1))),
  );
  return sorted[i];
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Coarse browser / OS from a user agent; enough for triage, not analytics. */
export function classifyUserAgent(ua: string | undefined): {
  browser?: string;
  os?: string;
} {
  if (!ua) return {};
  let browser: string | undefined;
  const m = (re: RegExp) => ua.match(re)?.[1];
  if (/Edg\//.test(ua)) browser = `Edge ${m(/Edg\/(\d+)/) ?? ""}`.trim();
  else if (/OPR\//.test(ua)) browser = `Opera ${m(/OPR\/(\d+)/) ?? ""}`.trim();
  else if (/Firefox\//.test(ua))
    browser = `Firefox ${m(/Firefox\/(\d+)/) ?? ""}`.trim();
  else if (/CriOS\//.test(ua))
    browser = `Chrome iOS ${m(/CriOS\/(\d+)/) ?? ""}`.trim();
  else if (/Chrome\//.test(ua))
    browser = `Chrome ${m(/Chrome\/(\d+)/) ?? ""}`.trim();
  else if (/Safari\//.test(ua))
    browser = `Safari ${m(/Version\/(\d+(?:\.\d+)?)/) ?? ""}`.trim();
  if (/; wv\)/.test(ua)) browser = `${browser ?? "Android"} WebView`;

  let os: string | undefined;
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
}

/** Running bad-state tracker: total seconds bad and the longest run. */
class BadTime {
  sampled = 0;
  bad = 0;
  longest = 0;
  private run = 0;
  scores: number[] = [];

  feed(score: number, dt: number): void {
    this.scores.push(score);
    this.sampled += dt;
    if (score < BAD_MOS) {
      this.bad += dt;
      this.run += dt;
      this.longest = Math.max(this.longest, this.run);
    } else {
      this.run = 0;
    }
  }

  gap(): void {
    this.run = 0;
  }

  result(): DirectionQuality {
    const sorted = [...this.scores].sort((a, b) => a - b);
    return {
      sampledS: round(this.sampled, 0),
      badS: round(this.bad, 0),
      badPct: this.sampled ? round((100 * this.bad) / this.sampled) : 0,
      longestBadRunS: round(this.longest, 0),
      worst: sorted.length ? round(sorted[0], 2) : null,
      p50: sorted.length ? round(quantile(sorted, 0.5) as number, 2) : null,
    };
  }
}

function summarizeMedia(events: RtcEvent[]): MediaAccessSummary {
  const media: MediaAccessSummary = {
    requests: 0,
    successes: 0,
    failures: [],
    lastObtained: [],
    screenshareRequests: 0,
    screenshareFailures: [],
    tracksEnded: 0,
    recorded: false,
  };
  for (const ev of events) {
    switch (ev.type) {
      case GUM:
        media.requests += 1;
        break;
      case `${GUM}OnSuccess`:
        media.successes += 1;
        if (Array.isArray(ev.value)) {
          media.lastObtained = ev.value
            .map((t: any) => t?.kind)
            .filter((k: unknown): k is string => typeof k === "string");
        }
        break;
      case `${GUM}OnFailure`: {
        const text = String(ev.value ?? "");
        const name = text.match(/^(\w+Error)\b/)?.[1] ?? text.slice(0, 80);
        media.failures.push({
          error: name,
          meaning: MEDIA_ERROR_MEANING[name],
          at: iso(ev.timestamp) ?? "",
        });
        break;
      }
      case GDM:
        media.screenshareRequests += 1;
        break;
      case `${GDM}OnFailure`: {
        const text = String(ev.value ?? "");
        media.screenshareFailures.push(
          text.match(/^(\w+Error)\b/)?.[1] ?? text.slice(0, 80),
        );
        break;
      }
      case "MediaStreamTrack.onended":
        media.tracksEnded += 1;
        break;
    }
  }
  media.recorded = media.requests + media.successes + media.failures.length > 0;
  return media;
}

function selectedPair(reports: Record<string, any>): any {
  const transport = Object.values(reports).find(
    (r: any) =>
      r?.type === "transport" &&
      r.selectedCandidatePairId &&
      reports[r.selectedCandidatePairId],
  ) as any;
  if (transport) return reports[transport.selectedCandidatePairId];
  return Object.values(reports).find(
    (r: any) =>
      r?.type === "candidate-pair" && r.nominated && r.state === "succeeded",
  );
}

interface PcResult {
  summary: ConnectionSummary;
  last: Record<string, any> | null;
  maxRttMs?: number;
}

function summarizeConnection(id: string, events: RtcEvent[]): PcResult | null {
  const summary: ConnectionSummary = {
    id,
    iceConnected: false,
    dtlsConnected: false,
    dtlsStalled: false,
    disconnects: 0,
    failures: 0,
    iceRestarts: 0,
    candidateErrors: 0,
  };
  let isPc = false;
  let checkingAt: number | undefined;
  let iceUpAt: number | undefined;
  let dtlsUpAt: number | undefined;
  let last: Record<string, any> | null = null;
  let maxRtt: number | undefined;

  for (const ev of events) {
    switch (ev.type) {
      case "oniceconnectionstatechange": {
        isPc = true;
        const state = String(ev.value);
        if (state === "checking" && checkingAt === undefined)
          checkingAt = ev.timestamp;
        if (
          (state === "connected" || state === "completed") &&
          iceUpAt === undefined
        ) {
          iceUpAt = ev.timestamp;
          summary.iceConnected = true;
          if (checkingAt !== undefined)
            summary.iceConnectMs = ev.timestamp - checkingAt;
        }
        if (state === "disconnected") summary.disconnects += 1;
        if (state === "failed") summary.failures += 1;
        break;
      }
      case "onconnectionstatechange": {
        isPc = true;
        const state = String(ev.value);
        summary.finalState = state;
        if (state === "connected" && dtlsUpAt === undefined) {
          dtlsUpAt = ev.timestamp;
          summary.dtlsConnected = true;
        }
        if (state === "failed") summary.failures += 1;
        break;
      }
      case "restartIce":
        summary.iceRestarts += 1;
        break;
      case "createOffer":
        if (
          ev.value &&
          typeof ev.value === "object" &&
          ev.value.iceRestart === true
        ) {
          summary.iceRestarts += 1;
        }
        break;
      case "onicecandidateerror":
        summary.candidateErrors += 1;
        break;
      case "getStats":
        isPc = true;
        last = ev.value;
        for (const r of Object.values(ev.value ?? {}) as any[]) {
          if (
            r?.type === "transport" &&
            r.dtlsState === "connected" &&
            dtlsUpAt === undefined
          ) {
            dtlsUpAt = ev.timestamp;
            summary.dtlsConnected = true;
          }
          if (r?.type === "candidate-pair" && r.nominated) {
            const rtt = num(r.currentRoundTripTime);
            if (rtt !== undefined) maxRtt = Math.max(maxRtt ?? 0, rtt * 1000);
          }
        }
        break;
    }
  }
  // A key whose only events are the client-info "create" is not a connection.
  if (
    !isPc &&
    events.every((e) => e.type === "create" && !(e.value && e.value.iceServers))
  ) {
    return null;
  }

  if (iceUpAt !== undefined) {
    const end = events[events.length - 1].timestamp;
    summary.dtlsStalled =
      dtlsUpAt === undefined
        ? end - iceUpAt > DTLS_STALL_S * 1000
        : dtlsUpAt - iceUpAt > DTLS_STALL_S * 1000;
  }

  if (last) {
    const pair = selectedPair(last);
    if (pair) {
      const local = last[pair.localCandidateId];
      const remote = last[pair.remoteCandidateId];
      summary.path = {
        local: local?.candidateType ?? "unknown",
        remote: remote?.candidateType,
        relayProtocol:
          local?.candidateType === "relay" ? local?.relayProtocol : undefined,
        rttMs:
          num(pair.currentRoundTripTime) !== undefined
            ? round(pair.currentRoundTripTime * 1000, 0)
            : undefined,
      };
    }
    // Cumulative seconds per reason, one object per simulcast layer: take the
    // layer with the largest total, never a sum.
    let best: Record<string, number> | null = null;
    let bestTotal = 0;
    for (const r of Object.values(last) as any[]) {
      if (r?.type !== "outbound-rtp" || r.kind !== "video") continue;
      const d = r.qualityLimitationDurations;
      if (!d || typeof d !== "object") continue;
      const total = (Object.values(d) as unknown[]).reduce<number>(
        (a, v) => a + (num(v) ?? 0),
        0,
      );
      if (total > bestTotal) {
        bestTotal = total;
        best = d;
      }
    }
    if (best && bestTotal > 0) {
      const pct = (k: string) =>
        round((100 * (num(best![k]) ?? 0)) / bestTotal);
      summary.qualityLimitation = {
        bandwidthPct: pct("bandwidth"),
        cpuPct: pct("cpu"),
        otherPct: pct("other"),
      };
    }
  }

  return { summary, last, maxRttMs: maxRtt };
}

function summarizeQuality(events: RtcEvent[]): RtcstatsSummary["quality"] {
  const sending = new BadTime();
  const receiving = new BadTime();
  const limiting: Record<string, number> = {};
  let pausedS = 0;
  let prev: number | undefined;

  for (const ev of events) {
    if (
      ev.type !== ":samba-track-scores" ||
      !ev.value ||
      typeof ev.value !== "object"
    )
      continue;
    let dt = 0;
    if (prev !== undefined) {
      const gap = (ev.timestamp - prev) / 1000;
      if (gap >= 0 && gap <= MAX_SCORE_GAP_S) dt = gap;
      else {
        pausedS += Math.max(gap, 0);
        sending.gap();
        receiving.gap();
      }
    }
    prev = ev.timestamp;

    const tracks: any[] = Array.isArray(ev.value.trackScores)
      ? ev.value.trackScores
      : [];
    const sent = tracks.filter(
      (t) => t?.direction === "sending" && typeof t.score === "number",
    );
    const recv = tracks.filter(
      (t) => t?.direction === "receiving" && typeof t.score === "number",
    );
    if (sent.length) {
      const worst = sent.reduce((a, t) => (t.score < a.score ? t : a));
      sending.feed(worst.score, dt);
      if (worst.score < BAD_MOS && typeof worst.limitingFactor === "string") {
        limiting[worst.limitingFactor] =
          (limiting[worst.limitingFactor] ?? 0) + 1;
      }
    }
    if (recv.length) receiving.feed(median(recv.map((t) => t.score)), dt);
  }

  const sendingResult = sending.result();
  if (Object.keys(limiting).length) sendingResult.limitingFactors = limiting;
  return {
    sending: sendingResult,
    receiving: receiving.result(),
    pausedS: round(pausedS, 0),
  };
}

function summarizeRtp(pcs: PcResult[]): RtcstatsSummary["rtp"] {
  let aRecv = 0,
    aLost = 0,
    aSamples = 0,
    aConcealed = 0;
  let vRecv = 0,
    vLost = 0,
    freezes = 0,
    freezeS = 0,
    vStreams = 0;
  let maxRtt: number | undefined;
  for (const pc of pcs) {
    if (pc.maxRttMs !== undefined) maxRtt = Math.max(maxRtt ?? 0, pc.maxRttMs);
    for (const r of Object.values(pc.last ?? {}) as any[]) {
      if (r?.type !== "inbound-rtp") continue;
      if (r.kind === "audio") {
        aRecv += num(r.packetsReceived) ?? 0;
        aLost += Math.max(num(r.packetsLost) ?? 0, 0);
        aSamples += num(r.totalSamplesReceived) ?? 0;
        aConcealed += num(r.concealedSamples) ?? 0;
      } else if (r.kind === "video") {
        vStreams += 1;
        vRecv += num(r.packetsReceived) ?? 0;
        vLost += Math.max(num(r.packetsLost) ?? 0, 0);
        freezes += num(r.freezeCount) ?? 0;
        freezeS += num(r.totalFreezesDuration) ?? 0;
      }
    }
  }
  const rtp: RtcstatsSummary["rtp"] = {};
  if (aRecv + aLost > 0)
    rtp.audioInLossPct = round((100 * aLost) / (aRecv + aLost), 2);
  if (aSamples > 0)
    rtp.audioConcealedPct = round((100 * aConcealed) / aSamples, 2);
  if (vRecv + vLost > 0) {
    rtp.videoInLossPct = round((100 * vLost) / (vRecv + vLost), 2);
    rtp.videoFreezes = freezes;
    rtp.videoStreams = vStreams;
    rtp.videoFreezeS = round(freezeS, 0);
  }
  if (maxRtt !== undefined) rtp.maxRttMs = round(maxRtt, 0);
  return rtp;
}

function findingsFor(s: Omit<RtcstatsSummary, "findings">): string[] {
  const f: string[] = [];
  const { media, connections, quality, rtp } = s;

  if (media.failures.length) {
    const last = media.failures[media.failures.length - 1];
    const recovered =
      media.successes > 0
        ? " (a later request succeeded)"
        : " and never succeeded";
    f.push(
      `Camera/microphone access failed ${media.failures.length}x${recovered}: ${last.error}` +
        (last.meaning ? ` - ${last.meaning}.` : "."),
    );
  }
  if (
    media.successes > 0 &&
    media.lastObtained.length &&
    !media.lastObtained.includes("audio")
  ) {
    f.push("No microphone track was obtained.");
  }
  if (media.screenshareFailures.length) {
    f.push(
      `Screen sharing failed ${media.screenshareFailures.length}x (${media.screenshareFailures.join(", ")}).`,
    );
  }

  if (!connections.length) {
    f.push(
      "No media connection was created: the participant never got as far as sending or receiving media.",
    );
  } else if (!connections.some((c) => c.iceConnected)) {
    f.push(
      "No media connection ever connected (ICE never reached connected): a firewall or network blocking both UDP and TURN is the usual cause.",
    );
  } else {
    const stalled = connections.filter((c) => c.dtlsStalled).length;
    if (stalled)
      f.push(
        `${stalled} connection(s) reached ICE but stalled in DTLS for over ${DTLS_STALL_S} s.`,
      );
    const slow = Math.max(...connections.map((c) => c.iceConnectMs ?? 0));
    if (slow > 5000)
      f.push(`Slowest connection took ${round(slow / 1000)} s to connect.`);
    const relays = connections.filter((c) => c.path?.local === "relay");
    if (relays.length) {
      const protos = [
        ...new Set(relays.map((c) => c.path?.relayProtocol).filter(Boolean)),
      ];
      const tcp = protos.some((p) => p === "tcp" || p === "tls");
      f.push(
        `Media went through a TURN relay${protos.length ? ` over ${protos.join("/")}` : ""}` +
          (tcp
            ? ": UDP looks blocked on this network, which makes audio and video more fragile."
            : "."),
      );
    }
  }
  const drops = connections.reduce((a, c) => a + c.disconnects, 0);
  const restarts = connections.reduce((a, c) => a + c.iceRestarts, 0);
  if (drops)
    f.push(
      `Connection dropped ${drops}x during the call (${restarts} ICE restart(s)).`,
    );

  const { sending, receiving } = quality;
  if (sending.badS >= 10) {
    const why = sending.limitingFactors
      ? ` Limiting factor: ${Object.entries(sending.limitingFactors)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} (${v})`)
          .join(", ")}.`
      : "";
    f.push(
      `Sending quality was poor (score < ${BAD_MOS}) for ${sending.badS} s (${sending.badPct}% of the time, longest ${sending.longestBadRunS} s): others saw/heard this participant badly.${why}`,
    );
  }
  const ql = connections.map((c) => c.qualityLimitation).find(Boolean);
  if (ql && ql.cpuPct >= 20)
    f.push(
      `Video encoder was CPU-limited ${ql.cpuPct}% of the time: the device is overloaded.`,
    );
  if (ql && ql.bandwidthPct >= 20)
    f.push(
      `Video encoder was bandwidth-limited ${ql.bandwidthPct}% of the time: upload is too slow.`,
    );
  if (receiving.badS >= 10) {
    f.push(
      `Receiving quality was poor for ${receiving.badS} s (${receiving.badPct}% of the time, longest ${receiving.longestBadRunS} s): the median received stream was poor, which points to this participant's own download rather than one sender.`,
    );
  }
  if ((rtp.audioConcealedPct ?? 0) >= 2)
    f.push(
      `Received audio had ${rtp.audioConcealedPct}% concealed samples (audible glitches).`,
    );
  if ((rtp.videoFreezeS ?? 0) >= 10)
    f.push(
      `Received video froze for ${rtp.videoFreezeS} s (${rtp.videoFreezes} freezes), summed over ${rtp.videoStreams} received video stream(s) still open at the end of the call.`,
    );
  if (quality.pausedS >= 30) {
    f.push(
      `The page was not running for ${quality.pausedS} s (hidden tab, locked phone or sleeping device), so no quality data for that time.`,
    );
  }
  if (!f.length) f.push("No problems found in the WebRTC stats.");
  return f;
}

/** Summarize a parsed dump. */
export function summarizeDump(dump: ParsedDump): RtcstatsSummary {
  const client = dump.peerConnections.client ?? [];
  const all = Object.values(dump.peerConnections).flat();
  const first = all.reduce<number | undefined>(
    (a, e) => (a === undefined || e.timestamp < a ? e.timestamp : a),
    undefined,
  );
  const lastTs = all.reduce<number | undefined>(
    (a, e) => (a === undefined || e.timestamp > a ? e.timestamp : a),
    undefined,
  );

  const pcs: PcResult[] = Object.entries(dump.peerConnections)
    .filter(([id]) => id !== "client")
    .map(([id, events]) => summarizeConnection(id, events))
    .filter((p): p is PcResult => p !== null);

  const createEvent = all.find(
    (e) =>
      e.type === "create" &&
      e.value &&
      typeof e.value === "object" &&
      !e.value.iceServers,
  );
  const ua =
    typeof dump.meta.userAgent === "string" ? dump.meta.userAgent : undefined;

  const base: Omit<RtcstatsSummary, "findings"> = {
    startedAt: iso(first),
    endedAt: iso(lastTs),
    durationS:
      first !== undefined && lastTs !== undefined
        ? round((lastTs - first) / 1000, 0)
        : undefined,
    device: {
      userAgent: ua,
      ...classifyUserAgent(ua),
      cores: num(createEvent?.value?.hardwareConcurrency),
      memoryGb: num(createEvent?.value?.deviceMemory),
    },
    media: summarizeMedia(client),
    connections: pcs.map((p) => p.summary),
    quality: summarizeQuality(client),
    rtp: summarizeRtp(pcs),
  };
  return { ...base, findings: findingsFor(base) };
}
