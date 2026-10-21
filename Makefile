COMPOSE := docker compose -f infra/docker-compose.yml --env-file .env
BACKEND := $(COMPOSE) exec backend
FRONTEND := $(COMPOSE) exec frontend

.PHONY: env up down logs migrate seed seed-force demo-photos lint test e2e e2e-prod gen-types fmt reset

env:
	@test -f .env || (cp .env.example .env && echo "created .env from .env.example")

up: env
	$(COMPOSE) up -d --build
	@echo "site:     http://localhost:5173"
	@echo "api docs: http://localhost:8000/docs"
	@echo "minio:    http://localhost:9001"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f backend frontend

migrate:
	$(BACKEND) alembic upgrade head

# Fills an empty database only; with content already there it changes nothing.
seed:
	$(BACKEND) python -m seed.run

# Dev only (APP_ENV=dev). Overwrites the starter content: seeded rows get their seed
# values back, and sections added by editors on seeded pages are DELETED.
seed-force:
	$(BACKEND) python -m seed.run --force

# Local demo only: free stock photos into backend/seed/photos (not in git), which the seeds
# take instead of the drawn images on the next seed-force. Needs PEXELS_API_KEY or
# UNSPLASH_ACCESS_KEY in .env. Another photo for a slot: make demo-photos ARGS="--replace office"
demo-photos:
	$(BACKEND) python -m seed.fetch_photos $(ARGS)

lint:
	$(BACKEND) ruff check .
	$(BACKEND) ruff format --check .
	$(BACKEND) mypy app seed tests
	$(FRONTEND) npm run lint
	$(FRONTEND) npm run typecheck

fmt:
	$(BACKEND) ruff format .
	$(BACKEND) ruff check --fix .
	$(FRONTEND) npm run format

test:
	$(BACKEND) pytest
	$(FRONTEND) npm test

# End-to-end tests and layout screenshots (frontend/e2e) in a separate compose project with
# its own database and bucket, seeded from scratch and removed afterwards (down -v of that
# project only). The dev stack and its data are not touched. Pass Playwright args via ARGS.
E2E_COMPOSE := docker compose -p megasmart-e2e -f infra/docker-compose.yml \
	-f infra/docker-compose.e2e.yml --env-file .env.example
E2E_ADMIN_EMAIL ?= e2e-admin@example.com
E2E_ADMIN_PASSWORD ?= e2e-password-not-secret
export E2E_ADMIN_EMAIL E2E_ADMIN_PASSWORD

e2e:
	@status=0; \
	$(E2E_COMPOSE) up -d --build --wait postgres minio backend frontend && \
	$(E2E_COMPOSE) exec -T backend alembic upgrade head && \
	$(E2E_COMPOSE) exec -T backend python -m seed.run && \
	printf '%s\n' "$$E2E_ADMIN_PASSWORD" | $(E2E_COMPOSE) exec -T backend \
		python -m app.cli create-admin --email "$$E2E_ADMIN_EMAIL" --name "E2E Admin" --password-stdin && \
	$(E2E_COMPOSE) run --rm e2e npx playwright test $(ARGS) || status=$$?; \
	$(E2E_COMPOSE) --profile e2e down -v --remove-orphans; \
	exit $$status

# Smoke tests of the production build (frontend/e2e/*.prod.ts, playwright.prod.config.ts):
# the static build behind Caddy as it ships, without the dev server and StrictMode. Same
# isolation as `make e2e`, its own compose project, removed afterwards together with the
# images it built (`--rmi local`, then the untagged build stages of this run:
# infra/prune-built-images.sh; pulled and older images stay). Pass args via ARGS.
E2E_PROD_COMPOSE := docker compose -p megasmart-e2e-prod -f infra/docker-compose.yml \
	-f infra/docker-compose.e2e.yml -f infra/docker-compose.e2e-prod.yml --env-file .env.example

e2e-prod:
	@status=0; since=$$(date -u +%Y-%m-%dT%H:%M:%S); \
	$(E2E_PROD_COMPOSE) up -d --build --wait postgres minio backend web && \
	$(E2E_PROD_COMPOSE) run --rm --no-deps frontend true && \
	$(E2E_PROD_COMPOSE) exec -T backend alembic upgrade head && \
	$(E2E_PROD_COMPOSE) exec -T backend python -m seed.run && \
	$(E2E_PROD_COMPOSE) run --rm e2e-prod npx playwright test -c playwright.prod.config.ts $(ARGS) \
		|| status=$$?; \
	$(E2E_PROD_COMPOSE) --profile e2e down -v --rmi local --remove-orphans; \
	infra/prune-built-images.sh "$$since"; \
	exit $$status

gen-types:
	$(FRONTEND) npm run gen-types

# Drops all data volumes. Use when you want a clean database and bucket.
reset:
	$(COMPOSE) down -v
