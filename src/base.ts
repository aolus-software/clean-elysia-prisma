import {
	BodyLimitPlugin,
	DiPlugin,
	LoggerPlugin,
	PerformancePlugin,
	RequestPlugin,
	SecurityPlugin,
} from "@plugins";
import { Elysia } from "elysia";

export const baseApp = new Elysia({ name: "base-app" })
	.use(RequestPlugin)
	.use(LoggerPlugin)
	.use(PerformancePlugin)
	.use(DiPlugin)
	.use(BodyLimitPlugin)
	.use(SecurityPlugin);
