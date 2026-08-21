# Validation — TypeBox Schemas

All HTTP I/O is validated via Elysia's TypeBox (`t`). Schemas live next to the route they describe.

## Location

- Per-module: `src/modules/<feature>/schema.ts`
- Cross-module response envelopes: `commonResponse(...)` from `@utils`

## List query schemas come from `datatableQueryParams`

A list route's `query` schema is built once per module in that module's `schema.ts`, from the shared builder in `@types`, passing the repository's **exported** allow-lists:

```ts
import { roleFilterableFields, roleSortableFields } from "@repositories";
import { datatableQueryParams } from "@types";

export const RoleQuerySchema = datatableQueryParams({
	sortFields: roleSortableFields,
	filterFields: roleFilterableFields,
});
```

What that buys, and why the exports rather than a restated list:

- `sort` becomes a **closed union of the allowed values**, so `/docs` renders a dropdown carrying `defaultSort` as its default, and an unrecognised value is a 422 from validation.
- The `filter` object gets **one typed property per allowed key** — an enum key renders as a dropdown of its values, every other key shows the sample from `<entity>FilterExample`. This is what replaces the single opaque description blob.
- **That filter object is documentation, not validation.** Elysia strips `filter[<key>]` query parameters before the schema runs, so nothing there ever receives a value; the repository enforces both the key set and the enum ranges, and returns **400**. See [repositories.md](./repositories.md).
- Nothing can drift. The documented list and the enforced list are the same array.

Passing a hand-written array here, or re-exporting the bare `DatatableQueryParams`, defeats all three. `DatatableQueryParams` exists only for a list route with no entity-specific allow-list to advertise, and there are none in this repo.

`sortDirection`, `page`, and `perPage` are already described and defaulted by the builder — do not redeclare them per module. Note the defaults are **materialised into the query object** by Elysia, so they are the values the repository actually receives; a default the repository would reject is a live 400, not a cosmetic mismatch.

## Rules

1. **One `schema.ts` per module / sub-module.** Group schemas with banner comments — Body, Query, Data, Response. See `src/modules/auth/schema.ts` for the canonical layout.
2. **Name schemas by intent + role:**
   - Inputs: `LoginSchema`, `CreateUserSchema`, `UserQuerySchema`
   - Data shapes (what the handler returns inside `data`): `MeDataSchema`, `UserDetailDataSchema`
   - Full response envelopes: `LoginResponseSchema`, `UserListResponseSchema`
3. **Always use `commonResponse(data, { include: [...] })` for the `response` field on routes.** It wraps the data schema in the success envelope and adds error schemas for the listed status codes.
   ```ts
   response: commonResponse(UserDetailDataSchema, {
   	include: [200, 404, 422, 500],
   });
   ```
   `include` should match the codes the handler can actually return. Don't blindly list every code.
4. **Apply schemas in the route definition**, not by re-validating in the handler:
   ```ts
   { body: CreateUserSchema, query: UserQuerySchema, response: UserCreateResponseSchema }
   ```
5. **String formats over regex when possible:** `t.String({ format: "email" })`, `t.String({ format: "uuid" })`. Custom regex only when no standard format fits.
6. **Length & range constraints belong in the schema**, not in the service: `t.String({ minLength: 8 })`. Business uniqueness lives in the service.
7. **Enum schemas reference single source of truth.** If Prisma defines an enum, mirror it with `t.UnionEnum([...])` and ensure both sides update together — or import the Prisma enum and use `t.Enum(PrismaEnum)`.
8. **Date fields use `t.Date()`** so Elysia handles serialization. Don't accept arbitrary strings for dates.
9. **Optional fields use `t.Optional(...)`**, not nullable + optional unless the underlying type really is `T | null`. Be precise.
10. **No schemas declared inline in `index.ts`** except trivial param objects (`t.Object({ id: t.String() })`). Anything reused or longer than a line goes in `schema.ts`.
11. **Examples are encouraged.** `t.String({ format: "email", examples: ["user@example.com"] })` improves the generated OpenAPI doc.
12. **Never expose secrets in response schemas.** Password hashes, raw tokens, internal IDs that shouldn't be public — leave them out. The schema is your last guardrail.
