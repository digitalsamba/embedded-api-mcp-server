/**
 * The consent page shown by GET /oauth/authorize, and the cookies that bind an
 * authorization flow to the browser that approved it.
 *
 * Why this exists: this server reaches Digital Samba with ONE upstream OAuth
 * client, while any MCP client can register itself here (DCR) with any
 * redirect URI. Digital Samba's own approval page cannot tell those clients
 * apart, so the user has to be shown, here, which client is asking and where
 * the result will be sent, and has to approve it explicitly.
 */

import type { Response } from "express";

/** Cookie set with the consent page; must come back with the decision. */
export const CONSENT_COOKIE = "mcp_oauth_consent";

/** Cookie set on approval; must come back to /oauth/callback. */
export const FLOW_COOKIE = "mcp_oauth_flow";

const COOKIE_PATH = "/oauth";
const COOKIE_MAX_AGE_SECONDS = 10 * 60;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Read one cookie from a raw Cookie header. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const raw = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}

/**
 * Set a flow cookie. HttpOnly, path-scoped to /oauth, short-lived.
 *
 * SameSite=Lax is deliberate: the cookie must survive the top-level redirect
 * back from Digital Samba to /oauth/callback (a cross-site GET navigation,
 * which Lax allows and Strict would not), while still being withheld from
 * cross-site POSTs, so another site cannot submit the consent form for the
 * user.
 */
export function setFlowCookie(
  res: Response,
  name: string,
  value: string,
  secure: boolean,
): void {
  res.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
}

export function clearFlowCookie(
  res: Response,
  name: string,
  secure: boolean,
): void {
  res.append(
    "Set-Cookie",
    `${name}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
}

/**
 * Where the authorization will be delivered, in the form a person can check.
 *
 * The client name is whatever the client registered and proves nothing; the
 * redirect destination is what decides who receives the access, so that is
 * what the page puts in front of the user.
 */
export function describeRedirect(redirectUri: string): {
  destination: string;
  local: boolean;
} {
  try {
    const url = new URL(redirectUri);
    if (url.protocol === "https:" || url.protocol === "http:") {
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      return { destination: url.host, local };
    }
    // Custom schemes used by desktop apps, e.g. cursor://...
    return { destination: `${url.protocol}//${url.host}`, local: false };
  } catch {
    return { destination: redirectUri, local: false };
  }
}

/**
 * Headers for every page this module renders: never cached, never framed
 * (framing would allow clickjacking the Approve button), no scripts.
 */
export function setPageHeaders(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // No form-action directive: it does not fall back to default-src, and
  // Chrome applies it to the redirect after the form posts, which would
  // block the hop to Digital Samba.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
}

const STYLE = `
  :root { color-scheme: light dark; --fg:#1d1d1f; --muted:#5f6368; --bg:#f5f5f7; --card:#fff; --line:#d9d9de; --accent:#3d5afe; --warn-bg:#fff4e5; --warn-fg:#7a4a00; }
  @media (prefers-color-scheme: dark) { :root { --fg:#f2f2f2; --muted:#a8a8ad; --bg:#121214; --card:#1c1c1f; --line:#333338; --accent:#7c8cff; --warn-bg:#3a2a10; --warn-fg:#ffd28a; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:16px; background:var(--bg); color:var(--fg); font:16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { width:100%; max-width:440px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:28px; }
  h1 { font-size:20px; margin:0 0 16px; }
  p { margin:0 0 14px; }
  .muted { color:var(--muted); font-size:14px; }
  .dest { display:block; margin:6px 0 0; padding:10px 12px; border:1px solid var(--line); border-radius:8px; font:600 16px ui-monospace, SFMono-Regular, Menlo, monospace; word-break:break-all; }
  .warn { background:var(--warn-bg); color:var(--warn-fg); border-radius:8px; padding:10px 12px; font-size:14px; }
  .actions { display:flex; gap:12px; margin-top:22px; }
  button { flex:1; font:inherit; font-weight:600; padding:11px 14px; border-radius:8px; border:1px solid var(--line); background:transparent; color:var(--fg); cursor:pointer; }
  button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
`;

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<link rel="icon" href="/favicon.svg">
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

export function renderConsentPage(options: {
  clientName: string;
  redirectUri: string;
  consentId: string;
  formAction: string;
}): string {
  const { destination, local } = describeRedirect(options.redirectUri);
  const destinationNote = local
    ? `<p class="muted">That is an app running on this computer.</p>`
    : "";

  return page(
    "Connect to Digital Samba",
    `<h1>Connect to Digital Samba</h1>
<p><strong>${escapeHtml(options.clientName)}</strong> wants access to your Digital Samba account.</p>
<p class="muted">That name is supplied by the app and is not verified.</p>
<p>If you approve, access will be sent to:
  <span class="dest">${escapeHtml(destination)}</span>
</p>
${destinationNote}
<p class="muted">It will be able to use the Digital Samba API on behalf of your team: rooms, sessions, recordings, transcripts and other data, including deleting them.</p>
<p class="warn">Only approve if you started connecting this app yourself, just now. If you opened a link someone sent you, cancel.</p>
<form method="post" action="${escapeHtml(options.formAction)}">
  <input type="hidden" name="consent_id" value="${escapeHtml(options.consentId)}">
  <div class="actions">
    <button type="submit" name="decision" value="deny">Cancel</button>
    <button type="submit" name="decision" value="approve" class="primary">Approve</button>
  </div>
</form>
<p class="muted" style="margin-top:18px">After approving you will sign in to Digital Samba.</p>`,
  );
}

export function renderErrorPage(title: string, message: string): string {
  return page(
    title,
    `<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
<p class="muted">Start connecting again from your app.</p>`,
  );
}
