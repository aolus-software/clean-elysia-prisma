import { baseApp } from "@base";
import { AppConfig } from "@config";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import { HomeResponseSchema } from "./schema";

export const HomeModule = new Elysia({
	name: "home-module",
	prefix: "/",
	detail: { tags: ["General"] },
})
	.use(baseApp)
	.get(
		"/",
		() => {
			return ResponseToolkit.success(
				{ name: AppConfig.APP_NAME, env: AppConfig.APP_ENV },
				"Welcome",
			);
		},
		{
			response: HomeResponseSchema,
			detail: {
				summary: "Welcome",
				description: "Returns app name and environment",
			},
		},
	);
