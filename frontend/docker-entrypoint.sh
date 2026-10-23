#!/bin/sh
# Entrypoint of the dev frontend image, also run once at build time with no arguments.
#
# node_modules is a named volume: it is filled from the image once and then outlives every
# rebuild, so after a pull that changes package-lock.json it would keep the old packages and
# Vite would fail with "Failed to resolve import". The volume therefore remembers the hash of
# the lock file it was installed from, and `npm ci` runs only when that hash differs (or is
# missing: a volume from before this script). With an unchanged lock file the start costs one
# hash of the file. DEPS_FORCE=1 reinstalls anyway (`make deps`).
set -eu
cd "$(dirname "$0")"

stamp=node_modules/.package-lock.sha256
want=$(sha256sum package-lock.json | cut -d' ' -f1)
have=$(cat "$stamp" 2>/dev/null || true)

if [ "${DEPS_FORCE:-}" = 1 ] || [ "$want" != "$have" ]; then
  if [ "$want" = "$have" ]; then
    echo "frontend: DEPS_FORCE=1, running npm ci"
  else
    echo "frontend: node_modules is not installed from this package-lock.json, running npm ci"
  fi
  npm ci --no-audit --no-fund
  echo "$want" > "$stamp"
fi

[ $# -eq 0 ] || exec "$@"
