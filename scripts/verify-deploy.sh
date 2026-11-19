#!/usr/bin/env bash
#
# Check that a deployed server behaves like this MCP server, not just that it
# boots: a build can serve /health with the right commit and still fail to
# serve MCP or OAuth.
#
#   scripts/verify-deploy.sh https://mcp-dev.digitalsamba.com
#
# Checks:
#   1. POST /mcp without credentials -> 401 with a WWW-Authenticate header
#      pointing clients at the OAuth metadata (how they discover sign-in).
#   2. /.well-known/oauth-authorization-server -> 200, issuer equal to the
#      URL, PKCE S256 advertised.
#
# Read-only and unauthenticated; creates nothing.

set -euo pipefail

URL=${1:?usage: $0 <base-url>}
URL=${URL%/}
FAIL=0

HEADERS=$(mktemp)
trap 'rm -f "$HEADERS"' EXIT

STATUS=$(curl -sS -o /dev/null -D "$HEADERS" -w '%{http_code}' --max-time 15 \
  -X POST "$URL/mcp" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"deploy-check","version":"0"}}}')
if [ "$STATUS" = "401" ] && grep -qi '^www-authenticate:.*resource_metadata' "$HEADERS"; then
  echo "ok   POST /mcp without credentials -> 401 with WWW-Authenticate"
else
  echo "FAIL POST /mcp without credentials -> $STATUS (want 401 with WWW-Authenticate resource_metadata)"
  FAIL=1
fi

META=$(curl -sS --max-time 15 -w '\n%{http_code}' "$URL/.well-known/oauth-authorization-server")
META_STATUS=${META##*$'\n'}
META_BODY=${META%$'\n'*}
ISSUER=$(printf '%s' "$META_BODY" | jq -r '.issuer // empty' 2>/dev/null || true)
S256=$(printf '%s' "$META_BODY" | jq -r '(.code_challenge_methods_supported // []) | index("S256") != null' 2>/dev/null || true)
if [ "$META_STATUS" = "200" ] && [ "$ISSUER" = "$URL" ] && [ "$S256" = "true" ]; then
  echo "ok   OAuth metadata -> 200, issuer $ISSUER, S256"
else
  echo "FAIL OAuth metadata -> $META_STATUS, issuer '${ISSUER}' (want '$URL'), S256=${S256:-?}"
  FAIL=1
fi

exit "$FAIL"
