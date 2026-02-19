#!/bin/bash
# Compute SRI (Subresource Integrity) hash for a CDN URL.
# Usage: compute_sri.sh <url>
# Output: sha384-<base64hash>  (or empty string on failure)
#
# Example:
#   ./compute_sri.sh https://cdn.jsdelivr.net/npm/chart.js@4
#   sha384-abc123...

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage: compute_sri.sh <url>" >&2
  exit 1
fi

CONTENT=$(curl -sL --max-time 15 --connect-timeout 10 "$URL" 2>/dev/null)
if [ -z "$CONTENT" ]; then
  echo "" # Empty output signals failure — caller should omit integrity attribute
  exit 0
fi

printf '%s' "$CONTENT" | openssl dgst -sha384 -binary | openssl base64 -A | sed 's/^/sha384-/'
