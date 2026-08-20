# The Canonical CRUD Module

A full CRUD resource is five routes in one `index.ts`, each with a guard, input schemas, a named
response schema, and a `detail`. `src/modules/settings/roles/index.ts` is the reference
implementation — copy its shape rather than inventing a new one.

| Route | Verb + path | Service method | Permission | Success |
| ----- | ----------- | -------------- | ---------- | ------- |
| list   | `GET "/"`       | `list(queryParam)`   | `<group> list`   | 200 |
| detail | `GET "/:id"`    | `detail(id)`         | `<group> detail` | 200 |
| create | `POST "/"`      | `create(...)`        | `<group> create` | 201 |
| update | `PATCH "/:id"`  | `update(id, ...)`    | `<group> edit`   | 200 |
| delete | `DELETE "/:id"` | `delete(id)`         | `<group> delete` | 200 |

Service methods are named `list` / `detail` / `create` / `update` / `delete` — not `findAll` /
`findOne`. Collection paths are `"/"`. Permission strings use the seeded `<group> <action>`
vocabulary, where the update action is `edit`. See [rbac.md](./rbac.md).

The declaration order in the existing modules is list, detail, create, update, delete — follow it so
the five modules stay diffable against each other.

## List

Parse the datatable query with `DatatableToolkit.parseFilter(query)`, then spread the repository's
`{ data, meta }` across `ResponseToolkit.paginated`.

```ts
.get(
	"/",
	async ({ query }) => {
		const queryParam = DatatableToolkit.parseFilter(query);
		const result = await RoleService.list(queryParam);
		return ResponseToolkit.paginated(
			result.data,
			result.meta,
			"Roles retrieved successfully",
		);
	},
	{
		beforeHandle: ({ user }) => {
			PermissionGuard.canActivate(user, ["role list"]);
		},
		query: RoleQuerySchema,
		response: RoleListResponseSchema,
		detail: {
			summary: "List roles",
			description: "Retrieve a paginated list of roles",
		},
	},
)
```

Each module declares its own `<Entity>QuerySchema` in `schema.ts` rather than sharing one type. The
repository rejects an unknown sort key or filter with `BadRequestError`, so `400` belongs in the
response schema's `include`.

## Detail

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

An inline `params: t.Object({ id: t.String() })` is the accepted form for the id — it is trivial
enough not to earn a named schema. `404` enters the response schema from here on: every `:id` route
can miss.

## Create

The only route that touches `set.status`. Set it **and** return `ResponseToolkit.created(...)` — the
first drives the HTTP status, the second puts `201` in the body, and they must agree.

```ts
.post(
	"/",
	async ({ body, set }) => {
		set.status = 201;
		const role = await RoleService.create(body.name);
		return ResponseToolkit.created(role, "Role created successfully");
	},
	{
		beforeHandle: ({ user }) => {
			PermissionGuard.canActivate(user, ["role create"]);
		},
		body: CreateRoleSchema,
		response: RoleCreateResponseSchema,
		detail: { summary: "Create role", description: "Create a new role" },
	},
)
```

Create returns the created entity, not `null` — `RoleService.create` resolves to
`{ id, name }`. No `404` on create.

## Update

```ts
.patch(
	"/:id",
	async ({ params, body }) => {
		const role = await RoleService.update(params.id, body.name);
		return ResponseToolkit.success(role, "Role updated successfully");
	},
	{
		beforeHandle: ({ user }) => {
			PermissionGuard.canActivate(user, ["role edit"]);
		},
		params: t.Object({ id: t.String() }),
		body: UpdateRoleSchema,
		response: RoleUpdateResponseSchema,
		detail: { summary: "Update role", description: "Update an existing role" },
	},
)
```

`UpdateRoleSchema` is declared separately from `CreateRoleSchema`, not derived from it — see
[validation.md](./validation.md).

## Delete

```ts
.delete(
	"/:id",
	async ({ params }) => {
		await RoleService.delete(params.id);
		return ResponseToolkit.success(null, "Role deleted successfully");
	},
	{
		beforeHandle: ({ user }) => {
			PermissionGuard.canActivate(user, ["role delete"]);
		},
		params: t.Object({ id: t.String() }),
		response: RoleDeleteResponseSchema,
		detail: { summary: "Delete role", description: "Delete a role by ID" },
	},
)
```

Delete returns 200 with a message and `null` data, not 204 — the envelope always has a body.

Note this is a **hard delete**: `prisma/schema.prisma` has no `deletedAt` on any model, so
`RoleService.delete` issues a real `DELETE`. Do not document it as a soft delete, and be aware it can
fail or cascade on FK-referencing rows. See [schema.md](./schema.md).

## One response schema per route

Every route names its own envelope schema from `./schema` — `RoleListResponseSchema`,
`RoleDetailResponseSchema`, `RoleCreateResponseSchema`, `RoleUpdateResponseSchema`,
`RoleDeleteResponseSchema`. They are built there with `commonResponse(...)` /
`commonPaginatedResponse(...)`, so `index.ts` never calls those helpers directly.

Status codes to `include` when building them:

| Route  | `include` |
| ------ | --------- |
| list   | `[200, 400, 401, 403, 500]` |
| create | `[201, 400, 401, 403, 500]` |
| detail | `[200, 400, 401, 403, 404, 500]` |
| update | `[200, 400, 401, 403, 404, 500]` |
| delete | `[200, 400, 401, 403, 404, 500]` |

Add `422` where the service throws `UnprocessableEntityError`. Never list a code the route cannot
produce, and never omit one it can.

## Sub-resource actions

Actions beyond CRUD hang off the id — `PATCH "/:id/sync-roles"`, `PATCH "/:id/sync-permissions"`,
`PATCH "/:id/reset-password"`, `POST "/:id/send-email-verification"`. They come **after** the five
CRUD routes in the chain. Privilege-granting ones use `RoleGuard(["superuser"])`; the rest keep the
parent resource's permission. Add each to the map in [routes.md](./routes.md).

## Checklist

- [ ] Five routes, in list / detail / create / update / delete order.
- [ ] Collection paths are `"/"`; item paths are `"/:id"` with an inline `params` schema.
- [ ] Every route has a `beforeHandle` naming a seeded permission.
- [ ] `PATCH` uses the `edit` action, not `update`.
- [ ] Create sets `set.status = 201` and returns `ResponseToolkit.created(...)`.
- [ ] Each route names its own `<Entity><Action>ResponseSchema` from `schema.ts`.
- [ ] `:id` routes include `404`; list routes include `400`.
- [ ] The module is composed into `src/modules/settings/index.ts` and the routes are in [routes.md](./routes.md).
