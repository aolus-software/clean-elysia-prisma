# Repositories — Prisma Data Access

Repositories are the **only** layer allowed to call Prisma directly for cross-cutting reads/writes. Services and route handlers go through them.

## Location

- Concrete code: `src/libs/database/postgres/repositories/<name>.repository.ts`
- Public re-exports: `src/libs/repositories/index.ts` (the `@repositories` alias)

## Rules

1. **Repositories are factory functions, not classes.**
   ```ts
   export function UserRepository(tx?: Prisma.TransactionClient) {
     const db = tx ?? prisma;
     return { /* methods */ };
   }
   ```
   The factory takes an optional `tx`. Inside, alias to `db` and use that everywhere — never branch between `tx` and `prisma` per method.
2. **Transaction-aware everywhere.** Every repository accepts `Prisma.TransactionClient` so callers can compose them inside `prisma.$transaction(async (tx) => { ... })`. Never instantiate `prisma` in a method body other than the default.
3. **No business rules in the repository.** Repositories own *how* to query, not *whether*. Authorization, side effects, and "should this happen?" logic belong in services.
4. **Always `select` explicitly.** Do not return raw Prisma `findMany()` rows — pick the fields you need. This guards against accidental password/email leaks and stabilizes the API.
5. **Return types from `@types`.** Method signatures use domain types (`UserDetail`, `UserList`, `PaginationResponse<T>`). Do not leak `Prisma.User` to callers.
6. **List queries enforce a sort/filter allowlist.** Use the pattern in `user.repository.ts`: declare `allowedSort`, `allowedFilter`, `sortDirectionAllowed`, validate inputs, throw `BadRequestError` on violations. Never pass raw user input into `orderBy` or `where` keys.
7. **Use `DatatableType` + `PaginationResponse<T>` for list endpoints.** Pagination shape is fixed: `{ data, meta: { limit, page, totalCount } }`. Parse query params via `DatatableToolkit.parseFilter` in the route, hand off to the repository.
8. **Aggregate `count` and `findMany` with `Promise.all`** for paginated reads — they're independent and parallel is free.
9. **Never call repository methods from inside another repository.** Repositories are leaf nodes. Compose at the service layer instead.
10. **One repository per aggregate root**, not per table. `UserRepository` owns `user_roles` join reads when they're loaded with the user. Don't create a `UserRolesRepository` for incidental joins.
11. **Expose the raw model (`db.user`) sparingly.** It's a pragmatic escape hatch (see `UserRepository.user`) for cases where a service needs `prisma.user.create` with arbitrary `select`. Prefer adding a named method instead — the escape hatch is for one-offs.
12. **Re-export through `@repositories`.** Add new repositories to `src/libs/repositories/index.ts` so consumers import from a stable alias.

## Service-side usage

```ts
import { UserRepository } from "@repositories";
import { prisma } from "@database";

const user = await UserRepository().findByMail(email);

await prisma.$transaction(async (tx) => {
  const created = await UserRepository(tx).user.create({ data: ... });
  await RoleRepository(tx).attachToUser(created.id, roleIds);
});
```
