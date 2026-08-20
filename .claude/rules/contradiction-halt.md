# Contradiction Halt Rule

Applies to **every** change in this repo, regardless of path.

## Principle: the request can be wrong — surface it, don't silently "fix" it

The user (or a task, plan, or ticket) may ask for something that contradicts these rules, the
established architecture, or that would introduce a bug. **The user may be wrong, and that is
expected.** When you detect such a contradiction, **stop and tell the user, and do nothing else about
it** until they decide.

This applies whether the contradiction is with:

- a rule in `.claude/rules/*.md` or `CLAUDE.md`,
- the documented architecture or an existing pattern in the codebase,
- a latent bug the requested change would create or depend on, or
- a security / access-control invariant — `AuthPlugin` placement (public routes above it, protected
  routes below), `PermissionGuard` / `RoleGuard` coverage, password hashing, JWT lifetimes,
  the repository sort/filter allowlists, or explicit `select` shapes that keep hashes out of
  responses.

## What "do nothing" means

- **Do not implement the contradicting change**, not even a best-guess partial version.
- **Do not silently work around it** or quietly pick a different approach without saying so.
- **Do not fix the contradicting bug on your own initiative** as part of an unrelated task — report
  it and wait.

## What to do instead

1. State the contradiction plainly: what was requested, which rule / pattern / invariant it conflicts
   with (cite the rule file or `file:line`), and the concrete consequence — bug, data leak, broken
   contract, inconsistency.
2. If you have a compliant alternative, offer it as a recommendation — but still let the user choose.
3. Proceed once the user confirms. If they confirm the original request knowing the trade-off, that
   is their call to make, and you implement it in full.

## Scope

- This is a **halt-and-report** rule, not permission to refuse work. Once the user acknowledges the
  contradiction and decides, follow their decision.
- It does **not** apply to trivial style nits you can just conform to — match the surrounding code
  and move on. It applies to genuine contradictions with rules, architecture, security, or
  correctness.
- It does not license scope creep in the other direction either: noticing an unrelated defect means
  *reporting* it, not fixing it inside the current change.

## Known contradictions already on record

These are verified facts about this repository as it stands, not aspirations. Do not build on any of
them, and do not "fix" one as a side effect of unrelated work — raise it first.

- **~~RBAC is defined but never enforced.~~ ✅ RESOLVED 2026-08-20.** Every one of the 22 routes under
  `src/modules/settings/` now carries a `beforeHandle` calling `PermissionGuard.canActivate` (or
  `RoleGuard.canActivate` for the three privilege-granting routes). Kept on record because the
  *shape* of the mistake matters: `AuthPlugin` establishes identity only, and a route that composes
  `.use(AuthPlugin)` without a `beforeHandle` is unauthorized-by-default rather than
  denied-by-default. **Any new route must add its own guard** — nothing enforces this automatically.
  The three sensitive routes (`users/:id/sync-roles`, `users/:id/reset-password`,
  `roles/:id/sync-permissions`) are gated by `RoleGuard(["superuser"])` rather than a permission,
  matching how both sibling templates treat password reset.
- **Seeded permission names are space-separated, not `entity:action`.**
  `prisma/seed/permission.seed.ts` generates `` `${group} ${permission}` `` over
  groups `user`, `role`, `permission` and actions `list`, `create`, `detail`, `edit`, `delete` —
  i.e. `"user list"`, `"role create"`, `"permission delete"`. `UserRepository().userInformation()`
  flattens those same `Permission.name` strings into `UserInformation.permissions`, so a guard call
  would have to be written `PermissionGuard.canActivate(user, ["user create"])`. Do not introduce
  colon-form strings without deciding (and migrating) the whole catalog.
- **~~There is no soft delete anywhere.~~ ✅ RESOLVED 2026-08-20.** `User` now carries `deletedAt`
  and `UserService.delete` stamps it instead of issuing a `DELETE`; all four read paths in
  `user.repository.ts` filter `deletedAt: null`. Kept on record because the *shape* matters: soft
  delete is only as good as its least-filtered read, and the one that matters most is
  `userInformation()`, which `AuthPlugin` resolves the caller's roles and permissions through — an
  unfiltered read there would leave a deleted user fully authenticated. `Role`, `Permission`, and the
  join tables are **still hard-deleted**; do not assume otherwise. Note `User.email` deliberately lost
  its `@unique` so a deleted user's address is reusable — uniqueness among live users is a service
  check only.

- **~~`UserStatus` is missing a `SUSPENDED` value.~~ ✅ RESOLVED 2026-08-20.** The enum now carries
  four members, matching the sibling templates.

- **There are no tests and no test runner.** `package.json` defines
  `"test": "echo \"Error: no test specified\" && exit 1"`, and the repo contains zero `*.test.ts` /
  `*.spec.ts` files. None of the invariants in these rules has a regression test. Never report test
  results without first setting a runner up and saying that you did.
- **~~There is no deployment configuration.~~ ✅ RESOLVED 2026-08-20.** The `Makefile` now carries the
  nine `docker-*` targets and an `ecosystem.config.cjs` exists; `docs/DEPLOYMENT.md` documents both
  paths. Two things to know before using them:
  - **PM2 runs `instances: 1`, not `"max"`.** The sibling `clean-elysia` scales by SO_REUSEPORT, but
    this repo has no `APP_REUSE_PORT` — `src/server.ts` calls `.listen(AppConfig.APP_PORT)` plainly,
    so a second instance would fail to bind. The ecosystem file documents the three-file change needed
    to enable it. `APP_CLUSTER_MODE=false` is set in both env blocks so the in-process clustering in
    `src/index.ts` does not fight PM2 for the socket.
  - **The Docker image could not previously have run.** Fixed alongside: the `app` service in
    `docker-compose.yml` was entirely commented out, and the `Dockerfile` ran `bun install
    --production` (which drops `prisma`, a devDependency, so neither the CLI nor a generated client
    existed in the image) with no `prisma generate` step. A `.dockerignore` was added too, since
    `COPY . .` was copying host `node_modules` and `prisma/generated` — macOS/arm Prisma engines —
    into an Alpine image.
