#!/bin/sh
# Removes untagged images created since $1 (UTC, e.g. 2026-10-21T06:00:00): what a compose
# build leaves behind with the classic builder (no buildx here) once `down --rmi local` has
# removed the tagged images: the stages of a multi-stage Dockerfile and the parent layers.
# Tagged images and anything older than the run stay; used by `make e2e-prod` and
# design/tools/lighthouse.sh after their own `down`.
since="$1"
[ -n "$since" ] || exit 0
for pass in 1 2 3 4 5; do
  ids=$(docker images -f dangling=true -q --no-trunc | sort -u | while read -r id; do
    created=$(docker image inspect --format '{{.Created}}' "$id" 2>/dev/null) || continue
    if [ "$created" \> "$since" ]; then echo "$id"; fi
  done)
  [ -n "$ids" ] || exit 0
  # children before parents: what fails now goes in the next pass
  echo "$ids" | xargs -n1 docker rmi >/dev/null 2>&1 || true
done
exit 0
