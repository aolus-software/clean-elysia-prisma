import { Elysia } from "elysia";

import { AuthModule } from "./auth/index";
import { HealthModule } from "./health/index";
import { HomeModule } from "./home/index";
import { SettingsModule } from "./settings/index";

export { AuthModule, HealthModule, HomeModule, SettingsModule };

export const bootstraps = new Elysia()
	.use(HomeModule)
	.use(HealthModule)
	.use(AuthModule)
	.use(SettingsModule);
