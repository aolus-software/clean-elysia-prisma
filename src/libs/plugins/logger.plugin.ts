import { wrap } from "@bogeychan/elysia-logger";
import { log } from "@utils";

/**
 * Elysia plugin: exposes ctx.log, auto-logs requests,
 * and enriches each line with request-scoped props.
 */
export const LoggerPlugin = wrap(log, {
	autoLogging: true,
	customProps(ctx) {
		const url = new URL(ctx.request.url);
		return {
			// eslint-disable-next-line
			requestId: (ctx as any).requestId,
			method: ctx.request.method,
			path: url.pathname,
			route: ctx.route,
		};
	},
});
