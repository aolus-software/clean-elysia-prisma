## What does this change?

<!-- One or two sentences. What is different after this PR that was not true before? -->

## Why?

<!-- The problem being solved. Link the issue if there is one: Closes #123 -->

## Type of change

- [ ] `feat` — new feature, module, or route
- [ ] `fix` — bug fix
- [ ] `refactor` — restructuring, no behaviour change
- [ ] `docs` — documentation only
- [ ] `chore` — config, dependencies, tooling
- [ ] `db` — schema or migration change

## Checklist

<!-- The repo's standards live in .claude/rules/ (index: .claude/rules/README.md).
     Consult the relevant rule before ticking. -->

- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) —
      lowercase after the colon, imperative, no trailing period.
- [ ] `bun run lint`, `bun run format:check`, `bun run typecheck`, and `bun run build` pass locally
      (CI runs all four).
- [ ] Layering respected: route handler (parse → call service → wrap with `ResponseToolkit`) →
      service (business logic, transactions) → repository (queries).
      See `.claude/rules/modules.md`, `.claude/rules/services.md`, `.claude/rules/repositories.md`.
- [ ] No cross-module imports; anything shared moved into `src/libs/` (`.claude/rules/shared-code.md`).
- [ ] Cross-layer imports use path aliases (`@config`, `@database`, `@errors`, `@types`,
      `@repositories`, `@utils`, …) in the documented order (`.claude/rules/imports-and-naming.md`).
- [ ] No `any` outside `catch (err: unknown)`; explicit return and parameter types.
- [ ] No `console.*` — used `log` from `@utils`.
- [ ] Errors are **thrown** from `@errors`, never returned; success goes through `ResponseToolkit`
      (`.claude/rules/errors-and-responses.md`).
- [ ] Request/response validation lives in the module's `schema.ts` as TypeBox schemas, and responses
      use `commonResponse(...)` (`.claude/rules/validation.md`).
- [ ] New routes declare `detail` (summary, description, tags) and `security` when authenticated
      (`.claude/rules/openapi.md`).
- [ ] Protected routes sit below `.use(AuthPlugin)` and are gated with `RoleGuard` / `PermissionGuard`
      where appropriate (`.claude/rules/plugins.md`).
- [ ] New service registrations added to `src/bootstrap.ts`, not scattered across feature files
      (`.claude/rules/di.md`).
- [ ] New top-level modules wired into `bootstraps` in `src/modules/index.ts`.
- [ ] Repositories added here are re-exported from `src/libs/repositories/index.ts`.
- [ ] Queue changes follow `.claude/rules/queue.md` — typed payloads, workers re-throw on failure,
      no enqueue inside a Prisma transaction.
- [ ] Every new user-facing string added to **both** `src/libs/i18n/locales/en.json` and `id.json`,
      and `bun run i18n:keys` re-run.
- [ ] Any new env var added to the `@config` envalid schema, `.env.example`, and
      `docs/CONFIGURATION.md`.
- [ ] Docs my change makes wrong are fixed **in this PR** — `README.md`, `CLAUDE.md`, the relevant
      `.claude/rules/*.md`, and anything under `docs/`.

## Cluster mode

<!-- Delete this section if the PR adds no startup, queue, or in-memory state. -->

`src/index.ts` forks one worker per `APP_CLUSTER_WORKERS` when `APP_CLUSTER_MODE=true`, and each
worker runs `src/server.ts` independently.

- [ ] Any new side-effectful module load (BullMQ worker, scheduled job, warm-up) is safe to run
      **once per worker**, or is gated so only one worker runs it.
- [ ] Any new in-memory state (cache, counter, lock) is either per-worker-safe or backed by Redis.

## Database changes

<!-- Delete this section if the PR touches no schema. -->

- [ ] Schema edited in `prisma/schema.prisma`.
- [ ] Migration generated and applied with `make db-migrate-dev` — no already-applied migration in
      `prisma/migrations/` was hand-edited.
- [ ] `bunx --bun prisma format` run, so the CI formatting check passes.
- [ ] Migration reviewed for destructive operations (dropped columns, narrowed types, lost data).
- [ ] Seed data in `prisma/seed/` updated if the change makes it invalid.
- [ ] ClickHouse migrations updated if this touches analytics tables
      (`bun run db:clickhouse:migrate`).

> Note: `make db-push` (`prisma db push --force-reset`), `make db-drop`
> (`prisma migrate reset --force`), and `make fresh` (which chains both, then seeds) **destroy all
> data** in the database your `.env` points at. Do not reach for them to "fix" a migration you
> intend to ship.

## How was this tested?

<!-- Commands run, endpoints exercised, and what you saw. "It builds" is not testing.
     There is no test runner configured in this repo, so manual verification is the bar:
     paste the request and the response envelope. -->

## Screenshots or output

<!-- Optional: request/response bodies, Scalar screenshots from /docs, logs. -->
