import { Elysia } from "elysia";

import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	UnauthorizedError,
	UnprocessableEntityError,
} from "../errors";
import { LoggerPlugin } from "./logger.plugin";

export const ErrorHandlerPlugin = new Elysia({
	name: "error-handler",
})
	.use(LoggerPlugin)
	.onError(({ code, error, set, log }) => {
		if (error instanceof BadRequestError) {
			set.status = 400;
			return {
				status: 400,
				success: false,
				message: error.message || "Bad Request",
				errors: error.error || [],
			};
		}

		if (error instanceof UnprocessableEntityError) {
			set.status = 422;
			return {
				status: 422,
				success: false,
				message: error.message || "Unprocessable Entity",
				errors: error.error || [],
			};
		}

		if (error instanceof NotFoundError) {
			set.status = 404;
			return {
				status: 404,
				success: false,
				message: error.message || "Not Found",
				data: null,
			};
		}

		if (error instanceof UnauthorizedError) {
			set.status = 401;
			return {
				status: 401,
				success: false,
				message: error.message || "Unauthorized",
				data: null,
			};
		}

		if (error instanceof ForbiddenError) {
			set.status = 403;
			return {
				status: 403,
				success: false,
				message: error.message || "Forbidden",
				data: null,
			};
		}

		if (error instanceof RateLimitError) {
			set.status = 429;
			return {
				status: 429,
				success: false,
				message: error.message || "Too Many Requests",
				data: null,
			};
		}

		if (code === "VALIDATION") {
			set.status = 422;

			/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
			const validationError = error as any;
			const errors: { field: string; message: string }[] = [];

			if (Array.isArray(validationError.all)) {
				for (const err of validationError.all) {
					errors.push({
						field: err.path?.replace(/^\//, "") || "unknown",
						message: err.message || "Validation failed",
					});
				}
			}

			if (!errors.length && validationError.valueError) {
				const valueErrors = Array.isArray(validationError.valueError)
					? validationError.valueError
					: [validationError.valueError];

				for (const err of valueErrors) {
					errors.push({
						field: err.path?.replace(/^\//, "") || "unknown",
						message: err.message || "Validation failed",
					});
				}
			}

			if (!errors.length && validationError.message) {
				errors.push({
					field: "general",
					message: validationError.message,
				});
			}
			/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

			return {
				status: 422,
				success: false,
				message: "Request validation failed",
				errors: errors.length
					? errors
					: [{ field: "general", message: "Invalid request data" }],
			};
		}

		if (code === "NOT_FOUND") {
			set.status = 404;
			return {
				status: 404,
				success: false,
				message: "Route not found",
				data: null,
			};
		}

		if (code === "PARSE") {
			set.status = 400;
			return {
				status: 400,
				success: false,
				message: "Invalid request format",
				errors: [{ field: "body", message: "Failed to parse request body" }],
			};
		}

		set.status = 500;
		log?.error({ error }, "Unhandled error");

		return {
			status: 500,
			success: false,
			message: "Internal Server Error",
			data: null,
		};
	})
	.as("global");
