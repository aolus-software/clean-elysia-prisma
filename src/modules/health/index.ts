import { baseApp } from "@base";
import { prisma, RedisClient } from "@database";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import { HealthResponseSchema } from "./schema";

export const HealthModule = new Elysia({
	name: "health-module",
	prefix: "/health",
	detail: { tags: ["General"] },
})
	.use(baseApp)
	.get(
		"/",
		async () => {
			await prisma.$queryRaw`SELECT 1`;
			await RedisClient.getRedisClient().ping();
			return ResponseToolkit.success(
				{ database: "ok", redis: "ok" },
				"Healthy",
			);
		},
		{
			response: HealthResponseSchema,
			detail: {
				summary: "Health check",
				description: "Pings PostgreSQL and Redis",
			},
		},
	);
