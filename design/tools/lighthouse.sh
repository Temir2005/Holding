#!/bin/sh
# Lighthouse (mobile, default throttling) on the production build: the static build behind
# Caddy (frontend/Dockerfile.prod) with the API and MinIO, seeded from scratch, in its own
# throwaway compose project `megasmart-lh` (the e2e-prod files). Removed afterwards, its own
# volumes and built images only. Three runs per page; reports in design/stage-5/lighthouse, medians printed.
#   design/tools/lighthouse.sh            # up, seed, measure, down
#   KEEP=1 design/tools/lighthouse.sh     # leave the stack up; a second KEEP=1 run rebuilds
#                                         # only `web` (the build) and measures again
#   DOWN=1 design/tools/lighthouse.sh     # remove a stack left by KEEP=1
#   RUNS=5 CPU=2.6 ...                    # runs per page; CPU slowdown (default 4, calibrated
#                                         # for a host with benchmarkIndex ~1750)
set -eu
cd "$(dirname "$0")/../.."
OUT=design/stage-5/lighthouse
P="docker compose -p megasmart-lh -f infra/docker-compose.yml -f infra/docker-compose.e2e.yml -f infra/docker-compose.e2e-prod.yml --env-file .env.example"
# down: this project's containers, volumes and the images it built (pulled images stay)
SINCE=$(date -u +%Y-%m-%dT%H:%M:%S)
DOWN_ALL="$P --profile e2e down -v --rmi local --remove-orphans"
CLEAN="$DOWN_ALL; infra/prune-built-images.sh $SINCE"
if [ -n "${DOWN:-}" ]; then $DOWN_ALL; exit 0; fi
if [ -z "${KEEP:-}" ]; then trap 'eval "$CLEAN" >/dev/null 2>&1' EXIT; fi
if [ -n "${KEEP:-}" ] && [ -n "$($P ps -q backend 2>/dev/null)" ]; then
  $P up -d --build --wait web
else
  $P up -d --build --wait postgres minio backend web
  $P exec -T backend alembic upgrade head >/dev/null
  $P exec -T backend python -m seed.run >/dev/null
fi
WEB=$($P ps -q web)
mkdir -p "$OUT"
docker run --rm --ipc=host --network "container:$WEB" -v "$PWD/$OUT:/out" -v "$PWD/design/tools:/tools:ro" \
  -e LH_PAGES="${LH_PAGES:-}" -e RUNS="${RUNS:-3}" -e CPU="${CPU:-4}" mcr.microsoft.com/playwright:v1.64.0-noble sh -c '
    set -e
    export CHROME_PATH=$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome | head -1)
    rm -f /out/*.json /out/*.html
    for page in ${LH_PAGES:-home:/ru project:/ru/projects/zhk-proekt-a}; do
      name=${page%%:*}; path=${page#*:}
      for run in $(seq 1 ${RUNS:-3}); do
        npx -y lighthouse@13.5.0 "http://localhost:8080$path" \
          --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
          --only-categories=performance,accessibility,best-practices,seo --throttling.cpuSlowdownMultiplier=${CPU:-4} \
          --output=json --output=html --output-path="/out/$name-$run" --quiet
      done
    done
    node /tools/lighthouse-summary.cjs /out'
