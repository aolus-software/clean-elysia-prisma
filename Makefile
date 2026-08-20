.PHONY: help install dev build start lint lint-fix format typecheck db-generate db-migrate db-migrate-dev db-push db-pull db-studio db-drop db-seed db-clickhouse-migrate db-clickhouse-status fresh reset

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

# Combined workflows
fresh: db-drop db-push db-seed
	@echo "Database refreshed and seeded!"

reset: db-generate db-migrate db-seed
	@echo "Database migrated and seeded!"