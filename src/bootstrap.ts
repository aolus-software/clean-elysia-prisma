import { container } from "@plugins";

import { AuthService } from "./modules/auth/service";
import { ProfileService } from "./modules/profile/service";
import { PermissionService } from "./modules/settings/permission/service";
import { RoleService } from "./modules/settings/role/service";
import { SelectOptionService } from "./modules/settings/select-option/service";
import { UserService } from "./modules/settings/user/service";

/**
 * Bootstrap the application by registering all services in the DI container
 * This should be called once at application startup
 */
export const bootstrap = () => {
	container.register("authService", () => AuthService);
	container.register("profileService", () => ProfileService);
	container.register("userService", () => UserService);
	container.register("roleService", () => RoleService);
	container.register("permissionService", () => PermissionService);
	container.register("selectOptionService", () => SelectOptionService);
};
