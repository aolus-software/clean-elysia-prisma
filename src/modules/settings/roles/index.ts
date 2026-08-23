import { baseApp } from "@base";
import { PermissionGuard, RoleGuard } from "@guards";
import { t as trans } from "@i18n";
import { AuthPlugin } from "@plugins";
import { DatatableToolkit, ResponseToolkit } from "@utils";
import { Elysia, t } from "elysia";

import {
	CreateRoleSchema,
	RoleCreateResponseSchema,
	RoleDeleteResponseSchema,
	RoleDetailResponseSchema,
	RoleListResponseSchema,
	RoleQuerySchema,
	RoleSyncPermissionsResponseSchema,
	RoleUpdateResponseSchema,
	SyncRolePermissionsSchema,
	UpdateRoleSchema,
} from "./schema";
import { RoleService } from "./service";

export const RolesModule = new Elysia({
	name: "settings-roles-module",
	prefix: "/roles",
	detail: { tags: ["Settings - Roles"] },
})
	.use(baseApp)
	.use(AuthPlugin)
	.get(
		"/",
		async ({ query, request }) => {
			const queryParam = DatatableToolkit.parseFilter(query, request.url);
			const result = await RoleService.list(queryParam);
			return ResponseToolkit.paginated(
				result.data,
				result.meta,
				trans("role.listSuccess"),
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
				description:
					"Retrieve a paginated list of roles. `search` matches the role name. " +
					"Sortable and filterable fields are listed on the individual query " +
					"parameters; an unsupported `sort` is rejected with 422 and an " +
					"unsupported `filter[<key>]` with 400.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const role = await RoleService.detail(params.id);
			return ResponseToolkit.success(role, trans("role.detailSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["role detail"]);
			},
			params: t.Object({ id: t.String() }),
			response: RoleDetailResponseSchema,
			detail: {
				summary: "Get role",
				description:
					"Retrieve a single role by ID with all permissions and assignment status",
			},
		},
	)
	.post(
		"/",
		async ({ body, set }) => {
			set.status = 201;
			const role = await RoleService.create(body.name);
			return ResponseToolkit.created(role, trans("role.createSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["role create"]);
			},
			body: CreateRoleSchema,
			response: RoleCreateResponseSchema,
			detail: {
				summary: "Create role",
				description: "Create a new role",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const role = await RoleService.update(params.id, body.name);
			return ResponseToolkit.success(role, trans("role.updateSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["role edit"]);
			},
			params: t.Object({ id: t.String() }),
			body: UpdateRoleSchema,
			response: RoleUpdateResponseSchema,
			detail: {
				summary: "Update role",
				description: "Update an existing role by ID",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await RoleService.delete(params.id);
			return ResponseToolkit.success(null, trans("role.deleteSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["role delete"]);
			},
			params: t.Object({ id: t.String() }),
			response: RoleDeleteResponseSchema,
			detail: {
				summary: "Delete role",
				description: "Delete a role by ID",
			},
		},
	)
	.patch(
		"/:id/sync-permissions",
		async ({ params, body }) => {
			await RoleService.syncPermissions(params.id, body.permissionIds);
			return ResponseToolkit.success(
				null,
				trans("role.syncPermissionsSuccess"),
			);
		},
		{
			beforeHandle: ({ user }) => {
				RoleGuard.canActivate(user, ["superuser"]);
			},
			params: t.Object({ id: t.String() }),
			body: SyncRolePermissionsSchema,
			response: RoleSyncPermissionsResponseSchema,
			detail: {
				summary: "Sync role permissions",
				description:
					"Replace all permissions assigned to a role with the provided list",
			},
		},
	);
