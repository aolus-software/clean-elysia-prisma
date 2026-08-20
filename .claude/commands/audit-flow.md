---
description: Read-only whole-codebase audit of this Elysia backend — auth/token flows, RBAC gaps, data integrity, secrets at rest, i18n parity, dead code/validation, shared-code duplication, response-contract drift, and doc drift. Writes explained findings (what it is · why · what it costs · what to do) to an audit findings document. Never modifies application code.
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(rg:*), Bash(find:*), Bash(ls:*), Bash(wc:*), Read, Glob, Grep, Agent, Write, Edit
---

# Audit Flow

Run a structured, **read-only** audit of this backend and record the results in an audit findings
document (default: `docs/audit-findings.md`; if the user names another path, use theirs). This command
**never changes application code, schemas, TypeBox definitions, services, repositories, migrations, or
seeds** — its only output is the findings document.

`$ARGUMENTS` (optional) narrows scope to specific categories or paths (e.g. `audit-flow auth rbac`,
`audit-flow src/modules/settings/users`). **With no arguments, sweep the entire codebase** as defined
under "What a full sweep covers" — not a sample, not the modules that changed recently.

## How to run it

1. **Read the ground truth first**: `CLAUDE.md`, every `.claude/rules/*.md`, and
   `.claude/rules/audit-findings.md` in particular — that is the writing contract, and it is read
   before a single finding is written. These define the intended behaviour that findings are measured
   against: a finding is always "code vs stated intent", never "code vs the auditor's taste". Where
   no rule states an intent, say so in the finding rather than inventing one.
2. **Build the inventory before dispatching anything.** Enumerate what exists so coverage is a fact
   rather than a hope: every module and sub-module under `src/modules/`, every bucket under
   `src/libs/`, every queue and worker under `src/bull/`, every model and enum in
   `prisma/schema.prisma`, every migration under `prisma/migrations/`, every permission produced by
   `prisma/seed/permission.seed.ts`, and every route declared across the module `index.ts` files
   (this repo has **no** route-map rule file — the routes are the source of truth, so grep them).
   Keep this list — it is what the report's Coverage section is written from.
3. **Dispatch parallel read-only `Explore` subagents** — one per category below, each given its slice
   of the inventory so every file has an owner. Do not read serially in the main thread. If a
   category is too large for one agent, split it by module and say so in Coverage.
4. **Each subagent returns evidence, not prose**: `file:line` for every claim, the intended behaviour
   per the rules, what the code actually does, the gap, and whether it traced the path end to end
   (**CONFIRMED**) or is guessing (**SUSPECT**, plus what would settle it).
5. **Write the findings up yourself, in the main thread.** A subagent's terse notes are raw material.
   Every finding gets the five blocks required by `.claude/rules/audit-findings.md`:

   > **Where** (`file:line`) · **What this is** · **Why this can happen** · **What it costs** ·
   > **What we should do**

   written so someone who has never opened that file understands the problem without reading code. A
   bare code citation with a one-line verdict is **not** an acceptable finding — expand it. Tag each
   🔴 bug · 🟠 inconsistency · 🟡 hygiene · 📄 doc, by consequence, never by effort.
6. **Write the Coverage section** — what was reached, and what was deliberately not. A category with
   no findings says so and names what was checked; "clean" without evidence is indistinguishable from
   "not audited".
7. **Write "Top priorities" last**, ordered security → data integrity → correctness → hygiene/doc, in
   the plainest language in the document. This is the part the owner actually reads.
8. **Report a short summary to the user. Do not fix anything** — fixes are a separate, explicitly
   requested step.

## What a full sweep covers

Everything below is in scope for an unscoped run. Nothing here is skipped for being boilerplate —
`src/index.ts`, `src/server.ts`, and `src/base.ts` are where clustering, the global plugin stack,
CORS/Helmet/rate-limiting, and OpenAPI gating are wired, so they carry security invariants.

Note the layout: **`libs/` lives inside `src/`**. There is no top-level `libs/` directory.

| Area | Includes |
|---|---|
| `src/index.ts` | the cluster entrypoint — worker forking on `APP_CLUSTER_MODE`, crash restarts, `SIGINT`/`SIGTERM` forwarding, and what runs once per worker vs once per process |
| `src/server.ts`, `src/base.ts`, `src/bootstrap.ts` | the Elysia bootstrap, the `baseApp` plugin order (as coded: `RequestPlugin` → `LocalePlugin` → `LoggerPlugin` → `PerformancePlugin` → `DiPlugin` → `BodyLimitPlugin` → `SecurityPlugin`), `DocsPlugin` + `ErrorHandlerPlugin` composition, and DI registrations |
| `src/modules/auth/**` | login, register, verify-email, resend-verification, forgot-password, reset-password, and `GET /auth/me` — plus their TypeBox schemas |
| `src/modules/settings/users/**` | the user CRUD surface plus `sync-roles`, `send-email-verification`, `send-password-reset`, and `reset-password` sub-actions |
| `src/modules/settings/roles/**`, `src/modules/settings/permissions/**` | the RBAC catalogue itself — the thing every guard would depend on — including `PATCH /settings/roles/:id/sync-permissions` |
| `src/modules/settings/select-option/**` | what the dropdown/lookup surface discloses and to whom |
| `src/modules/home/**`, `src/modules/health/**`, `src/modules/index.ts` | the unauthenticated surface, what it discloses, and the `bootstraps` composition |
| `src/libs/plugins/**` | `AuthPlugin` (JWT verify + cached `UserInformation`), `SecurityPlugin` (CORS/Helmet/rate limit), `ErrorHandlerPlugin`, `DocsPlugin`, `LocalePlugin`, `LoggerPlugin`, `RequestPlugin` (in `request-id.plugin.ts`), `PerformancePlugin`, `BodyLimitPlugin`, `DiPlugin`, and `plugins/core/container.ts` |
| `src/libs/guards/**` | `PermissionGuard`, `RoleGuard` — **and every route that should call them and does not** |
| `src/libs/database/postgres/**` | the `prisma` client singleton and the three repository factories (`user`, `role`, `permission`), their `select` shapes and sort/filter allowlists |
| `src/libs/database/redis/**`, `src/libs/cache/**` | the shared Redis connection, `Cache` helpers, and the key builders in `cache/const.ts` |
| `src/libs/database/clickhouse/**` | the client manager, `services/user-activity.ts`, the hand-rolled migration runner in `scripts/migrate.ts`, and `migrations/*.sql` — an optional subsystem that still writes user data |
| `src/libs/repositories/index.ts` | the `@repositories` barrel — **a repository missing from it silently breaks the alias** |
| `src/libs/errors/**` | the six error classes and whether every one has a branch in `ErrorHandlerPlugin` |
| `src/libs/i18n/**` | `en.json` / `id.json` catalogue parity, `keys.generated.ts` freshness, `accept-language.ts`, `locale-store.ts`, `validation.ts` |
| `src/libs/mailer/**` | transport, `mail.service.ts`, `auth-mail.service.ts`, and the four Handlebars/HTML templates (en + id) |
| `src/libs/utils/**` | `ResponseToolkit` + `commonResponse` (`utils/elysia/response.ts`), `DatatableToolkit`, `log`, `Hash`, `encrypt`, and the `toolkit/` helpers |
| `src/libs/config/**` | `env.config.ts` (`cleanEnv` validation) plus the app/cors/jwt/mail/redis/database/clickhouse config objects |
| `src/libs/default/**`, `src/libs/types/**` | the constants (`pagination-length`, `sort`, `strong-password`, `token-lifetime`, upload limits) and the domain types |
| `src/bull/**` | `send-mail-queue.ts` / `send-mail-worker.ts`, retry and re-throw behaviour, and what happens to workers under cluster mode |
| `prisma/**` | `schema.prisma`, the two applied migrations under `prisma/migrations/`, and the seeds (`permission.seed.ts`, `role.seed.ts`, `user.seed.ts`) — **the seeded permission catalogue is ground truth for any guard** |
| repo root | `Makefile`, `.env.example`, `package.json` scripts, `tsconfig.json` path aliases, `eslint.config.mjs`, `.husky/pre-commit`, `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml` |
| `docs/**`, `README.md`, `CLAUDE.md` | doc drift against the code (see category 11) |

**Deliberately out of scope** (state this in Coverage): `node_modules/`, `dist/`, `storage/`,
`prisma/generated/` (generated Prisma client), `bun.lock`, and `.agents/skills/` + `.claude/skills/`
(vendored bundles, not this project's code).

**There are no tests to audit.** `package.json` defines `"test": "echo \"Error: no test specified\"
&& exit 1"` and the repo contains zero `*.test.ts` / `*.spec.ts` files. Record the absence once as a
finding; do not open a "test coverage" category expecting files.

Coverage is not optional. If time or context forces a partial sweep, **say which areas were not
reached** rather than letting silence imply they were clean.

## Categories to cover

1. **Auth & token flows** — the order and idempotency of register → verify-email → login;
   forgot-password → reset-password; whether a consumed or expired `UserEmailVerification` /
   `PasswordReset` row is invalidated rather than left reusable; whether issuing a second token
   revokes the first (`src/modules/auth/service.ts` uses `deleteMany` in several places — check each
   one actually runs before the new token is written, and inside a transaction where it matters);
   token lifetimes sourced from `src/libs/default/token-lifetime.ts` rather than inline numbers;
   what `GET /auth/me` returns.
2. **Access control — guards & routes** — every route in `src/modules/**/index.ts` against its
   gating. `AuthPlugin` is opt-in per route group (`modules.md` rule 3): a route below it proves
   *identity* only. **Known today and still to be written up: `PermissionGuard` / `RoleGuard` exist
   in `src/libs/guards/` but have no call site anywhere in `src/`, and there is no `beforeHandle` in
   the tree — so every settings route is reachable by any authenticated user.** Confirm the scope of
   that yourself, route by route, rather than restating the rule. Also check for public routes that
   sit *above* `AuthPlugin` by accident, and any authenticated route that acts on a user id other
   than the caller's without a check.
3. **Ownership & self-service boundaries** — `PATCH /settings/users/:id/reset-password`,
   `PATCH /settings/users/:id/sync-roles`, `POST /settings/users/:id/send-password-reset`, and
   `POST /settings/users/:id/send-email-verification` all take an arbitrary id. Confirm each either
   requires an elevated permission or asserts the target is the caller. A privilege-escalation path
   (a user granting themselves a role, or resetting the superuser's password) is 🔴 and sorts first.
4. **Data integrity & transactions** — **this repo has no soft delete: `prisma/schema.prisma`
   declares no `deletedAt` on any model, so `prisma.user.delete(...)` and the repository `delete`
   methods are permanent.** Audit what that costs: cascade behaviour on `UserRole` /
   `RolePermission`, orphaned `UserEmailVerification` / `PasswordReset` rows, whether a delete
   destroys audit history, unique constraints the code assumes (email) actually declared, and
   transaction boundaries owned by the service (never the repository) per `services.md` rule 6 and
   `repositories.md` rule 2. Also flag multi-write sequences that should be in `prisma.$transaction`
   and are not.
5. **Secrets & sensitive data at rest** — password hashes, `APP_JWT_SECRET`, `APP_KEY`, reset and
   verification tokens absent from logs, response schemas, OpenAPI examples, error messages, and
   repository `select` shapes; `Hash` from `@utils` used for passwords rather than a hand-rolled
   hash; `encrypt` used where reversible storage is intended; env read through `@config` and never
   `process.env` outside `env.config.ts`; and `.env.example` carrying no real credentials.
6. **Caching correctness** — `AuthPlugin` caches the resolved `UserInformation` (roles + flattened
   permissions) under `UserInformationCacheKey(userId)` for 3600. Check that every write which
   changes a user's roles, permissions, status, or password invalidates that key — a stale
   permission cache is a **security** finding, not a performance one. Check key collisions across
   users and TTL units (`Cache.set(..., 3600)` vs the constants in `@default`).
7. **i18n coverage & catalogue parity** — any user-facing literal that bypassed i18n; `en.json` and
   `id.json` holding the same keys with the same `{placeholders}`; `locales/keys.generated.ts` in
   sync with the catalogues (`bun run i18n:keys`); `ErrorHandlerPlugin` fallback keys
   (`t("errors.badRequest")` and friends) actually present in both catalogues; and the mailer
   templates having an `.id.html` counterpart for every `.html`.
8. **Response-contract completeness** — routes whose `response: commonResponse(Data, { include: [...] })`
   disagrees with what the handler, plugins, and `ErrorHandlerPlugin` can actually produce: a 403
   omitted on a guarded route, a 404 omitted where the service throws `NotFoundError`, a 429 omitted
   though `SecurityPlugin` rate-limits every route, a missing 401 below `AuthPlugin`. Also: routes
   returning a hand-built object instead of `ResponseToolkit`, `set.status` set anywhere other than
   alongside `ResponseToolkit.created`, missing `detail.summary` / `detail.description`, missing
   `detail.security: [{ bearerAuth: [] }]` on authenticated routes, and modules missing
   `detail.tags`. See `.claude/rules/errors-and-responses.md`, `openapi.md`, and `validation.md`.
   **The error wire format here is `{ status, success, message, errors: [{ field, message }] }` —
   an `errors` array, not a field map. That is the intended contract; do not report it as drift.**
9. **Dead code, unused fields & validation** — schema fields never read by the service, dead enum
   members (`UserStatus` has `ACTIVE`/`INACTIVE`/`BLOCKED` — check every one is reachable), missing
   or wrong TypeBox constraints, enum filters with no membership check, repository `select` shapes vs
   what the service actually reads, and sort/filter allowlists that drifted from the schema
   (`allowedSort`, `allowedFilter`, `sortDirectionAllowed` in the repositories; `defaultSort` and
   `paginationLength` in `@default`). Also: exports that nothing imports — `@guards` is the
   obvious candidate, but sweep every `libs/` bucket for the same shape.
10. **Shared-code placement & duplication** — logic copy-pasted across services that belongs in
    `src/libs/` (`shared-code.md`); magic values that should be constants in `src/libs/default/`;
    three ways to do one thing; cross-module imports (`modules/a` importing `modules/b`, forbidden by
    `modules.md` rule 5); `src/libs/**` importing from `src/modules/**` (forbidden by `shared-code.md`
    rule 3); relative paths crossing layers instead of aliases; and **a symbol missing from its
    bucket's `index.ts`**, which silently breaks the path alias.
11. **Queues, rate limiting & cluster mode** — `send-mail-worker.ts` re-throwing on failure so
    BullMQ retries, a `worker.on("failed", ...)` handler present, jobs enqueued *after* a transaction
    commits rather than inside it (`queue.md` rule 11), and the shared Redis connection used rather
    than a fresh `IORedis`. For cluster mode: side-effectful module loads (`@bull` workers, schedules)
    firing once per worker, and in-memory state that does not survive across workers — the
    `elysia-rate-limit` counters in `SecurityPlugin` are per-process, so the effective limit
    multiplies by the worker count.
12. **Data model & migrations** — `schema.prisma` vs the applied migrations under
    `prisma/migrations/`, a schema change with no migration, an edited already-applied migration,
    indexes missing on columns the repositories filter or sort by, and seed data that disagrees with
    the schema. The ClickHouse side has its own hand-rolled runner
    (`src/libs/database/clickhouse/scripts/migrate.ts`) — check it tracks applied migrations
    idempotently.
13. **Documentation drift** — `CLAUDE.md`, `README.md`, `docs/*.md`, and `.claude/rules/*` claims vs
    code: env var names, module and route names, permission strings, path aliases, Makefile targets,
    and `package.json` scripts. A shipped pattern with no rule is itself a 📄 finding
    (`.claude/rules/documentation.md`). **Known today, both to be confirmed and recorded rather than
    assumed already reported:** (a) the `@i18n` alias is declared in `tsconfig.json` and used by
    `ErrorHandlerPlugin`, but is absent from the alias tables in both `CLAUDE.md` and
    `.claude/rules/imports-and-naming.md`; (b) `CLAUDE.md` and `.claude/rules/plugins.md` rule 9 both
    give the `baseApp` order as `RequestPlugin` → `LoggerPlugin` → …, omitting `LocalePlugin`, which
    `src/base.ts` composes second.

## Rules for this command

- **Read-only.** If the audit surfaces a bug or rule contradiction, **report it — do not act on it**
  (`.claude/rules/contradiction-halt.md`). The findings document is the one file this command writes.
- **Writing format is governed by `.claude/rules/audit-findings.md`** — the five blocks, plain
  language, severity by consequence, CONFIRMED-vs-SUSPECT honesty, document layout, permanent finding
  numbers, and how a resolved finding is marked. Read it before writing the report.
- **Prefer updating the existing findings document** over creating a new file — one living record.
  Never renumber an existing finding; append new ones.
- **Cite `file:line` for every finding.** No finding without a location.
- **Explain, don't just point.** A finding a reader must open the code to understand has not been
  written yet.
- **Known issues already on record** in `.claude/rules/contradiction-halt.md` — the uninvoked
  guards, the space-separated permission names, the absent soft delete, the three-value `UserStatus`,
  the missing test runner, the missing deployment config — are still swept and still written up. A
  rule noting them is not a substitute for the report carrying them with evidence and consequences.
