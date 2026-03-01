import { commonResponse } from "@utils";
import { t } from "elysia";

export const HomeDataSchema = t.Object({
	name: t.String(),
	env: t.String(),
});

export const HomeResponseSchema = commonResponse(HomeDataSchema, {
	include: [200, 500],
});
