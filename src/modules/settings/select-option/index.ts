import { baseApp } from "@base";
import { PermissionGuard } from "@guards";
import { t as trans } from "@i18n";
import { AuthPlugin } from "@plugins";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import {
	PermissionSelectOptionResponseSchema,
	RoleSelectOptionResponseSchema,
} from "./schema";
import { SelectOptionService } from "./service";

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
			const permissions = await SelectOptionService.permissions();
			return ResponseToolkit.success(
				permissions,
				trans("selectOption.permissionsSuccess"),
			);
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["permission list"]);
			},
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
			const roles = await SelectOptionService.roles();
			return ResponseToolkit.success(roles, trans("selectOption.rolesSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["role list"]);
			},
			response: RoleSelectOptionResponseSchema,
			detail: {
				summary: "Role select options",
				description: "Retrieve all roles for select inputs",
			},
		},
	);
