/**
 * Call diagnostics: rtcstats decoding, the dump and client-log summaries, and
 * the two tools.
 *
 * Every fixture here is SYNTHETIC. This repository is public: never paste a
 * real rtcstats dump or client log in here, they carry customer data.
 *
 * @group unit
 */

import { gzipSync } from "node:zlib";
import { parseDump } from "../../src/diagnostics/rtcstats-decoder";
import { summarizeDump } from "../../src/diagnostics/rtcstats-summary";
import { summarizeClientLogs } from "../../src/diagnostics/client-log-summary";
import {
  diagnoseParticipant,
  executeDiagnosticsTool,
  registerDiagnosticsTools,
} from "../../src/tools/diagnostics-tools";
import { ApiResponseError } from "../../src/errors";

const T0 = 1_763_640_000_000; // 2025-11-20T12:00:00Z

/**
 * Build a fileFormat 3 dump: header, metadata record, then events
 * [method, pcId, value, deltaMs] with the time absolute on the first event
 * and a delta after that.
 */
function dump(events: Array<[string | number, string | null, unknown, number]>): string {
  let prev = 0;
  const lines = events.map(([m, pc, v, at]) => {
    const delta = prev === 0 ? at : at - prev;
    prev = at;
    return JSON.stringify([m, pc, v, delta]);
  });
  return [
    "RTCStatsDump",
    JSON.stringify({
      fileFormat: 3,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    }),
    ...lines,
  ].join("\n");
}

const scores = (sending: number, receiving: number[]) => ({
  trackScores: [
    { direction: "sending", kind: "video", score: sending, limitingFactor: sending < 3 ? "cpu" : undefined },
    ...receiving.map((s) => ({ direction: "receiving", kind: "audio", score: s })),
  ],
  aggregate: { aggregateMOS: sending },
});

/** A relayed-over-TCP, CPU-limited call with 20 s of bad sending quality. */
function troubledCall(): string {
  const ev: Array<[string | number, string | null, unknown, number]> = [
    [39, null, { hardwareConcurrency: 4, deviceMemory: 8 }, T0],
    [60, null, { audio: true, video: true }, T0 + 100],
    [62, null, "NotReadableError: Could not start video source", T0 + 300],
    [60, null, { audio: true, video: false }, T0 + 400],
    [61, null, [{ kind: "audio" }], T0 + 500],
    [39, "PC_0", { iceServers: [{}] }, T0 + 1000],
    [24, "PC_0", "checking", T0 + 1100],
    [24, "PC_0", "connected", T0 + 1400],
    [25, "PC_0", "connected", T0 + 2000],
    [
      "g",
      "PC_0",
      {
        t: T0 + 3000,
        T1: { type: 5, 123: "connected", 125: "CP1" },
        CP1: { type: 6, 148: "L1", 149: "R1", 150: true, 118: "succeeded", 152: 0.12 },
        L1: { type: 7, 136: "relay", 139: "tcp" },
        R1: { type: 8, 136: "host" },
        OV: { type: 2, 11: "video", 96: { none: 10, bandwidth: 0, cpu: 30, other: 0 } },
        IA: { type: 1, 11: "audio", 14: 950, 15: 50, 51: 48000, 52: 2400 },
      },
      T0 + 3000,
    ],
  ];
  // Score samples every 2 s: 10 good, 10 bad (20 s), then good again.
  for (let i = 0; i < 30; i++) {
    const bad = i >= 10 && i < 20;
    ev.push([":samba-track-scores", null, scores(bad ? 2.1 : 4.3, [4.2, 4.0]), T0 + 4000 + i * 2000]);
  }
  // Delta getStats: only the changed audio counters, the rest is carried over.
  ev.push(["g", "PC_0", { t: T0 + 64000, IA: { 14: 2950 } }, T0 + 64000]);
  ev.push([24, "PC_0", "disconnected", T0 + 65000]);
  ev.push([24, "PC_0", "connected", T0 + 66000]);
  return dump(ev);
}

describe("rtcstats decoder", () => {
  it("rejects text that is not a dump", () => {
    expect(() => parseDump("hello")).toThrow("invalidDump");
  });

  it("decodes methods, stats names and absolute times, and carries delta stats over", () => {
    const parsed = parseDump(troubledCall());
    expect(parsed.meta.fileFormat).toBe(3);
    const pc = parsed.peerConnections.PC_0;
    expect(pc[0].type).toBe("create");
    expect(pc[1]).toMatchObject({ type: "oniceconnectionstatechange", value: "checking", timestamp: T0 + 1100 });

    const stats = pc.filter((e) => e.type === "getStats");
    expect(stats[0].value.L1).toMatchObject({ type: "local-candidate", candidateType: "relay", relayProtocol: "tcp" });
    // second report only sent packetsReceived; the rest comes from the first
    expect(stats[1].value.IA).toMatchObject({ type: "inbound-rtp", kind: "audio", packetsReceived: 2950, packetsLost: 50 });
    expect(stats[1].value.L1.candidateType).toBe("relay");
  });

  it("splits records written back to back without newlines", () => {
    const text = 'RTCStatsDump{"fileFormat":3}[24,"PC_1","checking",' + T0 + '][24,"PC_1","connected",250]';
    const parsed = parseDump(text);
    expect(parsed.peerConnections.PC_1.map((e) => e.timestamp)).toEqual([T0, T0 + 250]);
  });
});

describe("rtcstats summary", () => {
  const s = summarizeDump(parseDump(troubledCall()));

  it("reads the device", () => {
    expect(s.device).toMatchObject({ browser: "Chrome 142", os: "Windows", cores: 4, memoryGb: 8 });
  });

  it("reports the camera failure with its meaning, and the audio-only recovery", () => {
    expect(s.media.requests).toBe(2);
    expect(s.media.successes).toBe(1);
    expect(s.media.failures[0].error).toBe("NotReadableError");
    expect(s.media.lastObtained).toEqual(["audio"]);
    expect(s.findings[0]).toMatch(/Camera\/microphone access failed 1x \(a later request succeeded\): NotReadableError/);
  });

  it("describes the connection", () => {
    expect(s.connections).toHaveLength(1);
    expect(s.connections[0]).toMatchObject({
      iceConnected: true,
      iceConnectMs: 300,
      dtlsConnected: true,
      dtlsStalled: false,
      disconnects: 1,
      path: { local: "relay", remote: "host", relayProtocol: "tcp", rttMs: 120 },
      qualityLimitation: { cpuPct: 75, bandwidthPct: 0 },
    });
    expect(s.findings.join("\n")).toMatch(/TURN relay over tcp: UDP looks blocked/);
    expect(s.findings.join("\n")).toMatch(/CPU-limited 75%/);
  });

  it("measures bad quality as time, sending and receiving apart", () => {
    expect(s.quality.sending).toMatchObject({ badS: 20, longestBadRunS: 20, worst: 2.1 });
    expect(s.quality.sending.limitingFactors).toEqual({ cpu: 10 });
    expect(s.quality.receiving.badS).toBe(0);
    expect(s.findings.join("\n")).toMatch(/Sending quality was poor \(score < 3\) for 20 s/);
  });

  it("computes RTP ratios from the last stats", () => {
    expect(s.rtp.audioInLossPct).toBeCloseTo(1.66, 1);
    expect(s.rtp.audioConcealedPct).toBe(5);
    expect(s.rtp.maxRttMs).toBe(120);
  });

  it("flags a participant who never connected", () => {
    const never = summarizeDump(
      parseDump(dump([
        [60, null, { audio: true }, T0],
        [62, null, "NotAllowedError: Permission denied", T0 + 50],
        [24, "PC_0", "checking", T0 + 1000],
        [24, "PC_0", "failed", T0 + 31000],
      ])),
    );
    expect(never.findings[0]).toMatch(/failed 1x and never succeeded: NotAllowedError - permission denied/);
    expect(never.findings.join("\n")).toMatch(/No media connection ever connected/);
  });

  it("claims nothing about camera/microphone when the dump does not record getUserMedia", () => {
    const quiet = summarizeDump(parseDump(dump([[24, "PC_0", "checking", T0], [24, "PC_0", "connected", T0 + 200]])));
    expect(quiet.media.recorded).toBe(false);
    expect(quiet.findings).toEqual(["No problems found in the WebRTC stats."]);
  });

    it("does not count a sleeping page as bad quality", () => {
    const asleep = summarizeDump(
      parseDump(dump([
        [":samba-track-scores", null, scores(2, [2]), T0],
        [":samba-track-scores", null, scores(2, [2]), T0 + 2000],
        [":samba-track-scores", null, scores(2, [2]), T0 + 122000],
      ])),
    );
    expect(asleep.quality.sending.badS).toBe(2);
    expect(asleep.quality.pausedS).toBe(120);
  });
});

describe("client log summary", () => {
  const at = (s: number) => new Date(T0 + s * 1000).toISOString();

  it("finds milestones in order and groups repeated problems", () => {
    const s = summarizeClientLogs([
      { level: "info", message: "Requesting user media", timestamp: at(1) },
      { level: "info", message: "audio track settings:", timestamp: at(2) },
      { level: "info", message: "ICE connection established successfully", timestamp: at(3) },
      { level: "warn", message: "[AUDIO-HEALTH] Audio stalled", timestamp: at(10) },
      { level: "warn", message: "[AUDIO-HEALTH] Audio stalled", timestamp: at(20) },
      { level: "error", message: "Request 1234 failed", timestamp: at(30) },
      { level: "error", message: "Request 5678 failed", timestamp: at(40) },
    ]);
    expect(s.lines).toBe(7);
    expect(s.byLevel).toEqual({ info: 3, warn: 2, error: 2 });
    expect(s.milestones.map((m) => m.label)).toEqual([
      "Requested camera/microphone",
      "Got a microphone track",
      "Media connection established",
      "Received audio stalled",
    ]);
    expect(s.topProblems[0]).toMatchObject({ count: 2 });
    expect(s.topProblems.find((p) => p.level === "error")?.count).toBe(2);
    expect(s.findings).toEqual(["Received audio stalled 2x."]);
  });

  it("infers a failed camera/microphone request from a request with no track after it", () => {
    const s = summarizeClientLogs([{ level: "info", message: "Requesting user media", timestamp: at(1) }]);
    expect(s.findings[0]).toMatch(/requested 1x but no track was ever obtained/);
    expect(s.findings[1]).toMatch(/never record a media connection/);
  });

  it("names the camera/microphone error from each remote log line that carries it", () => {
    const s = summarizeClientLogs([
      { level: "error", message: "Media capture failed: NotAllowedError: Permission denied", timestamp: at(1) },
      { level: "error", message: "Media capture failed: NotAllowedError: Permission denied", timestamp: at(5) },
      // as the client sends them: extra arguments arrive as a JSON array in payload
      { level: "error", message: "WebRTC client error in publishing:", payload: ["Timeout waiting for media server"] as any, timestamp: at(6) },
      { level: "error", message: "WebRTC client error in publishing:", payload: ["NotReadableError | Could not start video source"] as any, timestamp: at(7) },
      { level: "warn", message: "Camera switch capture failed; keeping current stream", payload: [{ name: "OverconstrainedError", message: "" }] as any, timestamp: at(8) },
      { level: "error", message: "Media capture failed: TypeError: x", timestamp: at(9) },
    ]);
    expect(s.mediaErrors.map((e) => [e.error, e.count])).toEqual([
      ["NotAllowedError", 2],
      ["NotReadableError", 1],
      ["OverconstrainedError", 1],
    ]);
    expect(s.findings[0]).toMatch(/failed 2x while turning on or switching a device in the call: NotAllowedError - permission denied/);
    expect(s.findings[1]).toMatch(/while publishing \(publishing\): NotReadableError/);
    expect(s.findings[2]).toMatch(/Camera switch \(the previous stream kept working\): OverconstrainedError/);
  });

  it("does not flag media access when a track was obtained", () => {
    const s = summarizeClientLogs([
      { level: "info", message: "Requesting user media", timestamp: at(1) },
      { level: "info", message: "audio track settings:", timestamp: at(2) },
      { level: "info", message: "ICE connection established successfully", timestamp: at(3) },
    ]);
    expect(s.findings).toEqual(["No problems found in the client logs."]);
  });

  it("handles an empty log", () => {
    expect(summarizeClientLogs([]).findings).toEqual(["No client logs were received from this participant."]);
  });
});

describe("diagnostics tools", () => {
  const notFound = () =>
    new ApiResponseError("Digital Samba API error (404): Not found", { statusCode: 404, apiErrorMessage: "Not found" });

  const client = (over: Record<string, jest.Mock> = {}) =>
    ({
      getParticipantRtcstats: jest.fn().mockResolvedValue(troubledCall()),
      getParticipantLogs: jest.fn().mockResolvedValue([]),
      listSessionParticipants: jest.fn(),
      ...over,
    }) as any;

  it("registers both tools as read-only", () => {
    const tools = registerDiagnosticsTools();
    expect(tools.map((t) => t.name)).toEqual(["get-participant-diagnostics", "get-session-diagnostics"]);
    tools.forEach((t) => expect(t.annotations?.readOnlyHint).toBe(true));
  });

  it("explains a missing dump instead of failing", async () => {
    const d = await diagnoseParticipant(
      client({ getParticipantRtcstats: jest.fn().mockRejectedValue(notFound()) }),
      "p1",
    );
    expect(d.rtcstats).toBeUndefined();
    expect(d.findings.join("\n")).toMatch(/may still be in the session/);
  });

  it("returns findings only when detail is off", async () => {
    const res = await executeDiagnosticsTool(
      "get-participant-diagnostics",
      { participantId: "p1", includeDetail: false },
      client(),
    );
    const body = JSON.parse(res.content[0].text);
    expect(Object.keys(body)).toEqual(["participantId", "findings"]);
    expect(body.findings[0]).toMatch(/NotReadableError/);
  });

  it("diagnoses every participant of a session", async () => {
    const api = client({
      listSessionParticipants: jest.fn().mockResolvedValue({
        total_count: 2,
        data: [
          { id: "p1", name: "Synthetic A", join_time: "2025-11-20T12:00:00Z" },
          { id: "p2", name: "Synthetic B", join_time: "2025-11-20T12:01:00Z" },
        ],
      }),
      getParticipantRtcstats: jest
        .fn()
        .mockImplementation((id: string) => (id === "p1" ? Promise.resolve(troubledCall()) : Promise.reject(notFound()))),
    });
    const res = await executeDiagnosticsTool("get-session-diagnostics", { sessionId: "s1" }, api);
    const body = JSON.parse(res.content[0].text);
    expect(body.participants).toBe(2);
    expect(body.results[0]).toMatchObject({ participantId: "p1", device: "Chrome 142 / Windows" });
    expect(body.results[1].findings.join("\n")).toMatch(/No WebRTC stats/);
    expect(api.listSessionParticipants).toHaveBeenCalledWith("s1", { limit: 50 });
  });

  it("gunzips the dump in the API client", async () => {
    const { DigitalSambaApiClient } = await import("../../src/digital-samba-api");
    const api = new DigitalSambaApiClient("k", "https://api.example.test/api/v1");
    const gz = gzipSync(Buffer.from(troubledCall()));
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(gz, { status: 200, headers: { "Content-Type": "application/gzip" } }));
    try {
      const text = await api.getParticipantRtcstats("p1");
      expect(text.startsWith("RTCStatsDump")).toBe(true);
      expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/participants\/p1\/rtcstats$/);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
