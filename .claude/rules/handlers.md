# Route Handlers (`src/modules/<feature>/index.ts`)

Elysia has no controller class. The handler is the arrow function passed as the second argument to
`.get / .post / .patch / .delete`; the third argument is the route's contract — guard, input schemas,
`response`, and `detail`. Both halves matter. A handler with no contract is an undocumented,
unvalidated, ungated route.

## Rules

1. **A handler does HTTP only.** Destructure the context, call **one** service method, wrap the
   result. No domain conditionals, no transformation, no `prisma` access.

   ```ts
   .get(
   	"/:id",
   	async ({ params }) => {
   		const role = await RoleService.detail(params.id);
   		return ResponseToolkit.success(role, "Role retrieved successfully");
   	},
   	{
   		beforeHandle: ({ user }) => {
   			PermissionGuard.canActivate(user, ["role detail"]);
   		},
   		params: t.Object({ id: t.String() }),
   		response: RoleDetailResponseSchema,
   		detail: {
   			summary: "Get role",
   			description: "Retrieve a single role by ID with all permissions and assignment status",
   		},
   	},
   )
   ```

   An `if` that depends on the database belongs in the service. See [services.md](./services.md).

2. **Destructure only what you use** — `{ body }`, `{ params }`, `{ query }`, `{ user }`, `{ set }`.
   Never pass the Elysia context into a service: services take primitives and DTOs and know nothing
   about HTTP.

3. **Success responses go through `ResponseToolkit` from `@utils`, data first.**

   ```ts
   ResponseToolkit.success(data, message);                    // 200
   ResponseToolkit.created(data, message);                    // 201
   ResponseToolkit.paginated(rows, meta, message);            // 200, meta = { page, limit, totalCount }
   ```

   The envelope is `{ status, success, message, data }` — `status` is in the body as well as being the
   HTTP status. Never hand-build it.

4. **List routes use `ResponseToolkit.paginated`, not `success`.** The repository returns
   `{ data, meta }`; spread it across the two arguments:

   ```ts
   const result = await RoleService.list(queryParam);
   return ResponseToolkit.paginated(result.data, result.meta, "Roles retrieved successfully");
   ```

5. **Create routes set `set.status = 201` *and* return `ResponseToolkit.created(...)`.** Both are
   needed: `set.status` drives the HTTP status, `created` puts `201` in the body. They must agree.

   ```ts
   async ({ body, set }) => {
   	set.status = 201;
   	const role = await RoleService.create(body.name);
   	return ResponseToolkit.created(role, "Role created successfully");
   }
   ```

   This is the **only** place a handler touches `set.status`. Every other status comes from the
   toolkit method or the thrown error class.

6. **Handlers throw; they never build an error response.**

   ```ts
   throw new NotFoundError("Role not found");
   ```

   `ErrorHandlerPlugin` maps each class from `@errors` to its status and envelope. No try/catch in a
   handler — an uncaught domain error is the intended path. See
   [errors-and-responses.md](./errors-and-responses.md).

7. **`response` references a named envelope schema from `./schema`, not an inline `commonResponse`.**
   This repo builds the envelope in `schema.ts` (`RoleListResponseSchema`,
   `RoleDetailResponseSchema`, `RoleCreateResponseSchema`, …) by wrapping the data schema in
   `commonResponse(...)` / `commonPaginatedResponse(...)` there, and `index.ts` names the result. One
   response schema per route. See [validation.md](./validation.md).

8. **Every route declares the full contract:**
   - `beforeHandle` with a guard for anything not public or self-scoped — [rbac.md](./rbac.md)
   - `body` / `query` / `params` where applicable, from `./schema` (a bare
     `params: t.Object({ id: t.String() })` inline is accepted)
   - `response`, naming a schema whose `include` codes match what the route can really return
   - `detail: { summary, description }` — [openapi.md](./openapi.md)

9. **Module composition:** `export const <Name>Module = new Elysia({ name, prefix, detail: { tags } })`,
   then `.use(baseApp)`, then `.use(AuthPlugin)` where the protected routes begin. `name` must be
   unique — Elysia dedupes `.use()` by it. Public routes go **above** the `AuthPlugin` call; see
   `src/modules/auth/index.ts`, which keeps six public POSTs above it and `GET /me` below.

10. **Services are imported statically at the top** — `import { RoleService } from "./service"`. Never
    `await import(...)` inside a handler.

## Don't

- Don't `set.status = 404` and return a payload. Throw.
- Don't import `prisma` or a repository into `index.ts`. Handlers go through the service.
- Don't call two services from one handler unless it is genuinely orchestrating a cross-feature flow.
- Don't declare a bare data schema as `response` — `ResponseToolkit` adds the envelope, so the
  schema must be the wrapped one from `schema.ts`.
- Don't omit `detail` because the route "is obvious". It is the only source for `/docs`.
