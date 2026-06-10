#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MAKE_CMD="$(bash "$ROOT_DIR/harness/scripts/resolve_make.sh")"

cd "$ROOT_DIR" || exit 1
"$MAKE_CMD" benchmark-smoke
