import { Elysia } from "elysia";

import { PermissionsModule } from "./permissions/index";
import { RolesModule } from "./roles/index";
import { SelectOptionModule } from "./select-option/index";
import { UsersModule } from "./users/index";

export { PermissionsModule, RolesModule, SelectOptionModule, UsersModule };

export const SettingsModule = new Elysia({
	name: "settings-module",
	prefix: "/settings",
})
	.use(PermissionsModule)
	.use(RolesModule)
	.use(UsersModule)
	.use(SelectOptionModule);
