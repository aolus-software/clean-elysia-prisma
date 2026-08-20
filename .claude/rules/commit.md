# Commits — Conventional, Hook-Gated

## Message format

Conventional Commits. The prefixes in use in this repo's history are `feat`, `fix`, `chore`, `refactor`, `docs`, `remove`, `test`. The summary is lowercase after the colon, imperative mood, under 72 characters, no trailing period.

```
feat: translate auth service messages through the i18n catalog
fix: expire reset tokens before issuing a new one
chore: regenerate prisma client after schema change
```

The full workflow — gathering context, staging, writing the body — lives in [`../commands/commit.md`](../commands/commit.md). It is the authority; this rule does not duplicate its type table or its steps.

## The pre-commit hook

`.husky/pre-commit` is a Husky hook, and it is heavier than a typical lint-staged hook. It runs, in order:

```
bun install
bun run format
bun run lint:fix
bunx --bun prisma validate
bunx --bun prisma format
bunx --bun prisma migrate dev
bunx --bun prisma generate
bun run tsc --noEmit
bun run build
```

**It touches the database and the migration folder.** `prisma migrate dev` runs against whatever `DATABASE_URL` points at, creates migration files non-interactively, and on schema drift will offer to **reset the database** — at a point where nobody is reading the output. `prisma format` also rewrites `prisma/schema.prisma` in place. Check `git status` after the hook and stage or discard what it produced deliberately.

**It is slow.** `bun install` plus a full `tsc --noEmit` plus `bun run build` on every commit. If you have already run `format`, `lint`, and `typecheck` in this session and they passed clean, `--no-verify` is defensible; otherwise let it run, and if it fails, fix the cause, re-stage, and make a **new** commit rather than `--amend`ing over a failed hook.

## Before you commit

If you are skipping the hook, you owe it these three manually — the hook's own checks, minus the destructive ones:

```
bun run format:check
bun run lint
bun run typecheck
```

## Rules

1. **It is not lint-staged.** There is no `lint-staged` key in `package.json` and no `lint-staged` dependency. The hook runs the scripts against the **whole tree**, not your staged files — so `format` and `lint:fix` will rewrite files you did not stage. Check `git status` after it runs.
2. **It mutates the schema and the database.** `prisma format` rewrites `prisma/schema.prisma`; `prisma migrate dev` can create a migration under `prisma/migrations/` and applies it to whatever `DATABASE_URL` points at; `prisma generate` rewrites `prisma/generated/`. Review what the hook produced and stage it deliberately. An accidental empty migration committed alongside an unrelated change is the classic mess here.
3. **`--no-verify` has exactly one licence.** [`../commands/commit.md`](../commands/commit.md) permits it when `format`, `lint`, and `build` have already been run in this session with no error or warning. Otherwise let the hook run.
4. **If the hook fails, fix the cause and make a new commit.** Never `--amend` over a failed hook.
5. **If you skip the hook, run its non-destructive checks yourself:**
   ```
   bun run format:check
   bun run lint
   bun run typecheck
   ```
6. **Stage by explicit path.** `git add -A` and `git add .` are forbidden — the hook generates files, and blanket staging picks them up silently.
7. **A migration belongs to the schema change that needed it.** Don't carry one along in an unrelated commit, and don't hand-edit an applied migration.

## Never commit

- `.env` or any `.env.*.local`. They are gitignored; don't `git add -f` them.
- Secrets, keys, tokens, or a real `DATABASE_URL` / SMTP credential in a config default, a seed, or a fixture.
- `node_modules/`, `dist/`, the compiled `server` binary.
- `prisma/generated/` — the generated Prisma client. It is gitignored and ESLint-ignored; it is regenerated, never reviewed.
- A hand-edited `src/libs/i18n/locales/keys.generated.ts`. Regenerate with `bun run i18n:keys` and commit the output — see [i18n.md](./i18n.md).
- Migration noise the hook produced as a side effect of something else.
- Formatting churn in files the change did not otherwise touch. If `bun run format` rewrote half the tree, that is its own `chore:` commit.
