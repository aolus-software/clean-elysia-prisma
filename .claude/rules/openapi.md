# OpenAPI — Documentation

OpenAPI is served by `DocsPlugin` (`src/libs/plugins/docs.plugin.ts`) at `/docs` using Scalar, gated on a single flag: `enabled: AppConfig.ENABLE_API_DOCS`, from the `ENABLE_API_DOCS` environment variable.

That flag **defaults to `false`**, so an environment that never sets it cannot expose the schema, and it is deliberately **independent of `NODE_ENV`** — docs can be turned on for a staging box without pretending it is a development environment, and cannot be published by accident just by shipping with `NODE_ENV=staging`. An `APP_ENV !== "production"` check would publish the schema on every non-production deployment; don't reintroduce one alongside the flag. The flag is the whole switch.

## Rules

1. **Every route declares `detail`** with at minimum:
   - `summary` — short title shown in the doc nav
   - `description` — one or two sentences on behavior
     Example:
   ```ts
   { detail: { summary: "List users", description: "Paginated user list." } }
   ```
2. **Every route declares `response`** using `commonResponse(...)` from `@utils`, including the status codes the handler can actually return:
   ```ts
   response: commonResponse(UserDataSchema, { include: [200, 401, 404, 500] });
   ```
   Never use a bare TypeBox schema — `commonResponse` provides the envelope (`{ success, data, message }`).
3. **Set module-level `detail.tags`** so endpoints group correctly in Scalar:
   ```ts
   new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } });
   ```
   Use Title Case ("Auth", "Settings - Users"). One module = one tag (or one tag per sub-module).
4. **Authenticated routes must declare `security`** in their `detail`:
   ```ts
   detail: { summary: "...", security: [{ bearerAuth: [] }] }
   ```
   `bearerAuth` is the only declared scheme — see `docs.plugin.ts`.
5. **Body / query / params validation doubles as documentation.** Always use TypeBox (`t.Object(...)`), never untyped `any`. The schema is what Scalar renders.
6. **Examples are encouraged on non-trivial schemas:**
   ```ts
   t.String({ format: "email", examples: ["user@example.com"] });
   ```
7. **Do not commit secrets, real user data, or staging URLs into examples.**
8. **Version & metadata changes go in `docs.plugin.ts`**, not in individual modules. Bump `version` there when shipping a breaking API change.
9. **Never flip `enabled` to `true` unconditionally**, and never add an `APP_ENV` / `NODE_ENV` term next to it. `ENABLE_API_DOCS` is the only switch; an environment that wants docs sets it.

## Reviewing a new route

Before opening a PR, hit `/docs` locally and check:

- Endpoint shows up under the right tag
- Request body / query / params render with field types
- All response codes are listed
- Auth lock icon shows on protected routes
