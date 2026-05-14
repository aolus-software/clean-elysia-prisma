# OpenAPI — Documentation

OpenAPI is served by `DocsPlugin` (`src/libs/plugins/docs.plugin.ts`) at `/docs` using Scalar. It is **disabled in production** (`AppConfig.APP_ENV !== "production"`).

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
9. **Production stays dark.** Never flip `enabled` to `true` unconditionally — guard it on env.

## Reviewing a new route

Before opening a PR, hit `/docs` locally and check:

- Endpoint shows up under the right tag
- Request body / query / params render with field types
- All response codes are listed
- Auth lock icon shows on protected routes
