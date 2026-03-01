import { Elysia } from "elysia";

import { AuthModule } from "./auth/index";
import { HealthModule } from "./health/index";
import { HomeModule } from "./home/index";

export { AuthModule, HealthModule, HomeModule };

export const bootstraps = new Elysia()
	.use(HomeModule)
	.use(HealthModule)
	.use(AuthModule);
