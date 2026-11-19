/**
 * /health status rules.
 *
 * The endpoint always answers 200 (the container healthcheck reads the HTTP
 * code, and a degraded server should keep serving rather than restart-loop);
 * `status` is "degraded" and `problems` names each reason when the server is
 * up but misconfigured or cut off from a dependency.
 */

import type { StoreStatus } from "./session-store.js";

export type HealthProblem =
  | "oauth_not_configured"
  | "session_store_in_memory"
  | "session_store_disconnected"
  | "session_store_unreadable"
  | "api_url_config";

export interface HealthInputs {
  oauthConfigured: boolean;
  store: StoreStatus;
  /** The last attempt to count sessions/clients in the store failed. */
  storeCountsFailed: boolean;
  /** Warnings from resolveApiUrls(); only their presence is reported. */
  apiUrlWarnings: readonly string[];
}

export function healthProblems(inputs: HealthInputs): HealthProblem[] {
  const problems: HealthProblem[] = [];
  if (!inputs.oauthConfigured) problems.push("oauth_not_configured");
  if (inputs.store.backend === "memory") {
    // Sessions, clients and codes are lost on restart and not shared
    // between replicas.
    problems.push("session_store_in_memory");
  } else if (!inputs.store.connected) {
    problems.push("session_store_disconnected");
  }
  if (inputs.storeCountsFailed && inputs.store.connected) {
    problems.push("session_store_unreadable");
  }
  if (inputs.apiUrlWarnings.length > 0) problems.push("api_url_config");
  return problems;
}
