#!/usr/bin/env bash
# Bolt Atlas onto a Paperclip checkout as the /org view.
set -euo pipefail
P="${1:?usage: ./apply.sh /path/to/paperclip-checkout}"
HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$P/ui/src/lib/pc-atlas"
cp "$HERE/../src/atlas.js" "$HERE/atlas.d.ts" "$P/ui/src/lib/pc-atlas/"
cp "$HERE/OrgAtlas.tsx" "$P/ui/src/pages/"
git -C "$P" apply --check "$HERE/App.tsx.patch" 2>/dev/null \
  && git -C "$P" apply "$HERE/App.tsx.patch" \
  || echo "App.tsx.patch did not apply cleanly — add the OrgAtlas import and the /org route manually (see INTEGRATION.md)."
echo "Done. Run: pnpm dev and open /{ISSUE_PREFIX}/org"
