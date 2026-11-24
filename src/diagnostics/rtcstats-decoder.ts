/**
 * rtcstats fileFormat 3 decoder.
 *
 * Port of react-dashboard src/components/RtcStats/utils/Decoder.js (the
 * dashboard's RTC stats viewer), which in turn ports the dictionaries from
 * rtcstats packages/rtcstats-shared/compression.js. The dictionaries are kept
 * packed line for line with that source so the three stay easy to diff.
 *
 * Left out on purpose: SDP description decompression. The diagnostics summary
 * never reads SDP, so offers/answers stay as recorded.
 *
 * @module diagnostics/rtcstats-decoder
 */

// prettier-ignore
export const METHODS: Record<string, string> = {
  g: 'getStats', 1: 'getStats',
  2: 'createOffer', 3: 'createOfferOnSuccess', 12: 'createOfferOnFailure',
  4: 'createAnswer', 5: 'createAnswerOnSuccess', 13: 'createAnswerOnFailure',
  6: 'setLocalDescription', 7: 'setLocalDescriptionOnSuccess', 14: 'setLocalDescriptionOnFailure',
  8: 'setRemoteDescription', 9: 'setRemoteDescriptionOnSuccess', 15: 'setRemoteDescriptionOnFailure',
  10: 'addIceCandidate', 11: 'addIceCandidateOnSuccess', 16: 'addIceCandidateOnFailure',
  20: 'onicecandidate', 21: 'onicecandidateerror', 22: 'ontrack',
  23: 'onsignalingstatechange', 24: 'oniceconnectionstatechange', 25: 'onconnectionstatechange',
  26: 'onicegatheringstatechange', 27: 'onnegotiationneeded', 28: 'ondatachannel',
  30: 'addTrack', 31: 'addTrackOnSuccess', 32: 'addTransceiver', 33: 'addTransceiverOnSuccess',
  34: 'removeTrack', 35: 'createDataChannel', 36: 'close', 37: 'restartIce', 38: 'setConfiguration',
  39: 'create', 40: 'constraints', 41: 'setCodecPreferences', 42: 'setHeaderExtensionsToNegotiate',
  50: 'setParameters', 51: 'replaceTrack',
  60: 'navigator.mediaDevices.getUserMedia', 61: 'navigator.mediaDevices.getUserMediaOnSuccess',
  62: 'navigator.mediaDevices.getUserMediaOnFailure', 63: 'navigator.mediaDevices.getDisplayMedia',
  64: 'navigator.mediaDevices.getDisplayMediaOnSuccess', 65: 'navigator.mediaDevices.getDisplayMediaOnFailure',
  66: 'navigator.mediaDevices.enumerateDevices', 67: 'navigator.mediaDevices.ondevicechange',
  70: 'MediaStreamTrack.stop', 71: 'MediaStreamTrack.applyConstraints',
  72: 'MediaStreamTrack.onended', 73: 'MediaStreamTrack.onmute', 74: 'MediaStreamTrack.onunmute',
  80: 'HTMLMediaElement.resize'
};

// prettier-ignore
export const STATS_TYPES: Record<string, string> = {
  1: 'inbound-rtp', 2: 'outbound-rtp', 3: 'remote-inbound-rtp', 4: 'remote-outbound-rtp',
  5: 'transport', 6: 'candidate-pair', 7: 'local-candidate', 8: 'remote-candidate',
  9: 'data-channel', 10: 'peer-connection', 11: 'certificate', 12: 'media-source',
  13: 'media-playout', 14: 'codec'
};

// prettier-ignore
export const STATS_PROPS: Record<string, string> = {
  t: 'timestamp',
  4: 'payloadType', 5: 'transportId', 6: 'mimeType', 7: 'clockRate', 8: 'channels', 9: 'sdpFmtpLine',
  10: 'ssrc', 11: 'kind', 12: 'codecId',
  14: 'packetsReceived', 15: 'packetsLost', 16: 'jitter',
  17: 'trackIdentifier', 18: 'mid', 19: 'remoteId', 20: 'framesDecoded', 21: 'keyFramesDecoded',
  22: 'framesDropped', 23: 'frameWidth', 24: 'frameHeight', 25: 'framesPerSecond', 26: 'qpSum',
  27: 'totalDecodeTime', 28: 'totalInterFrameDelay', 29: 'totalSquaredInterFrameDelay',
  30: 'pauseCount', 31: 'totalPausesDuration', 32: 'freezeCount', 33: 'totalFreezesDuration',
  34: 'lastPacketReceivedTimestamp', 35: 'headerBytesReceived', 36: 'packetsDiscarded',
  37: 'fecPacketsReceived', 38: 'fecPacketsDiscarded', 39: 'fecBytesReceived', 40: 'fecSsrc',
  41: 'bytesReceived', 42: 'nackCount', 43: 'firCount', 44: 'pliCount', 45: 'totalProcessingDelay',
  46: 'estimatedPlayoutTimestamp', 47: 'jitterBufferDelay', 48: 'jitterBufferTargetDelay',
  49: 'jitterBufferEmittedCount', 50: 'jitterBufferMinimumDelay', 51: 'totalSamplesReceived',
  52: 'concealedSamples', 53: 'silentConcealedSamples', 54: 'concealmentEvents',
  55: 'insertedSamplesForDeceleration', 56: 'removedSamplesForAcceleration', 57: 'audioLevel',
  58: 'totalAudioEnergy', 59: 'totalSamplesDuration', 60: 'framesReceived', 61: 'decoderImplementation',
  62: 'playoutId', 63: 'powerEfficientDecoder', 64: 'framesAssembledFromMultiplePackets',
  65: 'totalAssemblyTime', 66: 'contentType', 67: 'googTimingFrameInfo',
  68: 'retransmittedPacketsReceived', 69: 'retransmittedBytesReceived', 70: 'rtxSsrc',
  71: 'totalCorruptionProbability', 72: 'totalSquaredCorruptionProbability', 73: 'corruptionMeasurements',
  74: 'localId', 75: 'roundTripTime', 76: 'totalRoundTripTime', 77: 'fractionLost',
  78: 'roundTripTimeMeasurements', 79: 'packetsSent', 80: 'bytesSent', 81: 'mediaSourceId',
  82: 'rid', 83: 'encodingIndex', 84: 'headerBytesSent', 85: 'retransmittedPacketsSent',
  86: 'retransmittedBytesSent', 87: 'targetBitrate', 88: 'totalEncodedBytesTarget', 89: 'framesSent',
  90: 'hugeFramesSent', 91: 'framesEncoded', 92: 'keyFramesEncoded', 93: 'totalEncodeTime',
  94: 'totalPacketSendDelay', 95: 'qualityLimitationReason', 96: 'qualityLimitationDurations',
  97: 'qualityLimitationResolutionChanges', 98: 'encoderImplementation', 99: 'powerEfficientEncoder',
  100: 'active', 101: 'scalabilityMode', 102: 'remoteTimestamp', 103: 'reportsSent',
  104: 'echoReturnLoss', 105: 'echoReturnLossEnhancement', 106: 'width', 107: 'height', 108: 'frames',
  109: 'synthesizedSamplesDuration', 110: 'synthesizedSamplesEvents', 111: 'totalPlayoutDelay',
  112: 'totalSamplesCount', 113: 'dataChannelsOpened', 114: 'dataChannelsClosed', 115: 'label',
  116: 'protocol', 117: 'dataChannelIdentifier', 118: 'state', 119: 'messagesSent',
  120: 'messagesReceived', 121: 'iceRole', 122: 'iceLocalUsernameFragment', 123: 'dtlsState',
  124: 'iceState', 125: 'selectedCandidatePairId', 126: 'localCertificateId',
  127: 'remoteCertificateId', 128: 'tlsVersion', 129: 'dtlsCipher', 130: 'dtlsRole',
  131: 'srtpCipher', 132: 'selectedCandidatePairChanges', 133: 'rtcpTransportStatsId',
  134: 'address', 135: 'port', 136: 'candidateType', 137: 'priority', 138: 'url',
  139: 'relayProtocol', 140: 'foundation', 141: 'relatedAddress', 142: 'relatedPort',
  143: 'usernameFragment', 144: 'tcpType', 145: 'networkType', 148: 'localCandidateId',
  149: 'remoteCandidateId', 150: 'nominated', 151: 'lastPacketSentTimestamp',
  152: 'currentRoundTripTime', 153: 'availableOutgoingBitrate', 154: 'availableIncomingBitrate',
  155: 'requestsReceived', 156: 'requestsSent', 157: 'responsesReceived', 158: 'responsesSent',
  159: 'consentRequestsSent', 160: 'packetsDiscardedOnSend', 161: 'bytesDiscardedOnSend',
  163: 'fingerprint', 164: 'fingerprintAlgorithm', 165: 'base64Certificate', 166: 'issuerCertificateId',
  167: 'psnrMeasurements', 168: 'psnrSum', 169: 'packetsReceivedWithEct1', 170: 'packetsReceivedWithCe',
  171: 'packetsReportedAsLost', 172: 'packetsReportedAsLostButRecovered',
  173: 'packetsWithBleachedEct1Marking', 174: 'packetsSentWithEct1',
  175: 'ccfbMessagesSent', 176: 'ccfbMessagesReceived'
};

export const DUMP_HEADER = "RTCStatsDump";

/** One recorded call, in order, with its absolute time in ms since the epoch. */
export interface RtcEvent {
  timestamp: number;
  type: string;
  value: any;
}

export interface ParsedDump {
  /** The dump's metadata record (userAgent, url, fileFormat, ...). */
  meta: Record<string, any>;
  /** Events per peer connection id; events without one are under "client". */
  peerConnections: Record<string, RtcEvent[]>;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Port of statsDecompression(), including its merge semantics, so results
 * match the reference importer exactly.
 */
export function statsDecompression(
  baseStats: Record<string, any>,
  delta: Record<string, any>,
): Record<string, any> {
  const newStats = clone(delta);

  Object.keys(newStats).forEach((id) => {
    const report = newStats[id];
    if (report === null || typeof report !== "object") return;

    Object.keys(report).forEach((name) => {
      const newName = STATS_PROPS[name] || name;
      if (newName === name) {
        if (name === "type") {
          report.type = STATS_TYPES[report.type] || report.type;
        }
        return;
      }
      report[newName] = report[name];
      delete report[name];
    });
  });

  const timestamp = newStats.t;
  delete newStats.t;

  Object.keys(baseStats).forEach((id) => {
    if (newStats[id] === null) {
      delete newStats[id];
      return;
    }
    if (!newStats[id]) {
      newStats[id] = clone(baseStats[id]);
    } else {
      const report = baseStats[id];
      Object.keys(report).forEach((name) => {
        if (!newStats[id][name]) {
          newStats[id][name] = report[name];
        } else if (
          typeof report[name] === "object" &&
          !Array.isArray(report[name])
        ) {
          const newObject = newStats[id][name];
          newStats[id][name] = clone(report[name]);
          Object.keys(newObject).forEach((key) => {
            newStats[id][name][key] = newObject[key];
          });
        }
      });
    }
    if (timestamp !== undefined) {
      newStats[id].timestamp = timestamp;
    }
  });

  if (timestamp !== undefined) {
    Object.keys(newStats).forEach((id) => {
      const report = newStats[id];
      if (report && report.timestamp === undefined) {
        report.timestamp = timestamp;
      }
    });
  }

  return newStats;
}

/**
 * Split the body of a dump into its records. They are JSON values written
 * back to back (some writers separate them with a newline, some do not, and
 * SDP payloads carry newlines of their own), so track string and bracket
 * nesting instead of splitting on a delimiter.
 */
function scanRecords(text: string, from: number): string[] {
  const records: string[] = [];
  let depth = 0;
  let start = 0;
  let inString = false;
  let escaped = false;

  for (let i = from; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      if (depth === 0) start = i;
      depth += 1;
    } else if ((char === "}" || char === "]") && depth > 0) {
      depth -= 1;
      if (depth === 0) records.push(text.slice(start, i + 1));
    }
  }
  return records;
}

const CONTROL_ESCAPES: Record<string, string> = {
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

/** Repair raw CR/LF/TAB inside strings, which JSON only accepts escaped. */
function escapeRawControls(record: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const char of record) {
    if (!inString) {
      inString = char === '"';
      out += char;
    } else {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      out += CONTROL_ESCAPES[char] || char;
    }
  }
  return out;
}

function parseRecord(record: string): unknown {
  try {
    return JSON.parse(record);
  } catch {
    try {
      return JSON.parse(escapeRawControls(record));
    } catch {
      return undefined;
    }
  }
}

/**
 * Turn the raw dump text into { meta, peerConnections }.
 *
 * Every event is [method, pcId, value, ...extra, time]. The time is absolute
 * on the first event and a delta from the previous event after that, so a
 * running sum gives absolute ms.
 *
 * @throws Error("invalidDump") when the text is not an rtcstats dump
 */
export function parseDump(text: string): ParsedDump {
  if (!text || !text.startsWith(DUMP_HEADER)) {
    throw new Error("invalidDump");
  }

  const [header, ...records] = scanRecords(text, DUMP_HEADER.length);
  const meta = header ? parseRecord(header) : undefined;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("invalidDump");
  }

  const peerConnections: Record<string, RtcEvent[]> = {};
  const baseStats: Record<string, Record<string, any>> = {};
  let lastTime = 0;

  for (const record of records) {
    const entry = parseRecord(record);
    if (!Array.isArray(entry) || entry.length < 3) continue;

    const [rawMethod, pcId, rawValue, ...extra] = entry;
    const method = METHODS[rawMethod] || String(rawMethod);
    const delta = extra.pop();
    if (typeof delta === "number") lastTime += delta;

    const key = pcId === null || pcId === undefined ? "client" : String(pcId);
    if (!peerConnections[key]) {
      peerConnections[key] = [];
      baseStats[key] = {};
    }

    let value = rawValue;
    if (method === "getStats" && value && typeof value === "object") {
      value = statsDecompression(baseStats[key], value);
      baseStats[key] = clone(value);
    }

    peerConnections[key].push({ timestamp: lastTime, type: method, value });
  }

  return { meta: meta as Record<string, any>, peerConnections };
}
