# Prisma Schema (`prisma/schema.prisma`)

The schema is the source of truth for the database. One file holds every model; the generated client
lands in `prisma/generated` (`generator client { output = "./generated" }`) and is reached through the
`@prisma-generated` alias.

## Naming conventions

- Models are **PascalCase singular**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`,
  `UserEmailVerification`, `PasswordReset`.
- Fields are **camelCase**: `emailVerifiedAt`, `createdAt`, `updatedAt`, `userId`.
- Enums are PascalCase with SCREAMING_CASE members: `UserStatus { ACTIVE INACTIVE SUSPENDED BLOCKED }`.
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
- Uniqueness is declared on the field (`@unique`) **except on `User.email`**, where soft delete makes
  the address reusable — see below. The service checks uniqueness first either way, so the client gets
  a field-mapped `BadRequestError` rather than a raw constraint violation — see
  [services-crud.md](./services-crud.md).

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

- `User` is soft-deleted (below), so its children are never orphaned by the normal delete path. Every
  other model is hard-deleted, and deleting one that other tables reference will fail or cascade
  depending on the relation's default — check before adding a delete path to a new model.
- When a child row has no meaning without its parent, say so explicitly:
  `@relation(fields: [userId], references: [id], onDelete: Cascade)`.

## Soft delete

`User` carries `deletedAt DateTime?`. It is the
**only** soft-deletable model — `Role`, `Permission`, and the join tables are still hard-deleted.

Two things follow, and both are load-bearing:

- **Every read of `User` filters `deletedAt: null`.** All four read paths in `user.repository.ts` do
  (`findAll`, `findOne`, `findByMail`, `userInformation`). `userInformation` is the one that matters
  most: `AuthPlugin` resolves the caller's roles and permissions through it, so a missed filter there
  would leave a deleted user fully authenticated.
- **`email` deliberately has no `@unique`.** A soft-deleted user's address has to be reusable, and a
  database-level unique constraint would reject the reuse with a raw `P2002` *after* the service's
  own check has already passed. Uniqueness among live users is enforced in the service; the schema
  carries plain `@@index([email])` and `@@index([deletedAt])`. Both sibling repos resolve it the same
  way. The trade-off is real: nothing at the database level stops two live users sharing an address
  if the service check is skipped or races.

Adding soft delete to another model means adding the column **and** auditing every read of it in the
same change. A `deletedAt` with unfiltered reads is worse than no soft delete at all, because the row
looks gone in one place and is present in another.

## Token tables — expiry, single use, and a unique token

`UserEmailVerification` and `PasswordReset` are the template. Each carries `token` with `@unique`,
`expiresAt`, and `usedAt`, plus `@@index([userId, usedAt])`:

```prisma
token     String    @unique @db.VarChar(255)
expiresAt DateTime
usedAt    DateTime?
// ...
@@index([userId, usedAt], name: "idx_<table>_user_used")
```

**Single use is a stamp, not a delete.** `AuthService.verifyEmail` and `AuthService.resetPassword`
each check `record.usedAt !== null` and reject a spent token with the same message a bad token gets,
then `updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } })` inside the
`$transaction` that performs the write they authorise. `AuthMailService` does the same on issuance, to
revoke any outstanding token before minting a new one.

Deleting the row instead also enforces single use, but it loses the audit trail and a failed delete
leaves the token live. Two things follow from stamping, and both are load-bearing:

- **A spent row still matches the token lookup.** `findFirst({ where: { token } })` returns it. The
  `usedAt` check in the service is the *only* thing enforcing single use — omit it and the token is
  permanently reusable.
- **Both flows spend every outstanding token for that user, not just the one presented.** A password
  that has just changed must invalidate the other links that could change it again.

Neither table had *any* index on `token` before this change, so nothing at the database level was
preventing a duplicate. A **new** token table gets all four columns and both indexes from the start.

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
- Don't add a `deletedAt` to a model without auditing every read of that model in the same change.
  A soft-delete column with unfiltered reads is worse than none.
- Don't add a token table without `expiresAt`, `usedAt`, and `@unique` on `token`.
- Don't enforce single use by deleting the row, and don't read a token without checking `usedAt`.
