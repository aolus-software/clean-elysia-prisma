import { commonResponse } from "@utils";
import { t } from "elysia";

export const HealthDataSchema = t.Object({
	database: t.String(),
	redis: t.String(),
});

export const HealthResponseSchema = commonResponse(HealthDataSchema, {
	include: [200, 500],
});
