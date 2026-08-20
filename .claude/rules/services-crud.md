# The Canonical CRUD Service

A full CRUD service exposes five methods, matching the five routes in
[handlers-crud.md](./handlers-crud.md). `src/modules/settings/roles/service.ts` is the reference.

```ts
async list(queryParam: DatatableType): Promise<PaginationResponse<XList>>
async detail(id: string): Promise<XDetail>
async create(...): Promise<X>
async update(id: string, ...): Promise<X>
async delete(id: string): Promise<void>
```

Methods use the object-method shorthand (`async list(...) {}`), not arrow properties. Every method has
an explicit return type.

## The service owns the checks

This is the load-bearing rule of the layer. The repository queries; the **service** decides. Fetch,
check, then act:

- existence → `NotFoundError`
- uniqueness → `BadRequestError` with a field array
- anything else needing DB state → the service

The repository only validates the datatable inputs (sort field, sort direction, filter keys) and
throws `BadRequestError` for those. It has no opinion on whether an operation should be allowed.

## list

Delegates with no added logic.

```ts
async list(queryParam: DatatableType): Promise<PaginationResponse<RoleList>> {
	return RoleRepository().findAll(queryParam);
},
```

The handler already ran `DatatableToolkit.parseFilter(query)` — do not re-parse.

## detail

Fetch, then throw if absent. Never return `null` to the handler; the handler has no null branch.

```ts
async detail(id: string): Promise<RoleDetail> {
	const role = await RoleRepository().findOne(id);
	if (!role) {
		throw new NotFoundError("Role not found");
	}
	return role;
},
```

`findOne` returns `null` for a miss — that is deliberate, so the service can decide the status.

## create

Check uniqueness first, then write. The field array is what lets the client render an inline error.

```ts
async create(name: string): Promise<{ id: string; name: string }> {
	const existing = await RoleRepository().findByName(name);
	if (existing) {
		throw new BadRequestError("Role already exists", [
			{ field: "name", message: "Role with this name already exists" },
		]);
	}
	return RoleRepository().create(name);
},
```

Hash passwords and compute derived fields here, never in the repository or the handler. Uniqueness
failures use `BadRequestError` with field details in this repo — not `UnprocessableEntityError`, and
not a 409. Stay consistent with that.

## update

Existence **and** uniqueness, with the self-exclusion that is easy to forget:

```ts
async update(id: string, name: string): Promise<{ id: string; name: string }> {
	const role = await RoleRepository().findOne(id);
	if (!role) {
		throw new NotFoundError("Role not found");
	}

	const existing = await RoleRepository().findByName(name);
	if (existing && existing.id !== id) {
		throw new BadRequestError("Role already exists", [
			{ field: "name", message: "Role with this name already exists" },
		]);
	}

	return RoleRepository().update(id, name);
},
```

The `existing.id !== id` guard is mandatory — without it, saving a record without changing its unique
field rejects itself.

## delete

Existence check, then delete.

```ts
async delete(id: string): Promise<void> {
	const role = await RoleRepository().findOne(id);
	if (!role) {
		throw new NotFoundError("Role not found");
	}
	await RoleRepository().delete(id);
},
```

**Whether this is a hard delete depends on the model.** `User` is soft-deleted — `UserService.delete`
stamps `deletedAt` with an `update`, and every read in `UserRepository` filters `deletedAt: null`:

```ts
await prisma.user.update({
	where: { id },
	data: { deletedAt: new Date() },
});
```

Every **other** model is still hard-deleted, and two consequences follow there:

- Deleting a row that other tables reference will cascade or fail on the foreign key, depending on the
  relation. Check the relation before adding a delete to a new model.
- The audit trail is gone.

Extending soft delete to another model is a schema migration plus an audit of every read of it — see
[schema.md](./schema.md).

## Beyond CRUD

Non-CRUD operations go in the same service object, after the five. They follow the same fetch-check-act
shape:

```ts
async syncPermissions(roleId: string, permissionIds: string[]): Promise<void> {
	const role = await RoleRepository().findOne(roleId);
	if (!role) {
		throw new NotFoundError("Role not found");
	}
	await RoleRepository().syncPermissions(roleId, permissionIds);
},
```

Sync-style operations replace the whole set rather than diffing it, and they are gated on
`RoleGuard(["superuser"])` at the route because they grant privilege — see [rbac.md](./rbac.md).

## Transactions

Multi-write operations wrap in `prisma.$transaction` and pass `tx` into the repository factory, which
accepts it as its first argument:

```ts
await prisma.$transaction(async (tx) => {
	const created = await UserRepository(tx).create(data);
	await RoleRepository(tx).attachToUser(created.id, roleIds);
});
```

Note the difference from the Drizzle sibling: here `tx` goes to the **factory**
(`UserRepository(tx)`), not to each method. See [repositories.md](./repositories.md).

## Imports

```ts
import { BadRequestError, NotFoundError } from "@errors";
import { RoleRepository } from "@repositories";
import {
	DatatableType,
	PaginationResponse,
	RoleDetail,
	RoleList,
} from "@types";
```

Import only the errors the service actually throws.

## Checklist

- [ ] Five methods named `list` / `detail` / `create` / `update` / `delete`, object-method shorthand.
- [ ] Explicit return type on every method.
- [ ] `detail`, `update`, `delete` all check existence and throw `NotFoundError`.
- [ ] `create` and `update` check uniqueness; `update` excludes the record itself.
- [ ] Uniqueness errors are `BadRequestError` with a `[{ field, message }]` array.
- [ ] Hashing and derived fields computed here, not in the repository.
- [ ] Multi-write operations wrapped in `prisma.$transaction` with `tx` passed to the factory.
- [ ] No HTTP types, no `set`, no `console.*`.
