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
#      whose resource_metadata is the absolute URL of /mcp's metadata
#      document (how clients discover sign-in; RFC 9728 wants a full URL).
#   2. /.well-known/oauth-authorization-server -> 200, issuer equal to the
#      URL, PKCE S256 advertised.
#   3. /.well-known/oauth-protected-resource -> 200, resource equal to the
#      URL and the URL listed in authorization_servers (RFC 9728; the
#      document for the root endpoint, the URL customers are given).
#   4. /.well-known/oauth-protected-resource/mcp -> 200, resource equal to
#      URL/mcp (the document the 401 above points clients at).
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
WANT_RM="$URL/.well-known/oauth-protected-resource/mcp"
if [ "$STATUS" = "401" ] && grep -qiF "resource_metadata=\"$WANT_RM\"" "$HEADERS"; then
  echo "ok   POST /mcp without credentials -> 401 with WWW-Authenticate resource_metadata $WANT_RM"
else
  echo "FAIL POST /mcp without credentials -> $STATUS (want 401 with WWW-Authenticate resource_metadata=\"$WANT_RM\")"
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

PRM=$(curl -sS --max-time 15 -w '\n%{http_code}' "$URL/.well-known/oauth-protected-resource")
PRM_STATUS=${PRM##*$'\n'}
PRM_BODY=${PRM%$'\n'*}
RESOURCE=$(printf '%s' "$PRM_BODY" | jq -r '.resource // empty' 2>/dev/null || true)
LISTS_AS=$(printf '%s' "$PRM_BODY" | jq -r --arg u "$URL" '(.authorization_servers // []) | index($u) != null' 2>/dev/null || true)
if [ "$PRM_STATUS" = "200" ] && [ "$RESOURCE" = "$URL" ] && [ "$LISTS_AS" = "true" ]; then
  echo "ok   Protected-resource metadata -> 200, resource $RESOURCE"
else
  echo "FAIL Protected-resource metadata -> $PRM_STATUS, resource '${RESOURCE}' (want '$URL'), lists authorization server=${LISTS_AS:-?}"
  FAIL=1
fi

PRM_MCP=$(curl -sS --max-time 15 -w '\n%{http_code}' "$URL/.well-known/oauth-protected-resource/mcp")
PRM_MCP_STATUS=${PRM_MCP##*$'\n'}
PRM_MCP_BODY=${PRM_MCP%$'\n'*}
RESOURCE_MCP=$(printf '%s' "$PRM_MCP_BODY" | jq -r '.resource // empty' 2>/dev/null || true)
if [ "$PRM_MCP_STATUS" = "200" ] && [ "$RESOURCE_MCP" = "$URL/mcp" ]; then
  echo "ok   Protected-resource metadata for /mcp -> 200, resource $RESOURCE_MCP"
else
  echo "FAIL Protected-resource metadata for /mcp -> $PRM_MCP_STATUS, resource '${RESOURCE_MCP}' (want '$URL/mcp')"
  FAIL=1
fi

exit "$FAIL"
