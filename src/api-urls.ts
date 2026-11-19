/**
 * Which Digital Samba API an HTTP-mode server talks to.
 *
 * Two base URLs are in play: OAuth sessions call `/oauth-api/v1`, developer-key
 * sessions call `/api/v1`. They used to be configured independently with a
 * hard-coded production fallback each, so a non-production host that set the
 * OAuth variables but not DIGITAL_SAMBA_API_URL sent developer-key traffic to
 * production, silently. Now the key URL is derived from the OAuth one when it
 * is not set, the choice is logged, and a host mismatch is warned about.
 */

export const PRODUCTION_API_URL = "https://api.digitalsamba.com/api/v1";
export const PRODUCTION_OAUTH_API_URL =
  "https://api.digitalsamba.com/oauth-api/v1";

export interface ResolvedApiUrls {
  /** Base URL for developer-key sessions (/api/v1). */
  keyApiUrl: string;
  /** Base URL for OAuth sessions (/oauth-api/v1). */
  oauthApiUrl: string;
  /** How keyApiUrl was chosen, for the startup log. */
  keySource:
    | "DIGITAL_SAMBA_API_URL"
    | "derived from OAUTH_API_URL"
    | "production default";
  /** Problems worth shouting about at startup. */
  warnings: string[];
}

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function resolveApiUrls(
  env: Record<string, string | undefined> = process.env,
): ResolvedApiUrls {
  const warnings: string[] = [];
  const oauthApiUrl = env.OAUTH_API_URL || PRODUCTION_OAUTH_API_URL;

  let keyApiUrl: string;
  let keySource: ResolvedApiUrls["keySource"];
  if (env.DIGITAL_SAMBA_API_URL) {
    keyApiUrl = env.DIGITAL_SAMBA_API_URL;
    keySource = "DIGITAL_SAMBA_API_URL";
  } else if (env.OAUTH_API_URL) {
    keyApiUrl = env.OAUTH_API_URL.replace(/\/oauth-api\/v1\/?$/, "/api/v1");
    keySource = "derived from OAUTH_API_URL";
    if (keyApiUrl === env.OAUTH_API_URL) {
      warnings.push(
        `OAUTH_API_URL (${env.OAUTH_API_URL}) does not end in /oauth-api/v1, so the developer-key API URL could not be derived from it; set DIGITAL_SAMBA_API_URL.`,
      );
    }
  } else {
    keyApiUrl = PRODUCTION_API_URL;
    keySource = "production default";
  }

  if (host(keyApiUrl) !== host(oauthApiUrl)) {
    warnings.push(
      `Developer-key sessions use ${host(keyApiUrl)} but OAuth sessions use ${host(oauthApiUrl)}. These are usually the same environment; check DIGITAL_SAMBA_API_URL and OAUTH_API_URL.`,
    );
  }

  return { keyApiUrl, oauthApiUrl, keySource, warnings };
}

export function apiHost(url: string): string {
  return host(url);
}
