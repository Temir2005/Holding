#!/bin/sh
# Runs a design/tools script in the Playwright image on the host network (MinIO images load),
# with the frontend node_modules volume read-only. Env vars listed in PW_ENV are passed through.
#   tools/pw.sh tools/rm-check.cjs 1440x900 /ru
#   NORMAL=1 PW_ENV=NORMAL tools/pw.sh tools/rm-check.cjs ...
cd "$(dirname "$0")/.."
envs=""
for v in $PW_ENV BASE REDUCED; do eval "val=\${$v-}"; [ -n "$val" ] && envs="$envs -e $v=$val"; done
exec docker run --rm --ipc=host --network "${PW_NETWORK:-host}" $envs -v "$PWD:/design" \
  -v megasmart_frontend_node_modules:/app/node_modules:ro -e NODE_PATH=/app/node_modules \
  -w /design mcr.microsoft.com/playwright:v1.64.0-noble node "$@"
