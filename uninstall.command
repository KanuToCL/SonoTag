#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

rm -rf backend/.venv frontend/node_modules frontend/dist

echo
echo "Uninstall complete."
read -r -p "Press Enter to close..." _
