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
- **There is no soft delete anywhere in this repo.** `prisma/schema.prisma` declares no `deletedAt`
  (or `deleted_at`) field on any model, and no `deletedAt` appears in `src/`. Deletes are hard:
  `src/modules/settings/users/service.ts:128` calls `prisma.user.delete(...)`, and the role and
  permission repositories do the same (`role.repository.ts:238`, `permission.repository.ts:247`).
  This diverges from the sibling templates in this family, which all soft-delete `User`. Nothing here
  filters `deletedAt: null`, and it would be a bug to write code that assumes it does.
- **`UserStatus` is missing a `SUSPENDED` value.** The enum in `prisma/schema.prisma:16` has three
  members — `ACTIVE`, `INACTIVE`, `BLOCKED` — where the sibling templates carry four. Any state
  machine or UI copied from a sibling will reference a value this schema does not have.
- **There are no tests and no test runner.** `package.json` defines
  `"test": "echo \"Error: no test specified\" && exit 1"`, and the repo contains zero `*.test.ts` /
  `*.spec.ts` files. None of the invariants in these rules has a regression test. Never report test
  results without first setting a runner up and saying that you did.
- **There is no deployment configuration.** No `ecosystem.config.*` (PM2) exists, and the `Makefile`
  has no Docker or PM2 targets — its full target list is `help`, `install`, `dev`, `build`, `start`,
  `lint`, `lint-fix`, `format`, `typecheck`, the `db-*` targets, `fresh`, and `reset`. A `Dockerfile`
  and `docker-compose.yml` do exist at the repo root but are not wired into any canonical command,
  so "the deploy command" does not exist to be updated.
