# Project Rules

Coding rules for the `clean-elysia-prisma` codebase (Bun + Elysia + Prisma + PostgreSQL). Each file is
a focused, enforceable contract — read the relevant rule before writing code in that area.

Rules here carry no frontmatter; the scope is stated in the table below and in each file's opening
line.

## Always in scope

These apply to **every** change, regardless of which files it touches. Read them first.

| Rule | Scope |
| ---- | ----- |
| [contradiction-halt.md](./contradiction-halt.md) | A request that contradicts a rule, the architecture, or a security invariant is reported and halted — never silently implemented or worked around. Lists the invariants and known sharp edges |
| [documentation.md](./documentation.md) | A doc your change makes wrong is fixed in the **same** change; lists every doc that must stay in sync |
| [audit-findings.md](./audit-findings.md) | How an audit finding is written: five blocks, plain language, severity by consequence, CONFIRMED vs SUSPECT — the writing contract for [`/audit-flow`](../commands/audit-flow.md) |
| [clean-code.md](./clean-code.md) | Formatting, explicit types, no `any`, no `console.*`, comment density |
| [elysia.md](./elysia.md) | Layering (`handler → service → repository`), reuse-before-you-build, config and logging |

## Layer rules

Ordered outside-in, the way a request travels.

| Rule | Applies to |
| ---- | ---------- |
| [modules.md](./modules.md) | `src/modules/<feature>/` — the three-file layout and how modules compose |
| [handlers.md](./handlers.md) | `src/modules/<feature>/index.ts` — what a route handler may do, the `ResponseToolkit` envelope, the full route contract |
| [handlers-crud.md](./handlers-crud.md) | `src/modules/<feature>/index.ts` — the canonical five-route CRUD module and its status codes |
| [validation.md](./validation.md) | `src/modules/<feature>/schema.ts` — TypeBox schemas, the named response envelopes, formats, what never appears in a response |
| [services.md](./services.md) | `src/modules/<feature>/service.ts` — plain-object services, business-logic boundaries, transactions |
| [services-crud.md](./services-crud.md) | `src/modules/<feature>/service.ts` — the canonical five-method CRUD service; the service owns the existence and uniqueness checks |
| [repositories.md](./repositories.md) | `src/libs/database/postgres/repositories/` — Prisma factory pattern, `tx` on the factory, explicit `select`, sort/filter allow-lists |
| [schema.md](./schema.md) | `prisma/schema.prisma` — model and field naming, composite join keys, soft delete on `User`, the token-table contract, migrations |
| [shared-code.md](./shared-code.md) | Anything reusable across modules **must** live in `libs/` |
| [di.md](./di.md) | Dependency injection container and `DiPlugin` |
| [plugins.md](./plugins.md) | `src/libs/plugins/` — plugin naming (`name`), `baseApp` composition order, what a plugin may not do |

## Cross-cutting concerns

| Rule | Applies to |
| ---- | ---------- |
| [rbac.md](./rbac.md) | Authorization — `PermissionGuard` / `RoleGuard` in `beforeHandle`, the seeded permission vocabulary, and why this repo once shipped 22 unguarded routes |
| [routes.md](./routes.md) | Path composition, verb conventions, and the **live route map** with the guard on every route |
| [errors-and-responses.md](./errors-and-responses.md) | The success envelope, the six error classes and their statuses, `ErrorHandlerPlugin` |
| [openapi.md](./openapi.md) | OpenAPI / Scalar documentation, `detail`, tags, security |
| [i18n.md](./i18n.md) | `t()` from `@i18n`, the `en`/`id` catalogues (92 keys, moved together), the generated key type, no hardcoded user-facing strings |
| [mail.md](./mail.md) | Queued mail via `AuthMailService`, templates and their locale variants, `{{var}}` substitution |
| [rate-limiting.md](./rate-limiting.md) | The global limiter inside `SecurityPlugin`, and why its numbers are hardcoded |
| [queue.md](./queue.md) | BullMQ queues, workers, retries |
| [imports-and-naming.md](./imports-and-naming.md) | Path aliases, import order, file and symbol naming |
| [commit.md](./commit.md) | Conventional Commits, what runs before a commit, what never gets committed |

## How to use

- These rules complement `CLAUDE.md` — they don't replace it.
- When a rule conflicts with `CLAUDE.md`, the rule file wins (it's more specific).
- Don't introduce a new pattern without updating the relevant rule first — that is
  [documentation.md](./documentation.md), and a new rule must be added to this index.
- Slash commands live in [`../commands/`](../commands/): `/commit` and `/audit-flow` (the latter
  governed by [audit-findings.md](./audit-findings.md)).

## Where this repo differs from its Drizzle sibling

The two repos share this filename set exactly, but three conventions genuinely differ. Don't port code
across without checking which side you are on:

| | `clean-elysia-prisma` | `clean-elysia` |
| --- | --- | --- |
| Transaction handle | passed to the **factory** — `UserRepository(tx)` | passed to each **method** — `UserRepository().find(x, tx)` |
| CRUD checks | in the **service** (fetch, check, throw) | in the **repository** |
| Response schemas | named envelopes built in `schema.ts` | `commonResponse(...)` inline at the route |
| OpenAPI tags | `Settings - Users` | `Settings/Users` |
| Soft delete | `deletedAt` on `User` only | `deleted_at` on soft-deletable tables |
