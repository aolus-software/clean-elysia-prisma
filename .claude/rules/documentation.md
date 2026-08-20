# Documentation Upkeep Rule

Applies to **every** change in this repo, regardless of path.

## Principle: docs are part of the change, not an afterthought

When a change makes a documentation file wrong, fixing that doc belongs to the **same change** — not
a follow-up, not "later". Code and docs move together so the repository never carries documentation
that contradicts the code.

This is not a mandate to rewrite docs on every commit. It is: **if you changed something a doc
describes, update that doc in the same change.** If nothing a doc covers changed, leave it alone.

## Docs that must stay in sync

| Doc | Update it when… |
|---|---|
| `README.md` | setup steps, scripts, env vars, the project structure listing, or the high-level architecture change |
| `CLAUDE.md` | a path alias, the layer structure, an entry point (`src/index.ts` / `src/server.ts` / `src/base.ts` / `src/bootstrap.ts`), a "key pattern", or a new module changes |
| `Makefile` | a canonical command is added, renamed, or removed — its `help` target lists every command by hand, and `CLAUDE.md` + `README.md` both quote the list, so all three move together |
| `.env.example` | a new env var is read — it must appear here **and** in `src/libs/config/env.config.ts`, and `docs/CONFIGURATION.md` documents it |
| `src/libs/config/env.config.ts` | a new env var is read — it is validated by `cleanEnv` there or nowhere. Never read `process.env` directly outside this file |
| `prisma/schema.prisma` + `prisma/migrations/` | a model, field, enum, or relation changes — run `make db-migrate-dev` to generate the migration and regenerate the client; never hand-edit an already-applied migration |
| `prisma/seed/*.seed.ts` | the permission catalog, seeded roles, or the bootstrap user change — the seed is the ground truth a guard call would be written against |
| `docs/API_DOCUMENTATION.md` | a route is added, renamed, or its request/response shape changes |
| `docs/CONFIGURATION.md` | an env var is added, renamed, defaulted differently, or removed |
| `docs/ERROR_HANDLING.md` | an error class in `@errors` or a branch of `ErrorHandlerPlugin` changes — the wire format is a public contract |
| `docs/PLUGINS.md` | a plugin is added to `src/libs/plugins/`, or the `baseApp` composition order changes |
| `docs/SECURITY.md` | auth, RBAC, rate limiting, CORS/Helmet, or password rules change |
| `docs/README.md` | a file is added to or removed from `docs/` — it is the index |
| `src/libs/i18n/locales/{en,id}.json` | a user-facing string is added — **both catalogues, in the same change**, then re-run `bun run i18n:keys` so `locales/keys.generated.ts` matches |
| `.claude/rules/*.md` | a coded convention changes, or a new pattern ships with no rule yet — write one |
| `.claude/rules/README.md` | a rule file is added, renamed, or removed — it is the index, and an unlisted rule is an unread rule |
| `.claude/commands/*.md` | a command's workflow or scope changes |

## What "up to date" means

- **Exact facts.** Path aliases, route paths, model and field names, env var names, permission
  strings, Makefile targets, and script names must match reality. A stale env var name or a renamed
  helper is a documentation bug, not a nitpick.
- **No orphan references.** If you rename, move, or delete a file, function, permission, alias, or
  rule, update every doc that names it. Do not leave pointers to things that no longer exist.
- **New surfaces get rules, not just code.** A new plugin, guard, queue worker, external integration,
  or module that establishes a pattern needs its rule written (and indexed in
  `.claude/rules/README.md`), not just its implementation.
- **OpenAPI is documentation.** A new route needs `detail.summary`, `detail.description`, a
  `response:` built with `commonResponse(...)` listing the codes it can actually return, the right
  module `detail.tags`, and `security: [{ bearerAuth: [] }]` when it sits below `AuthPlugin`. An
  endpoint that works but renders wrong in `/docs` is an incomplete change. See
  [openapi.md](./openapi.md) and [validation.md](./validation.md).
- **Comment density stays as-is.** A comment explains *why* when the why is non-obvious — never
  line-by-line narration of the code. See [imports-and-naming.md](./imports-and-naming.md).

## When a doc is wrong but the current task didn't cause it

Per [contradiction-halt.md](./contradiction-halt.md), if you notice a doc contradicting the code but
fixing it falls outside the requested task, **report it to the user** — do not silently rewrite
unrelated docs. The "update in the same change" duty covers the docs your own change affects.
