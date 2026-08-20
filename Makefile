.PHONY: help install dev build start lint lint-fix format typecheck db-generate db-migrate db-migrate-dev db-push db-pull db-studio db-drop db-seed db-clickhouse-migrate db-clickhouse-status docker-build docker-up docker-down docker-restart docker-logs docker-ps docker-migrate docker-seed docker-deploy fresh reset

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Setup:"
	@echo "    install             - Install dependencies"
	@echo ""
	@echo "  Development:"
	@echo "    dev             	   - Run dev server with hot reload"
	@echo ""
	@echo "  Build:"
	@echo "    build           	   - Build the application"
	@echo ""
	@echo "  Production:"
	@echo "    start               - Start the production server"
	@echo ""
	@echo "  Code Quality:"
	@echo "    lint                - Run ESLint"
	@echo "    lint-fix            - Fix ESLint issues"
	@echo "    format              - Format code with Prettier"
	@echo "    typecheck           - Run TypeScript type checking"
	@echo ""
	@echo "  Database (PostgreSQL/Prisma):"
	@echo "    db-generate         - Generate the Prisma client"
	@echo "    db-migrate          - Apply migrations (prod: migrate deploy)"
	@echo "    db-migrate-dev      - Create + apply a migration, then generate (dev)"
	@echo "    db-push             - Push schema to database (dev only, FORCE-RESETS data)"
	@echo "    db-pull             - Pull schema from database"
	@echo "    db-studio           - Open Prisma Studio"
	@echo "    db-drop             - Reset the database (dangerous! destroys all data)"
	@echo "    db-seed             - Seed database with initial data"
	@echo ""
	@echo "  Database (ClickHouse):"
	@echo "    db-clickhouse-migrate - Run ClickHouse migrations"
	@echo "    db-clickhouse-status  - Check ClickHouse migration status"
	@echo ""
	@echo "  Docker:"
	@echo "    docker-build        - Build the compose images"
	@echo "    docker-up           - Start the full stack (build if needed)"
	@echo "    docker-down         - Stop the stack"
	@echo "    docker-restart      - Restart the app container"
	@echo "    docker-logs         - Tail app logs"
	@echo "    docker-ps           - Show stack status"
	@echo "    docker-migrate      - Apply migrations in a one-off app container"
	@echo "    docker-seed         - Seed the database in a one-off app container"
	@echo "    docker-deploy       - git pull + build + up + migrate (server deploy)"
	@echo ""
	@echo "  Workflows:"
	@echo "    fresh               - Drop, push schema, and seed (dev only)"
	@echo "    reset               - Generate, migrate, and seed"

install:
	bun install

dev:
	bun run dev

build:
	bun run build

start:
	bun run start

# Code quality
lint:
	bun run lint

lint-fix:
	bun run lint:fix

format:
	bun run format

typecheck:
	bun run typecheck

# Database (PostgreSQL/Prisma)
db-generate:
	bunx --bun prisma generate

db-migrate-dev:
	bunx --bun prisma migrate dev
	bunx --bun prisma generate

db-migrate:
	bunx --bun prisma migrate deploy

db-push:
	bunx --bun prisma db push --force-reset

db-pull:
	bunx --bun prisma db pull

db-studio:
	bunx --bun prisma studio

db-drop:
	bunx --bun prisma migrate reset --force
	@echo "All tables dropped! Use 'make db-push' to recreate the schema."

db-seed:
	bun run db:seed

# Database (ClickHouse)
db-clickhouse-migrate:
	bun run db:clickhouse:migrate

db-clickhouse-status:
	bun run db:clickhouse:status

# Docker (compose stack — config comes from .env, see docs/DEPLOYMENT.md)
# The Dockerfile is single-stage: there is no separate `migrator` image, so
# migrations and seeds run in a one-off `app` container via `compose run`,
# which joins the compose network and starts `depends_on` services first.
docker-build:
	docker compose build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-restart:
	docker compose restart app

docker-logs:
	docker compose logs -f app

docker-ps:
	docker compose ps

docker-migrate:
	docker compose run --rm app bunx --bun prisma migrate deploy

docker-seed:
	docker compose run --rm app bun run db:seed

# Full server deploy: pull latest, rebuild, roll the stack, migrate
docker-deploy:
	git pull
	docker compose up -d --build
	$(MAKE) docker-migrate
	@echo "Deployed!"

# Combined workflows
fresh: db-drop db-push db-seed
	@echo "Database refreshed and seeded!"

reset: db-generate db-migrate db-seed
	@echo "Database migrated and seeded!"