#!/bin/bash
# Initialize a visualize workspace directory
# Usage: ./init_workspace.sh "slug-name" ["title"] ["output_dir"]

SLUG="${1:?Usage: init_workspace.sh <slug> [title] [output_dir]}"
TITLE="${2:-$SLUG}"
OUTPUT_DIR="${3:-}"
DATE=$(date +%Y-%m-%d)

# Detect environment: OD instances have ~/persistent/
IS_OD=false
[ -d "$HOME/persistent" ] && IS_OD=true

if [ -n "$OUTPUT_DIR" ]; then
    WORKSPACE="$OUTPUT_DIR"
elif [ "$IS_OD" = true ]; then
    WORKSPACE="$HOME/visualize/$DATE/$SLUG"
else
    WORKSPACE="/tmp/visualize/$DATE/$SLUG"
fi

mkdir -p "$WORKSPACE"

# Create metadata.json
cat > "$WORKSPACE/metadata.json" <<EOF
{
  "title": "$TITLE",
  "timestamp": "$DATE",
  "instruction": "",
  "archetype": ""
}
EOF

echo "$WORKSPACE"
