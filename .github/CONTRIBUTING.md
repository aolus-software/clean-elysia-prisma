# Contributing

Thanks for considering a contribution. This repository is a **starter template**, so changes are
judged by whether most projects built on it would benefit — not by whether they help one specific
application.

## Before you start

Read these first; they are the source of truth for how code is written here:

- **`CLAUDE.md`** — architecture, cluster mode, layer structure, path aliases, and the patterns that
  are easy to get wrong.
- **`.claude/rules/`** — focused, enforceable contracts. Start with
  [`README.md`](../.claude/rules/README.md), which indexes all of them. The load-bearing ones are
  `modules.md`, `repositories.md`, `services.md`, and `shared-code.md`.
- **`docs/`** — deeper references: `CONFIGURATION.md` (env vars), `ERROR_HANDLING.md`,
  `PLUGINS.md`, `API_DOCUMENTATION.md`, and `SECURITY.md` (how auth actually works).

Where a rule file and `CLAUDE.md` disagree, the rule file wins — it is more specific.

For anything larger than a bug fix, open an issue first so the design can be agreed before you spend
time on it.

## Local setup

Runtime is **Bun**. Do not use `npm`, `pnpm`, or `yarn`.

```bash
git clone <this repo>
cd clean-elysia-prisma
bun install
cp .env.example .env          # then fill in secrets
docker compose up -d          # PostgreSQL + Redis
make db-migrate-dev           # prisma migrate dev + generate
bun run db:seed               # optional: seed roles, permissions, and a superuser
bun run dev                   # hot-reload dev server
```

The API listens on `APP_PORT`. The Scalar API reference is at `/docs`, and is **disabled when
`APP_ENV=production`**.

Useful commands:

```bash
bun run dev            # hot-reload dev server
bun run build          # bundle to dist/index.js
bun run start          # run dist/index.js
bun run lint           # eslint
bun run lint:fix       # eslint --fix
bun run format         # prettier --write
bun run format:check   # prettier --check
bun run typecheck      # tsc --noEmit
bun run i18n:keys      # regenerate i18n key types
```

Database commands are Make targets wrapping `bunx --bun prisma` — there are no `db:*` bun scripts
apart from the seeder. Run `make help` for the full list.

```bash
make db-generate       # prisma generate
make db-migrate-dev    # create + apply a migration, then generate (development)
make db-migrate        # prisma migrate deploy (production)
make db-studio         # prisma studio
make db-pull           # introspect an existing database
```

> **These three destroy data.** `make db-push` runs `prisma db push --force-reset`, `make db-drop`
> runs `prisma migrate reset --force`, and `make fresh` chains both before seeding. Know which
> database your `.env` points at before running any of them.

ClickHouse is optional: `bun run db:clickhouse:migrate` and `bun run db:clickhouse:status`.

### Cluster mode

`src/index.ts` forks worker processes when `APP_CLUSTER_MODE=true` (count from
`APP_CLUSTER_WORKERS`, or `os.availableParallelism()` when `0`). This changes how the app boots, so
keep it in mind when debugging:

- Every worker re-runs `bootstrap()` and creates its own Prisma, Redis, and BullMQ clients.
  Side-effectful module loads — including `@bull` workers — fire **once per worker**. Gate
  single-instance work on `cluster.worker?.id === 1` or move queue workers to their own process.
- In-memory state is not shared across workers. Anything cross-worker must go through Redis.
- Only workers bind the port; the primary does not. Point health checks at a worker.

## Coding standards

The full set is in `.claude/rules/`. The parts that come up most:

- **Style** — tabs, double quotes, semicolons, unix linebreaks (Prettier-enforced). Imports are
  sorted by `eslint-plugin-simple-import-sort`; run `bun run lint:fix` rather than hand-sorting.
- **Types** — `strict` is on, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. No
  `any` — use `unknown` and narrow. Prefix intentionally-unused params with `_`.
- **Modules** — one feature per folder, exactly `index.ts` (routes) / `schema.ts` (TypeBox) /
  `service.ts` (plain-object business logic). Never a class. See `rules/modules.md`.
- **Repositories** — factory functions taking an optional `Prisma.TransactionClient`, explicit
  `select`, allow-listed sort and filter keys. See `rules/repositories.md`.
- **Shared code** — if two modules need it, it moves to `src/libs/<bucket>/` and is imported through
  its alias. A module may never import from another module. See `rules/shared-code.md`.
- **Path aliases** — `@base @bull @cache @config @database @default @errors @guards @mailer
@plugins @repositories @types @utils @modules @prisma-generated`. Relative imports only within the
  same module.
- **Errors** — throw `BadRequestError` / `UnauthorizedError` / `NotFoundError` / `ForbiddenError`
  from `@errors`; `ErrorHandlerPlugin` maps them to responses. Never build an error response by hand.
- **Responses** — always `ResponseToolkit.success/created/paginated`, and wrap route response
  schemas with `commonResponse(...)` listing the status codes the route can actually return.
- **Logging** — never `console.*`; use the structured `log` from `@utils` (object first, message
  second). Never log passwords or tokens.
- **Env** — add new variables to `src/libs/config/env.config.ts`, the matching config object, and
  `.env.example`, then read them through `@config`.

## Adding a feature module

1. Create `src/modules/<name>/{index.ts,schema.ts,service.ts}`.
2. Build a named instance: `new Elysia({ name: "<name>-module", prefix: "/<name>", detail: { tags: [...] } }).use(baseApp)`, then `.use(AuthPlugin)` above the routes that need a logged-in user.
3. Register it in `src/modules/index.ts` so `bootstraps` picks it up.
4. If the service needs DI resolution, register it in `src/bootstrap.ts` (see `rules/di.md`).
5. New repositories go in `src/libs/database/postgres/repositories/` and must be re-exported from
   `src/libs/repositories/index.ts`.

## Database changes

Edit `prisma/schema.prisma`, then:

```bash
make db-migrate-dev
```

Never hand-edit a migration under `prisma/migrations/` that has already been applied. Review every
generated migration for destructive operations before committing it, and commit the migration
alongside the schema change.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), lowercase after the colon, imperative
mood, under 72 characters, no trailing period:

```
feat(auth): add refresh token rotation
fix(users): filter soft-deleted rows from the list query
docs: document cluster mode caveats
chore: bump elysia to 1.5
db(rbac): add composite index on role_permissions
```

> **The `pre-commit` hook does more than lint.** `.husky/pre-commit` runs `bun install`,
> `bun run format`, `bun run lint:fix`, `prisma validate`, `prisma format`, **`prisma migrate dev`**,
> `prisma generate`, `bun run tsc --noEmit`, and `bun run build`. The `prisma migrate dev` step
> **mutates the database in your `.env`** and can prompt or reset. Know what `DATABASE_URL` points at
> before committing. If you have already run format, lint, typecheck, and build yourself,
> `git commit --no-verify` is reasonable.

## Pull requests

1. Branch off `main`.
2. Keep the PR focused — one concern per PR.
3. Fill in the pull request template, including the checklist.
4. Make sure `bun run format:check`, `bun run lint`, `bun run typecheck`, and `bun run build` pass.
5. Update the docs your change affects **in the same PR** — `README.md`, `CLAUDE.md`, the relevant
   `.claude/rules/` file, `docs/CONFIGURATION.md` for new env vars, and both i18n catalogues for new
   user-facing strings.

> **No test runner is configured.** `bun run test` exits with an error. Do not claim test results;
> say what you exercised manually instead. Adding a test setup would be a welcome contribution.

## Reporting bugs and requesting features

Use the issue templates. Security vulnerabilities go through [SECURITY.md](SECURITY.md) — never a
public issue.

## License

By contributing, you agree that your contributions are licensed under the MIT License that covers
this repository.
