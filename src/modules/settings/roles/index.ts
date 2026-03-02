import { baseApp } from "@base";
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
			query: RoleQuerySchema,
			response: RoleListResponseSchema,
			detail: {
				summary: "List roles",
				description: "Retrieve a paginated list of roles",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const role = await RoleService.detail(params.id);
			return ResponseToolkit.success(role, "Role retrieved successfully");
		},
		{
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
			return ResponseToolkit.created(role, "Role created successfully");
		},
		{
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
			return ResponseToolkit.success(role, "Role updated successfully");
		},
		{
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
			return ResponseToolkit.success(null, "Role deleted successfully");
		},
		{
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
			await RoleService.syncPermissions(params.id, body.permission_ids);
			return ResponseToolkit.success(
				null,
				"Role permissions synced successfully",
			);
		},
		{
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
