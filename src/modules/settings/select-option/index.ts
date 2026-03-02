import { baseApp } from "@base";
import { AuthPlugin } from "@plugins";
import { PermissionRepository, RoleRepository } from "@repositories";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import {
	PermissionSelectOptionResponseSchema,
	RoleSelectOptionResponseSchema,
} from "./schema";

export const SelectOptionModule = new Elysia({
	name: "settings-select-option-module",
	prefix: "/select-option",
	detail: { tags: ["Settings - Select Options"] },
})
	.use(baseApp)
	.use(AuthPlugin)
	.get(
		"/permissions",
		async () => {
			const permissions = await PermissionRepository().selectOptions();
			return ResponseToolkit.success(
				permissions,
				"Permission options retrieved successfully",
			);
		},
		{
			response: PermissionSelectOptionResponseSchema,
			detail: {
				summary: "Permission select options",
				description:
					"Retrieve all permissions grouped by group for select inputs",
			},
		},
	)
	.get(
		"/roles",
		async () => {
			const result = await RoleRepository().findAll({
				page: 1,
				perPage: 1000,
				sortDirection: "asc",
				sort: "name",
			});
			const roles = result.data.map((role) => ({
				id: role.id,
				name: role.name,
			}));
			return ResponseToolkit.success(
				roles,
				"Role options retrieved successfully",
			);
		},
		{
			response: RoleSelectOptionResponseSchema,
			detail: {
				summary: "Role select options",
				description: "Retrieve all roles for select inputs",
			},
		},
	);
