/**
 * Verified write helper
 *
 * Write tools used to report a fixed success string whenever the API returned
 * any 2xx. That is not evidence: several Digital Samba write endpoints accept a
 * request, return 200 with an empty body, and do nothing (`import-polls` and
 * `send-chat-message` both shipped in v1.1.0 behaving this way). A tool that
 * says "Successfully imported polls" when nothing was imported is worse than
 * one that errors, because the caller acts on the lie.
 *
 * This module gives write handlers one code path that reports only what was
 * actually established:
 *
 * - the API response body, when it carries evidence (an id, a count);
 * - a read-back, when one is cheap and a silent no-op is plausible;
 * - otherwise, plainly, that the request was accepted and nothing more.
 *
 * @module tools/verified-write
 */
import logger from "../logger.js";

/**
 * Result of reading state back after a write.
 */
export interface VerifyOutcome {
  /** Whether the read-back proves the write actually landed */
  landed: boolean;
  /** What the read-back showed, e.g. "room now has 5 polls (was 2)" */
  evidence: string;
}

/**
 * Standard MCP tool result shape used by the tool handlers.
 */
export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface VerifiedWriteOptions<T> {
  /**
   * Field name → value pairs that must be present. The first missing one
   * short-circuits with the same "<field> is required." message the handlers
   * used before.
   */
  required?: Record<string, unknown>;
  /**
   * Noun phrase naming what is being written, e.g. `polls into room abc`. Reads
   * after the verb on success and after "this request for" when unverified, so
   * keep it a noun phrase rather than a clause.
   */
  describe: string;
  /** The write itself. Resolves to the parsed API response body. */
  action: () => Promise<T>;
  /**
   * Optional read-back, run after a successful write. Supply this wherever a
   * silent no-op is plausible and a read endpoint exists.
   */
  verify?: (result: T) => Promise<VerifyOutcome>;
  /** Verb used in messages, e.g. `Imported`. */
  verb: string;
  /** Label used in error text and logs, e.g. `importing polls`. */
  errorLabel: string;
}

/**
 * Pull whatever identifying evidence the response body carries.
 *
 * Returns undefined when the body is empty or has nothing useful — which is the
 * common case for these endpoints and precisely why `verify` exists.
 */
export function extractEvidence(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const body = result as Record<string, unknown>;

  const id = body.id ?? body.uuid ?? body.external_id;
  if (typeof id === "string" || typeof id === "number") {
    return `id ${id}`;
  }

  if (Array.isArray(body.data)) {
    return `${body.data.length} record(s) returned`;
  }

  return undefined;
}

/**
 * Count the items in a list response.
 *
 * List endpoints return either a bare array or a paginated `{ data: [...] }`
 * object, so read-backs that compare counts must accept both.
 *
 * @returns the item count, or undefined when the value is neither shape
 */
export function countOf(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) return data.length;
  }
  return undefined;
}

/**
 * Describe the outcome of an unverified write.
 *
 * Reports the response body's evidence when it carries any, and otherwise says
 * plainly that the request was accepted and nothing more — never "Successfully
 * X", which a no-op endpoint would earn just as easily as a real write.
 *
 * Exported for handlers that keep their own error handling and only need the
 * success wording.
 *
 * @param result - the parsed API response body
 * @param verb - past-tense verb, e.g. `Connected`
 * @param describe - noun phrase naming the target, e.g. `room abc`
 */
export function describeWriteResult(
  result: unknown,
  verb: string,
  describe: string,
): string {
  const evidence = extractEvidence(result);
  return evidence
    ? `${verb} ${describe} (${evidence}).`
    : `The API accepted the request (${verb} ${describe}) but returned no ` +
        `confirmation body, so the effect is not verified here. Read the ` +
        `state back if it matters.`;
}

/**
 * Run a write and report only what can actually be substantiated.
 *
 * @param options - see {@link VerifiedWriteOptions}
 * @returns an MCP tool result; `isError` is set when a read-back proves the
 *          write did not land, so a no-op can never read as success
 */
export async function verifiedWrite<T>(
  options: VerifiedWriteOptions<T>,
): Promise<ToolResult> {
  const { required, describe, action, verify, verb, errorLabel } = options;

  for (const [field, value] of Object.entries(required ?? {})) {
    if (value === undefined || value === null || value === "") {
      return {
        content: [{ type: "text", text: `${field} is required.` }],
        isError: true,
      };
    }
  }

  let result: T;
  try {
    result = await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error ${errorLabel}`, { error: message });
    return {
      content: [{ type: "text", text: `Error ${errorLabel}: ${message}` }],
      isError: true,
    };
  }

  if (!verify) {
    // Nothing to read back. Say what happened — the request was accepted — and
    // do not imply the effect was confirmed.
    return {
      content: [
        { type: "text", text: describeWriteResult(result, verb, describe) },
      ],
    };
  }

  let outcome: VerifyOutcome;
  try {
    outcome = await verify(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Read-back failed after ${errorLabel}`, { error: message });
    return {
      content: [
        {
          type: "text",
          text:
            `The API accepted the request to ${describe}, but reading the state ` +
            `back to confirm it failed: ${message}. The write is unverified.`,
        },
      ],
    };
  }

  if (!outcome.landed) {
    logger.error(`Write reported success but did not land: ${errorLabel}`, {
      evidence: outcome.evidence,
    });
    return {
      content: [
        {
          type: "text",
          text:
            `The API returned success for ${describe}, but reading the state back ` +
            `shows it had no effect (${outcome.evidence}). Nothing was changed. ` +
            `This is an API-side failure, not a rejected request.`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `${verb} ${describe} — confirmed by read-back (${outcome.evidence}).`,
      },
    ],
  };
}
