#!/usr/bin/env bash
# Copy the built pages into the GitHub Pages repo under skin-care/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${1:-$ROOT/../susutw.github.io}"
DEST="$SITE/skin-care"

python3 "$ROOT/tools/build.py"
mkdir -p "$DEST/quiz"
cp "$ROOT/index.html" "$DEST/index.html"
cp "$ROOT/quiz/index.html" "$DEST/quiz/index.html"
echo "copied to $DEST"
