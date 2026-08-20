# Prisma Schema (`prisma/schema.prisma`)

The schema is the source of truth for the database. One file holds every model; the generated client
lands in `prisma/generated` (`generator client { output = "./generated" }`) and is reached through the
`@prisma-generated` alias.

## Naming conventions

- Models are **PascalCase singular**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`,
  `UserEmailVerification`, `PasswordReset`.
- Fields are **camelCase**: `emailVerifiedAt`, `createdAt`, `updatedAt`, `userId`.
- Enums are PascalCase with SCREAMING_CASE members: `UserStatus { ACTIVE INACTIVE BLOCKED }`.
- No `@@map` / `@map` is used, so table and column names in Postgres match the model and field names
  exactly. Keep it that way — introducing `@map` on one model only would make the SQL half-translated.

Note this differs from the Drizzle sibling on every count (snake_case tables and columns, lowercase
plural exports). Do not port names across; port intent.

## Standard fields

```prisma
model Role {
  id        String   @id @default(uuid())
  name      String   @unique @db.VarChar(255)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userRoles       UserRole[]
  rolePermissions RolePermission[]
}
```

- Primary key: `String @id @default(uuid())`.
- Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`. The
  `@updatedAt` attribute is what keeps the column current — a model without it silently never updates.
- Strings that map to a bounded column carry `@db.VarChar(255)`. A bare `String` becomes `text`; be
  deliberate about which you want.
- Uniqueness is declared on the field (`@unique`), not enforced in code. The service still checks it
  first so the client gets a field-mapped `BadRequestError` instead of a raw constraint violation —
  see [services-crud.md](./services-crud.md).

## Join tables use composite primary keys

```prisma
model UserRole {
  userId    String
  roleId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}
```

`UserRole` and `RolePermission` both use `@@id([...])` with no surrogate `id`. This is a deliberate
modelling choice — the pair *is* the identity. Follow it for new join tables rather than adding an
`id` column.

## Relations and cascade

Every relation currently reads `@relation(fields: [userId], references: [id])` with **no
`onDelete`**, so Prisma's default applies. Two things follow:

- Because there is no soft delete (below), deleting a `User` that has verification tokens, password
  resets, or role assignments will fail or cascade depending on the relation's default — check before
  adding a delete path to a new model.
- When a child row has no meaning without its parent, say so explicitly:
  `@relation(fields: [userId], references: [id], onDelete: Cascade)`.

## Known schema gaps — do not treat these as the template

Three things are missing here that the three sibling repos all have. They are recorded rather than
silently copied forward; each is a migration, so fixing one is a deliberate change, not a drive-by.

1. **No soft delete anywhere.** `deletedAt` does not appear in this file. Every delete is a hard
   `DELETE`, reads have no `deletedAt` filter, and the audit trail is gone. The other three repos all
   soft-delete users.
2. **`UserStatus` is missing `SUSPENDED`.** It has `ACTIVE`, `INACTIVE`, `BLOCKED` where the siblings
   have four values. Code or seed data ported from another repo that references `SUSPENDED` will fail
   at the type level.
3. **Token tables have no `usedAt` and no unique index on `token`.** `UserEmailVerification` and
   `PasswordReset` both carry `expiresAt` (good — and the service does check it), but single-use is
   enforced by deleting the row after consumption. That works, and it loses the audit trail, and a
   failed delete leaves the token live.

For a **new** token table: include `expiresAt`, a `@unique` on `token`, and prefer a `usedAt` stamp
over deletion. For a new soft-deletable entity, raise the inconsistency rather than adding a lone
`deletedAt` to one model — see [contradiction-halt.md](./contradiction-halt.md).

## Enums are shared with TypeBox

A Prisma enum is the single source of truth for its values. TypeBox schemas import it rather than
restating the members:

```ts
import { UserStatus } from "@prisma-generated";

status: t.Enum(UserStatus);
```

A hand-written `t.UnionEnum(["ACTIVE", "INACTIVE"])` drifts the moment the enum changes. Adding a
value means a migration, because Postgres enums are real types. See [validation.md](./validation.md).

## Migrations

```
make db-migrate-dev   # prisma migrate dev + generate — the normal development loop
make db-migrate       # prisma migrate deploy — applies pending migrations, for deploys
make db-generate      # prisma generate only
make reset            # db-generate + db-migrate + db-seed
```

Two targets are destructive and their names do not say so:

- `make db-push` runs `prisma db push --force-reset` — it **drops and recreates** the schema with no
  migration file.
- `make db-drop` runs `prisma migrate reset --force`.
- `make fresh` is `db-drop` → `db-push` → `db-seed`, so it resets the database **twice**.

Never run any of the three against a shared database.

Rules for migration files under `prisma/migrations/`:

- Review the generated SQL before applying — look for dropped columns, narrowed types, lost data.
- Never hand-edit a migration that has already been applied. Add a new one.
- `prisma/migrations/migration_lock.toml` is committed; do not delete it to "start clean".

## Seeds

`prisma/seed/` holds `index.ts`, `permission.seed.ts`, `role.seed.ts`, `user.seed.ts`, run by
`make db-seed`. `permission.seed.ts` generates the entire RBAC catalogue as `<group> <action>`, and
every guard string in the app must match one of the names it produces — see [rbac.md](./rbac.md).
Changing the catalogue means checking every `beforeHandle` in the same change.

## Don't

- Don't add a model without its inverse relation field on the other side — Prisma will not validate.
- Don't add an enum value without generating a migration.
- Don't introduce `@map` / `@@map` on a single model.
- Don't add a `deletedAt` to one model in isolation; soft delete is all-or-nothing per entity and
  needs the read paths changed with it.
- Don't add a token table without `expiresAt`.
