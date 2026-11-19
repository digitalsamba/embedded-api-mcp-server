#!/usr/bin/env bash
#
# File a drift report on GitHub without ever dropping one and without repeating one.
#
#   scripts/report-drift-issue.sh <label> <marker> <title> <report.md>
#
#   label   issue label that groups this kind of drift (api-update, sdk-update)
#   marker  a string that identifies this exact state, e.g. "spec-sha256: <hash>"
#   title   title to use if a new issue has to be opened
#   report  Markdown file with the findings
#
# Behaviour:
#   - an open <label> issue already carries <marker>  -> do nothing (same state as last time)
#   - an open <label> issue exists without <marker>   -> comment the report on it
#   - no open <label> issue                           -> open one
#
# An open issue therefore never silences later changes: each new state is added
# to it. Set DRY_RUN=1 to print the decision instead of calling GitHub for the
# write. Requires gh (authenticated via GH_TOKEN) and jq.

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <label> <marker> <title> <report.md>" >&2
  exit 2
fi

LABEL=$1
MARKER=$2
TITLE=$3
REPORT=$4

if [ ! -s "$REPORT" ]; then
  echo "error: report $REPORT is missing or empty" >&2
  exit 2
fi

# GitHub rejects bodies over 65536 characters; leave room for the frame.
MAX_REPORT_BYTES=55000

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# OPEN_ISSUES_JSON lets a test or dry run supply the listing.
if [ -n "${OPEN_ISSUES_JSON:-}" ]; then
  printf '%s' "$OPEN_ISSUES_JSON" > "$WORK/open.json"
else
  gh issue list --label "$LABEL" --state open --limit 100 \
    --json number,body,comments > "$WORK/open.json"
fi

ALREADY=$(jq -r --arg m "$MARKER" '
  [ .[]
    | select(
        ((.body // "") | contains($m))
        or any(.comments[]?; (.body // "") | contains($m))
      )
    | .number
  ] | first // empty' "$WORK/open.json")

if [ -n "$ALREADY" ]; then
  echo "Issue #${ALREADY} already reports '${MARKER}'; nothing new to say."
  exit 0
fi

# Oldest open issue: the one a reviewer is most likely already working from.
TARGET=$(jq -r 'map(.number) | min // empty' "$WORK/open.json")

{
  if [ -n "$TARGET" ]; then
    echo "**It changed again since this issue was last updated.** The report below is the full, cumulative difference from what this repository has stored, so it supersedes the earlier ones."
    echo
  fi
  head -c "$MAX_REPORT_BYTES" "$REPORT"
  if [ "$(wc -c < "$REPORT" | tr -d ' ')" -gt "$MAX_REPORT_BYTES" ]; then
    echo
    echo
    echo "_Report truncated; run the check locally for the rest._"
  fi
  echo
  echo "---"
  echo "*Detected by the scheduled drift check on $(date -u +%Y-%m-%d).* \`${MARKER}\`"
} > "$WORK/body.md"

if [ "${DRY_RUN:-0}" = "1" ]; then
  if [ -n "$TARGET" ]; then
    echo "DRY RUN: would comment on #${TARGET}:"
  else
    echo "DRY RUN: would open '${TITLE}' [${LABEL}, needs-review]:"
  fi
  cat "$WORK/body.md"
  exit 0
fi

if [ -n "$TARGET" ]; then
  gh issue comment "$TARGET" --body-file "$WORK/body.md"
  echo "Commented on #${TARGET}."
else
  # Labels may not exist in a fresh fork; creating an existing one is a no-op.
  gh label create "$LABEL" --color D93F0B --description "Upstream drift detected by the scheduled check" 2>/dev/null || true
  gh label create needs-review --color FBCA04 2>/dev/null || true
  gh issue create --title "$TITLE" --label "$LABEL" --label needs-review --body-file "$WORK/body.md"
fi
