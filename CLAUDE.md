# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js with TypeBox validation
- **ORM**: Prisma (with `@prisma/adapter-pg` driver) — generated client lives in `prisma/generated/prisma-client/`
- **Databases**: PostgreSQL (primary), Redis (cache/queues), ClickHouse (analytics)
- **Queue**: BullMQ
- **Auth**: JWT via `@elysiajs/jwt`, bcryptjs for password hashing
- **Logging**: pino via `@bogeychan/elysia-logger`

## Commands

```sh
bun run dev          # Dev server with hot reload
bun run lint         # ESLint
bun run lint:fix     # Fix ESLint issues
bun run format       # Prettier
bun run typecheck    # TypeScript type check (tsc --noEmit)
bun run db:seed      # Seed database

# Prisma (use make or bunx --bun prisma directly)
make db-generate       # bunx --bun prisma generate
make db-migrate-dev    # bunx --bun prisma migrate dev + generate
make db-migrate        # bunx --bun prisma migrate deploy
make db-push           # bunx --bun prisma db push --force-reset
make db-studio         # bunx --bun prisma studio
make db-drop           # bunx --bun prisma migrate reset --force
make fresh             # db-drop + db-push + db-seed
make reset             # db-generate + db-migrate + db-seed
```

## Architecture

### Entry Points

- `src/index.ts` — Creates the Elysia app, registers `DocsPlugin` + `ErrorHandlerPlugin`, starts server
- `src/base.ts` — `baseApp` shared instance with cross-cutting plugins: `RequestPlugin`, `LoggerPlugin`, `PerformancePlugin`, `DiPlugin`, `BodyLimitPlugin`, `SecurityPlugin`
- `src/bootstrap.ts` — Registers all modules (currently commented out during migration)

### Layer Structure

```
src/
├── index.ts / base.ts / bootstrap.ts
├── bull/               # BullMQ queues and workers
│   ├── queue/          # Queue definitions
│   └── worker/         # Worker implementations
├── libs/               # Shared infrastructure
│   ├── config/         # Env-validated config (AppConfig, DatabaseConfig, etc.)
│   ├── database/
│   │   ├── postgres/   # Prisma client + repositories
│   │   ├── redis/      # RedisClient singleton
│   │   └── clickhouse/ # ClickHouse client and migrations
│   ├── cache/          # Redis cache helpers + key constants
│   ├── errors/         # Custom error classes
│   ├── guards/         # RoleGuard, PermissionGuard
│   ├── mailer/         # Nodemailer transport + mail services
│   ├── plugins/        # Elysia plugins (auth, security, di, error-handler, docs, etc.)
│   ├── types/          # TypeScript interfaces organized by domain
│   ├── default/        # App-wide constants (pagination, sort, password rules)
│   └── utils/          # Utilities: Hash, log, ResponseToolkit, date/string/number helpers
└── modules/            # Feature modules (auth, profile, settings, home)
    └── <module>/
        ├── index.ts    # Route definitions using baseApp
        ├── schema.ts   # TypeBox validation schemas
        └── service.ts  # Business logic (optional)
prisma/
├── schema.prisma       # Data models: User, Role, Permission, UserRole, RolePermission, etc.
├── migrations/         # Migration history
├── generated/          # Generated Prisma client (do not edit)
└── seed/               # Seed scripts
```

### Key Patterns

**Repository** — Factory functions accepting optional `Prisma.TransactionClient`:

```typescript
export function UserRepository(tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return {
		/* methods */
	};
}
```

**Service** — Plain object exports (no classes):

```typescript
export const AuthService = {
  signIn: async (email: string, password: string): Promise<UserInformation> => { ... },
};
```

**Module** — Elysia instance with `prefix`, uses `baseApp`:

```typescript
export const AuthModule = new Elysia({ prefix: "/auth" })
	.use(baseApp)
	.post("/login", handler, { body: LoginSchema });
```

**Plugin** — Named Elysia instances:

```typescript
export const SecurityPlugin = new Elysia({ name: "security-plugin" }).use(helmet()).use(rateLimit(...));
```

**DI Container** — Injected via `DiPlugin`; access via `container` in route context.

### Path Aliases (tsconfig.json)

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

Always use these aliases — never relative imports across layers.

### Import Order

1. External libraries (`elysia`, `bullmq`, etc.)
2. Aliases by category: `@config` → `@database` → `@errors` → `@types` → `@repositories` → `@utils` → others
3. Relative imports only within the same module

### Error Handling

Use custom error classes from `@errors`:

```typescript
throw new BadRequestError("Validation error", [
	{ field: "email", message: "..." },
]);
throw new UnauthorizedError("Unauthorized");
throw new NotFoundError("Not found");
throw new ForbiddenError("Forbidden");
```

Catch and log with context:

```typescript
try { ... } catch (error) {
  log.error({ error, context }, "Operation failed");
  throw new BadRequestError("Operation failed");
}
```

### Code Style

- Comments only for complex logic — use block JSDoc on functions, not inline comments every few lines
- File naming: kebab-case with role suffix — `user.repository.ts`, `auth.service.ts`, `auth.plugin.ts`
- No `console.log` — use `log` from `@utils`
- TypeScript strict mode is enabled (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`)

### Validation

Use Elysia TypeBox (`t`) for request/response schemas in `schema.ts`. Apply to routes via `{ body: Schema, response: ResponseSchema }`.

### Response Format

```typescript
// Success
{ success: true, data: result }
// Paginated
{ success: true, data: results, meta: { page, perPage, total, totalPages } }
// Errors are handled by ErrorHandlerPlugin automatically
```

### Redis Caching

```typescript
const redis = RedisClient.getRedisClient();
await redis.set(key, JSON.stringify(data), "EX", 3600);
const cached = await redis.get(key);
```

### BullMQ Queues

Queues connect via `RedisClient.getQueueRedisClient()`. Workers must re-throw errors to trigger BullMQ retry logic. Listen to `worker.on("failed", ...)` for logging.
