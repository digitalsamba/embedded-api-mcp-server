/**
 * Usage log: one structured line per tool call.
 *
 * The line is `[INFO] tool_call {json}` so a log shipper can split on the
 * prefix and parse the rest. It carries no tool arguments and no results
 * (those can hold participant names, emails, chat text). Who called is a
 * fingerprint of the developer key, never the key: the first 12 hex of its
 * SHA-256, stable per key, so usage can be counted per team without the log
 * holding anything that authenticates.
 */
import { createHash } from "crypto";
import logger from "./logger.js";

export type ToolOutcome =
  | "ok"
  | "tool_error"
  | "invalid_params"
  | "invalid_request"
  | "error";

export interface ToolCallRecord {
  tool: string;
  outcome: ToolOutcome;
  ms: number;
  /** HTTP status from the API when the call failed on an API response. */
  status?: number;
  /** First 8 characters of the MCP session id. */
  session?: string;
  /** Developer-key fingerprint (see keyFingerprint). */
  caller?: string;
  /** MCP client name/version from the initialize handshake. */
  client?: string;
}

const MAX_FIELD = 80;

/** Client-supplied strings: cap length, keep printable ASCII only. */
export function cleanField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^\x20-\x7e]/g, "?").slice(0, MAX_FIELD);
}

export function keyFingerprint(secret: string | undefined): string | undefined {
  if (!secret) return undefined;
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}

export function clientLabel(
  info: { name?: string; version?: string } | undefined,
): string | undefined {
  if (!info?.name) return undefined;
  return cleanField(info.version ? `${info.name}/${info.version}` : info.name);
}

export function logToolCall(record: ToolCallRecord): void {
  const line: ToolCallRecord = {
    ...record,
    tool: cleanField(record.tool) ?? "",
    session: record.session?.slice(0, 8),
  };
  logger.info(`tool_call ${JSON.stringify(line)}`);
}
