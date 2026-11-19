#!/usr/bin/env bash
#
# Summarise how a live OpenAPI spec differs from the stored one, as Markdown.
#
#   scripts/api-drift-report.sh <stored.yaml> <live.yaml> [skill-api-reference.md]
#
# Used by .github/workflows/check-api-updates.yml, and runnable locally:
#
#   curl -fsS https://developer.digitalsamba.com/rest-api/openapi.yaml -o /tmp/live.yaml
#   scripts/api-drift-report.sh openapi-stored.yaml /tmp/live.yaml
#
# The optional third argument is digital-samba-skill's hand-curated
# api-reference.md; when given, its endpoint list is compared with the live spec
# in both directions.
#
# Operations are identified by METHOD + path, not operationId: the spec reuses
# some operationIds, and a rename on an unchanged path is itself a signal (that
# is how the chat endpoint's new request body announced itself).
#
# Exit status is 0 whether or not there are differences; the report is the output.

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <stored.yaml> <live.yaml> [skill-api-reference.md]" >&2
  exit 2
fi

STORED=$1
LIVE=$2
SKILL_REF=${3:-}

for f in "$STORED" "$LIVE"; do
  if [ ! -s "$f" ]; then
    echo "error: $f is missing or empty" >&2
    exit 2
  fi
done

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Emit every line of each operation's block as "METHOD path<TAB>line".
# Relies on the spec's fixed layout: paths at 2 spaces, methods at 4.
operation_lines() {
  awk '
    /^[^ ]/ { in_paths = ($0 ~ /^paths:[ ]*$/); path = ""; method = ""; next }
    !in_paths { next }
    /^  [^ ]/ {
      path = $0
      sub(/^  /, "", path); sub(/:[ ]*$/, "", path); gsub(/\047/, "", path)
      method = ""
      next
    }
    /^    (get|post|put|patch|delete|head|options):[ ]*$/ {
      method = toupper($1); sub(/:$/, "", method)
      next
    }
    /^    [^ ]/ { method = ""; next }
    path != "" && method != "" { print method " " path "\t" $0 }
  ' "$1"
}

# "METHOD path<TAB>operationId", one per operation.
operations() {
  operation_lines "$1" |
    awk -F '\t' '$2 ~ /^      operationId:/ {
      id = $2; sub(/^ *operationId:[ ]*/, "", id); gsub(/\047/, "", id)
      print $1 "\t" id
    }' | sort
}

booleans() {
  { grep -B1 'type: boolean' "$1" || true; } |
    { grep -v 'type:' || true; } |
    { grep -v '^--$' || true; } |
    sed 's/://g' | awk '{$1=$1};1' | sort -u
}

list() { # stdin: lines -> Markdown bullets in code spans
  while IFS= read -r line; do
    [ -n "$line" ] && printf -- '- `%s`\n' "$line"
  done
}

operations "$STORED" > "$WORK/old-ops.tsv"
operations "$LIVE" > "$WORK/new-ops.tsv"

OLD_COUNT=$(wc -l < "$WORK/old-ops.tsv" | tr -d ' ')
NEW_COUNT=$(wc -l < "$WORK/new-ops.tsv" | tr -d ' ')

# A spec this script cannot read must not be reported as "no operations changed".
for pair in "$STORED:$OLD_COUNT" "$LIVE:$NEW_COUNT"; do
  file=${pair%:*}
  parsed=${pair##*:}
  raw=$(grep -c '^ *operationId:' "$file" || true)
  if [ "$parsed" != "$raw" ]; then
    echo "error: parsed $parsed operations from $file but it has $raw operationId lines (layout changed?)" >&2
    exit 2
  fi
done

cut -f1 "$WORK/old-ops.tsv" > "$WORK/old-keys.txt"
cut -f1 "$WORK/new-ops.tsv" > "$WORK/new-keys.txt"

comm -13 "$WORK/old-keys.txt" "$WORK/new-keys.txt" > "$WORK/added-keys.txt"
comm -23 "$WORK/old-keys.txt" "$WORK/new-keys.txt" > "$WORK/removed-keys.txt"
comm -12 "$WORK/old-keys.txt" "$WORK/new-keys.txt" > "$WORK/common-keys.txt"

# Renamed: same METHOD + path, different operationId.
join -t "$(printf '\t')" "$WORK/old-ops.tsv" "$WORK/new-ops.tsv" |
  awk -F '\t' '$2 != $3 { print $1 "\t" $2 "\t" $3 }' > "$WORK/renamed.tsv"

# Changed: an operation present in both whose block differs at all
# (parameters, request body, responses, description).
operation_lines "$STORED" > "$WORK/old-lines.tsv"
operation_lines "$LIVE" > "$WORK/new-lines.tsv"
{ diff "$WORK/old-lines.tsv" "$WORK/new-lines.tsv" || true; } |
  { grep '^[<>] ' || true; } | sed 's/^[<>] //' | cut -f1 | sort -u > "$WORK/touched-keys.txt"
comm -12 "$WORK/touched-keys.txt" "$WORK/common-keys.txt" > "$WORK/changed-keys.txt"

booleans "$STORED" > "$WORK/old-bools.txt"
booleans "$LIVE" > "$WORK/new-bools.txt"
comm -13 "$WORK/old-bools.txt" "$WORK/new-bools.txt" > "$WORK/added-bools.txt"
comm -23 "$WORK/old-bools.txt" "$WORK/new-bools.txt" > "$WORK/removed-bools.txt"

id_for() { # $1 = ops.tsv, $2 = key
  awk -F '\t' -v key="$2" '$1 == key { print $2; exit }' "$1"
}

echo "Stored spec: **${OLD_COUNT}** operations. Live spec: **${NEW_COUNT}** operations."
echo

ANY=0

if [ -s "$WORK/added-keys.txt" ]; then
  ANY=1
  echo "### New operations ($(wc -l < "$WORK/added-keys.txt" | tr -d ' '))"
  echo
  while IFS= read -r key; do
    printf -- '- `%s` — `%s`\n' "$(id_for "$WORK/new-ops.tsv" "$key")" "$key"
  done < "$WORK/added-keys.txt"
  echo
fi

if [ -s "$WORK/removed-keys.txt" ]; then
  ANY=1
  echo "### Removed operations ($(wc -l < "$WORK/removed-keys.txt" | tr -d ' ')) — check the tools that call them"
  echo
  while IFS= read -r key; do
    printf -- '- `%s` — `%s`\n' "$(id_for "$WORK/old-ops.tsv" "$key")" "$key"
  done < "$WORK/removed-keys.txt"
  echo
fi

if [ -s "$WORK/renamed.tsv" ]; then
  ANY=1
  echo "### Renamed operations ($(wc -l < "$WORK/renamed.tsv" | tr -d ' ')) — same endpoint, new operationId; re-read its contract"
  echo
  while IFS="$(printf '\t')" read -r key old new; do
    printf -- '- `%s`: `%s` → `%s`\n' "$key" "$old" "$new"
  done < "$WORK/renamed.tsv"
  echo
fi

if [ -s "$WORK/changed-keys.txt" ]; then
  ANY=1
  echo "### Changed operations ($(wc -l < "$WORK/changed-keys.txt" | tr -d ' ')) — parameters, body, responses or description differ"
  echo
  list < "$WORK/changed-keys.txt"
  echo
fi

if [ -s "$WORK/added-bools.txt" ]; then
  ANY=1
  echo "### New boolean properties ($(wc -l < "$WORK/added-bools.txt" | tr -d ' '))"
  echo
  list < "$WORK/added-bools.txt"
  echo
fi

if [ -s "$WORK/removed-bools.txt" ]; then
  ANY=1
  echo "### Removed boolean properties ($(wc -l < "$WORK/removed-bools.txt" | tr -d ' '))"
  echo
  list < "$WORK/removed-bools.txt"
  echo
fi

if [ "$ANY" = 0 ]; then
  if cmp -s "$STORED" "$LIVE"; then
    echo "The specs are identical."
  else
    echo "The specs differ only outside operations and boolean properties (tags, shared schemas, examples). Run a full diff for details."
  fi
  echo
fi

if [ -n "$SKILL_REF" ]; then
  echo "### Cross-check against digital-samba-skill"
  echo
  if [ ! -s "$SKILL_REF" ]; then
    echo "Skipped: the skill's \`api-reference.md\` could not be fetched."
    echo
  else
    # Endpoint headings look like "### GET /api/v1/rooms/{room}".
    { grep -E '^#{2,4} +`?(GET|POST|PUT|PATCH|DELETE) +/' "$SKILL_REF" || true; } |
      sed -E 's/^#+ +//; s/`//g; s/[[:space:]]+$//' |
      awk '{ p = $2; if (p != "/") sub(/\/$/, "", p); print $1 " " p }' |
      sort -u > "$WORK/skill-keys.txt"
    awk '{ p = $2; if (p != "/") sub(/\/$/, "", p); print $1 " " p }' "$WORK/new-keys.txt" |
      sort -u > "$WORK/live-keys-normalised.txt"

    comm -23 "$WORK/live-keys-normalised.txt" "$WORK/skill-keys.txt" > "$WORK/skill-missing.txt"
    comm -13 "$WORK/live-keys-normalised.txt" "$WORK/skill-keys.txt" > "$WORK/skill-extra.txt"

    echo "The skill documents $(wc -l < "$WORK/skill-keys.txt" | tr -d ' ') endpoints by hand after each API change. A mismatch is a hint that one side missed something, not proof."
    echo
    if [ -s "$WORK/skill-missing.txt" ]; then
      echo "In the live spec but not in the skill's reference:"
      echo
      list < "$WORK/skill-missing.txt"
      echo
    fi
    if [ -s "$WORK/skill-extra.txt" ]; then
      echo "In the skill's reference but not in the live spec (undocumented, or withdrawn):"
      echo
      list < "$WORK/skill-extra.txt"
      echo
    fi
    if [ ! -s "$WORK/skill-missing.txt" ] && [ ! -s "$WORK/skill-extra.txt" ]; then
      echo "Both list the same endpoints."
      echo
    fi
  fi
fi
