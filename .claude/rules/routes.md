# Route Structure & the Live Route Map

## Convention: flat, resource-named, composed by prefix

There is no global prefix and no URL versioning. A route's full path is the concatenation of the
`prefix` on each Elysia instance it passes through: `SettingsModule` (`/settings`) composes
`RolesModule` (`/roles`), so the list route is `GET /settings/roles`.

Resource segments are plural and kebab-case, and the module folder matches
(`src/modules/settings/roles/` → `/roles`). The one exception is `select-option`, whose folder and
prefix are both singular.

Access is enforced by the per-route `beforeHandle`, never by the path. `/settings/**` is not a
security boundary. See [rbac.md](./rbac.md).

## Method conventions

| Operation | Verb + path | Body status |
| --------- | ----------- | ----------- |
| list      | `GET /<resource>/` | 200 |
| create    | `POST /<resource>/` | 201 |
| detail    | `GET /<resource>/:id` | 200 |
| update    | `PATCH /<resource>/:id` | 200 |
| delete    | `DELETE /<resource>/:id` | 200 |

**Use `PATCH`, never `PUT`.** A sub-resource action gets a trailing segment on the id —
`PATCH /settings/users/:id/sync-roles` — and keeps the parent resource's permission unless it grants
privilege, in which case it is gated on `RoleGuard(["superuser"])` (see [rbac.md](./rbac.md)).

Collection routes pass `"/"` as the path in this repo, not `""`. Match the local convention.

## Current route map

Guard column is the `beforeHandle` contents. "—" means no guard: legitimate only for public routes
and for routes that act on the caller's own identity.

```
# Home (src/modules/home, prefix /) — tags ["General"], baseApp
GET    /                                             —   public

# Health (src/modules/health, prefix /health) — tags ["General"], baseApp
GET    /health                                       —   public

# Auth (src/modules/auth, prefix /auth) — tags ["Auth"], baseApp + jwtPlugin
POST   /auth/login                                   —   public
POST   /auth/register                                —   public
POST   /auth/verify-email                            —   public
POST   /auth/resend-verification                     —   public
POST   /auth/forgot-password                         —   public
POST   /auth/reset-password                          —   public
                                        .use(AuthPlugin) from here down
GET    /auth/me                                      —   own identity

# Settings / Users (prefix /settings/users) — tags ["Settings - Users"], AuthPlugin
GET    /settings/users/                              PermissionGuard ["user list"]
POST   /settings/users/                              PermissionGuard ["user create"]
GET    /settings/users/:id                           PermissionGuard ["user detail"]
PATCH  /settings/users/:id                           PermissionGuard ["user edit"]
DELETE /settings/users/:id                           PermissionGuard ["user delete"]
PATCH  /settings/users/:id/sync-roles                RoleGuard ["superuser"]
PATCH  /settings/users/:id/reset-password            RoleGuard ["superuser"]
POST   /settings/users/:id/send-email-verification   PermissionGuard ["user create"]
POST   /settings/users/:id/send-password-reset       PermissionGuard ["user create"]

# Settings / Roles (prefix /settings/roles) — tags ["Settings - Roles"], AuthPlugin
GET    /settings/roles/                              PermissionGuard ["role list"]
POST   /settings/roles/                              PermissionGuard ["role create"]
GET    /settings/roles/:id                           PermissionGuard ["role detail"]
PATCH  /settings/roles/:id                           PermissionGuard ["role edit"]
DELETE /settings/roles/:id                           PermissionGuard ["role delete"]
PATCH  /settings/roles/:id/sync-permissions          RoleGuard ["superuser"]

# Settings / Permissions (prefix /settings/permissions) — tags ["Settings - Permissions"], AuthPlugin
GET    /settings/permissions/                        PermissionGuard ["permission list"]
POST   /settings/permissions/                        PermissionGuard ["permission create"]
GET    /settings/permissions/:id                     PermissionGuard ["permission detail"]
PATCH  /settings/permissions/:id                     PermissionGuard ["permission edit"]
DELETE /settings/permissions/:id                     PermissionGuard ["permission delete"]

# Settings / Select Options (prefix /settings/select-option) — tags ["Settings - Select Options"], AuthPlugin
GET    /settings/select-option/permissions           PermissionGuard ["permission list"]
GET    /settings/select-option/roles                 PermissionGuard ["role list"]
```

That is **22 guarded routes** under `/settings`. Every one needs its guard — an ungated route here is
reachable by any authenticated user. See [rbac.md](./rbac.md).

**Keep this map current.** Adding, renaming, or re-gating a route updates this table in the same
change — that is [documentation.md](./documentation.md).

## Known gaps in the current map

- **The `auth` module does not set `security: []`.** Its six public POST routes therefore inherit the
  global `bearerAuth` requirement that `DocsPlugin` declares, so `/docs` shows a lock on endpoints
  that take no token. The sibling `clean-elysia` sets `security: []` on its auth module. Cosmetic, but
  it misleads a consumer reading the spec.
- `select-option` gates its two routes on `permission list` / `role list`, while the sibling
  `clean-elysia` gates the same two on `RoleGuard(["superuser"])`. Both are defensible; the difference
  is unexplained. Do not "align" it without deciding which is intended.

## OpenAPI tagging

Tags mirror the module path with ` - ` as the separator: `Settings - Users`, `Settings - Roles`,
`Settings - Permissions`, `Settings - Select Options`; top-level modules get a single word (`Auth`,
`General`). Note this differs from the sibling repo, which uses `Settings/Users` — stay consistent
*within* this repo. Tags are set once per module in `new Elysia({ detail: { tags } })` and inherited by
every child route; do not repeat them per route.

`SettingsModule` itself declares no tags, only a `prefix` and `name` — it composes children and
carries no routes of its own. See [openapi.md](./openapi.md).

## Registering a route

1. Define it in the module's `index.ts` (see [handlers.md](./handlers.md)).
2. Make sure the module is composed into its parent: nested → `src/modules/settings/index.ts`;
   top-level → `src/modules/index.ts` (`bootstraps.use(<Name>Module)`).
3. Add it to the map above, with its guard.
