import { container } from "@plugins";

import { AuthService } from "./modules/auth/service";

/**
 * Bootstrap the application by registering all services in the DI container.
 * Call once at application startup.
 */
export const bootstrap = () => {
	container.register("authService", () => AuthService);
};
