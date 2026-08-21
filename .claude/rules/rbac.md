# Authorization (RBAC)

Authentication and authorization are two separate steps. `AuthPlugin` proves **who** the caller is. A
guard in `beforeHandle` decides **what** they may do. A route that has the first and not the second is
authenticated but unauthorized — every logged-in user can call it.

This is not hypothetical. A module that composes `.use(baseApp).use(AuthPlugin)` and declares routes
with no `beforeHandle` lets any self-registered user delete the superuser, grant themselves any role,
or reset any account's password. All 22 routes under `src/modules/settings/` are gated — but nothing
prevents the next route from reintroducing the hole, because there is no framework-level default that
rejects an ungated route. That is what this rule is for.

## The two guards

Both live in `src/libs/guards/` and are exported from `@guards`. Both are classes with a single
**static** method, and both **throw** `ForbiddenError` (403) rather than returning `false`:

```ts
PermissionGuard.canActivate(user, ["user list"]);   // requires every listed permission
RoleGuard.canActivate(user, ["superuser"]);         // requires every listed role
```

## Rules

1. **Guards go in `beforeHandle`, never in the handler body.**

   ```ts
   .get(
   	"/",
   	async ({ query, request }) => { /* ... */ },
   	{
   		beforeHandle: ({ user }) => {
   			PermissionGuard.canActivate(user, ["role list"]);
   		},
   		query: RoleQuerySchema,
   		detail: { summary: "List roles", description: "... Requires 'role list' permission." },
   		response: RoleListResponseSchema,
   	},
   )
   ```

   `beforeHandle` short-circuits before the handler runs, so a 403 costs no query. A check inside the
   handler runs after work has started and is trivially lost to copy-paste.

2. **`user` comes from the context, supplied by `AuthPlugin`.** It is `UserInformation`, carrying
   `roles: string[]` and `permissions: string[]`. A route with a guard but no `AuthPlugin` above it
   has no `user` to check.

3. **Both guards bypass for `superuser`.** If `user.roles` includes `"superuser"` they return `true`
   before checking anything. Do not add your own superuser branch.

4. **A multi-element array means AND, not OR.** Both guards use `.every(...)`. There is no OR
   variant — needing one means the permission catalogue is modelled wrong, not that you should
   hand-roll a check.

5. **Permission names come from the seed.** `prisma/seed/permission.seed.ts` builds the entire
   catalogue as `` `${group} ${permission}` `` over groups `user`, `role`, `permission` and actions
   `list`, `create`, `detail`, `edit`, `delete`. That is **15 permissions and no others**, and they are
   **space-separated** — `"user list"`, never `user:list`. Seeded roles are `superuser` and `admin`
   (`prisma/seed/role.seed.ts`).

   A guard naming a string the seed does not produce fails closed: nobody can hold it, so every
   non-superuser gets a 403 on a route that looks correctly gated. Grep the seed before inventing a
   name. If a route genuinely needs a 16th permission, extend the seed in the same change.

6. **Privilege-granting routes are gated on the role, not a permission.** Three routes use
   `RoleGuard.canActivate(user, ["superuser"])`:

   | Route | Why |
   | ----- | --- |
   | `PATCH /settings/users/:id/sync-roles` | grants roles |
   | `PATCH /settings/users/:id/reset-password` | account takeover |
   | `PATCH /settings/roles/:id/sync-permissions` | grants permissions |

   Gating these on `user edit` / `role edit` would let anyone holding an edit permission grant
   themselves superuser — the same escalation in a different costume. Both sibling repos gate password
   reset the same way.

7. **`403` must be in the response schema.** A guarded route can return 403, so `403` belongs in its
   `commonResponse(..., { include: [...] })`. A route with no guard must not list it — the spec would
   advertise a status nothing can produce.

8. **The URL prefix is not a security boundary.** `/settings/**` grants nothing and protects nothing;
   only the per-route `beforeHandle` does. Guards are per-route — putting one on the module-level
   Elysia instance does not cover its children.

9. **Never soften a `ForbiddenError`.** Do not catch it and return an empty list or a 200. A caller
   who may not read something gets a 403.

## Checklist for a new protected route

- [ ] The module chains `.use(AuthPlugin)` above this route.
- [ ] The route has a `beforeHandle` calling `PermissionGuard` or `RoleGuard`.
- [ ] Every permission string it names exists in `prisma/seed/permission.seed.ts`.
- [ ] Privilege-granting or account-takeover routes use `RoleGuard(["superuser"])`.
- [ ] `403` (and `401`) are in the `include` array.
- [ ] The `detail.description` states the requirement in words.
- [ ] The route is added to the map in [routes.md](./routes.md).
