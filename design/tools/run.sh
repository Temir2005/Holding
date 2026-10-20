#!/bin/sh
# Runs tools/shoot.cjs in the Playwright image with the frontend node_modules volume (read-only).
cd "$(dirname "$0")/.."
exec docker run --rm --ipc=host -v "$PWD:/design" -v megasmart_frontend_node_modules:/app/node_modules:ro \
  -e NODE_PATH=/app/node_modules -w /design mcr.microsoft.com/playwright:v1.64.0-noble \
  node tools/shoot.cjs "$@"
