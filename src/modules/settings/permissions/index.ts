import { baseApp } from "@base";
import { AuthPlugin } from "@plugins";
import { DatatableToolkit, ResponseToolkit } from "@utils";
import { Elysia, t } from "elysia";

import {
	CreatePermissionSchema,
	PermissionCreateResponseSchema,
	PermissionDeleteResponseSchema,
	PermissionDetailResponseSchema,
	PermissionListResponseSchema,
	PermissionQuerySchema,
	PermissionUpdateResponseSchema,
	UpdatePermissionSchema,
} from "./schema";
import { PermissionService } from "./service";

export const PermissionsModule = new Elysia({
	name: "settings-permissions-module",
	prefix: "/permissions",
	detail: { tags: ["Settings - Permissions"] },
})
	.use(baseApp)
	.use(AuthPlugin)
	.get(
		"/",
		async ({ query }) => {
			const queryParam = DatatableToolkit.parseFilter(query);
			const result = await PermissionService.list(queryParam);
			return ResponseToolkit.paginated(
				result.data,
				result.meta,
				"Permissions retrieved successfully",
			);
		},
		{
			query: PermissionQuerySchema,
			response: PermissionListResponseSchema,
			detail: {
				summary: "List permissions",
				description: "Retrieve a paginated list of permissions",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const permission = await PermissionService.detail(params.id);
			return ResponseToolkit.success(
				permission,
				"Permission retrieved successfully",
			);
		},
		{
			params: t.Object({ id: t.String() }),
			response: PermissionDetailResponseSchema,
			detail: {
				summary: "Get permission",
				description: "Retrieve a single permission by ID",
			},
		},
	)
	.post(
		"/",
		async ({ body, set }) => {
			set.status = 201;
			const permission = await PermissionService.create(body.name, body.group);
			return ResponseToolkit.created(
				permission,
				"Permission created successfully",
			);
		},
		{
			body: CreatePermissionSchema,
			response: PermissionCreateResponseSchema,
			detail: {
				summary: "Create permission",
				description: "Create a new permission",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const permission = await PermissionService.update(
				params.id,
				body.name,
				body.group,
			);
			return ResponseToolkit.success(
				permission,
				"Permission updated successfully",
			);
		},
		{
			params: t.Object({ id: t.String() }),
			body: UpdatePermissionSchema,
			response: PermissionUpdateResponseSchema,
			detail: {
				summary: "Update permission",
				description: "Update an existing permission by ID",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await PermissionService.delete(params.id);
			return ResponseToolkit.success(null, "Permission deleted successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			response: PermissionDeleteResponseSchema,
			detail: {
				summary: "Delete permission",
				description: "Delete a permission by ID",
			},
		},
	);
