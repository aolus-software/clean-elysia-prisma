import { Elysia } from "elysia";

import { log } from "../utils/elysia/logger";

/**
 * Performance logging plugin
 * Logs request duration and warns on slow requests
 * Must be used after RequestPlugin (which provides requestId and startedAt)
 */
export const PerformancePlugin = new Elysia({
	name: "performance",
}).onAfterHandle(({ request, set, store }) => {
	const startedAt = (store as Record<string, unknown>)["startedAt"] as
		| number
		| undefined;
	const duration = startedAt ? Date.now() - startedAt : 0;
	const url = new URL(request.url);
	const method = request.method;
	const path = url.pathname;
	const status = set.status ?? 200;

	const logData = {
		method,
		path,
		status,
		duration: `${duration}ms`,
	};

	if (duration > 1000) {
		log.warn(logData, "Slow request detected");
	} else if (duration > 500) {
		log.info(logData, "Request completed");
	} else {
		log.debug(logData, "Request completed");
	}
});
