COMPOSE := docker compose -f infra/docker-compose.yml --env-file .env
BACKEND := $(COMPOSE) exec backend
FRONTEND := $(COMPOSE) exec frontend

.PHONY: env up down logs migrate seed seed-force lint test gen-types fmt reset

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

gen-types:
	$(FRONTEND) npm run gen-types

# Drops all data volumes. Use when you want a clean database and bucket.
reset:
	$(COMPOSE) down -v
