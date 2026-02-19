#!/bin/bash
# Log visualize skill usage to Scuba — silent, best-effort.
# All failures are suppressed. Never blocks the user.
#
# Usage: log_usage.sh <workspace> <slug> <archetype> <instruction> <upload_ok> <px_url> <token_expired>
#
# Arguments:
#   workspace     - Path to the workspace directory (e.g. ~/visualize/2025-01-01/my-viz)
#   slug          - URL-safe slug for the visualization
#   archetype     - Archetype name (will be normalized to lowercase-dash)
#   instruction   - User instruction (will be truncated to 500 chars)
#   upload_ok     - 1 if Pixelcloud upload succeeded, 0 otherwise
#   px_url        - Pixelcloud URL (empty string if upload failed)
#   token_expired - 1 if token existed but was expired, 0 otherwise

(
  WORKSPACE="${1:?}"
  SLUG="${2:?}"
  ARCHETYPE="$3"
  INSTRUCTION="$4"
  UPLOAD_OK="${5:-0}"
  PX_URL="${6:-}"
  TOKEN_EXPIRED="${7:-0}"

  # Token state — check OD and local paths
  HAS_TOKEN=0
  if [ -d "$HOME/persistent" ]; then
    [ -f "$HOME/persistent/private-30d/pixelcloud_token.txt" ] && HAS_TOKEN=1
  else
    [ -f "$HOME/.claude/cache/pixelcloud_token.txt" ] && HAS_TOKEN=1
  fi

  # HTML size
  HTML_SIZE=0
  [ -f "$WORKSPACE/index.html" ] && HTML_SIZE=$(wc -c < "$WORKSPACE/index.html")

  # Classify host environment (no raw hostname for privacy)
  HNAME=$(hostname)
  if [[ "$HNAME" == *".od."* || "$HNAME" == *".ondemand."* ]]; then
    HOST_ENV="ondemand"
  elif [[ "$HNAME" == devgpu* ]]; then
    HOST_ENV="devgpu"
  elif [[ "$HNAME" == devvm* ]]; then
    HOST_ENV="devserver"
  elif [[ "$HNAME" == sandcastle* ]]; then
    HOST_ENV="sandcastle"
  elif [[ "$HNAME" == *.local ]] || [[ "$HNAME" != *.* ]]; then
    HOST_ENV="local-mac"
  else
    HOST_ENV="unknown"
  fi

  # Standardize archetype to lowercase-dash format (e.g. "Presentation Deck" -> "presentation-deck")
  ARCHETYPE_NORMALIZED=$(echo "$ARCHETYPE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

  # Truncate instruction to 500 chars
  INSTRUCTION_TRUNCATED=$(echo "$INSTRUCTION" | cut -c1-500)

  # Escape JSON-special characters in user-provided strings
  json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' | tr -d '\n'; }
  SLUG_ESC=$(json_escape "$SLUG")
  PX_URL_ESC=$(json_escape "$PX_URL")
  INSTRUCTION_ESC=$(json_escape "$INSTRUCTION_TRUNCATED")

  # IMPORTANT: JSON must be a single line. Do NOT use a heredoc or multi-line string.
  # scribe_cat splits input on newlines, treating each line as a separate Scribe message.
  # A multi-line heredoc produces ~14 lines, each sent as an independent (invalid) JSON
  # fragment, causing ~97% data loss into perfpipe_errors. See D93372376.
  scribe_cat perfpipe_visualize_skill_usage "{\"int\":{\"time\":$(date +%s),\"upload_success\":$UPLOAD_OK,\"has_pixelcloud_token\":$HAS_TOKEN,\"token_expired\":$TOKEN_EXPIRED,\"html_size_bytes\":$HTML_SIZE},\"normal\":{\"host_env\":\"$HOST_ENV\",\"archetype\":\"$ARCHETYPE_NORMALIZED\",\"slug\":\"$SLUG_ESC\",\"pixelcloud_url\":\"$PX_URL_ESC\",\"instruction\":\"$INSTRUCTION_ESC\"}}"
) 2>/dev/null || true
