# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

Before writing or reviewing code, consult the focused rule files in [`.claude/rules/`](./.claude/rules/README.md). The index lists every rule; the most load-bearing ones:

- [`modules.md`](./.claude/rules/modules.md) — required layout for a feature module
- [`repositories.md`](./.claude/rules/repositories.md) — Prisma repository factory + transaction pattern
- [`services.md`](./.claude/rules/services.md) — plain-object services, throw don't return
- [`shared-code.md`](./.claude/rules/shared-code.md) — anything reusable lives in `libs/`
- [`di.md`](./.claude/rules/di.md), [`queue.md`](./.claude/rules/queue.md), [`openapi.md`](./.claude/rules/openapi.md)
- [`validation.md`](./.claude/rules/validation.md), [`errors-and-responses.md`](./.claude/rules/errors-and-responses.md), [`imports-and-naming.md`](./.claude/rules/imports-and-naming.md), [`plugins.md`](./.claude/rules/plugins.md)

Rule files override the summaries in this document when more specific.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js with TypeBox validation
- **ORM**: Prisma 7 (with `@prisma/adapter-pg` driver) — generated client lives in `prisma/generated/prisma-client/`
- **Databases**: PostgreSQL (primary), Redis (cache/queues), ClickHouse (analytics, optional)
- **Queue**: BullMQ
- **Auth**: JWT via `@elysiajs/jwt`, bcryptjs for password hashing
- **Logging**: pino via `@bogeychan/elysia-logger`
- **Docs**: `@elysiajs/openapi` served by Scalar at `/docs` (disabled in production)

> README.md is partially stale — it mentions Drizzle in places. This codebase uses **Prisma**.

## Commands

```sh
bun run dev          # Dev server with hot reload
bun run lint         # ESLint
bun run lint:fix     # Fix ESLint issues
bun run format       # Prettier
bun run db:seed      # Seed database
bun run build        # Bun bundle → dist/index.js
bun run start        # Run dist/index.js
```

> **Known typo**: `package.json` defines `"typechedk"` (sic) instead of `"typecheck"`. Run type checks via `bunx tsc --noEmit` until the script is renamed.

> **No test runner is configured.** `bun run test` just exits with an error. Don't claim test results without setting one up.

Prisma / database (Makefile wraps `bunx --bun prisma`):

```sh
make db-generate       # prisma generate
make db-migrate-dev    # prisma migrate dev + generate
make db-migrate        # prisma migrate deploy
make db-push           # prisma db push --force-reset
make db-studio         # prisma studio
make db-drop           # prisma migrate reset --force
make fresh             # db-drop + db-push + db-seed
make reset             # db-generate + db-migrate + db-seed
```

ClickHouse: `bun run db:clickhouse:migrate`, `bun run db:clickhouse:status`.

## Architecture

### Entry Points

- `src/index.ts` — Boots the app: calls `bootstrap()`, then composes `DocsPlugin` + `ErrorHandlerPlugin` + `bootstraps` (all modules) and `.listen(AppConfig.APP_PORT)`.
- `src/base.ts` — `baseApp`, the shared Elysia instance carrying global plugins: `RequestPlugin` → `LoggerPlugin` → `PerformancePlugin` → `DiPlugin` → `BodyLimitPlugin` → `SecurityPlugin`. Order matters — request-id must precede logging, etc.
- `src/bootstrap.ts` — Registers services in the DI container at startup (currently registers `authService`). Add new DI registrations here.
- `src/modules/index.ts` — `bootstraps` composes every top-level module (`HomeModule`, `HealthModule`, `AuthModule`, `SettingsModule`). New modules wire in here.

### Layer Structure

```
src/
├── index.ts / base.ts / bootstrap.ts
├── bull/               # BullMQ queues and workers (see rules/queue.md)
├── libs/               # Shared infrastructure — anything reusable lives here
│   ├── config/         # Env-validated config (envalid)
│   ├── database/       # Prisma client, Redis singleton, ClickHouse client
│   ├── cache/          # Redis cache helpers + key constants
│   ├── errors/         # Custom error classes (BadRequest/Unauthorized/NotFound/Forbidden)
│   ├── guards/         # RoleGuard, PermissionGuard
│   ├── mailer/         # Nodemailer transport + mail services
│   ├── plugins/        # Cross-cutting Elysia plugins (auth, security, di, …)
│   ├── repositories/   # Re-exports of postgres repositories (the @repositories alias)
│   ├── types/          # Domain TypeScript interfaces
│   ├── default/        # App-wide constants (pagination, sort, password rules)
│   └── utils/          # Hash, log, ResponseToolkit, DatatableToolkit, DateToolkit, …
└── modules/            # Feature modules — see rules/modules.md
    └── <feature>/
        ├── index.ts    # Elysia routes
        ├── schema.ts   # TypeBox schemas
        └── service.ts  # Business logic (optional)

prisma/
├── schema.prisma       # User, Role, Permission, UserRole, RolePermission, …
├── migrations/         # Migration history
├── generated/          # Generated Prisma client (do not edit)
└── seed/               # Seed scripts
```

### Key Patterns (one-line each — full rule in `.claude/rules/`)

- **Repository** — factory function taking optional `Prisma.TransactionClient`; explicit `select`; allowlisted sort/filter. See [`rules/repositories.md`](./.claude/rules/repositories.md).
- **Service** — plain-object export with async methods; throws custom errors; no HTTP types. See [`rules/services.md`](./.claude/rules/services.md).
- **Module** — named `Elysia` instance with `prefix` and `detail.tags`, `.use(baseApp)`, `.use(AuthPlugin)` above protected routes. See [`rules/modules.md`](./.claude/rules/modules.md).
- **Plugin** — named `Elysia` instance (e.g. `{ name: "security-plugin" }`). See [`rules/plugins.md`](./.claude/rules/plugins.md).
- **DI** — `container.register` in `bootstrap.ts`; `container.resolve<T>(name)` in handlers via the `container` derived by `DiPlugin`. See [`rules/di.md`](./.claude/rules/di.md).

### Path Aliases (`tsconfig.json`)

| Alias               | Maps to                           |
| ------------------- | --------------------------------- |
| `@base`             | `src/base.ts`                     |
| `@bull`             | `src/bull/`                       |
| `@cache`            | `src/libs/cache/`                 |
| `@config`           | `src/libs/config/`                |
| `@database`         | `src/libs/database/`              |
| `@default`          | `src/libs/default/`               |
| `@errors`           | `src/libs/errors/`                |
| `@guards`           | `src/libs/guards/`                |
| `@mailer`           | `src/libs/mailer/`                |
| `@plugins`          | `src/libs/plugins/`               |
| `@repositories`     | `src/libs/repositories/`          |
| `@types`            | `src/libs/types/`                 |
| `@utils`            | `src/libs/utils/`                 |
| `@modules`          | `src/modules/`                    |
| `@prisma-generated` | `prisma/generated/prisma-client/` |

Always use aliases for cross-layer imports. Relative imports are allowed only within the same module. See [`rules/imports-and-naming.md`](./.claude/rules/imports-and-naming.md) for import order and file/symbol naming.

### Response Format

Success responses use `ResponseToolkit` from `@utils` (`success`, `created`, `paginated`). Errors are thrown from `@errors` and translated by `ErrorHandlerPlugin`. See [`rules/errors-and-responses.md`](./.claude/rules/errors-and-responses.md).

### Authentication

JWT bearer tokens. `AuthPlugin` (`@plugins`) verifies the token and attaches `user` (with roles/permissions) to context. Modules call `.use(AuthPlugin)` between their public and protected routes — see `src/modules/auth/index.ts` for the canonical example.

`RoleGuard` / `PermissionGuard` from `@guards` enforce RBAC on protected routes.

### Background Jobs

BullMQ workers boot via `src/bull/index.ts`. Producers enqueue through service helpers (often in `@mailer`); workers must re-throw on failure to trigger retries. See [`rules/queue.md`](./.claude/rules/queue.md).

## Deeper Documentation

Topic-specific guides live in [`docs/`](./docs/):

- [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) — API consumer guide
- [`docs/CONFIGURATION.md`](./docs/CONFIGURATION.md) — environment variables reference
- [`docs/ERROR_HANDLING.md`](./docs/ERROR_HANDLING.md) — error contract
- [`docs/PLUGINS.md`](./docs/PLUGINS.md) — plugin system
- [`docs/SECURITY.md`](./docs/SECURITY.md) — security notes

When the dev server is running, the live Scalar UI sits at `http://localhost:3000/docs` and the raw spec at `http://localhost:3000/docs/openapi.json`.
