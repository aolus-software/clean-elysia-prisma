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
   	return {
   		/* methods */
   	};
   }
   ```
   The factory takes an optional `tx`. Inside, alias to `db` and use that everywhere — never branch between `tx` and `prisma` per method.
2. **Transaction-aware everywhere.** Every repository accepts `Prisma.TransactionClient` so callers can compose them inside `prisma.$transaction(async (tx) => { ... })`. Never instantiate `prisma` in a method body other than the default.
3. **No business rules in the repository.** Repositories own _how_ to query, not _whether_. Authorization, side effects, and "should this happen?" logic belong in services.
4. **Always `select` explicitly.** Do not return raw Prisma `findMany()` rows — pick the fields you need. This guards against accidental password/email leaks and stabilizes the API.
5. **Return types from `@types`.** Method signatures use domain types (`UserDetail`, `UserList`, `PaginationResponse<T>`). Do not leak `Prisma.User` to callers.
6. **List queries enforce a sort/filter allow-list, declared at module scope and exported.** Never pass raw user input into `orderBy` or `where` keys.

   ```ts
   /* The ?sort= and filter[...] values this repository accepts. Exported so the
      module can document them in OpenAPI from one source of truth rather than
      restating the list. An unrecognised value is rejected, not ignored. */
   export const roleSortableFields = ["id", "name", "createdAt", "updatedAt"];
   export const roleFilterableFields = ["name", "createdAt", "updatedAt"];
   ```

   `findAll` reads them as `allowedSort` / `allowedFilter`, checks `sortDirectionAllowed` too, and throws `BadRequestError` on any violation. Three rules about the contents:

   - **They must be exported.** The module's `schema.ts` feeds them to `datatableQueryParams({ sortFields, filterFields })` so `/docs` advertises exactly what is enforced — see [validation.md](./validation.md). A hand-written list at the schema is the drift this is designed to prevent.
   - **`sortFields` must contain `defaultSort`.** Elysia materialises a schema default into the query object, so `parseFilter`'s `?? defaultSort` fallback never fires. A default missing from the list therefore rejects **every** request that omits `?sort=` — a 400 on the plainest possible call.
   - **`filterFields` lists only keys `findAll` actually implements.** A key that passes validation with no matching `where` branch is worse than a rejected one: the caller gets a 200 and an unfiltered page that looks filtered.

   **Enum-typed keys carry their values.** An entry may be a plain key string or `{ field, enum }`:

   ```ts
   export const userFilterableFields: FilterField[] = [
   	"name",
   	{ field: "status", enum: Object.values(UserStatus) },
   	"createdAt",
   ];

   export const userFilterExample: Record<string, string> = {
   	name: "jane",
   	createdAt: "2024-01-01,2024-12-31",
   };
   ```

   One array then drives three things that used to be written three times: the key-set check (`filterFieldNames(...)`), the enum-range check (`DatatableToolkit.assertFilterEnums(filter, userFilterableFields)`), and the `/docs` rendering — where an enum key becomes a dropdown and every other key shows the sample from `<entity>FilterExample`. Never restate an enum's values by hand; pass `Object.values(...)` so adding a member updates validation and docs together.

   **Filter values stay strings.** `DatatableToolkit.parseFilter` does not coerce them, because only the repository knows whether a value is a single scalar, a comma-separated id list, or a `start,end` date range. Use `DatatableToolkit.filterValues(value)` to split and trim.
7. **Use `DatatableType` + `PaginationResponse<T>` for list endpoints.** Pagination shape is fixed: `{ data, meta: { limit, page, totalCount } }`. Parse query params via `DatatableToolkit.parseFilter` in the route, hand off to the repository.
8. **Aggregate `count` and `findMany` with `Promise.all`** for paginated reads — they're independent and parallel is free.
9. **Never call repository methods from inside another repository.** Repositories are leaf nodes. Compose at the service layer instead.
10. **One repository per aggregate root**, not per table. `UserRepository` owns `user_roles` join reads when they're loaded with the user. Don't create a `UserRolesRepository` for incidental joins.
11. **Expose the raw model (`db.user`) sparingly.** It's a pragmatic escape hatch (see `UserRepository.user`) for cases where a service needs `prisma.user.create` with arbitrary `select`. Prefer adding a named method instead — the escape hatch is for one-offs.
12. **Re-export through `@repositories`.** Add new repositories to `src/libs/repositories/index.ts` so consumers import from a stable alias.

## Filters come off the raw URL, not the validated query

`filter[<key>]=<value>` is the wire format, and **Elysia never delivers it to the handler.** A route
that declares a `query` schema receives only the properties that schema names, and `filter[status]`
is not a valid property name — so the bracketed keys are stripped before validation runs. Elysia does
not fold them into a nested `filter` object either.

Two consequences, both load-bearing:

1. **`DatatableToolkit.parseFilter(query, request.url)` takes the URL** and reads the brackets from
   `new URL(url).searchParams`. The second argument is required precisely so a new list route cannot
   forget it — omitting it is a compile error, not a silently filter-less endpoint.
2. **The `filter` object in the query schema is documentation only.** It never receives a value, so it
   cannot validate one. Enum ranges and the key set are enforced in the repository
   (`assertFilterKeys` / `assertFilterEnums`), which is why an unknown key or a bad enum value is a
   **400** rather than a 422.

Do not "simplify" this by dropping the `url` argument and reading `query` alone. That is how filtering
silently stopped working before: `parseFilter` scanned `query` for keys starting with `filter[`, the
validated object never contained any, so `filter` was always `undefined` and no `where` branch ever
ran — on every list endpoint, with no error anywhere.

### Comma conventions per filter kind

A comma means different things depending on the key, so each key declares its `kind` and the
`/docs` description says which:

| `kind` | Comma means | Matched with |
| --- | --- | --- |
| `id` | several ids | `IN` — **never** a scalar equality |
| `list` | several arbitrary values | `IN` |
| `date` | the two ends of a range | `>= start-of-first-day AND <= end-of-last-day` |
| *(omitted)* | nothing — a literal comma | as-is |

```ts
export const userFilterableFields: FilterField[] = [
	{ field: "status", enum: Object.values(UserStatus) },
	"name",
	{ field: "role_id", kind: "id" },
	{ field: "createdAt", kind: "date" },
];
```

**Every id-ish key is `kind: "id"` and splits.** Assigning a raw value to a scalar is wrong even when
a single id is the common case — it silently makes multi-value input match nothing:

```ts
// WRONG — one id only, and a comma-separated value matches no row at all
eq(userRoles.role_id, filter.role_id as string)

// RIGHT
inArray(userRoles.role_id, DatatableToolkit.filterValues(filter.role_id))
```

**Date keys go through `DatatableToolkit.filterDateRange(value, key)`**, which returns an inclusive
`{ from, to }`. A single date matches **that whole day** — these are timestamp columns, so an equality
match on a bare date would almost never hit a row. The helper rejects an unparseable date, a reversed
range, and more than two parts with a 400; left unchecked those become `Invalid Date` and surface as a
500 or silently match nothing.

Do not hand-roll `new Date(...)` or `DateToolkit.parse(...)` per repository. The helper also carries the
timezone fix: a bare `YYYY-MM-DD` is read as wall-clock time in `APP_TIMEZONE`, not the host's
timezone, so the window lands on the calendar day the caller meant.

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
