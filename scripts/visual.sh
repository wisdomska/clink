#!/usr/bin/env bash
# Visual regression for the public pages, always rendered by Playwright's
# official Docker image so screenshots match on every machine (font
# rasterising differs between laptops, dev containers and CI runners).
#
#   scripts/visual.sh                      compare against the baselines
#   scripts/visual.sh --update-snapshots   record new baselines
#
# Needs a built app (pnpm build). Starts it on :3000 if nothing is there.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('@playwright/test/package.json').version")
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

started=""
if ! curl -s -o /dev/null http://localhost:3000/; then
  pnpm start -p 3000 > /tmp/clink-visual-server.log 2>&1 &
  started=$!
  for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/ && break; sleep 1; done
fi
trap '[ -n "$started" ] && kill "$started" 2>/dev/null || true' EXIT

docker run --rm --network host --ipc host \
  -v "$PWD":/work -w /work \
  -e VISUAL=1 -e PW_NO_SERVER=1 -e CI="${CI:-}" \
  "$IMAGE" \
  npx playwright test tests/visual --trace off --retries 0 "$@"
